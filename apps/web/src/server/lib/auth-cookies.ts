import type { NextRequest, NextResponse } from 'next/server';
import { AUTH } from '@community-finance/shared';
import { isProduction } from '../config/env';

/**
 * Web clients receive the refresh token as an httpOnly cookie scoped to
 * the refresh endpoint; mobile clients read it from the JSON body and
 * store it in secure storage. Both flows share the same API.
 */
export function setRefreshCookie(res: NextResponse, token: string): void {
  res.cookies.set(AUTH.REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'strict',
    path: '/api/v1/auth',
    maxAge: AUTH.REFRESH_TOKEN_TTL_SECONDS,
  });
}

export function clearRefreshCookie(res: NextResponse): void {
  res.cookies.set(AUTH.REFRESH_COOKIE_NAME, '', {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'strict',
    path: '/api/v1/auth',
    maxAge: 0,
  });
}

/** Refresh token from cookie (web) or body (mobile). */
export async function extractRefreshToken(req: NextRequest): Promise<string | null> {
  const cookie = req.cookies.get(AUTH.REFRESH_COOKIE_NAME)?.value;
  if (cookie) return cookie;
  try {
    const body = (await req.json()) as { refreshToken?: string };
    return body.refreshToken ?? null;
  } catch {
    return null;
  }
}
