import { z } from 'zod';
import { UserRole } from '@community-finance/shared';
import { getMaintenanceService } from '@/server/config/container';
import { CLEARABLE_SECTIONS } from '@/server/services/maintenance.service';
import { ok } from '@/server/lib/api-response';
import { parseBody, withApi } from '@/server/middleware/api-handler';

const bodySchema = z.object({
  section: z.enum(CLEARABLE_SECTIONS),
  /** Must equal the string CLEAR to proceed (guards accidental calls). */
  confirm: z.literal('CLEAR'),
});

/**
 * Danger zone — permanently delete a section's data for this community.
 * Super admin only. Audit logs and closed-period snapshots are never
 * touched (immutable by design).
 */
export const POST = withApi(
  {
    roles: [UserRole.SUPER_ADMIN],
    rateLimit: { keyPrefix: 'admin:clear', limit: 20, windowSeconds: 15 * 60 },
  },
  async (req, ctx) => {
    const { section } = await parseBody(req, bodySchema);
    const counts = await getMaintenanceService().clearSection(
      ctx.auth.communityId,
      section,
      ctx.auth.sub
    );
    const deleted = Object.values(counts).reduce((a, b) => a + b, 0);
    return ok({ section, deleted, counts });
  }
);
