import { UserRole, bulkCreateMembersSchema } from '@community-finance/shared';
import { getMemberService } from '@/server/config/container';
import { ok } from '@/server/lib/api-response';
import { parseBody, withApi } from '@/server/middleware/api-handler';

/**
 * Bulk CSV member import (admins). Per-row outcomes; generated passwords
 * are returned once and never stored in plain text.
 */
export const POST = withApi(
  {
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
    rateLimit: { keyPrefix: 'members:bulk', limit: 10, windowSeconds: 15 * 60 },
  },
  async (req, ctx) => {
    const input = await parseBody(req, bulkCreateMembersSchema);
    const results = await getMemberService().bulkCreate(
      ctx.auth.communityId,
      input.members,
      ctx.auth.sub
    );
    return ok({
      results,
      created: results.filter((r) => r.status === 'CREATED').length,
      failed: results.filter((r) => r.status === 'FAILED').length,
    });
  }
);
