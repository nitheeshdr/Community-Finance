import { z } from 'zod';
import { getSearchService } from '@/server/config/container';
import { ok } from '@/server/lib/api-response';
import { parseQuery, withApi } from '@/server/middleware/api-handler';

const querySchema = z.object({ q: z.string().trim().min(2).max(100) });

/** Global search (⌘K). */
export const GET = withApi(
  { rateLimit: { keyPrefix: 'search', limit: 60, windowSeconds: 60 } },
  async (req, ctx) => {
    const { q } = parseQuery(req, querySchema);
    const results = await getSearchService().search(ctx.auth.communityId, q);
    return ok(results);
  }
);
