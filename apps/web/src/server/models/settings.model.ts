import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { DEFAULTS } from '@community-finance/shared';

const settingsSchema = new Schema(
  {
    communityId: {
      type: Schema.Types.ObjectId,
      ref: 'Community',
      required: true,
      unique: true,
    },
    expenseCategories: {
      type: [String],
      default: () => [...DEFAULTS.EXPENSE_CATEGORIES],
    },
    /** Paise. */
    billMandatoryThreshold: {
      type: Number,
      default: DEFAULTS.BILL_MANDATORY_THRESHOLD * 100,
    },
    notificationPrefs: {
      paymentReminders: { type: Boolean, default: true },
      paymentUpdates: { type: Boolean, default: true },
      eventUpdates: { type: Boolean, default: true },
      reports: { type: Boolean, default: true },
      announcements: { type: Boolean, default: true },
    },
    /** AES-256-GCM encrypted per-community Razorpay credentials. */
    razorpay: {
      keyId: { type: String },
      keySecretEncrypted: { type: String, select: false },
      webhookSecretEncrypted: { type: String, select: false },
      configured: { type: Boolean, default: false },
    },
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
    language: { type: String, enum: ['en', 'ta', 'hi'], default: 'en' },
  },
  { timestamps: true }
);

export type SettingsDoc = InferSchemaType<typeof settingsSchema>;

export const SettingsModel: Model<SettingsDoc> =
  (models.Settings as Model<SettingsDoc>) ?? model<SettingsDoc>('Settings', settingsSchema);
