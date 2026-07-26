import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiFetch } from '@/shared/api/api';
import { config } from '@/shared/config/config';
import { STORAGE } from '@/shared/config/storage-keys';

export type AuthUser = {
  id: string;
  username: string;
  token?: string;
};

type AuthState = {
  user: AuthUser | null;
  isLoading: boolean;
};

type AuthActions = {
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
};

async function ensureWalletCreated() {
  try {
    const res = await apiFetch(`${config.apiUrl}/wallets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initialBalanceInMainUnit: 1000 }),
    });
    if (res.status === 409) return;
    if (!res.ok) console.warn('Wallet creation failed:', await res.text());
  } catch (err) {
    console.warn('Wallet creation error (non-blocking):', err);
  }
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,

      login: async (username: string, password: string) => {
        set({ isLoading: true });
        try {
          const params = new URLSearchParams({
            client_id: 'crash-game-client',
            grant_type: 'password',
            username,
            password,
          });

          const res = await fetch(
            `${config.apiUrl}/auth/realms/crash-game/protocol/openid-connect/token`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: params,
            },
          );

          if (!res.ok) throw new Error('Invalid credentials');

          const data = await res.json();
          const token: string = data.access_token;
          const payload = JSON.parse(atob(token.split('.')[1]));

          const authUser: AuthUser = {
            id: payload.sub as string,
            username: (payload.preferred_username as string) ?? username,
            token,
          };

          await ensureWalletCreated();
          set({ user: authUser, isLoading: false });
        } catch (err) {
          if (config.isDev && err instanceof TypeError) {
            const DEV_USER_ID_KEY = 'dev-user-id';
            let devId = localStorage.getItem(DEV_USER_ID_KEY);
            if (!devId) {
              devId = crypto.randomUUID();
              localStorage.setItem(DEV_USER_ID_KEY, devId);
            }
            const devUser: AuthUser = { id: devId, username };
            await ensureWalletCreated();
            set({ user: devUser, isLoading: false });
            return;
          }
          set({ isLoading: false });
          throw err;
        }
      },

      logout: () => set({ user: null }),

      setUser: (user) => set({ user }),

      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: STORAGE.AUTH,
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
