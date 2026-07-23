'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import {
  API_PREFIX,
  type AuthUserDto,
  type LoginResponseDto,
} from '@community-finance/shared';
import { apiClient, setAccessToken, setUnauthorizedHandler } from './api-client';

interface AuthContextValue {
  user: AuthUserDto | null;
  /** true while the silent session restore is running. */
  loading: boolean;
  login: (phone: string, password: string) => Promise<AuthUserDto>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUserDto | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Attempt silent session restore from the refresh cookie on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.post(
          `${API_PREFIX}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const data = res.data?.data as LoginResponseDto | undefined;
        if (data && !cancelled) {
          setAccessToken(data.accessToken);
          setUser(data.user);
        }
      } catch {
        // no session — stay logged out
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setAccessToken(null);
      router.replace('/login');
    });
  }, [router]);

  const login = useCallback(async (phone: string, password: string) => {
    const res = await apiClient.post<{ data: LoginResponseDto }>('/auth/login', {
      phone,
      password,
    });
    const data = res.data.data;
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      setAccessToken(null);
      setUser(null);
      router.replace('/login');
    }
  }, [router]);

  const refreshUser = useCallback(async () => {
    const res = await apiClient.get<{ data: AuthUserDto }>('/auth/me');
    setUser(res.data.data);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout, refreshUser }),
    [user, loading, login, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
