import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { EventCategory, EventFundingMode, EventStatus } from '@community-finance/shared';

const eventSchema = new Schema(
  {
    communityId: { type: Schema.Types.ObjectId, ref: 'Community', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, maxlength: 2000 },
    category: {
      type: String,
      enum: Object.values(EventCategory),
      default: EventCategory.OTHER,
    },
    status: {
      type: String,
      enum: Object.values(EventStatus),
      required: true,
      default: EventStatus.DRAFT,
    },
    date: { type: Date, required: true },
    endDate: { type: Date },
    /** Paise. */
    budget: { type: Number, required: true, min: 0 },
    /** BALANCE = funded from community balance; SPLIT = member shares. */
    fundingMode: {
      type: String,
      enum: Object.values(EventFundingMode),
      default: EventFundingMode.SPLIT,
    },
    /** SPLIT mode participant scope; empty = all active members. */
    participantIds: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },
    /** Paise — denormalized from the latest split calculation. */
    perHeadAmount: { type: Number, default: 0 },
    /** Paise — denormalized running totals, updated transactionally. */
    collectedAmount: { type: Number, default: 0 },
    spentAmount: { type: Number, default: 0 },
    organizerId: { type: Schema.Types.ObjectId, ref: 'User' },
    images: { type: [String], default: [] },
    budgetOverride: { type: Boolean, default: false },
    closedAt: { type: Date },
    closedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

eventSchema.index({ communityId: 1, status: 1, date: -1 });
eventSchema.index({ communityId: 1, name: 'text' });

export type EventDoc = InferSchemaType<typeof eventSchema>;

export const EventModel: Model<EventDoc> =
  (models.Event as Model<EventDoc>) ?? model<EventDoc>('Event', eventSchema);
