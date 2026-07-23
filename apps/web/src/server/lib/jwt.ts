import jwt, { type SignOptions } from 'jsonwebtoken';
import { AUTH, type UserRole } from '@community-finance/shared';
import { getEnv } from '../config/env';
import { AuthError } from '../errors/app-error';

/** Claims embedded in every access token. Tenant scoping flows from here. */
export interface AccessTokenPayload {
  sub: string; // userId
  communityId: string;
  role: UserRole;
  name: string;
}

/** Refresh tokens carry rotation lineage for theft detection. */
export interface RefreshTokenPayload {
  sub: string;
  family: string; // rotation family id
  jti: string; // unique token id — hashed copy stored in DB
}

const signOpts: SignOptions = { algorithm: 'HS256' };

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, getEnv().JWT_ACCESS_SECRET, {
    ...signOpts,
    expiresIn: AUTH.ACCESS_TOKEN_TTL_SECONDS,
  });
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, getEnv().JWT_REFRESH_SECRET, {
    ...signOpts,
    expiresIn: AUTH.REFRESH_TOKEN_TTL_SECONDS,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    return jwt.verify(token, getEnv().JWT_ACCESS_SECRET, {
      algorithms: ['HS256'],
    }) as AccessTokenPayload;
  } catch {
    throw new AuthError('Invalid or expired access token');
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    return jwt.verify(token, getEnv().JWT_REFRESH_SECRET, {
      algorithms: ['HS256'],
    }) as RefreshTokenPayload;
  } catch {
    throw new AuthError('Invalid or expired refresh token');
  }
}
