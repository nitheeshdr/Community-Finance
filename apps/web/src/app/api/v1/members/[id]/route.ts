import { UserRole, updateMemberSchema } from '@community-finance/shared';
import { getMemberService } from '@/server/config/container';
import { noContent, ok } from '@/server/lib/api-response';
import { parseBody, withApi } from '@/server/middleware/api-handler';

const ADMIN_ROLES = [UserRole.SUPER_ADMIN, UserRole.ADMIN];

export const GET = withApi({}, async (_req, ctx) => {
  const member = await getMemberService().getById(ctx.auth.communityId, ctx.params.id!);
  return ok(member);
});

export const PATCH = withApi({ roles: ADMIN_ROLES }, async (req, ctx) => {
  const input = await parseBody(req, updateMemberSchema);
  const member = await getMemberService().update(
    ctx.auth.communityId,
    ctx.params.id!,
    input,
    ctx.auth.role
  );
  return ok(member);
});

export const DELETE = withApi({ roles: ADMIN_ROLES }, async (_req, ctx) => {
  await getMemberService().remove(ctx.auth.communityId, ctx.params.id!, ctx.auth.sub, ctx.auth.role);
  return noContent();
});
