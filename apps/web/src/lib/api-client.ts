'use client';

import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { API_PREFIX, type ApiFailure } from '@community-finance/shared';

/**
 * Axios instance for the admin dashboard.
 * - Access token lives in memory only (never localStorage → no XSS token theft).
 * - On 401, transparently refreshes via the httpOnly cookie and retries once.
 * - Concurrent 401s share a single refresh promise.
 */
let accessToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

export const apiClient = axios.create({
  baseURL: API_PREFIX,
  withCredentials: true,
  timeout: 30_000,
});

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  refreshPromise ??= axios
    .post(`${API_PREFIX}/auth/refresh`, {}, { withCredentials: true })
    .then((res) => {
      const token = res.data?.data?.accessToken as string | undefined;
      accessToken = token ?? null;
      return accessToken;
    })
    .catch(() => {
      accessToken = null;
      return null;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<ApiFailure>) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const status = error.response?.status;

    if (status === 401 && original && !original._retried && !original.url?.includes('/auth/')) {
      original._retried = true;
      const token = await refreshAccessToken();
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return apiClient(original);
      }
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

/** Extract a human-readable message from an API error. */
export function apiErrorMessage(err: unknown): string {
  if (axios.isAxiosError<ApiFailure>(err)) {
    return err.response?.data?.error?.message ?? err.message;
  }
  return err instanceof Error ? err.message : 'Something went wrong';
}
