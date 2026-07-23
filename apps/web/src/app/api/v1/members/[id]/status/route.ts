import { UserRole, changeMemberStatusSchema } from '@community-finance/shared';
import { getMemberService } from '@/server/config/container';
import { ok } from '@/server/lib/api-response';
import { parseBody, withApi } from '@/server/middleware/api-handler';

/** Activate / deactivate / suspend a member. Triggers budget-split recalc. */
export const POST = withApi(
  { roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
  async (req, ctx) => {
    const input = await parseBody(req, changeMemberStatusSchema);
    const member = await getMemberService().changeStatus(
      ctx.auth.communityId,
      ctx.params.id!,
      input,
      ctx.auth.sub,
      ctx.auth.role
    );
    return ok(member);
  }
);
