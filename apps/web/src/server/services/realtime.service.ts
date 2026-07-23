import Pusher from 'pusher';
import { REALTIME } from '@community-finance/shared';
import { getEnv } from '../config/env';
import { logger } from '../lib/logger';

/**
 * Real-time fan-out via Pusher Channels (Socket.IO cannot run on Vercel
 * serverless). Fails soft: realtime is an enhancement, never a dependency
 * of the business operation.
 */
export class RealtimeService {
  private client: Pusher | null | undefined;

  private getClient(): Pusher | null {
    if (this.client !== undefined) return this.client;
    const env = getEnv();
    if (!env.PUSHER_APP_ID || !env.PUSHER_KEY || !env.PUSHER_SECRET) {
      this.client = null; // not configured — no-op
      return this.client;
    }
    this.client = new Pusher({
      appId: env.PUSHER_APP_ID,
      key: env.PUSHER_KEY,
      secret: env.PUSHER_SECRET,
      cluster: env.PUSHER_CLUSTER,
      useTLS: true,
    });
    return this.client;
  }

  async publish(communityId: string, event: string, payload: unknown): Promise<void> {
    const client = this.getClient();
    if (!client) return;
    try {
      await client.trigger(REALTIME.communityChannel(communityId), event, payload);
    } catch (err) {
      logger.warn({ err, event }, 'Pusher publish failed');
    }
  }

  /** Auth endpoint support for private channels. */
  authorizeChannel(socketId: string, channel: string): { auth: string } | null {
    const client = this.getClient();
    if (!client) return null;
    return client.authorizeChannel(socketId, channel);
  }
}
