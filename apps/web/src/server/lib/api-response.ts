import { NextResponse } from 'next/server';
import type { ApiFailure, ApiSuccess, PaginationMeta } from '@community-finance/shared';

/** Uniform success envelope. */
export function ok<T>(data: T, meta?: PaginationMeta, init?: ResponseInit): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ success: true as const, data, ...(meta ? { meta } : {}) }, init);
}

export function created<T>(data: T): NextResponse<ApiSuccess<T>> {
  return ok(data, undefined, { status: 201 });
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

/** Uniform failure envelope. */
export function fail(
  code: string,
  message: string,
  statusCode: number,
  details?: unknown,
  headers?: Record<string, string>
): NextResponse<ApiFailure> {
  return NextResponse.json(
    { success: false as const, error: { code, message, ...(details !== undefined ? { details } : {}) } },
    { status: statusCode, headers }
  );
}

export function buildPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}
