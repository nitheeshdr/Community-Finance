import {
  AuditAction,
  AuditEntity,
  NotificationType,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
  SubscriptionStatus,
  UserRole,
  formatINR,
} from '@community-finance/shared';
import { logger } from '../lib/logger';
import { WebhookEventModel } from '../models/webhook-event.model';
import type { PaymentEntity, PaymentRepository } from '../repositories/payment.repository';
import type { RazorpaySubscriptionRepository } from '../repositories/razorpay-subscription.repository';
import type { UserEntity, UserRepository } from '../repositories/user.repository';
import type { AuditService } from './audit.service';
import type { NotificationService } from './notification.service';
import type { PaymentService } from './payment.service';

interface RazorpayWebhookBody {
  event: string;
  payload: {
    payment?: { entity: RazorpayPaymentEntity };
    subscription?: { entity: RazorpaySubscriptionEntityRaw };
    refund?: { entity: { id: string; payment_id: string; amount: number } };
    payment_link?: {
      entity: { id: string; notes?: Record<string, string> };
    };
  };
  created_at: number;
}

interface RazorpayPaymentEntity {
  id: string;
  amount: number;
  status: string;
  order_id?: string;
  invoice_id?: string;
  error_description?: string;
}

interface RazorpaySubscriptionEntityRaw {
  id: string;
  status: string;
  charge_at?: number;
  notes?: Record<string, string>;
}

const STATUS_MAP: Record<string, SubscriptionStatus> = {
  created: SubscriptionStatus.CREATED,
  authenticated: SubscriptionStatus.AUTHENTICATED,
  active: SubscriptionStatus.ACTIVE,
  paused: SubscriptionStatus.PAUSED,
  halted: SubscriptionStatus.HALTED,
  cancelled: SubscriptionStatus.CANCELLED,
  completed: SubscriptionStatus.COMPLETED,
  expired: SubscriptionStatus.EXPIRED,
};

/**
 * Razorpay webhook processing. Idempotency: the (provider, eventId) pair
 * is unique-indexed; a duplicate insert aborts processing before any side
 * effects. Signature verification happens in the route (raw body needed).
 */
export class WebhookService {
  constructor(
    private readonly payments: PaymentRepository,
    private readonly subscriptions: RazorpaySubscriptionRepository,
    private readonly users: UserRepository,
    private readonly paymentService: PaymentService,
    private readonly notifications: NotificationService,
    private readonly audit: AuditService
  ) {}

  async process(eventId: string, body: RazorpayWebhookBody): Promise<'processed' | 'duplicate' | 'skipped'> {
    // Idempotency gate.
    try {
      await WebhookEventModel.create({
        provider: 'razorpay',
        eventId,
        eventType: body.event,
        payload: body.payload,
      });
    } catch (err) {
      if ((err as { code?: number }).code === 11000) {
        logger.info({ eventId }, 'Duplicate webhook skipped');
        return 'duplicate';
      }
      throw err;
    }

    try {
      switch (body.event) {
        case 'subscription.charged':
          await this.onSubscriptionCharged(body);
          return 'processed';
        case 'subscription.activated':
        case 'subscription.authenticated':
        case 'subscription.paused':
        case 'subscription.resumed':
        case 'subscription.halted':
        case 'subscription.cancelled':
        case 'subscription.completed':
          await this.onSubscriptionStatusChange(body);
          return 'processed';
        case 'payment_link.paid':
          await this.onPaymentLinkPaid(body);
          return 'processed';
        case 'payment.failed':
          await this.onPaymentFailed(body);
          return 'processed';
        case 'refund.processed':
          await this.onRefundProcessed(body);
          return 'processed';
        default:
          logger.debug({ event: body.event }, 'Webhook event ignored');
          return 'skipped';
      }
    } catch (err) {
      await WebhookEventModel.updateOne(
        { provider: 'razorpay', eventId },
        { status: 'FAILED', error: err instanceof Error ? err.message : String(err) }
      );
      throw err;
    }
  }

  /* -------------------------------------------------------------- */

  private async onSubscriptionCharged(body: RazorpayWebhookBody): Promise<void> {
    const subEntity = body.payload.subscription?.entity;
    const payEntity = body.payload.payment?.entity;
    if (!subEntity || !payEntity) return;

    const sub = await this.subscriptions.findByRazorpayId(subEntity.id);
    if (!sub) {
      logger.warn({ subscriptionId: subEntity.id }, 'Charged webhook for unknown subscription');
      return;
    }
    const communityId = String(sub.communityId);
    const memberId = String(sub.memberId);
    const period = currentPeriod();

    // Already recorded (webhook retry with a different event id)?
    const existing = await this.payments.findByRazorpayPaymentId(payEntity.id);
    if (existing) return;

    // Upsert against a possible pending row for the period.
    const pending = await this.payments.findSubscriptionPayment(communityId, memberId, period);
    let payment: PaymentEntity;
    if (pending && pending.status !== PaymentStatus.PAID) {
      payment = (await this.payments.updateById(communityId, String(pending._id), {
        $set: {
          status: PaymentStatus.PAID,
          method: PaymentMethod.RAZORPAY,
          amount: payEntity.amount,
          razorpayPaymentId: payEntity.id,
          razorpayInvoiceId: payEntity.invoice_id,
          razorpaySubscriptionId: subEntity.id,
          paidAt: new Date(body.created_at * 1000),
        },
      })) as PaymentEntity;
    } else {
      payment = (await this.payments.create(communityId, {
        memberId,
        type: PaymentType.SUBSCRIPTION,
        method: PaymentMethod.RAZORPAY,
        status: PaymentStatus.PAID,
        amount: payEntity.amount,
        period,
        razorpayPaymentId: payEntity.id,
        razorpayInvoiceId: payEntity.invoice_id,
        razorpaySubscriptionId: subEntity.id,
        paidAt: new Date(body.created_at * 1000),
      } as never)) as PaymentEntity;
    }

    await this.paymentService.settle(communityId, payment);
    await this.updateSubStatus(sub.razorpaySubscriptionId, subEntity);

    const member = (await this.users.findById(communityId, memberId)) as UserEntity | null;
    await this.audit.record({
      action: AuditAction.PAYMENT_RECEIVED,
      entity: AuditEntity.PAYMENT,
      entityId: String(payment._id),
      after: { amount: payEntity.amount, razorpayPaymentId: payEntity.id },
      actor: {
        userId: memberId,
        userName: member?.name ?? 'Member',
        role: UserRole.MEMBER,
        communityId,
      },
    });
  }

  /** Member paid their event share via the "Pay now" payment link. */
  private async onPaymentLinkPaid(body: RazorpayWebhookBody): Promise<void> {
    const link = body.payload.payment_link?.entity;
    const payEntity = body.payload.payment?.entity;
    if (!link) return;

    // Locate the pending payment row: by link id, falling back to notes.
    let payment = await this.payments.findByRazorpayLinkId(link.id);
    if (!payment && link.notes?.communityId && link.notes.paymentId) {
      payment = (await this.payments.findById(
        link.notes.communityId,
        link.notes.paymentId
      )) as PaymentEntity | null;
    }
    if (!payment) {
      logger.warn({ linkId: link.id }, 'payment_link.paid for unknown payment');
      return;
    }
    if (payment.status === PaymentStatus.PAID) return; // duplicate

    const communityId = String(payment.communityId);
    const updated = (await this.payments.updateById(communityId, String(payment._id), {
      $set: {
        status: PaymentStatus.PAID,
        razorpayPaymentId: payEntity?.id,
        paidAt: new Date(body.created_at * 1000),
      },
    })) as PaymentEntity;

    await this.paymentService.settle(communityId, updated);

    const member = (await this.users.findById(
      communityId,
      String(payment.memberId)
    )) as UserEntity | null;
    await this.audit.record({
      action: AuditAction.PAYMENT_RECEIVED,
      entity: AuditEntity.PAYMENT,
      entityId: String(payment._id),
      after: { amount: updated.amount, via: 'payment-link', razorpayPaymentId: payEntity?.id },
      actor: {
        userId: String(payment.memberId),
        userName: member?.name ?? 'Member',
        role: UserRole.MEMBER,
        communityId,
      },
    });
  }

  private async onSubscriptionStatusChange(body: RazorpayWebhookBody): Promise<void> {
    const subEntity = body.payload.subscription?.entity;
    if (!subEntity) return;
    await this.updateSubStatus(subEntity.id, subEntity);
  }

  private async onPaymentFailed(body: RazorpayWebhookBody): Promise<void> {
    const payEntity = body.payload.payment?.entity;
    const subEntity = body.payload.subscription?.entity;
    if (!payEntity) return;

    // Only handle failures tied to a known subscription.
    const sub = subEntity ? await this.subscriptions.findByRazorpayId(subEntity.id) : null;
    if (!sub) return;

    const communityId = String(sub.communityId);
    const memberId = String(sub.memberId);
    const period = currentPeriod();

    const existing = await this.payments.findSubscriptionPayment(communityId, memberId, period);
    if (!existing) {
      await this.payments.create(communityId, {
        memberId,
        type: PaymentType.SUBSCRIPTION,
        method: PaymentMethod.RAZORPAY,
        status: PaymentStatus.FAILED,
        amount: payEntity.amount,
        period,
        razorpayPaymentId: payEntity.id,
        failureReason: payEntity.error_description,
      } as never);
    }

    const member = (await this.users.findById(communityId, memberId)) as UserEntity | null;
    await this.notifications.send({
      communityId,
      type: NotificationType.PAYMENT_FAILED,
      title: 'Payment failed',
      body: `${formatINR(payEntity.amount)} subscription payment failed for ${member?.name ?? 'a member'}. It will be retried automatically.`,
      recipientIds: [memberId],
    });
    await this.audit.record({
      action: AuditAction.PAYMENT_FAILED,
      entity: AuditEntity.PAYMENT,
      after: { amount: payEntity.amount, reason: payEntity.error_description },
      actor: {
        userId: memberId,
        userName: member?.name ?? 'Member',
        role: UserRole.MEMBER,
        communityId,
      },
    });
  }

  private async onRefundProcessed(body: RazorpayWebhookBody): Promise<void> {
    const refund = body.payload.refund?.entity;
    if (!refund) return;
    const payment = await this.payments.findByRazorpayPaymentId(refund.payment_id);
    if (!payment || payment.status === PaymentStatus.REFUNDED) return;
    // Refund initiated from the Razorpay dashboard — mirror it locally.
    await this.paymentService.refund(
      String(payment.communityId),
      String(payment._id),
      'Refund processed via Razorpay',
      'razorpay-webhook'
    );
  }

  private async updateSubStatus(
    razorpaySubscriptionId: string,
    entity: RazorpaySubscriptionEntityRaw
  ): Promise<void> {
    const status = STATUS_MAP[entity.status];
    if (!status) return;
    const sub = await this.subscriptions.findByRazorpayId(razorpaySubscriptionId);
    if (!sub) return;
    await this.subscriptions.updateById(String(sub.communityId), String(sub._id), {
      $set: {
        status,
        ...(entity.charge_at ? { nextChargeAt: new Date(entity.charge_at * 1000) } : {}),
      },
    });
  }
}

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
