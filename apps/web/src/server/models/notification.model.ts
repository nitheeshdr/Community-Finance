import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { NotificationType } from '@community-finance/shared';

const notificationSchema = new Schema(
  {
    communityId: { type: Schema.Types.ObjectId, ref: 'Community', required: true, index: true },
    type: { type: String, enum: Object.values(NotificationType), required: true },
    title: { type: String, required: true, maxlength: 150 },
    body: { type: String, required: true, maxlength: 2000 },
    /** null ⇒ broadcast to the whole community. */
    recipientIds: { type: [Schema.Types.ObjectId], default: null },
    readBy: { type: [Schema.Types.ObjectId], default: [] },
    /** Optional deep-link payload for clients. */
    data: { type: Schema.Types.Mixed },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

notificationSchema.index({ communityId: 1, createdAt: -1 });
notificationSchema.index({ communityId: 1, recipientIds: 1, createdAt: -1 });

export type NotificationDoc = InferSchemaType<typeof notificationSchema>;

export const NotificationModel: Model<NotificationDoc> =
  (models.Notification as Model<NotificationDoc>) ??
  model<NotificationDoc>('Notification', notificationSchema);
