import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { apiFetch } from '@/shared/api/api';
import { config } from '@/shared/config/config';
import { STORAGE } from '@/shared/config/storage-keys';
import type { RevealedSeed } from '@/shared/lib/socket-types';

type SeedState = {
  seedHash: string;
  seedHistory: RevealedSeed[];
};

type SeedActions = {
  setSeedHash: (hash: string) => void;
  revealSeed: () => Promise<void>;
};

export const useSeedStore = create<SeedState & SeedActions>()(
  persist(
    (set) => ({
      seedHash: '',
      seedHistory: [],

      setSeedHash: (hash) => set({ seedHash: hash }),

      revealSeed: async () => {
        try {
          const res = await apiFetch(`${config.apiUrl}/games/provably-fair/reveal`, {
            method: 'POST',
          });
          if (!res.ok) return;
          const data = await res.json();
          const entry: RevealedSeed = {
            serverSeed: data.serverSeed,
            serverSeedHash: data.serverSeedHash,
            clientSeed: data.clientSeed,
            nonce: data.nonce,
            timestamp: new Date().toISOString(),
          };
          set((s) => ({
            seedHash: data.serverSeedHash,
            seedHistory: [entry, ...s.seedHistory],
          }));
        } catch {
          // silently fail
        }
      },
    }),
    {
      name: STORAGE.SEED_HISTORY,
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ seedHash: state.seedHash, seedHistory: state.seedHistory }),
    },
  ),
);
