import { Types } from 'mongoose';
import {
  NotificationType,
  PaymentStatus,
  formatINR,
} from '@community-finance/shared';
import { logger } from '../lib/logger';
import { EventSplitModel } from '../models/event-split.model';
import type { EventEntity, EventRepository } from '../repositories/event.repository';
import type { EventSplitRepository } from '../repositories/event-split.repository';
import type { UserRepository } from '../repositories/user.repository';
import type { NotificationService } from './notification.service';

/**
 * THE core business rule: every open event's budget is split equally
 * across ACTIVE members, and the split recalculates automatically whenever
 * membership or the budget changes.
 *
 *   perHead = ceil(budget / activeMemberCount)
 *
 * `paidAmount` always survives recalculation. Members who leave the active
 * pool keep their split row flagged `inactive` for reconciliation; members
 * who already overpaid a lowered split keep the credit visible.
 */
export class BudgetSplitService {
  constructor(
    private readonly events: EventRepository,
    private readonly splits: EventSplitRepository,
    private readonly users: UserRepository,
    private readonly notifications: NotificationService
  ) {}

  /** Recalculate every open event for the community (membership change). */
  async recalculateAll(communityId: string, trigger: string): Promise<void> {
    const openEvents = await this.events.findOpenEvents(communityId);
    for (const event of openEvents) {
      try {
        await this.recalculate(communityId, event, trigger);
      } catch (err) {
        logger.error(
          { err, eventId: String(event._id) },
          'Budget split recalculation failed'
        );
      }
    }
  }

  /** Recalculate a single event's splits. No-op if nothing changed. */
  async recalculate(
    communityId: string,
    event: EventEntity,
    trigger: string
  ): Promise<{ perHead: number; activeCount: number } | null> {
    const activeMemberIds = await this.users.findActiveMemberIds(communityId);
    const activeCount = activeMemberIds.length;
    const perHead = activeCount > 0 ? Math.ceil(event.budget / activeCount) : 0;

    // Skip when nothing changed (same head-count share and same budget as
    // the latest history entry).
    const history = await this.splits.historyForEvent(communityId, String(event._id));
    const latest = history[0];
    if (
      latest &&
      latest.perHeadAmount === perHead &&
      latest.activeMemberCount === activeCount &&
      latest.budget === event.budget
    ) {
      return null;
    }

    const cid = new Types.ObjectId(communityId);
    const activeSet = new Set(activeMemberIds.map(String));

    // Upsert splits for the active pool.
    if (activeCount > 0) {
      await EventSplitModel.bulkWrite(
        activeMemberIds.map((memberId) => ({
          updateOne: {
            filter: { communityId: cid, eventId: event._id, memberId },
            update: {
              $set: { splitAmount: perHead, inactive: false },
              $setOnInsert: { paidAmount: 0 },
            },
            upsert: true,
          },
        }))
      );
    }

    // Flag splits of members no longer in the active pool.
    await EventSplitModel.updateMany(
      { communityId: cid, eventId: event._id, memberId: { $nin: activeMemberIds } },
      { $set: { inactive: true } }
    );

    // Recompute statuses from paidAmount vs the new split.
    const allSplits = await EventSplitModel.find({ communityId: cid, eventId: event._id });
    await EventSplitModel.bulkWrite(
      allSplits.map((s) => ({
        updateOne: {
          filter: { _id: s._id },
          update: {
            $set: {
              status:
                s.paidAmount >= (activeSet.has(String(s.memberId)) ? perHead : s.splitAmount) &&
                s.paidAmount > 0
                  ? PaymentStatus.PAID
                  : PaymentStatus.PENDING,
            },
          },
        },
      }))
    );

    await this.events.updateById(communityId, String(event._id), {
      $set: { perHeadAmount: perHead },
    });

    await this.splits.recordHistory({
      communityId: cid,
      eventId: event._id,
      budget: event.budget,
      activeMemberCount: activeCount,
      perHeadAmount: perHead,
      trigger,
    } as never);

    await this.notifications.send({
      communityId,
      type: NotificationType.BUDGET_UPDATED,
      title: `${event.name}: contribution updated`,
      body: `Your share is now ${formatINR(perHead)} (${activeCount} active members). Reason: ${trigger}`,
      data: { eventId: String(event._id), perHead },
    });

    return { perHead, activeCount };
  }
}
