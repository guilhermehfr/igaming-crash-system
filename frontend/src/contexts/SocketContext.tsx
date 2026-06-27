import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { config } from '@/config';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  cashOutRandomMocks,
  generateMockBets,
  loseRemainingMocks,
  type MockBet,
} from '@/lib/mock-users';

export type RoundState = 'betting' | 'running' | 'crashed' | null;

export type LiveBet = {
  id: string;
  user: string;
  displayName: string;
  amount: number;
  outcome: { type: 'pending' } | { type: 'cashed'; multiplier: number } | { type: 'lost' };
};

export type RevealedSeed = {
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  timestamp: string;
};

type SocketContextValue = {
  bets: LiveBet[];
  playingCount: number;
  roundState: RoundState;
  roundNumber: number;
  currentMultiplier: number;
  seedHash: string;
  seedHistory: RevealedSeed[];
  revealSeed: () => Promise<void>;
  balance: number | null;
  refreshBalance: (userId: string) => Promise<void>;
  connected: boolean;
};

const SocketContext = createContext<SocketContextValue | null>(null);

function toDisplayName(userId: string, demoSessionId: string | null): string {
  if (demoSessionId === null) return `Player-${userId.slice(0, 4)}`;
  return `Guest-${demoSessionId.slice(0, 4)}`;
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const roundCountRef = useRef(0);

  const [connected, setConnected] = useState(false);
  const [roundState, setRoundState] = useState<RoundState>(null);
  const [currentMultiplier, setCurrentMultiplier] = useState(0);
  const [roundNumber, setRoundNumber] = useState(0);
  const [bets, setBets] = useState<LiveBet[]>([]);
  const [seedHash, setSeedHash] = useState('');
  const [balance, setBalance] = useState<number | null>(null);
  const { user } = useAuth();

  const [seedHistory, setSeedHistory] = useState<RevealedSeed[]>(() => {
    try {
      const raw = sessionStorage.getItem('igaming-seed-history');
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
        sessionStorage.setItem('igaming-seed-history', JSON.stringify(updated));
        return updated;
      });
    } catch {
      // silently fail
    }
  }, []);

  const userIdRef = useRef<string | null>(null);
  userIdRef.current = user?.id ?? null;

  const refreshBalance = useCallback(async (userId: string) => {
    try {
      const res = await apiFetch(`${config.apiUrl}/wallets/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balanceInMainUnit);
      }
    } catch {}
  }, []);

  const mockBetsRef = useRef<MockBet[]>([]);
  const mockTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearMockTimer = useCallback(() => {
    if (mockTimerRef.current !== null) {
      clearInterval(mockTimerRef.current);
      mockTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (roundState === null) return;

    if (roundState === 'betting') {
      clearMockTimer();
      const mocks = generateMockBets();
      mockBetsRef.current = mocks;
      setBets((prev) => [...mocks.map(mockToLiveBet), ...prev.filter((b) => !b.id.startsWith('mock-'))]);
    } else if (roundState === 'running') {
      mockTimerRef.current = setInterval(() => {
        mockBetsRef.current = cashOutRandomMocks(mockBetsRef.current, currentMultiplier);
        setBets((prev) => [...mockBetsRef.current.map(mockToLiveBet), ...prev.filter((b) => !b.id.startsWith('mock-'))]);
      }, 800);
    } else if (roundState === 'crashed') {
      clearMockTimer();
      mockBetsRef.current = loseRemainingMocks(mockBetsRef.current);
      setBets((prev) => [...mockBetsRef.current.map(mockToLiveBet), ...prev.filter((b) => !b.id.startsWith('mock-'))]);
    }

    return clearMockTimer;
  }, [roundState, clearMockTimer, currentMultiplier]);

  useEffect(() => {
    const url = config.wsUrl || undefined;
    const socket = io(url, { transports: ['websocket', 'polling'] });

    socket.on('connect', () => {
      setConnected(true);

      apiFetch(`${config.apiUrl}/games/provably-fair`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data?.serverSeedHash) setSeedHash(data.serverSeedHash);
        })
        .catch(() => {});

      apiFetch(`${config.apiUrl}/games/current`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (!data) return;
          const state = data.state.toLowerCase() as RoundState;
          setRoundState(state);
          setCurrentMultiplier(data.currentMultiplier);
          if (state === 'betting') {
            roundCountRef.current += 1;
            setRoundNumber(roundCountRef.current);
          }
        })
        .catch(() => {});

      if (userIdRef.current) refreshBalance(userIdRef.current);
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on(
      'round:state-changed',
      (data: { roundId: string; state: string; crashPoint: number | null }) => {
        const state = data.state.toLowerCase() as RoundState;
        setRoundState(state);
        if (state === 'betting') {
          roundCountRef.current += 1;
          setRoundNumber(roundCountRef.current);
          setCurrentMultiplier(0);
          setBets((prev) => prev.filter((b) => !b.id.startsWith('mock-')));
          if (userIdRef.current) refreshBalance(userIdRef.current);
        }
      },
    );

    socket.on('round:multiplier-updated', (data: { roundId: string; multiplier: number }) => {
      setCurrentMultiplier(data.multiplier);
    });

    socket.on(
      'round:bet-placed',
      (data: {
        roundId: string;
        bet: { id: string; userId: string; demoSessionId: string | null; amountInMainUnit: number };
      }) => {
        const newBet: LiveBet = {
          id: data.bet.id,
          user: data.bet.userId,
          displayName: toDisplayName(data.bet.userId, data.bet.demoSessionId),
          amount: data.bet.amountInMainUnit,
          outcome: { type: 'pending' },
        };
        setBets((prev) => [newBet, ...prev]);
      },
    );

    socket.on(
      'round:bet-cashed-out',
      (data: {
        roundId: string;
        bet: { id: string; userId: string; demoSessionId: string | null; multiplier: number | null };
      }) => {
        setBets((prev) =>
          prev.map((b) =>
            b.id === data.bet.id
              ? { ...b, outcome: { type: 'cashed' as const, multiplier: data.bet.multiplier ?? 0 } }
              : b,
          ),
        );
      },
    );

    socket.on('round:crashed', (data: { roundId: string; crashPoint: number }) => {
      setRoundState('crashed');
      setCurrentMultiplier(data.crashPoint);
    });

    return () => {
      clearMockTimer();
      socket.disconnect();
    };
  }, [clearMockTimer]);

  const playingCount = bets.filter((b) => b.outcome.type === 'pending').length;

  return (
      <SocketContext.Provider
        value={{
          bets,
          playingCount,
          roundState,
          roundNumber,
          currentMultiplier,
          seedHash,
          seedHistory,
          revealSeed,
          balance,
          refreshBalance,
          connected,
        }}
      >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within <SocketProvider>');
  return ctx;
}

function mockToLiveBet(m: MockBet): LiveBet {
  return {
    id: m.id,
    user: m.userId,
    displayName: m.displayName,
    amount: m.amount,
    outcome: m.outcome,
  };
}
