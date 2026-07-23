import { getUserRepository } from '@/server/config/container';
import { AuthError } from '@/server/errors/app-error';
import { ok } from '@/server/lib/api-response';
import { withApi } from '@/server/middleware/api-handler';

/** Current authenticated user profile. */
export const GET = withApi({}, async (_req, ctx) => {
  const user = await getUserRepository().findById(ctx.auth.communityId, ctx.auth.sub);
  if (!user) throw new AuthError('Account not found');
  const u = user as typeof user & { _id: unknown; mustChangePassword?: boolean };
  return ok({
    id: String(u._id),
    communityId: String(u.communityId),
    name: u.name,
    phone: u.phone,
    role: u.role,
    status: u.status,
    profileImage: u.profileImage ?? undefined,
    mustChangePassword: u.mustChangePassword ?? false,
  });
});
