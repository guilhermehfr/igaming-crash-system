import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { config } from '@/config';
import { apiFetch } from '@/lib/api';
import { keycloakLogin } from '@/lib/auth';
import { STORAGE } from '@/lib/storage-keys';

export type AuthUser = {
  id: string;
  username: string;
  token?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function persistAuth(data: AuthUser) {
  localStorage.setItem(STORAGE.AUTH, JSON.stringify(data));
}

function clearAuth() {
  localStorage.removeItem(STORAGE.AUTH);
}

function hydrateAuth(): AuthUser | null {
  const raw = localStorage.getItem(STORAGE.AUTH);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    clearAuth();
    return null;
  }
}

async function ensureWalletCreated() {
  try {
    const res = await apiFetch(`${config.apiUrl}/wallets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initialBalanceInMainUnit: 1000 }),
    });
    if (res.status === 409) return;
    if (!res.ok) {
      console.warn('Wallet creation failed:', await res.text());
    }
  } catch (err) {
    console.warn('Wallet creation error (non-blocking):', err);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = hydrateAuth();
    setUser(stored);
    setIsLoading(false);
  }, []);

  async function login(username: string, password: string) {
    try {
      const result = await keycloakLogin(username, password);
      const authUser: AuthUser = {
        id: result.userId,
        username: result.username,
        token: result.token,
      };
      persistAuth(authUser);

      await ensureWalletCreated();
      setUser(authUser);
    } catch (err) {
      if (config.isDev && err instanceof TypeError) {
        const DEV_USER_ID_KEY = 'dev-user-id';
        let devId = localStorage.getItem(DEV_USER_ID_KEY);
        if (!devId) {
          devId = crypto.randomUUID();
          localStorage.setItem(DEV_USER_ID_KEY, devId);
        }
        const devUser: AuthUser = { id: devId, username };
        persistAuth(devUser);

        await ensureWalletCreated();
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
