import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

/**
 * Processed webhook registry — guarantees idempotency. Razorpay retries
 * webhooks aggressively; inserting the event id with a unique index makes
 * duplicate processing impossible.
 */
const webhookEventSchema = new Schema(
  {
    provider: { type: String, required: true, default: 'razorpay' },
    eventId: { type: String, required: true },
    eventType: { type: String, required: true },
    payload: { type: Schema.Types.Mixed },
    processedAt: { type: Date, default: () => new Date() },
    status: { type: String, enum: ['PROCESSED', 'FAILED', 'SKIPPED'], default: 'PROCESSED' },
    error: { type: String },
  },
  { timestamps: true }
);

webhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });

export type WebhookEventDoc = InferSchemaType<typeof webhookEventSchema>;

export const WebhookEventModel: Model<WebhookEventDoc> =
  (models.WebhookEvent as Model<WebhookEventDoc>) ??
  model<WebhookEventDoc>('WebhookEvent', webhookEventSchema);
