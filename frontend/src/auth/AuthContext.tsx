import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types/contract';
import { login as apiLogin } from '../services/api';
import { getToken, setToken } from '../services/http';

const STORAGE_KEY = 'pguard-user';

interface AuthCtx {
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

// Rehydrate the session from localStorage. The JWT + user snapshot are written
// together on login, so a token with no matching user (or vice versa) is
// treated as no session — cleared, not trusted.
function restore(): User | null {
  if (!getToken()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as User;
    return saved && typeof saved.id === 'string' && saved.id ? saved : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(restore);

  const login = useCallback(async (email: string, password: string) => {
    const u = await apiLogin(email, password); // sets the JWT as a side effect
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
