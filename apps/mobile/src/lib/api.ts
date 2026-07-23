import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { API_PREFIX, type ApiFailure } from '@community-finance/shared';

/**
 * Mobile API client.
 * - Access token: memory only.
 * - Refresh token: expo-secure-store (Keychain/Keystore), sent in the
 *   request body on refresh — the API supports cookie (web) and body
 *   (mobile) flows.
 * - 401 → single-flight refresh → retry once → logout callback.
 *
 * Base URL resolution order:
 *   EXPO_PUBLIC_API_URL env → app.json extra.apiUrl → production URL.
 */
const REFRESH_KEY = 'cf_refresh_token';
const USER_KEY = 'cf_user';
const LAST_PHONE_KEY = 'cf_last_phone';

const baseHost =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  'https://finance-village-web.vercel.app';

export const API_BASE = `${baseHost.replace(/\/$/, '')}${API_PREFIX}`;

let accessToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

export async function saveRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_KEY, token);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_KEY);
}

export async function clearTokens(): Promise<void> {
  accessToken = null;
  await SecureStore.deleteItemAsync(REFRESH_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

/* ── Local session cache: instant sign-in on app start ─────────────── */

export async function saveCachedUser(user: unknown): Promise<void> {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function getCachedUser<T>(): Promise<T | null> {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Remember the last phone number for login prefill. */
export async function saveLastPhone(phone: string): Promise<void> {
  await SecureStore.setItemAsync(LAST_PHONE_KEY, phone);
}

export async function getLastPhone(): Promise<string | null> {
  return SecureStore.getItemAsync(LAST_PHONE_KEY);
}

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 30_000,
});

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  refreshPromise ??= (async () => {
    try {
      const stored = await getRefreshToken();
      if (!stored) return null;
      const res = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken: stored });
      const data = res.data?.data as
        | { accessToken: string; refreshToken: string }
        | undefined;
      if (!data) return null;
      accessToken = data.accessToken;
      await saveRefreshToken(data.refreshToken); // rotation
      return accessToken;
    } catch (err) {
      // Only a definitive server rejection ends the session — network
      // failures keep the cached login so the app works offline-ish.
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      if (status === 401 || status === 403) {
        await clearTokens();
      }
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<ApiFailure>) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retried?: boolean })
      | undefined;
    if (
      error.response?.status === 401 &&
      original &&
      !original._retried &&
      !original.url?.includes('/auth/')
    ) {
      original._retried = true;
      const token = await refreshAccessToken();
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

export function apiErrorMessage(err: unknown): string {
  if (axios.isAxiosError<ApiFailure>(err)) {
    if (!err.response) return 'Network error — check your connection';
    return err.response.data?.error?.message ?? err.message;
  }
  return err instanceof Error ? err.message : 'Something went wrong';
}
