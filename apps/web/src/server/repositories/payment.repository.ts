import { Types } from 'mongoose';
import { PaymentStatus, PaymentType } from '@community-finance/shared';
import { PaymentModel, type PaymentDoc } from '../models/payment.model';
import { BaseRepository } from './base.repository';

export type PaymentEntity = PaymentDoc & {
  _id: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};

export class PaymentRepository extends BaseRepository<PaymentDoc> {
  constructor() {
    super(PaymentModel);
  }

  async findByRazorpayPaymentId(paymentId: string): Promise<PaymentEntity | null> {
    return PaymentModel.findOne({ razorpayPaymentId: paymentId }).lean<PaymentEntity>();
  }

  async findByRazorpayLinkId(linkId: string): Promise<PaymentEntity | null> {
    return PaymentModel.findOne({ razorpayLinkId: linkId }).lean<PaymentEntity>();
  }

  /** Subscription payment row for member+period, any live status. */
  async findSubscriptionPayment(
    communityId: string,
    memberId: string,
    period: string
  ): Promise<PaymentEntity | null> {
    return this.findOne(communityId, {
      memberId,
      type: PaymentType.SUBSCRIPTION,
      period,
      status: { $in: [PaymentStatus.PAID, PaymentStatus.PENDING, PaymentStatus.OVERDUE] },
    }) as Promise<PaymentEntity | null>;
  }

  async sumPaidForEvent(communityId: string, eventId: string): Promise<number> {
    const rows = await this.aggregate<{ total: number }>(communityId, [
      {
        $match: {
          eventId: new Types.ObjectId(eventId),
          status: PaymentStatus.PAID,
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    return rows[0]?.total ?? 0;
  }
}
