import { REALTIME } from '@community-finance/shared';
import { getRealtimeService } from '@/server/config/container';
import { ForbiddenError } from '@/server/errors/app-error';
import { fail, ok } from '@/server/lib/api-response';
import { withApi } from '@/server/middleware/api-handler';

/**
 * Pusher private-channel authorization. A user may only subscribe to
 * their own community's channel — tenant isolation extends to realtime.
 */
export const POST = withApi({}, async (req, ctx) => {
  const body = await req.formData();
  const socketId = String(body.get('socket_id') ?? '');
  const channel = String(body.get('channel_name') ?? '');

  if (channel !== REALTIME.communityChannel(ctx.auth.communityId)) {
    throw new ForbiddenError('You cannot subscribe to this channel');
  }

  const auth = getRealtimeService().authorizeChannel(socketId, channel);
  if (!auth) {
    return fail('REALTIME_DISABLED', 'Realtime is not configured', 503);
  }
  return ok(auth);
});
