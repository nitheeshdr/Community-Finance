import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

const rateLimitEntrySchema = new Schema(
  {
    key: { type: String, required: true },
    windowStart: { type: Date, required: true },
    count: { type: Number, required: true, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: false, versionKey: false }
);

rateLimitEntrySchema.index({ key: 1, windowStart: 1 }, { unique: true });
rateLimitEntrySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type RateLimitEntryDoc = InferSchemaType<typeof rateLimitEntrySchema>;

export const RateLimitEntryModel: Model<RateLimitEntryDoc> =
  (models.RateLimitEntry as Model<RateLimitEntryDoc>) ??
  model<RateLimitEntryDoc>('RateLimitEntry', rateLimitEntrySchema);
