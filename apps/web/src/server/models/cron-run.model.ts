import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

/**
 * Daily housekeeping claim ledger. A unique index on `day` guarantees
 * housekeeping runs at most once per day, no matter how many concurrent
 * requests (or cron + lazy triggers) race to start it.
 */
const cronRunSchema = new Schema(
  {
    /** YYYY-MM-DD */
    day: { type: String, required: true, unique: true },
    startedAt: { type: Date, default: () => new Date() },
    finishedAt: { type: Date },
    result: { type: Schema.Types.Mixed },
    error: { type: String },
  },
  { timestamps: true }
);

// Keep 90 days of history.
cronRunSchema.index({ startedAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export type CronRunDoc = InferSchemaType<typeof cronRunSchema>;

export const CronRunModel: Model<CronRunDoc> =
  (models.CronRun as Model<CronRunDoc>) ?? model<CronRunDoc>('CronRun', cronRunSchema);
