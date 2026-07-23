import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

/**
 * Financial corrections. Business rule: closed-period figures are never
 * edited or deleted — an adjustment entry records the delta with a reason,
 * and reports include adjustments in their totals.
 */
const adjustmentSchema = new Schema(
  {
    communityId: { type: Schema.Types.ObjectId, ref: 'Community', required: true, index: true },
    entity: { type: String, enum: ['INCOME', 'EXPENSE'], required: true },
    /** Paise, signed: positive increases the entity total. */
    amount: { type: Number, required: true },
    reason: { type: String, required: true, maxlength: 500 },
    targetId: { type: Schema.Types.ObjectId },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

adjustmentSchema.index({ communityId: 1, createdAt: -1 });

export type AdjustmentDoc = InferSchemaType<typeof adjustmentSchema>;

export const AdjustmentModel: Model<AdjustmentDoc> =
  (models.Adjustment as Model<AdjustmentDoc>) ??
  model<AdjustmentDoc>('Adjustment', adjustmentSchema);
