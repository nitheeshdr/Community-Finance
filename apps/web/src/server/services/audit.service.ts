import type { AuditAction, AuditEntity } from '@community-finance/shared';
import { UserRole } from '@community-finance/shared';
import { AuditLogModel } from '../models/audit-log.model';
import { getRequestContext } from '../lib/request-context';
import { logger } from '../lib/logger';

export interface AuditInput {
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  /** Override actor (e.g. webhook processing acts on behalf of the member). */
  actor?: { userId: string; userName: string; role: UserRole; communityId: string };
}

/** Strip volatile/sensitive fields from audit diffs. */
function sanitize(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  const clone: Record<string, unknown> = { ...(value as Record<string, unknown>) };
  for (const key of [
    'passwordHash',
    'password',
    'aadhaarEncrypted',
    'keySecretEncrypted',
    'webhookSecretEncrypted',
    'tokenHash',
    '__v',
  ]) {
    delete clone[key];
  }
  return clone;
}

/**
 * Writes append-only audit entries. Actor + device info come from the
 * request context (AsyncLocalStorage) unless explicitly overridden.
 * Audit failures never break the business operation — they are logged.
 */
export class AuditService {
  async record(input: AuditInput): Promise<void> {
    try {
      const ctx = getRequestContext();
      const actor = input.actor ?? {
        userId: ctx?.userId ?? '',
        userName: ctx?.userName ?? 'system',
        role: ctx?.role ?? UserRole.MEMBER,
        communityId: ctx?.communityId ?? '',
      };
      if (!actor.userId || !actor.communityId) {
        logger.warn({ input: input.action }, 'Audit entry skipped: no actor in context');
        return;
      }
      await AuditLogModel.create({
        communityId: actor.communityId,
        userId: actor.userId,
        userName: actor.userName,
        role: actor.role,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        before: sanitize(input.before),
        after: sanitize(input.after),
        ip: ctx?.ip,
        device: ctx?.device,
        browser: ctx?.browser,
        os: ctx?.os,
      });
    } catch (err) {
      logger.error({ err }, 'Failed to write audit log');
    }
  }
}
