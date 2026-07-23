/** Auth security tests: login, rotation, theft detection, lockout. */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  CommunityType,
  UserRole,
  UserStatus,
} from '@community-finance/shared';
import { clearCollections, setupTestDb, teardownTestDb } from './helpers/db';
import { CommunityModel } from '@/server/models/community.model';
import { RefreshTokenModel } from '@/server/models/refresh-token.model';
import { UserModel } from '@/server/models/user.model';
import { RefreshTokenRepository } from '@/server/repositories/refresh-token.repository';
import { UserRepository } from '@/server/repositories/user.repository';
import { AuditService } from '@/server/services/audit.service';
import { AuthService } from '@/server/services/auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let communityId: string;

  beforeAll(async () => {
    await setupTestDb();
    service = new AuthService(
      new UserRepository(),
      new RefreshTokenRepository(),
      new AuditService()
    );
  });
  afterAll(teardownTestDb);

  beforeEach(async () => {
    await clearCollections();
    const community = await CommunityModel.create({
      name: 'Auth Test Village',
      type: CommunityType.VILLAGE,
    });
    communityId = String(community._id);

    const { hashPassword } = await import('@/server/lib/password');
    await UserModel.create({
      communityId,
      name: 'Test User',
      phone: '9876543210',
      passwordHash: await hashPassword('Secret@123'),
      role: UserRole.MEMBER,
      status: UserStatus.ACTIVE,
    });
  });

  it('logs in with valid credentials and issues a token pair', async () => {
    const result = await service.login('9876543210', 'Secret@123');
    expect(result.user.phone).toBe('9876543210');
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
  });

  it('rejects wrong passwords with a generic error', async () => {
    await expect(service.login('9876543210', 'wrong-pass1')).rejects.toThrow(
      'Invalid phone number or password'
    );
    // Unknown phone gets the SAME error — no user enumeration.
    await expect(service.login('9999999999', 'whatever1')).rejects.toThrow(
      'Invalid phone number or password'
    );
  });

  it('blocks suspended accounts', async () => {
    await UserModel.updateOne({ phone: '9876543210' }, { status: UserStatus.SUSPENDED });
    await expect(service.login('9876543210', 'Secret@123')).rejects.toThrow(/suspended/i);
  });

  it('rotates refresh tokens and detects reuse (theft)', async () => {
    const login = await service.login('9876543210', 'Secret@123');

    // First refresh: fine, returns a new token.
    const refreshed = await service.refresh(login.refreshToken);
    expect(refreshed.refreshToken).not.toBe(login.refreshToken);

    // Reusing the ORIGINAL (already rotated) token ⇒ theft ⇒ whole family dies.
    await expect(service.refresh(login.refreshToken)).rejects.toThrow(/security/i);

    // The rotated token is now also dead (family revoked).
    await expect(service.refresh(refreshed.refreshToken)).rejects.toThrow();
  });

  it('logout everywhere revokes all sessions', async () => {
    const a = await service.login('9876543210', 'Secret@123');
    await service.login('9876543210', 'Secret@123');

    const userId = a.user.id;
    const revoked = await service.logoutEverywhere(userId);
    expect(revoked).toBe(2);

    const live = await RefreshTokenModel.countDocuments({ userId, revokedAt: null });
    expect(live).toBe(0);
    await expect(service.refresh(a.refreshToken)).rejects.toThrow();
  });

  it('locks the account after repeated failures', async () => {
    for (let i = 0; i < 5; i++) {
      await expect(service.login('9876543210', 'bad-pass99')).rejects.toThrow();
    }
    // 6th attempt with the RIGHT password is still blocked by lockout.
    await expect(service.login('9876543210', 'Secret@123')).rejects.toThrow(/locked/i);
  });
});
