import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { IncomeSource, PaymentMethod } from '@community-finance/shared';

const incomeSchema = new Schema(
  {
    communityId: { type: Schema.Types.ObjectId, ref: 'Community', required: true, index: true },
    source: { type: String, enum: Object.values(IncomeSource), required: true },
    /** Paise. */
    amount: { type: Number, required: true, min: 0 },
    method: {
      type: String,
      enum: Object.values(PaymentMethod),
      default: PaymentMethod.CASH,
    },
    donorName: { type: String, maxlength: 150 },
    sponsorName: { type: String, maxlength: 150 },
    description: { type: String, maxlength: 1000 },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event' },
    /** Present when this income row was produced by a member payment. */
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment' },
    receivedAt: { type: Date, default: () => new Date() },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

incomeSchema.index({ communityId: 1, source: 1, receivedAt: -1 });
incomeSchema.index({ communityId: 1, eventId: 1 });
incomeSchema.index({ paymentId: 1 }, { sparse: true });

export type IncomeDoc = InferSchemaType<typeof incomeSchema>;

export const IncomeModel: Model<IncomeDoc> =
  (models.Income as Model<IncomeDoc>) ?? model<IncomeDoc>('Income', incomeSchema);
