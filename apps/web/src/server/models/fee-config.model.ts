import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

/**
 * Monthly subscription fee configuration. History is preserved — a new
 * document per change with `effectiveFrom`; the active config is the
 * latest whose effectiveFrom ≤ now.
 */
const feeConfigSchema = new Schema(
  {
    communityId: { type: Schema.Types.ObjectId, ref: 'Community', required: true, index: true },
    /** Paise. */
    amount: { type: Number, required: true, min: 0 },
    gracePeriodDays: { type: Number, required: true, default: 5, min: 0, max: 28 },
    dueDay: { type: Number, required: true, default: 1, min: 1, max: 28 },
    /** Paise. */
    lateFee: { type: Number, required: true, default: 0, min: 0 },
    effectiveFrom: { type: Date, required: true, default: () => new Date() },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

feeConfigSchema.index({ communityId: 1, effectiveFrom: -1 });

export type FeeConfigDoc = InferSchemaType<typeof feeConfigSchema>;

export const FeeConfigModel: Model<FeeConfigDoc> =
  (models.FeeConfig as Model<FeeConfigDoc>) ?? model<FeeConfigDoc>('FeeConfig', feeConfigSchema);
