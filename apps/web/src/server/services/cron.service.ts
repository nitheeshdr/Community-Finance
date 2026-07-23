import { Types } from 'mongoose';
import {
  CommunityStatus,
  NotificationType,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
  UserRole,
  UserStatus,
  formatINR,
} from '@community-finance/shared';
import { logger } from '../lib/logger';
import { CommunityModel } from '../models/community.model';
import { CronRunModel } from '../models/cron-run.model';
import { PaymentModel } from '../models/payment.model';
import { UserModel } from '../models/user.model';
import type { FeeConfigRepository } from '../repositories/fee-config.repository';
import type { NotificationService } from './notification.service';
import type { ReportService } from './report.service';

function currentPeriod(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function previousPeriod(now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Daily housekeeping jobs. Primary scheduler is the lazy in-app trigger
 * (dashboard load) — no cron infrastructure required; an optional external
 * scheduler can also hit the secret-protected /cron/run route. Every job
 * iterates all active communities (multi-tenant) and is idempotent —
 * safe to re-run.
 */
export class CronService {
  constructor(
    private readonly feeConfigs: FeeConfigRepository,
    private readonly notifications: NotificationService,
    private readonly reports: ReportService
  ) {}

  /**
   * Run all daily jobs exactly once per day. Works without any external
   * scheduler: callers may be the lazy in-app trigger or an optional
   * external cron service — the unique `day` claim makes them race-safe.
   * Returns null when today's run already happened.
   */
  async runDailyHousekeeping(): Promise<Record<string, unknown> | null> {
    const day = new Date().toISOString().slice(0, 10);
    try {
      await CronRunModel.create({ day });
    } catch (err) {
      if ((err as { code?: number }).code === 11000) return null; // already ran today
      throw err;
    }

    try {
      const result = {
        reminders: await this.sendPaymentReminders(),
        overdue: await this.markOverdue(),
        retries: await this.retryFailedPayments(),
        monthlyClose: await this.monthlyClose(),
      };
      await CronRunModel.updateOne({ day }, { finishedAt: new Date(), result });
      logger.info({ day, result }, 'Daily housekeeping complete');
      return result;
    } catch (err) {
      await CronRunModel.updateOne(
        { day },
        { finishedAt: new Date(), error: err instanceof Error ? err.message : String(err) }
      );
      throw err;
    }
  }

  /** Fire-and-forget lazy trigger — used from hot paths like the dashboard. */
  maybeRunHousekeeping(): void {
    void this.runDailyHousekeeping().catch((err) =>
      logger.error({ err }, 'Lazy housekeeping failed')
    );
  }

  private async activeCommunityIds(): Promise<string[]> {
    const communities = await CommunityModel.find({ status: CommunityStatus.ACTIVE })
      .select('_id')
      .lean<Array<{ _id: Types.ObjectId }>>();
    return communities.map((c) => String(c._id));
  }

  /**
   * On/after each month's due day: ensure a PENDING subscription payment
   * row exists for every active member (the "dues ledger"), then send
   * reminders to those still unpaid within the grace window.
   */
  async sendPaymentReminders(): Promise<{ communities: number; reminded: number }> {
    const now = new Date();
    const period = currentPeriod(now);
    let reminded = 0;
    const communityIds = await this.activeCommunityIds();

    for (const communityId of communityIds) {
      const config = await this.feeConfigs.findActive(communityId);
      if (!config || config.amount <= 0) continue;

      // Ensure pending rows exist from 3 days before the due day.
      const dueDate = new Date(now.getFullYear(), now.getMonth(), config.dueDay);
      const windowStart = new Date(dueDate);
      windowStart.setDate(windowStart.getDate() - 3);
      if (now < windowStart) continue;

      const activeMembers = await UserModel.find({
        communityId: new Types.ObjectId(communityId),
        role: UserRole.MEMBER,
        status: UserStatus.ACTIVE,
        deletedAt: null,
      })
        .select('_id name')
        .lean<Array<{ _id: Types.ObjectId; name: string }>>();

      const existing = await PaymentModel.find({
        communityId: new Types.ObjectId(communityId),
        type: PaymentType.SUBSCRIPTION,
        period,
      })
        .select('memberId status')
        .lean<Array<{ memberId: Types.ObjectId; status: string }>>();
      const byMember = new Map(existing.map((p) => [String(p.memberId), p.status]));

      const unpaidIds: string[] = [];
      for (const member of activeMembers) {
        const status = byMember.get(String(member._id));
        if (status === PaymentStatus.PAID) continue;
        if (!status) {
          // Create the dues row (idempotent via unique index).
          try {
            await PaymentModel.create({
              communityId,
              memberId: member._id,
              type: PaymentType.SUBSCRIPTION,
              method: PaymentMethod.CASH, // provisional; overwritten on settle
              status: PaymentStatus.PENDING,
              amount: config.amount,
              period,
            });
          } catch (err) {
            if ((err as { code?: number }).code !== 11000) throw err;
          }
        }
        unpaidIds.push(String(member._id));
      }

      if (unpaidIds.length > 0) {
        await this.notifications.send({
          communityId,
          type: NotificationType.PAYMENT_REMINDER,
          title: 'Monthly subscription due',
          body: `Your ${formatINR(config.amount)} subscription for ${period} is due. Please pay to keep community records up to date.`,
          recipientIds: unpaidIds,
        });
        reminded += unpaidIds.length;
      }
    }

    logger.info({ reminded }, 'Payment reminders sent');
    return { communities: communityIds.length, reminded };
  }

  /** After the grace period: PENDING → OVERDUE and apply the late fee once. */
  async markOverdue(): Promise<{ marked: number }> {
    const now = new Date();
    const period = currentPeriod(now);
    let marked = 0;

    for (const communityId of await this.activeCommunityIds()) {
      const config = await this.feeConfigs.findActive(communityId);
      if (!config) continue;

      const graceEnd = new Date(now.getFullYear(), now.getMonth(), config.dueDay);
      graceEnd.setDate(graceEnd.getDate() + config.gracePeriodDays);
      if (now <= graceEnd) continue;

      const result = await PaymentModel.updateMany(
        {
          communityId: new Types.ObjectId(communityId),
          type: PaymentType.SUBSCRIPTION,
          period,
          status: PaymentStatus.PENDING,
        },
        {
          $set: { status: PaymentStatus.OVERDUE },
          ...(config.lateFee > 0 ? { $inc: { amount: config.lateFee } } : {}),
        }
      );
      marked += result.modifiedCount;
    }

    logger.info({ marked }, 'Overdue payments marked');
    return { marked };
  }

  /** Nudge members whose gateway payments failed (Razorpay auto-retries). */
  async retryFailedPayments(): Promise<{ notified: number }> {
    const period = currentPeriod();
    let notified = 0;

    for (const communityId of await this.activeCommunityIds()) {
      const failed = await PaymentModel.find({
        communityId: new Types.ObjectId(communityId),
        type: PaymentType.SUBSCRIPTION,
        period,
        status: PaymentStatus.FAILED,
        retryCount: { $lt: 3 },
      }).lean<Array<{ _id: Types.ObjectId; memberId: Types.ObjectId; amount: number }>>();

      if (failed.length === 0) continue;

      await PaymentModel.updateMany(
        { _id: { $in: failed.map((f) => f._id) } },
        { $inc: { retryCount: 1 } }
      );
      await this.notifications.send({
        communityId,
        type: NotificationType.PAYMENT_FAILED,
        title: 'Payment retry pending',
        body: 'Your subscription payment failed. Please check your UPI mandate or pay manually.',
        recipientIds: failed.map((f) => String(f.memberId)),
      });
      notified += failed.length;
    }

    return { notified };
  }

  /** 1st of month: freeze last month's snapshot for every community. */
  async monthlyClose(): Promise<{ closed: number; skipped: number }> {
    const period = previousPeriod();
    let closed = 0;
    let skipped = 0;

    for (const communityId of await this.activeCommunityIds()) {
      try {
        await this.reports.closePeriod(communityId, period);
        closed++;
      } catch (err) {
        // Already closed or period incomplete — expected on re-runs.
        logger.info(
          { communityId, period, reason: err instanceof Error ? err.message : String(err) },
          'Monthly close skipped'
        );
        skipped++;
      }
    }

    return { closed, skipped };
  }
}
