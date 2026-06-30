import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { config } from '@/config';
import { keycloakLogin } from '@/lib/auth';

const AUTH_KEY = 'igaming-auth';
const DEMO_SESSION_KEY = 'igaming-demo-session';

export type AuthUser = {
  id: string;
  username: string;
  token?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  demoSessionId: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function persistAuth(data: AuthUser) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(data));
}

function clearAuth() {
  localStorage.removeItem(AUTH_KEY);
  sessionStorage.removeItem(DEMO_SESSION_KEY);
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

function generateDemoSessionId(): string {
  const id = crypto.randomUUID();
  sessionStorage.setItem(DEMO_SESSION_KEY, id);
  return id;
}

function getStoredDemoSessionId(): string | null {
  return sessionStorage.getItem(DEMO_SESSION_KEY);
}

async function ensureWalletCreated(userId: string, sessionId: string) {
  try {
    const res = await fetch(`${config.apiUrl}/wallets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
        'X-Demo-Session': sessionId,
      },
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
  const [demoSessionId, setDemoSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = hydrateAuth();
    setUser(stored);
    setDemoSessionId(getStoredDemoSessionId());
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

      const sessionId = generateDemoSessionId();
      await ensureWalletCreated(result.userId, sessionId);
      setUser(authUser);
      setDemoSessionId(sessionId);
    } catch (err) {
      if (config.isDev && err instanceof TypeError) {
        const devUser: AuthUser = { id: crypto.randomUUID(), username };
        persistAuth(devUser);

        const sessionId = generateDemoSessionId();
        await ensureWalletCreated(devUser.id, sessionId);
        setUser(devUser);
        setDemoSessionId(sessionId);
        return;
      }
      throw err;
    }
  }

  function logout() {
    clearAuth();
    setUser(null);
    setDemoSessionId(null);
  }

  return (
    <AuthContext.Provider value={{ user, demoSessionId, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
