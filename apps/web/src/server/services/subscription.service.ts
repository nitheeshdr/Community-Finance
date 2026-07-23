import {
  AuditAction,
  AuditEntity,
  SubscriptionStatus,
  UserStatus,
  toRupees,
  type SubscriptionDto,
} from '@community-finance/shared';
import {
  BusinessRuleError,
  NotFoundError,
} from '../errors/app-error';
import { getRazorpayClient } from '../lib/razorpay';
import type { FeeConfigRepository } from '../repositories/fee-config.repository';
import type {
  RazorpaySubscriptionEntity,
  RazorpaySubscriptionRepository,
} from '../repositories/razorpay-subscription.repository';
import type { UserEntity, UserRepository } from '../repositories/user.repository';
import type { AuditService } from './audit.service';

/**
 * Razorpay AutoPay subscriptions. Flow:
 * 1. Admin/member triggers create → we ensure a Razorpay plan for the
 *    current fee amount, create a subscription, store the short_url.
 * 2. Member authorizes AutoPay via the short_url (UPI mandate).
 * 3. Webhooks (`subscription.charged` etc.) drive status + payments.
 */
export class SubscriptionService {
  constructor(
    private readonly subscriptions: RazorpaySubscriptionRepository,
    private readonly users: UserRepository,
    private readonly feeConfigs: FeeConfigRepository,
    private readonly audit: AuditService
  ) {}

  async createForMember(communityId: string, memberId: string): Promise<SubscriptionDto> {
    const member = (await this.users.findById(communityId, memberId)) as UserEntity | null;
    if (!member || member.deletedAt) throw new NotFoundError('Member');
    if (member.status !== UserStatus.ACTIVE) {
      throw new BusinessRuleError('Only active members can have subscriptions');
    }

    const existing = await this.subscriptions.findLiveForMember(communityId, memberId);
    if (existing) {
      throw new BusinessRuleError('This member already has an active subscription');
    }

    const feeConfig = await this.feeConfigs.findActive(communityId);
    if (!feeConfig || feeConfig.amount <= 0) {
      throw new BusinessRuleError('Configure the monthly fee before creating subscriptions');
    }

    const client = await getRazorpayClient(communityId);

    // Razorpay plans are immutable; one plan per (community, amount).
    const plan = await client.plans.create({
      period: 'monthly',
      interval: 1,
      item: {
        name: `Monthly subscription — ₹${toRupees(feeConfig.amount)}`,
        amount: feeConfig.amount, // Razorpay uses paise too
        currency: 'INR',
      },
      notes: { communityId },
    });

    const subscription = await client.subscriptions.create({
      plan_id: plan.id,
      total_count: 120, // 10 years of monthly charges
      quantity: 1,
      customer_notify: 1,
      notes: { communityId, memberId },
    });

    const created = (await this.subscriptions.create(communityId, {
      memberId,
      razorpaySubscriptionId: subscription.id,
      razorpayPlanId: plan.id,
      status: SubscriptionStatus.CREATED,
      shortUrl: subscription.short_url ?? undefined,
    } as never)) as RazorpaySubscriptionEntity;

    await this.audit.record({
      action: AuditAction.SUBSCRIPTION_CHANGED,
      entity: AuditEntity.SUBSCRIPTION,
      entityId: String(created._id),
      after: { member: member.name, razorpaySubscriptionId: subscription.id, status: 'CREATED' },
    });

    return this.toDto(created, member.name);
  }

  async cancel(
    communityId: string,
    memberId: string,
    cancelAtCycleEnd: boolean,
    reason?: string
  ): Promise<SubscriptionDto> {
    const sub = await this.subscriptions.findLiveForMember(communityId, memberId);
    if (!sub) throw new NotFoundError('Active subscription');

    const client = await getRazorpayClient(communityId);
    await client.subscriptions.cancel(sub.razorpaySubscriptionId, cancelAtCycleEnd);

    const updated = (await this.subscriptions.updateById(communityId, String(sub._id), {
      $set: {
        status: SubscriptionStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: reason,
      },
    })) as RazorpaySubscriptionEntity;

    await this.audit.record({
      action: AuditAction.SUBSCRIPTION_CHANGED,
      entity: AuditEntity.SUBSCRIPTION,
      entityId: String(sub._id),
      before: { status: sub.status },
      after: { status: 'CANCELLED', reason },
    });
    return this.toDto(updated);
  }

  /** Resume = create a fresh subscription (Razorpay cancels are terminal). */
  async resume(communityId: string, memberId: string): Promise<SubscriptionDto> {
    return this.createForMember(communityId, memberId);
  }

  async getForMember(communityId: string, memberId: string): Promise<SubscriptionDto | null> {
    const sub = await this.subscriptions.findLiveForMember(communityId, memberId);
    return sub ? this.toDto(sub) : null;
  }

  private toDto(sub: RazorpaySubscriptionEntity, memberName?: string): SubscriptionDto {
    return {
      id: String(sub._id),
      memberId: String(sub.memberId),
      memberName,
      razorpaySubscriptionId: sub.razorpaySubscriptionId,
      status: sub.status as SubscriptionStatus,
      shortUrl: sub.shortUrl ?? undefined,
      nextChargeAt: sub.nextChargeAt?.toISOString(),
      createdAt: sub.createdAt?.toISOString() ?? '',
    };
  }
}
