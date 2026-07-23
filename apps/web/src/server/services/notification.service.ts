import { Types } from 'mongoose';
import {
  NotificationType,
  REALTIME,
  type NotificationDto,
  type NotificationListQuery,
} from '@community-finance/shared';
import { NotificationModel, type NotificationDoc } from '../models/notification.model';
import { SettingsModel } from '../models/settings.model';
import type { RealtimeService } from './realtime.service';

type NotificationEntity = NotificationDoc & { _id: Types.ObjectId; createdAt?: Date };

/** Which settings toggle gates each notification type. */
const PREF_KEY: Partial<Record<NotificationType, string>> = {
  [NotificationType.PAYMENT_REMINDER]: 'paymentReminders',
  [NotificationType.PAYMENT_SUCCESS]: 'paymentUpdates',
  [NotificationType.PAYMENT_FAILED]: 'paymentUpdates',
  [NotificationType.EVENT_CREATED]: 'eventUpdates',
  [NotificationType.EVENT_UPDATED]: 'eventUpdates',
  [NotificationType.BUDGET_UPDATED]: 'eventUpdates',
  [NotificationType.REPORT_READY]: 'reports',
  [NotificationType.ANNOUNCEMENT]: 'announcements',
};

export class NotificationService {
  constructor(private readonly realtime: RealtimeService) {}

  /**
   * Persist a notification and fan out over the community's realtime
   * channel. `recipientIds` empty/undefined ⇒ broadcast.
   */
  async send(input: {
    communityId: string;
    type: NotificationType;
    title: string;
    body: string;
    recipientIds?: string[];
    data?: Record<string, unknown>;
    createdBy?: string;
  }): Promise<void> {
    // Respect community notification preferences (emergency always sends).
    if (input.type !== NotificationType.EMERGENCY) {
      const prefKey = PREF_KEY[input.type];
      if (prefKey) {
        const settings = await SettingsModel.findOne({ communityId: input.communityId })
          .select('notificationPrefs')
          .lean();
        const prefs = settings?.notificationPrefs as Record<string, boolean> | undefined;
        if (prefs && prefs[prefKey] === false) return;
      }
    }

    await NotificationModel.create({
      communityId: input.communityId,
      type: input.type,
      title: input.title,
      body: input.body,
      recipientIds: input.recipientIds?.length ? input.recipientIds : null,
      data: input.data,
      createdBy: input.createdBy,
    });

    await this.realtime.publish(input.communityId, REALTIME.EVENTS.NOTIFICATION, {
      type: input.type,
      title: input.title,
      body: input.body,
    });
  }

  async listForUser(
    communityId: string,
    userId: string,
    query: NotificationListQuery
  ): Promise<{ items: NotificationDto[]; total: number }> {
    const filter: Record<string, unknown> = {
      communityId: new Types.ObjectId(communityId),
      $or: [{ recipientIds: null }, { recipientIds: new Types.ObjectId(userId) }],
    };
    if (query.type) filter.type = query.type;
    if (query.unreadOnly) filter.readBy = { $ne: new Types.ObjectId(userId) };

    const [items, total] = await Promise.all([
      NotificationModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean<NotificationEntity[]>(),
      NotificationModel.countDocuments(filter),
    ]);

    return {
      items: items.map((n) => ({
        id: String(n._id),
        type: n.type as NotificationType,
        title: n.title,
        body: n.body,
        read: (n.readBy ?? []).some((id) => String(id) === userId),
        createdAt: n.createdAt?.toISOString() ?? '',
      })),
      total,
    };
  }

  async markRead(communityId: string, userId: string, notificationId: string): Promise<void> {
    await NotificationModel.updateOne(
      { _id: notificationId, communityId },
      { $addToSet: { readBy: new Types.ObjectId(userId) } }
    );
  }

  async markAllRead(communityId: string, userId: string): Promise<void> {
    await NotificationModel.updateMany(
      {
        communityId: new Types.ObjectId(communityId),
        $or: [{ recipientIds: null }, { recipientIds: new Types.ObjectId(userId) }],
        readBy: { $ne: new Types.ObjectId(userId) },
      },
      { $addToSet: { readBy: new Types.ObjectId(userId) } }
    );
  }

  async unreadCount(communityId: string, userId: string): Promise<number> {
    return NotificationModel.countDocuments({
      communityId: new Types.ObjectId(communityId),
      $or: [{ recipientIds: null }, { recipientIds: new Types.ObjectId(userId) }],
      readBy: { $ne: new Types.ObjectId(userId) },
    });
  }
}
