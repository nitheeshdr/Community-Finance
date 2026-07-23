import { z } from 'zod';
import { Types } from 'mongoose';
import {
  AuditAction,
  AuditEntity,
  UserRole,
  paginationQuerySchema,
  type AuditLogDto,
} from '@community-finance/shared';
import { AuditLogModel } from '@/server/models/audit-log.model';
import { buildPaginationMeta, ok } from '@/server/lib/api-response';
import { parseQuery, withApi } from '@/server/middleware/api-handler';

const querySchema = paginationQuerySchema.extend({
  action: z.nativeEnum(AuditAction).optional(),
  entity: z.nativeEnum(AuditEntity).optional(),
  userId: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

/** Read-only audit trail (admins). The model itself blocks mutation. */
export const GET = withApi(
  { roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
  async (req, ctx) => {
    const query = parseQuery(req, querySchema);
    const filter: Record<string, unknown> = {
      communityId: new Types.ObjectId(ctx.auth.communityId),
    };
    if (query.action) filter.action = query.action;
    if (query.entity) filter.entity = query.entity;
    if (query.userId && Types.ObjectId.isValid(query.userId)) filter.userId = query.userId;
    if (query.from || query.to) {
      filter.createdAt = {
        ...(query.from ? { $gte: query.from } : {}),
        ...(query.to ? { $lte: query.to } : {}),
      };
    }

    const [items, total] = await Promise.all([
      AuditLogModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean(),
      AuditLogModel.countDocuments(filter),
    ]);

    const dtos: AuditLogDto[] = items.map((log) => ({
      id: String(log._id),
      userId: String(log.userId),
      userName: log.userName,
      role: log.role as AuditLogDto['role'],
      action: log.action as AuditLogDto['action'],
      entity: log.entity as AuditLogDto['entity'],
      entityId: log.entityId ? String(log.entityId) : undefined,
      before: log.before,
      after: log.after,
      ip: log.ip ?? undefined,
      device: log.device ?? undefined,
      browser: log.browser ?? undefined,
      os: log.os ?? undefined,
      createdAt: (log as { createdAt?: Date }).createdAt?.toISOString() ?? '',
    }));

    return ok(dtos, buildPaginationMeta(query.page, query.limit, total));
  }
);
