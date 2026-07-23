import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { SubscriptionStatus } from '@community-finance/shared';

const razorpaySubscriptionSchema = new Schema(
  {
    communityId: { type: Schema.Types.ObjectId, ref: 'Community', required: true, index: true },
    memberId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    razorpaySubscriptionId: { type: String, required: true, unique: true },
    razorpayPlanId: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(SubscriptionStatus),
      required: true,
      default: SubscriptionStatus.CREATED,
    },
    /** Hosted authorization link for the member to approve AutoPay. */
    shortUrl: { type: String },
    nextChargeAt: { type: Date },
    cancelledAt: { type: Date },
    cancelReason: { type: String, maxlength: 500 },
  },
  { timestamps: true }
);

// One live subscription per member.
razorpaySubscriptionSchema.index(
  { communityId: 1, memberId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: {
        $in: [
          SubscriptionStatus.CREATED,
          SubscriptionStatus.AUTHENTICATED,
          SubscriptionStatus.ACTIVE,
          SubscriptionStatus.PAUSED,
        ],
      },
    },
  }
);

export type RazorpaySubscriptionDoc = InferSchemaType<typeof razorpaySubscriptionSchema>;

export const RazorpaySubscriptionModel: Model<RazorpaySubscriptionDoc> =
  (models.RazorpaySubscription as Model<RazorpaySubscriptionDoc>) ??
  model<RazorpaySubscriptionDoc>('RazorpaySubscription', razorpaySubscriptionSchema);
