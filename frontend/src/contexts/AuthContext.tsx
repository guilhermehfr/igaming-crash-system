import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { config, DEV_USER_ID } from '@/config';
import { keycloakLogin } from '@/lib/auth';

const AUTH_KEY = 'igaming-auth';

export type AuthUser = {
  id: string;
  email: string;
  token?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function persistAuth(data: AuthUser) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(data));
}

function clearAuth() {
  localStorage.removeItem(AUTH_KEY);
}

function hydrateAuth(): AuthUser | null {
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    clearAuth();
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setUser(hydrateAuth());
    setIsLoading(false);
  }, []);

  async function login(email: string, password: string) {
    try {
      const result = await keycloakLogin(email, password);
      const authUser: AuthUser = { id: result.userId, email: result.email, token: result.token };
      persistAuth(authUser);
      setUser(authUser);
    } catch (err) {
      if (config.isDev && err instanceof TypeError) {
        const devUser: AuthUser = { id: DEV_USER_ID, email };
        persistAuth(devUser);
        setUser(devUser);
        return;
      }
      throw err;
    }
  }

  function logout() {
    clearAuth();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
