import { Types } from 'mongoose';
import { PaymentStatus } from '@community-finance/shared';
import {
  EventSplitHistoryModel,
  EventSplitModel,
  type EventSplitDoc,
  type EventSplitHistoryDoc,
} from '../models/event-split.model';
import { BaseRepository } from './base.repository';

export type EventSplitEntity = EventSplitDoc & {
  _id: Types.ObjectId;
  updatedAt?: Date;
};
export type EventSplitHistoryEntity = EventSplitHistoryDoc & {
  _id: Types.ObjectId;
  createdAt?: Date;
};

export class EventSplitRepository extends BaseRepository<EventSplitDoc> {
  constructor() {
    super(EventSplitModel);
  }

  async findForEvent(communityId: string, eventId: string): Promise<EventSplitEntity[]> {
    return this.findMany(communityId, { eventId }) as Promise<EventSplitEntity[]>;
  }

  /** Record a member payment against their split and derive its status. */
  async applyPayment(
    communityId: string,
    eventId: string,
    memberId: string,
    amountPaise: number
  ): Promise<void> {
    const split = await EventSplitModel.findOneAndUpdate(
      { communityId: new Types.ObjectId(communityId), eventId, memberId },
      { $inc: { paidAmount: amountPaise } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    if (split) {
      split.status =
        split.paidAmount >= split.splitAmount && split.splitAmount > 0
          ? PaymentStatus.PAID
          : PaymentStatus.PENDING;
      await split.save();
    }
  }

  async recordHistory(entry: Partial<EventSplitHistoryDoc>): Promise<void> {
    await EventSplitHistoryModel.create(entry);
  }

  async historyForEvent(communityId: string, eventId: string): Promise<EventSplitHistoryEntity[]> {
    return EventSplitHistoryModel.find({
      communityId: new Types.ObjectId(communityId),
      eventId: new Types.ObjectId(eventId),
    })
      .sort({ createdAt: -1 })
      .lean<EventSplitHistoryEntity[]>();
  }
}
