import { z } from 'zod';
import { NotificationType } from '../enums';
import { objectIdSchema, paginationQuerySchema } from './common';

export const createAnnouncementSchema = z.object({
  type: z
    .enum([NotificationType.ANNOUNCEMENT, NotificationType.EMERGENCY])
    .default(NotificationType.ANNOUNCEMENT),
  title: z.string().trim().min(2).max(150),
  body: z.string().trim().min(2).max(2000),
  memberIds: z.array(objectIdSchema).max(500).optional(), // omit = broadcast to all
});

export const notificationListQuerySchema = paginationQuerySchema.extend({
  type: z.nativeEnum(NotificationType).optional(),
  unreadOnly: z.coerce.boolean().optional(),
});

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>;
