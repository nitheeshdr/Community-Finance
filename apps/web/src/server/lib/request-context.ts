import { AsyncLocalStorage } from 'node:async_hooks';
import type { UserRole } from '@community-finance/shared';

/**
 * Per-request context propagated via AsyncLocalStorage so deep layers
 * (audit logging in particular) can access the actor and device info
 * without threading parameters through every call.
 */
export interface RequestContext {
  requestId: string;
  userId?: string;
  userName?: string;
  role?: UserRole;
  communityId?: string;
  ip?: string;
  userAgent?: string;
  device?: string;
  browser?: string;
  os?: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithContext<T>(ctx: RequestContext, fn: () => Promise<T>): Promise<T> {
  return storage.run(ctx, fn);
}

export function getRequestContext(): RequestContext | undefined {
  return storage.getStore();
}

/** Merge auth details into the current context after token verification. */
export function enrichContext(patch: Partial<RequestContext>): void {
  const ctx = storage.getStore();
  if (ctx) Object.assign(ctx, patch);
}
