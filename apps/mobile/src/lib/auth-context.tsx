import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthUserDto, LoginResponseDto } from '@community-finance/shared';
import {
  api,
  clearTokens,
  refreshAccessToken,
  saveRefreshToken,
  setAccessToken,
  setUnauthorizedHandler,
} from './api';

interface AuthContextValue {
  user: AuthUserDto | null;
  /** true while restoring the session from secure storage on cold start. */
  loading: boolean;
  login: (phone: string, password: string) => Promise<AuthUserDto>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUserDto | null>(null);
  const [loading, setLoading] = useState(true);

  // Silent session restore from the stored refresh token.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await refreshAccessToken();
        if (token && !cancelled) {
          const res = await api.get<{ data: AuthUserDto }>('/auth/me');
          if (!cancelled) setUser(res.data.data);
        }
      } catch {
        // stay logged out
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
  }, []);

  const login = useCallback(async (phone: string, password: string) => {
    const res = await api.post<{ data: LoginResponseDto }>('/auth/login', {
      phone,
      password,
    });
    const data = res.data.data;
    setAccessToken(data.accessToken);
    await saveRefreshToken(data.refreshToken);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      const { getRefreshToken } = await import('./api');
      const token = await getRefreshToken();
      if (token) await api.post('/auth/logout', { refreshToken: token });
    } catch {
      // best effort — clear locally regardless
    } finally {
      await clearTokens();
      setUser(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const res = await api.get<{ data: AuthUserDto }>('/auth/me');
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
