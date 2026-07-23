import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { PaymentStatus } from '@community-finance/shared';

/**
 * Per-member share of an event budget. Recomputed by BudgetSplitService
 * whenever the active member set or the budget changes; `paidAmount`
 * always survives recalculation.
 */
const eventSplitSchema = new Schema(
  {
    communityId: { type: Schema.Types.ObjectId, ref: 'Community', required: true, index: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    memberId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    /** Paise. */
    splitAmount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, required: true, default: 0, min: 0 },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      required: true,
      default: PaymentStatus.PENDING,
    },
    /** Member left the active pool after paying; retained for reconciliation. */
    inactive: { type: Boolean, default: false },
  },
  { timestamps: true }
);

eventSplitSchema.index({ eventId: 1, memberId: 1 }, { unique: true });
eventSplitSchema.index({ communityId: 1, memberId: 1 });
eventSplitSchema.index({ eventId: 1, status: 1 });

export type EventSplitDoc = InferSchemaType<typeof eventSplitSchema>;

export const EventSplitModel: Model<EventSplitDoc> =
  (models.EventSplit as Model<EventSplitDoc>) ??
  model<EventSplitDoc>('EventSplit', eventSplitSchema);

/** Immutable log of every recalculation for transparency ("split history"). */
const eventSplitHistorySchema = new Schema(
  {
    communityId: { type: Schema.Types.ObjectId, ref: 'Community', required: true, index: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    budget: { type: Number, required: true },
    activeMemberCount: { type: Number, required: true },
    perHeadAmount: { type: Number, required: true },
    trigger: { type: String, required: true, maxlength: 200 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export type EventSplitHistoryDoc = InferSchemaType<typeof eventSplitHistorySchema>;

export const EventSplitHistoryModel: Model<EventSplitHistoryDoc> =
  (models.EventSplitHistory as Model<EventSplitHistoryDoc>) ??
  model<EventSplitHistoryDoc>('EventSplitHistory', eventSplitHistorySchema);
