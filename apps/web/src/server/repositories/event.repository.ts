import { Types } from 'mongoose';
import { EventStatus } from '@community-finance/shared';
import { EventModel, type EventDoc } from '../models/event.model';
import { BaseRepository } from './base.repository';

export type EventEntity = EventDoc & {
  _id: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};

export class EventRepository extends BaseRepository<EventDoc> {
  constructor() {
    super(EventModel);
  }

  /** Events whose splits must track the active-member pool. */
  async findOpenEvents(communityId: string): Promise<EventEntity[]> {
    return this.findMany(communityId, {
      status: { $in: [EventStatus.DRAFT, EventStatus.ACTIVE] },
    }) as Promise<EventEntity[]>;
  }

  async incrementCollected(communityId: string, eventId: string, amountPaise: number): Promise<void> {
    await this.updateById(communityId, eventId, { $inc: { collectedAmount: amountPaise } });
  }

  async incrementSpent(communityId: string, eventId: string, amountPaise: number): Promise<void> {
    await this.updateById(communityId, eventId, { $inc: { spentAmount: amountPaise } });
  }
}
