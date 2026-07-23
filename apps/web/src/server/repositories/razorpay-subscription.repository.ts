import { Types } from 'mongoose';
import { SubscriptionStatus } from '@community-finance/shared';
import {
  RazorpaySubscriptionModel,
  type RazorpaySubscriptionDoc,
} from '../models/razorpay-subscription.model';
import { BaseRepository } from './base.repository';

export type RazorpaySubscriptionEntity = RazorpaySubscriptionDoc & {
  _id: Types.ObjectId;
  createdAt?: Date;
};

const LIVE_STATUSES = [
  SubscriptionStatus.CREATED,
  SubscriptionStatus.AUTHENTICATED,
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.PAUSED,
];

export class RazorpaySubscriptionRepository extends BaseRepository<RazorpaySubscriptionDoc> {
  constructor() {
    super(RazorpaySubscriptionModel);
  }

  async findLiveForMember(
    communityId: string,
    memberId: string
  ): Promise<RazorpaySubscriptionEntity | null> {
    return this.findOne(communityId, {
      memberId,
      status: { $in: LIVE_STATUSES },
    }) as Promise<RazorpaySubscriptionEntity | null>;
  }

  async findByRazorpayId(razorpaySubscriptionId: string): Promise<RazorpaySubscriptionEntity | null> {
    return RazorpaySubscriptionModel.findOne({
      razorpaySubscriptionId,
    }).lean<RazorpaySubscriptionEntity>();
  }
}
