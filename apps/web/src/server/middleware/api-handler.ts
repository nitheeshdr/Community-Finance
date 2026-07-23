import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { UAParser } from 'ua-parser-js';
import type { UserRole } from '@community-finance/shared';
import { connectDb } from '../config/db';
import { AppError, AuthError, ForbiddenError, RateLimitError } from '../errors/app-error';
import { fail } from '../lib/api-response';
import { type AccessTokenPayload, verifyAccessToken } from '../lib/jwt';
import { logger } from '../lib/logger';
import { enrichContext, runWithContext } from '../lib/request-context';
import { newTokenId } from '../lib/crypto';
import { consumeRateLimit } from './rate-limit';

export interface RouteContext {
  params: Promise<Record<string, string>>;
}

export interface ApiContext {
  params: Record<string, string>;
  /** Present when the route requires auth (or auth succeeded on optional). */
  auth: AccessTokenPayload;
  ip: string;
  userAgent: string;
}

export interface PublicApiContext extends Omit<ApiContext, 'auth'> {
  auth: AccessTokenPayload | null;
}

interface WithApiOptions {
  /** Require a valid access token. Defaults to true. */
  auth?: boolean;
  /** Restrict to these roles (implies auth). */
  roles?: UserRole[];
  /** Fixed-window rate limit for this route. */
  rateLimit?: { limit: number; windowSeconds: number; keyPrefix: string };
}

type Handler<C> = (req: NextRequest, ctx: C) => Promise<NextResponse>;

export function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

function parseDevice(userAgent: string) {
  const ua = UAParser(userAgent);
  return {
    device: ua.device.model ?? ua.device.type ?? 'Desktop',
    browser: [ua.browser.name, ua.browser.version].filter(Boolean).join(' ') || 'Unknown',
    os: [ua.os.name, ua.os.version].filter(Boolean).join(' ') || 'Unknown',
  };
}

function extractBearer(req: NextRequest): string | null {
  const header = req.headers.get('authorization');
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return null;
}

function errorToResponse(err: unknown, requestId: string): NextResponse {
  if (err instanceof ZodError) {
    return fail('VALIDATION_ERROR', 'Invalid request data', 400, err.flatten());
  }
  if (err instanceof RateLimitError) {
    return fail(err.code, err.message, err.statusCode, undefined, {
      'Retry-After': String(err.retryAfterSeconds),
    });
  }
  if (err instanceof AppError) {
    return fail(err.code, err.message, err.statusCode, err.details);
  }
  // Unknown error: log full details, return sanitized message.
  logger.error({ err, requestId }, 'Unhandled API error');
  return fail('INTERNAL_ERROR', 'Something went wrong. Please try again.', 500, { requestId });
}

/**
 * Route factory: wraps a handler with DB connection, request context,
 * authentication, role checks, rate limiting, and global error handling.
 *
 * Overload 1 (default, auth required): handler receives `ApiContext` with a
 * non-null `auth`. Overload 2 (`auth: false`): handler receives
 * `PublicApiContext`.
 */
export function withApi(
  options: WithApiOptions & { auth: false },
  handler: Handler<PublicApiContext>
): (req: NextRequest, ctx: RouteContext) => Promise<NextResponse>;
export function withApi(
  options: WithApiOptions,
  handler: Handler<ApiContext>
): (req: NextRequest, ctx: RouteContext) => Promise<NextResponse>;
export function withApi(
  options: WithApiOptions,
  handler: Handler<never>
): (req: NextRequest, ctx: RouteContext) => Promise<NextResponse> {
  const requireAuth = options.auth !== false || (options.roles?.length ?? 0) > 0;

  return async (req: NextRequest, routeCtx: RouteContext): Promise<NextResponse> => {
    const requestId = newTokenId();
    const ip = getClientIp(req);
    const userAgent = req.headers.get('user-agent') ?? '';
    const deviceInfo = parseDevice(userAgent);

    return runWithContext(
      { requestId, ip, userAgent, ...deviceInfo },
      async () => {
        try {
          await connectDb();

          if (options.rateLimit) {
            await consumeRateLimit(
              `${options.rateLimit.keyPrefix}:${ip}`,
              options.rateLimit.limit,
              options.rateLimit.windowSeconds
            );
          }

          let auth: AccessTokenPayload | null = null;
          const token = extractBearer(req);
          if (token) {
            auth = verifyAccessToken(token);
          }
          if (requireAuth && !auth) {
            throw new AuthError();
          }
          if (auth) {
            enrichContext({
              userId: auth.sub,
              userName: auth.name,
              role: auth.role,
              communityId: auth.communityId,
            });
          }
          if (options.roles && options.roles.length > 0) {
            if (!auth || !options.roles.includes(auth.role)) {
              throw new ForbiddenError();
            }
          }

          const params = await routeCtx.params;
          const ctx = { params, auth, ip, userAgent };
          return await (handler as Handler<PublicApiContext>)(req, ctx);
        } catch (err) {
          return errorToResponse(err, requestId);
        }
      }
    );
  };
}

/** Parse + validate a JSON body against a Zod schema (throws ZodError → 400). */
export async function parseBody<T>(req: NextRequest, schema: { parse: (v: unknown) => T }): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  return schema.parse(body);
}

/** Parse + validate URL search params against a Zod schema. */
export function parseQuery<T>(req: NextRequest, schema: { parse: (v: unknown) => T }): T {
  const raw: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((value, k) => {
    if (value !== '') raw[k] = value;
  });
  return schema.parse(raw);
}
