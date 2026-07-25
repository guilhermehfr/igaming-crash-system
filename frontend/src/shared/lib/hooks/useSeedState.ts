import { useCallback, useState } from 'react';
import { apiFetch } from '@/shared/api/api';
import { config } from '@/shared/config/config';
import { STORAGE } from '@/shared/config/storage-keys';
import type { RevealedSeed } from '@/shared/lib/socket-types';

export function useSeedState() {
  const [seedHash, setSeedHash] = useState('');
  const [seedHistory, setSeedHistory] = useState<RevealedSeed[]>(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE.SEED_HISTORY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const revealSeed = useCallback(async () => {
    try {
      const res = await apiFetch(`${config.apiUrl}/games/provably-fair/reveal`, { method: 'POST' });
      if (!res.ok) return;
      const data = await res.json();
      const entry: RevealedSeed = {
        serverSeed: data.serverSeed,
        serverSeedHash: data.serverSeedHash,
        clientSeed: data.clientSeed,
        nonce: data.nonce,
        timestamp: new Date().toISOString(),
      };
      setSeedHash(data.serverSeedHash);
      setSeedHistory((prev) => {
        const updated = [entry, ...prev];
        sessionStorage.setItem(STORAGE.SEED_HISTORY, JSON.stringify(updated));
        return updated;
      });
    } catch {
      // silently fail
    }
  }, []);

  return {
    seedHash,
    setSeedHash,
    seedHistory,
    setSeedHistory,
    revealSeed,
  };
}
