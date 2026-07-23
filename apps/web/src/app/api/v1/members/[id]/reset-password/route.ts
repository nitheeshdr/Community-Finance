import { UserRole, resetPasswordSchema } from '@community-finance/shared';
import { getMemberService } from '@/server/config/container';
import { ok } from '@/server/lib/api-response';
import { parseBody, withApi } from '@/server/middleware/api-handler';

/** Admin resets a member's password (no SMS in this deployment). */
export const POST = withApi(
  {
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
    rateLimit: { keyPrefix: 'members:reset-password', limit: 20, windowSeconds: 15 * 60 },
  },
  async (req, ctx) => {
    const input = await parseBody(req, resetPasswordSchema);
    await getMemberService().resetPassword(
      ctx.auth.communityId,
      ctx.params.id!,
      input.newPassword,
      ctx.auth.role
    );
    return ok({ reset: true });
  }
);
