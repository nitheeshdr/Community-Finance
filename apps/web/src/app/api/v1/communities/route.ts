import {
  AuditAction,
  AuditEntity,
  UserRole,
  UserStatus,
  communityListQuerySchema,
  createCommunitySchema,
  type CommunityDto,
} from '@community-finance/shared';
import { CommunityModel } from '@/server/models/community.model';
import { FeeConfigModel } from '@/server/models/fee-config.model';
import { SettingsModel } from '@/server/models/settings.model';
import { UserModel } from '@/server/models/user.model';
import { getAuditService } from '@/server/config/container';
import { ConflictError } from '@/server/errors/app-error';
import { hashPassword } from '@/server/lib/password';
import { buildPaginationMeta, created, ok } from '@/server/lib/api-response';
import { parseBody, parseQuery, withApi } from '@/server/middleware/api-handler';
import { DEFAULTS, toPaise } from '@community-finance/shared';

/**
 * Cross-tenant community management (super admin). This is the ONLY
 * route family that intentionally operates across communities.
 */
export const GET = withApi({ roles: [UserRole.SUPER_ADMIN] }, async (req, ctx) => {
  const query = parseQuery(req, communityListQuerySchema);
  const filter: Record<string, unknown> = {};
  if (query.type) filter.type = query.type;
  if (query.status) filter.status = query.status;
  if (query.search) {
    filter.name = { $regex: query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  }

  const [items, total] = await Promise.all([
    CommunityModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),
    CommunityModel.countDocuments(filter),
  ]);

  const memberCounts = await UserModel.aggregate<{ _id: unknown; count: number }>([
    { $match: { deletedAt: null } },
    { $group: { _id: '$communityId', count: { $sum: 1 } } },
  ]);
  const countMap = new Map(memberCounts.map((m) => [String(m._id), m.count]));

  const dtos: CommunityDto[] = items.map((c) => ({
    id: String(c._id),
    name: c.name,
    type: c.type as CommunityDto['type'],
    status: c.status as CommunityDto['status'],
    description: c.description ?? undefined,
    address: c.address ?? undefined,
    logo: c.logo ?? undefined,
    memberCount: countMap.get(String(c._id)) ?? 0,
    createdAt: (c as { createdAt?: Date }).createdAt?.toISOString() ?? '',
  }));

  void ctx;
  return ok(dtos, buildPaginationMeta(query.page, query.limit, total));
});

/** Onboard a new community with its bootstrap super admin. */
export const POST = withApi({ roles: [UserRole.SUPER_ADMIN] }, async (req) => {
  const input = await parseBody(req, createCommunitySchema);

  const existing = await CommunityModel.findOne({ name: input.name }).lean();
  if (existing) throw new ConflictError('A community with this name already exists');

  const community = await CommunityModel.create({
    name: input.name,
    type: input.type,
    description: input.description,
    address: input.address,
    logo: input.logo,
  });

  await UserModel.create({
    communityId: community._id,
    name: input.adminName,
    phone: input.adminPhone,
    passwordHash: await hashPassword(input.adminPassword),
    role: UserRole.SUPER_ADMIN,
    status: UserStatus.ACTIVE,
    mustChangePassword: true,
  });
  await FeeConfigModel.create({
    communityId: community._id,
    amount: toPaise(DEFAULTS.MONTHLY_FEE),
    gracePeriodDays: DEFAULTS.GRACE_PERIOD_DAYS,
    dueDay: DEFAULTS.DUE_DAY_OF_MONTH,
    lateFee: 0,
  });
  await SettingsModel.create({ communityId: community._id });

  await getAuditService().record({
    action: AuditAction.CREATE,
    entity: AuditEntity.COMMUNITY,
    entityId: String(community._id),
    after: { name: community.name, type: community.type },
  });

  return created({
    id: String(community._id),
    name: community.name,
    type: community.type,
    status: community.status,
    createdAt: new Date().toISOString(),
  });
});
