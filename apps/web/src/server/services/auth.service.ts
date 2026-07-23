import {
  AUTH,
  AuditAction,
  AuditEntity,
  UserStatus,
  type LoginResponseDto,
  type SessionDto,
} from '@community-finance/shared';
import type { UserRole } from '@community-finance/shared';
import { AuthError, ForbiddenError, ValidationError } from '../errors/app-error';
import { newTokenId, sha256 } from '../lib/crypto';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../lib/jwt';
import { logger } from '../lib/logger';
import { hashPassword, verifyPassword } from '../lib/password';
import { getRequestContext } from '../lib/request-context';
import type { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import type { UserRepository } from '../repositories/user.repository';
import { UserModel } from '../models/user.model';
import type { AuditService } from './audit.service';

const GENERIC_LOGIN_ERROR = 'Invalid phone number or password';

export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly audit: AuditService
  ) {}

  async login(phone: string, password: string): Promise<LoginResponseDto> {
    const user = await this.users.findForLogin(phone);
    // Uniform error whether the phone exists or not — no user enumeration.
    if (!user) throw new AuthError(GENERIC_LOGIN_ERROR);

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AuthError(
        'Account temporarily locked due to failed login attempts. Try again later.'
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      await this.registerFailedAttempt(String(user._id));
      throw new AuthError(GENERIC_LOGIN_ERROR);
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenError('Your account is suspended. Contact your community admin.');
    }
    if (user.status === UserStatus.INACTIVE) {
      throw new ForbiddenError('Your account is inactive. Contact your community admin.');
    }

    // Clear lockout state on success.
    await UserModel.updateOne({ _id: user._id }, { $unset: { lockedUntil: 1 } });

    const tokens = await this.issueTokenPair({
      userId: String(user._id),
      communityId: String(user.communityId),
      role: user.role as UserRole,
      name: user.name,
      family: newTokenId(),
    });

    await this.audit.record({
      action: AuditAction.LOGIN,
      entity: AuditEntity.SESSION,
      actor: {
        userId: String(user._id),
        userName: user.name,
        role: user.role as UserRole,
        communityId: String(user.communityId),
      },
    });

    return {
      user: {
        id: String(user._id),
        communityId: String(user.communityId),
        name: user.name,
        phone: user.phone,
        role: user.role as LoginResponseDto['user']['role'],
        status: user.status as LoginResponseDto['user']['status'],
        profileImage: user.profileImage ?? undefined,
        mustChangePassword: user.mustChangePassword ?? false,
      },
      ...tokens,
    };
  }

  /**
   * Rotate a refresh token. Reuse of an already-rotated token is treated
   * as theft: the whole family is revoked and the caller must re-login.
   */
  async refresh(rawToken: string): Promise<Omit<LoginResponseDto, 'user'> & { user: LoginResponseDto['user'] }> {
    const payload = verifyRefreshToken(rawToken);
    const stored = await this.refreshTokens.findByHash(sha256(rawToken));

    if (!stored || stored.revokedAt) {
      throw new AuthError('Session expired. Please log in again.');
    }
    if (stored.usedAt) {
      // Token reuse ⇒ likely theft ⇒ nuke the family.
      logger.warn({ family: stored.family, userId: payload.sub }, 'Refresh token reuse detected');
      await this.refreshTokens.revokeFamily(stored.family);
      throw new AuthError('Session invalidated for security reasons. Please log in again.');
    }
    if (stored.expiresAt < new Date()) {
      throw new AuthError('Session expired. Please log in again.');
    }

    const user = await this.users.findByIdWithPassword(
      String(stored.communityId),
      String(stored.userId)
    );
    if (!user || user.status !== UserStatus.ACTIVE) {
      await this.refreshTokens.revokeFamily(stored.family);
      throw new AuthError('Account is no longer active.');
    }

    await this.refreshTokens.markUsed(stored._id);

    const tokens = await this.issueTokenPair({
      userId: String(user._id),
      communityId: String(user.communityId),
      role: user.role as UserRole,
      name: user.name,
      family: stored.family,
    });

    return {
      user: {
        id: String(user._id),
        communityId: String(user.communityId),
        name: user.name,
        phone: user.phone,
        role: user.role as LoginResponseDto['user']['role'],
        status: user.status as LoginResponseDto['user']['status'],
        profileImage: user.profileImage ?? undefined,
        mustChangePassword: user.mustChangePassword ?? false,
      },
      ...tokens,
    };
  }

  async logout(rawToken: string | null): Promise<void> {
    if (!rawToken) return;
    const stored = await this.refreshTokens.findByHash(sha256(rawToken));
    if (stored) {
      await this.refreshTokens.revokeFamily(stored.family);
      await this.audit.record({
        action: AuditAction.LOGOUT,
        entity: AuditEntity.SESSION,
      });
    }
  }

  async logoutEverywhere(userId: string): Promise<number> {
    const revoked = await this.refreshTokens.revokeAllForUser(userId);
    await this.audit.record({
      action: AuditAction.LOGOUT_ALL,
      entity: AuditEntity.SESSION,
      after: { revokedSessions: revoked },
    });
    return revoked;
  }

  async listSessions(userId: string, currentRawToken: string | null): Promise<SessionDto[]> {
    const currentHash = currentRawToken ? sha256(currentRawToken) : null;
    const sessions = await this.refreshTokens.listActiveSessions(userId);
    return sessions.map((s) => ({
      id: String(s._id),
      device: s.deviceInfo?.device ?? 'Unknown',
      browser: s.deviceInfo?.browser ?? 'Unknown',
      os: s.deviceInfo?.os ?? 'Unknown',
      ip: s.deviceInfo?.ip ?? '',
      lastUsedAt: s.lastUsedAt?.toISOString() ?? '',
      createdAt: (s as { createdAt?: Date }).createdAt?.toISOString() ?? '',
      current: currentHash !== null && s.tokenHash === currentHash,
    }));
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const ok = await this.refreshTokens.revokeSession(userId, sessionId);
    if (!ok) throw new ValidationError('Session not found');
    await this.audit.record({
      action: AuditAction.LOGOUT,
      entity: AuditEntity.SESSION,
      entityId: sessionId,
    });
  }

  async changePassword(
    communityId: string,
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await this.users.findByIdWithPassword(communityId, userId);
    if (!user) throw new AuthError();
    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) throw new ValidationError('Current password is incorrect');

    await UserModel.updateOne(
      { _id: userId },
      { passwordHash: await hashPassword(newPassword), mustChangePassword: false }
    );
    // Changing the password invalidates every other session.
    await this.refreshTokens.revokeAllForUser(userId);
    await this.audit.record({
      action: AuditAction.PASSWORD_RESET,
      entity: AuditEntity.USER,
      entityId: userId,
    });
  }

  /* ---------------------------------------------------------------- */

  private async issueTokenPair(input: {
    userId: string;
    communityId: string;
    role: UserRole;
    name: string;
    family: string;
  }) {
    const jti = newTokenId();
    const accessToken = signAccessToken({
      sub: input.userId,
      communityId: input.communityId,
      role: input.role,
      name: input.name,
    });
    const refreshToken = signRefreshToken({ sub: input.userId, family: input.family, jti });

    const ctx = getRequestContext();
    await this.refreshTokens.create({
      userId: input.userId,
      communityId: input.communityId,
      tokenHash: sha256(refreshToken),
      family: input.family,
      jti,
      expiresAt: new Date(Date.now() + AUTH.REFRESH_TOKEN_TTL_SECONDS * 1000),
      deviceInfo: {
        ip: ctx?.ip,
        userAgent: ctx?.userAgent,
        device: ctx?.device,
        browser: ctx?.browser,
        os: ctx?.os,
      },
    } as never);

    return {
      accessToken,
      refreshToken,
      expiresIn: AUTH.ACCESS_TOKEN_TTL_SECONDS,
    };
  }

  private async registerFailedAttempt(userId: string): Promise<void> {
    // Track attempts via a rolling counter on the user document.
    const user = await UserModel.findOneAndUpdate(
      { _id: userId },
      { $inc: { failedLoginAttempts: 1 } },
      { new: true, strict: false }
    ).lean<{ failedLoginAttempts?: number }>();
    const attempts = user?.failedLoginAttempts ?? 0;
    if (attempts >= AUTH.MAX_LOGIN_ATTEMPTS) {
      await UserModel.updateOne(
        { _id: userId },
        {
          $set: {
            lockedUntil: new Date(Date.now() + AUTH.LOCKOUT_MINUTES * 60_000),
            failedLoginAttempts: 0,
          },
        },
        { strict: false }
      );
    }
  }
}
