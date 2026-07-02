import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { io } from 'socket.io-client';
import { config } from '@/config';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';
import { toDisplayName } from '@/lib/display';
import {
  cashOutRandomMocks,
  generateMockBets,
  loseRemainingMocks,
  type MockBet,
} from '@/lib/mock-users';
import { STORAGE } from '@/lib/storage-keys';

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

export type CrashRound = {
  id: number;
  multiplier: number;
  type: 'cashed' | 'busted' | 'none';
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
  syncError: string | null;
  crashHistory: CrashRound[];
  hasBet: boolean;
};

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const roundCountRef = useRef(0);

  const [connected, setConnected] = useState(false);
  const [roundState, setRoundState] = useState<RoundState>(null);
  const [currentMultiplier, setCurrentMultiplier] = useState(0);
  const currentMultiplierRef = useRef(0);
  currentMultiplierRef.current = currentMultiplier;
  const currentRoundIdRef = useRef<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [roundNumber, setRoundNumber] = useState(0);
  const [bets, setBets] = useState<LiveBet[]>([]);
  const [seedHash, setSeedHash] = useState('');
  const [balance, setBalance] = useState<number | null>(null);
  const { user } = useAuth();

  const [crashHistory, setCrashHistory] = useState<CrashRound[]>([]);
  const [hasBet, setHasBet] = useState(false);

  const betsRef = useRef<LiveBet[]>([]);
  betsRef.current = bets;

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

  useEffect(() => {
    if (user?.id) {
      refreshBalance(user.id);
    }
  }, [user, refreshBalance]);

  const mockBetsRef = useRef<MockBet[]>([]);
  const mockTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const staggerTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mockRevealedRef = useRef(0);

  const clearMockTimer = useCallback(() => {
    if (mockTimerRef.current !== null) {
      clearInterval(mockTimerRef.current);
      mockTimerRef.current = null;
    }
    if (staggerTimerRef.current !== null) {
      clearInterval(staggerTimerRef.current);
      staggerTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (roundState === null) return;

    if (roundState === 'betting') {
      clearMockTimer();
      const mocks = generateMockBets();
      mockBetsRef.current = mocks;
      mockRevealedRef.current = 0;
      setBets([]);

      staggerTimerRef.current = setInterval(() => {
        const total = mockBetsRef.current.length;
        const shown = mockRevealedRef.current;
        if (shown >= total) {
          if (staggerTimerRef.current !== null) {
            clearInterval(staggerTimerRef.current);
            staggerTimerRef.current = null;
          }
          return;
        }
        const batchSize = 1 + Math.floor(Math.random() * 2);
        const newShown = Math.min(shown + batchSize, total);
        mockRevealedRef.current = newShown;
        setBets((prev) => [
          ...mockBetsRef.current.slice(0, newShown).map(mockToLiveBet),
          ...prev.filter((b) => !b.id.startsWith('mock-')),
        ]);
      }, 600);
    } else if (roundState === 'running') {
      if (staggerTimerRef.current !== null) {
        clearInterval(staggerTimerRef.current);
        staggerTimerRef.current = null;
      }
      if (mockRevealedRef.current < mockBetsRef.current.length) {
        mockRevealedRef.current = mockBetsRef.current.length;
        setBets((prev) => [
          ...mockBetsRef.current.map(mockToLiveBet),
          ...prev.filter((b) => !b.id.startsWith('mock-')),
        ]);
      }
      mockTimerRef.current = setInterval(() => {
        mockBetsRef.current = cashOutRandomMocks(mockBetsRef.current, currentMultiplierRef.current);
        setBets((prev) => [
          ...mockBetsRef.current.map(mockToLiveBet),
          ...prev.filter((b) => !b.id.startsWith('mock-')),
        ]);
      }, 800);
    } else if (roundState === 'crashed') {
      clearMockTimer();
      mockBetsRef.current = loseRemainingMocks(mockBetsRef.current);
      setBets((prev) => [
        ...mockBetsRef.current.map(mockToLiveBet),
        ...prev.filter((b) => !b.id.startsWith('mock-')),
      ]);
    }

    return clearMockTimer;
  }, [roundState, clearMockTimer]);

  useEffect(() => {
    const socket = io(config.isDev ? undefined : config.apiUrl, {
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      setConnected(true);

      apiFetch(`${config.apiUrl}/games/provably-fair`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.serverSeedHash) setSeedHash(data.serverSeedHash);
        })
        .catch((err) => {
          if (config.isDev) console.warn('Provably-fair sync failed:', err);
          setSyncError('Failed to sync game data');
        });

      apiFetch(`${config.apiUrl}/games/current`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!data) return;
          currentRoundIdRef.current = data.id ?? null;
          const state = data.state.toLowerCase() as RoundState;
          setRoundState(state);
          setCurrentMultiplier(data.currentMultiplier);
          if (state === 'betting') {
            roundCountRef.current += 1;
            setRoundNumber(roundCountRef.current);
          }
        })
        .catch((err) => {
          if (config.isDev) console.warn('Current round fetch failed:', err);
          setSyncError('Failed to connect to game server');
        });

      if (userIdRef.current) refreshBalance(userIdRef.current);
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on(
      'round:state-changed',
      (data: { roundId: string; state: string; crashPoint: number | null }) => {
        currentRoundIdRef.current = data.roundId;
        const state = data.state.toLowerCase() as RoundState;
        setRoundState(state);
        if (state === 'betting') {
          setHasBet(false);
          setSyncError(null);
          roundCountRef.current += 1;
          setRoundNumber(roundCountRef.current);
          setCurrentMultiplier(0);
          setBets([]);
          if (userIdRef.current) refreshBalance(userIdRef.current);
        }
      },
    );

    socket.on('round:multiplier-updated', (data: { roundId: string; multiplier: number }) => {
      if (data.roundId !== currentRoundIdRef.current) return;
      setCurrentMultiplier(data.multiplier);
    });

    socket.on(
      'round:bet-placed',
      (data: {
        roundId: string;
        bet: { id: string; userId: string; demoSessionId: string | null; amountInMainUnit: number };
      }) => {
        if (data.roundId !== currentRoundIdRef.current) return;
        if (data.bet.userId === userIdRef.current) setHasBet(true);
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
        bet: {
          id: string;
          userId: string;
          demoSessionId: string | null;
          multiplier: number | null;
        };
      }) => {
        if (data.roundId !== currentRoundIdRef.current) return;
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
      if (data.roundId !== currentRoundIdRef.current) return;
      setRoundState('crashed');
      setCurrentMultiplier(data.crashPoint);

      const userBet = betsRef.current.find((b) => b.user === userIdRef.current);
      const type: CrashRound['type'] = !userBet
        ? 'none'
        : userBet.outcome.type === 'cashed'
          ? 'cashed'
          : 'busted';

      setCrashHistory((prev) =>
        [{ id: Date.now(), multiplier: Number(data.crashPoint), type }, ...prev].slice(0, 50),
      );
    });

    return () => {
      clearMockTimer();
      socket.disconnect();
    };
  }, [clearMockTimer, refreshBalance]);

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
        syncError,
        crashHistory,
        hasBet,
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
