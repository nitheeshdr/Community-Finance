import { Types } from 'mongoose';
import {
  AuditAction,
  AuditEntity,
  IncomeSource,
  NotificationType,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
  REALTIME,
  formatINR,
  toPaise,
  type ApprovePaymentInput,
  type PaymentDto,
  type PaymentListQuery,
  type RecordManualPaymentInput,
} from '@community-finance/shared';
import {
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../errors/app-error';
import { uploadBuffer } from '../lib/cloudinary';
import { logger } from '../lib/logger';
import { generateReceiptPdf } from '../lib/pdf';
import { nextCounter } from '../models/counter.model';
import { CommunityModel } from '../models/community.model';
import type { EventRepository } from '../repositories/event.repository';
import type { EventSplitRepository } from '../repositories/event-split.repository';
import type { IncomeEntity, IncomeRepository } from '../repositories/income.repository';
import type { PaymentEntity, PaymentRepository } from '../repositories/payment.repository';
import type { UserEntity, UserRepository } from '../repositories/user.repository';
import type { ListResult } from '../repositories/base.repository';
import type { AuditService } from './audit.service';
import type { NotificationService } from './notification.service';
import type { RealtimeService } from './realtime.service';

const INCOME_SOURCE_BY_TYPE: Record<PaymentType, IncomeSource> = {
  [PaymentType.SUBSCRIPTION]: IncomeSource.SUBSCRIPTION,
  [PaymentType.EVENT_CONTRIBUTION]: IncomeSource.EVENT,
  [PaymentType.DONATION]: IncomeSource.DONATION,
  [PaymentType.SPONSORSHIP]: IncomeSource.SPONSORSHIP,
  [PaymentType.MISC]: IncomeSource.MISC,
};

export class PaymentService {
  constructor(
    private readonly payments: PaymentRepository,
    private readonly users: UserRepository,
    private readonly incomes: IncomeRepository,
    private readonly events: EventRepository,
    private readonly eventSplits: EventSplitRepository,
    private readonly audit: AuditService,
    private readonly notifications: NotificationService,
    private readonly realtime: RealtimeService
  ) {}

  /* ------------------------------------------------------------ */
  /* Queries                                                       */
  /* ------------------------------------------------------------ */

  async list(communityId: string, query: PaymentListQuery): Promise<ListResult<PaymentDto>> {
    const filter: Record<string, unknown> = {};
    if (query.memberId) filter.memberId = query.memberId;
    if (query.eventId) filter.eventId = query.eventId;
    if (query.type) filter.type = query.type;
    if (query.method) filter.method = query.method;
    if (query.status) filter.status = query.status;
    if (query.period) filter.period = query.period;
    if (query.from || query.to) {
      filter.createdAt = {
        ...(query.from ? { $gte: query.from } : {}),
        ...(query.to ? { $lte: query.to } : {}),
      };
    }
    const { items, total } = await this.payments.list(communityId, filter, {
      page: query.page,
      limit: query.limit,
      populate: ['memberId', 'eventId', 'approvedBy'],
    });
    return { items: (items as PaymentEntity[]).map(toPaymentDto), total };
  }

  async getById(communityId: string, id: string): Promise<PaymentEntity> {
    const payment = (await this.payments.findById(communityId, id)) as PaymentEntity | null;
    if (!payment) throw new NotFoundError('Payment');
    return payment;
  }

  /* ------------------------------------------------------------ */
  /* Manual entry + approval workflow                              */
  /* ------------------------------------------------------------ */

  /** Admin records a cash/UPI payment. Requires approval before settlement. */
  async recordManual(
    communityId: string,
    input: RecordManualPaymentInput,
    recordedBy: string
  ): Promise<PaymentDto> {
    const member = (await this.users.findById(communityId, input.memberId)) as UserEntity | null;
    if (!member || member.deletedAt) throw new NotFoundError('Member');

    if (input.type === PaymentType.SUBSCRIPTION && input.period) {
      const existing = await this.payments.findSubscriptionPayment(
        communityId,
        input.memberId,
        input.period
      );
      if (existing && existing.status === PaymentStatus.PAID) {
        throw new ConflictError(`${member.name} has already paid for ${input.period}`);
      }
    }
    if (input.eventId) {
      const event = await this.events.findById(communityId, input.eventId);
      if (!event) throw new NotFoundError('Event');
    }

    const payment = (await this.payments.create(communityId, {
      memberId: input.memberId,
      type: input.type,
      method: input.method,
      status: PaymentStatus.PENDING,
      amount: toPaise(input.amount),
      period: input.period,
      eventId: input.eventId,
      upiReference: input.upiReference,
      notes: input.notes,
      paidAt: input.paidAt ?? new Date(),
    } as never)) as PaymentEntity;

    await this.audit.record({
      action: AuditAction.CREATE,
      entity: AuditEntity.PAYMENT,
      entityId: String(payment._id),
      after: {
        member: member.name,
        amount: payment.amount,
        method: payment.method,
        type: payment.type,
        recordedBy,
      },
    });
    return toPaymentDto({ ...payment, memberId: member as never });
  }

  /** Approve or reject a pending manual payment. Approval settles it. */
  async review(
    communityId: string,
    paymentId: string,
    input: ApprovePaymentInput,
    reviewerId: string
  ): Promise<PaymentDto> {
    const payment = await this.getById(communityId, paymentId);
    if (payment.status !== PaymentStatus.PENDING) {
      throw new BusinessRuleError('Only pending payments can be reviewed');
    }
    if (payment.method === PaymentMethod.RAZORPAY) {
      throw new BusinessRuleError('Razorpay payments settle automatically via webhooks');
    }

    if (input.action === 'REJECT') {
      const updated = (await this.payments.updateById(communityId, paymentId, {
        $set: {
          status: PaymentStatus.CANCELLED,
          approvedBy: reviewerId,
          rejectionReason: input.reason,
        },
      })) as PaymentEntity;
      await this.audit.record({
        action: AuditAction.REJECT,
        entity: AuditEntity.PAYMENT,
        entityId: paymentId,
        after: { reason: input.reason },
      });
      return toPaymentDto(updated);
    }

    const updated = (await this.payments.updateById(communityId, paymentId, {
      $set: { status: PaymentStatus.PAID, approvedBy: reviewerId },
    })) as PaymentEntity;

    await this.settle(communityId, updated);
    await this.audit.record({
      action: AuditAction.APPROVE,
      entity: AuditEntity.PAYMENT,
      entityId: paymentId,
      after: { amount: updated.amount, method: updated.method },
    });
    const settled = await this.getById(communityId, paymentId);
    return toPaymentDto(settled);
  }

  /* ------------------------------------------------------------ */
  /* Member self-service: pay an event share via Razorpay link     */
  /* ------------------------------------------------------------ */

  /**
   * "Pay now" for the member's remaining event share. Creates (or
   * reuses) a Razorpay Payment Link; settlement happens when the
   * `payment_link.paid` webhook arrives.
   */
  async createEventPayLink(
    communityId: string,
    eventId: string,
    memberId: string
  ): Promise<{ paymentId: string; shortUrl: string; amount: number }> {
    const event = await this.events.findById(communityId, eventId);
    if (!event) throw new NotFoundError('Event');

    const split = await this.eventSplits.findOne(communityId, { eventId, memberId });
    if (!split) throw new BusinessRuleError('You have no contribution share for this event');
    const remaining = split.splitAmount - split.paidAmount;
    if (remaining <= 0) {
      throw new BusinessRuleError('Your share for this event is already fully paid');
    }

    // Reuse a live link if one exists for the same remaining amount.
    const existing = (await this.payments.findOne(communityId, {
      memberId,
      eventId,
      type: PaymentType.EVENT_CONTRIBUTION,
      method: PaymentMethod.RAZORPAY,
      status: PaymentStatus.PENDING,
      razorpayLinkId: { $ne: null },
    })) as PaymentEntity | null;
    if (existing?.razorpayLinkUrl && existing.amount === remaining) {
      return {
        paymentId: String(existing._id),
        shortUrl: existing.razorpayLinkUrl,
        amount: existing.amount,
      };
    }

    const payment = (await this.payments.create(communityId, {
      memberId,
      type: PaymentType.EVENT_CONTRIBUTION,
      method: PaymentMethod.RAZORPAY,
      status: PaymentStatus.PENDING,
      amount: remaining,
      eventId,
    } as never)) as PaymentEntity;

    return this.attachPayLink(communityId, payment, `${event.name} — contribution`);
  }

  /**
   * "Pay now" for an existing pending payment (monthly subscription due,
   * a pending event contribution, etc.). Members may pay any of their own
   * PENDING/OVERDUE dues one-time via Razorpay even if they also have
   * AutoPay — this covers the current period or a failed AutoPay charge.
   */
  async payPendingPayment(
    communityId: string,
    paymentId: string,
    memberId: string
  ): Promise<{ paymentId: string; shortUrl: string; amount: number }> {
    const payment = await this.getById(communityId, paymentId);
    if (String(payment.memberId) !== memberId) {
      throw new ForbiddenError('You can only pay your own dues');
    }
    if (
      payment.status !== PaymentStatus.PENDING &&
      payment.status !== PaymentStatus.OVERDUE &&
      payment.status !== PaymentStatus.FAILED
    ) {
      throw new BusinessRuleError('This payment is not pending');
    }

    // Reuse the live link if we already generated one for this amount.
    if (payment.razorpayLinkUrl && payment.razorpayLinkId) {
      return {
        paymentId: String(payment._id),
        shortUrl: payment.razorpayLinkUrl,
        amount: payment.amount,
      };
    }

    // A cash/UPI-provisional row becomes a Razorpay row when paid online.
    if (payment.method !== PaymentMethod.RAZORPAY) {
      await this.payments.updateById(communityId, paymentId, {
        $set: { method: PaymentMethod.RAZORPAY },
      });
      payment.method = PaymentMethod.RAZORPAY;
    }

    const label =
      payment.type === PaymentType.SUBSCRIPTION
        ? `Monthly subscription ${payment.period ?? ''}`.trim()
        : `${humanize(payment.type)} contribution`;
    return this.attachPayLink(communityId, payment, label);
  }

  /** Create a Razorpay Payment Link for a payment row and persist it. */
  private async attachPayLink(
    communityId: string,
    payment: PaymentEntity,
    description: string
  ): Promise<{ paymentId: string; shortUrl: string; amount: number }> {
    const member = (await this.users.findById(communityId, String(payment.memberId))) as UserEntity | null;
    const { getRazorpayClient } = await import('../lib/razorpay');
    const client = await getRazorpayClient(communityId);

    const link = (await client.paymentLink.create({
      amount: payment.amount,
      currency: 'INR',
      description,
      customer: {
        name: member?.name,
        contact: member?.phone ? `+91${member.phone}` : undefined,
      },
      notify: { sms: false, email: false },
      notes: {
        communityId,
        paymentId: String(payment._id),
        memberId: String(payment.memberId),
        ...(payment.eventId ? { eventId: String(payment.eventId) } : {}),
      },
    })) as { id: string; short_url: string };

    await this.payments.updateById(communityId, String(payment._id), {
      $set: { razorpayLinkId: link.id, razorpayLinkUrl: link.short_url },
    });

    return { paymentId: String(payment._id), shortUrl: link.short_url, amount: payment.amount };
  }

  /* ------------------------------------------------------------ */
  /* Settlement pipeline (shared: manual approval + webhooks)      */
  /* ------------------------------------------------------------ */

  /**
   * Post-payment side effects: income row, receipt PDF, event split
   * credit, notification, dashboard refresh. Idempotent per payment
   * (guarded by receiptNumber existence).
   */
  async settle(communityId: string, payment: PaymentEntity): Promise<void> {
    if (payment.receiptNumber) return; // already settled

    const member = (await this.users.findById(
      communityId,
      String(payment.memberId)
    )) as UserEntity | null;
    const memberName = member?.name ?? 'Member';

    // 1. Income row (skip if one already exists for this payment)
    const existingIncome = await this.incomes.findOne(communityId, { paymentId: payment._id });
    if (!existingIncome) {
      await this.incomes.create(communityId, {
        source: INCOME_SOURCE_BY_TYPE[payment.type as PaymentType],
        amount: payment.amount,
        method: payment.method,
        eventId: payment.eventId ?? undefined,
        paymentId: payment._id,
        description:
          payment.type === PaymentType.SUBSCRIPTION
            ? `Monthly subscription ${payment.period ?? ''} — ${memberName}`
            : `${payment.type} — ${memberName}`,
        receivedAt: payment.paidAt ?? new Date(),
      } as never);
    }

    // 2. Event split credit
    if (payment.eventId && payment.type === PaymentType.EVENT_CONTRIBUTION) {
      await this.eventSplits.applyPayment(
        communityId,
        String(payment.eventId),
        String(payment.memberId),
        payment.amount
      );
      await this.events.incrementCollected(communityId, String(payment.eventId), payment.amount);
    }

    // 3. Receipt
    const receiptNumber = await this.generateReceiptNumber(communityId);
    let receiptUrl: string | undefined;
    try {
      const community = await CommunityModel.findById(communityId).lean();
      const pdf = await generateReceiptPdf({
        receiptNumber,
        communityName: community?.name ?? 'Community',
        memberName,
        memberPhone: member?.phone ?? '',
        amount: payment.amount,
        paymentType: humanize(payment.type),
        method: humanize(payment.method),
        period: payment.period ?? undefined,
        paidAt: payment.paidAt ?? new Date(),
        reference: payment.upiReference ?? payment.razorpayPaymentId ?? undefined,
      });
      const uploaded = await uploadBuffer(pdf, {
        communityId,
        folder: 'receipts',
        publicId: receiptNumber,
        resourceType: 'raw',
      });
      receiptUrl = uploaded.url;
    } catch (err) {
      // Receipt upload must not fail the settlement — regenerate on demand.
      logger.warn({ err, paymentId: String(payment._id) }, 'Receipt upload failed');
    }

    await this.payments.updateById(communityId, String(payment._id), {
      $set: { receiptNumber, ...(receiptUrl ? { receiptUrl } : {}) },
    });

    // 4. Notify the member + refresh dashboards
    await this.notifications.send({
      communityId,
      type: NotificationType.PAYMENT_SUCCESS,
      title: 'Payment received',
      body: `${formatINR(payment.amount)} received from ${memberName}. Receipt ${receiptNumber}.`,
      recipientIds: [String(payment.memberId)],
      data: { paymentId: String(payment._id) },
    });
    await this.realtime.publish(communityId, REALTIME.EVENTS.PAYMENT_UPDATED, {
      paymentId: String(payment._id),
      status: PaymentStatus.PAID,
    });
  }

  /* ------------------------------------------------------------ */
  /* Refunds                                                       */
  /* ------------------------------------------------------------ */

  async refund(
    communityId: string,
    paymentId: string,
    reason: string,
    refundedBy: string
  ): Promise<PaymentDto> {
    const payment = await this.getById(communityId, paymentId);
    if (payment.status !== PaymentStatus.PAID) {
      throw new BusinessRuleError('Only paid payments can be refunded');
    }

    // Razorpay-side refund for gateway payments.
    if (payment.method === PaymentMethod.RAZORPAY && payment.razorpayPaymentId) {
      const { getRazorpayClient } = await import('../lib/razorpay');
      const client = await getRazorpayClient(communityId);
      const refund = await client.payments.refund(payment.razorpayPaymentId, {
        amount: payment.amount,
        notes: { reason },
      });
      await this.payments.updateById(communityId, paymentId, {
        $set: { refundId: refund.id },
      });
    }

    const updated = (await this.payments.updateById(communityId, paymentId, {
      $set: { status: PaymentStatus.REFUNDED, refundReason: reason },
    })) as PaymentEntity;

    // Reverse the income row.
    const income = (await this.incomes.findOne(communityId, {
      paymentId: updated._id,
    })) as IncomeEntity | null;
    if (income) {
      await this.incomes.updateById(communityId, String(income._id), {
        $set: { deletedAt: new Date(), description: `[REFUNDED] ${income.description ?? ''}` },
      });
    }
    // Reverse event split credit.
    if (updated.eventId && updated.type === PaymentType.EVENT_CONTRIBUTION) {
      await this.eventSplits.applyPayment(
        communityId,
        String(updated.eventId),
        String(updated.memberId),
        -updated.amount
      );
      await this.events.incrementCollected(communityId, String(updated.eventId), -updated.amount);
    }

    await this.audit.record({
      action: AuditAction.REFUND,
      entity: AuditEntity.PAYMENT,
      entityId: paymentId,
      before: { status: PaymentStatus.PAID },
      after: { status: PaymentStatus.REFUNDED, reason, refundedBy },
    });
    return toPaymentDto(updated);
  }

  /* ------------------------------------------------------------ */

  private async generateReceiptNumber(communityId: string): Promise<string> {
    const seq = await nextCounter(communityId, 'receipt');
    const year = new Date().getFullYear();
    return `RCP-${year}-${String(seq).padStart(5, '0')}`;
  }
}

/* ---------------------------------------------------------------- */

function humanize(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function refName(ref: unknown): string | undefined {
  if (ref && typeof ref === 'object' && 'name' in ref) {
    return String((ref as { name: unknown }).name);
  }
  return undefined;
}

function refId(ref: unknown): string {
  if (ref && typeof ref === 'object' && '_id' in ref) {
    return String((ref as { _id: unknown })._id);
  }
  return String(ref ?? '');
}

export function toPaymentDto(payment: PaymentEntity): PaymentDto {
  return {
    id: String(payment._id),
    memberId: refId(payment.memberId),
    memberName: refName(payment.memberId),
    type: payment.type as PaymentDto['type'],
    method: payment.method as PaymentDto['method'],
    status: payment.status as PaymentDto['status'],
    amount: payment.amount,
    period: payment.period ?? undefined,
    eventId: payment.eventId ? refId(payment.eventId) : undefined,
    eventName: refName(payment.eventId),
    receiptNumber: payment.receiptNumber ?? undefined,
    receiptUrl: payment.receiptUrl ?? undefined,
    upiReference: payment.upiReference ?? undefined,
    notes: payment.notes ?? undefined,
    approvedBy: payment.approvedBy ? refId(payment.approvedBy) : undefined,
    approvedByName: refName(payment.approvedBy),
    razorpayPaymentId: payment.razorpayPaymentId ?? undefined,
    paidAt: payment.paidAt?.toISOString(),
    createdAt: payment.createdAt?.toISOString() ?? '',
  };
}
