import { createContext, type ReactNode, useContext, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '@/app/providers/AuthContext';
import { useMockBets } from '@/features/mock-bets/model/useMockBets';
import { apiFetch } from '@/shared/api/api';
import { config } from '@/shared/config/config';
import { toDisplayName } from '@/shared/lib/display';
import { useBalance, useSeedState, useSocketReducer } from '@/shared/lib/hooks';
import type { CrashRound, LiveBet, RevealedSeed, RoundState } from '@/shared/lib/socket-types';

export type { CrashRound, LiveBet, RevealedSeed, RoundState } from '@/shared/lib/socket-types';

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
  const [state, dispatch] = useSocketReducer();
  const { connected, roundState, currentMultiplier, syncError, roundNumber, crashHistory, hasBet } =
    state;

  const currentMultiplierRef = useRef(0);
  currentMultiplierRef.current = currentMultiplier;
  const currentRoundIdRef = useRef<string | null>(null);
  const { user } = useAuth();

  const { seedHash, setSeedHash, seedHistory, revealSeed } = useSeedState();
  const { balance, refreshBalance } = useBalance(user?.id);
  const { bets, setBets, clearMockTimer } = useMockBets(roundState, currentMultiplier);

  const betsRef = useRef<LiveBet[]>([]);
  betsRef.current = bets;

  const userIdRef = useRef<string | null>(null);
  userIdRef.current = user?.id ?? null;

  useEffect(() => {
    const socket = io(config.isDev ? undefined : config.apiUrl, {
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      dispatch({ type: 'CONNECTED' });

      apiFetch(`${config.apiUrl}/games/provably-fair`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.serverSeedHash) setSeedHash(data.serverSeedHash);
        })
        .catch((err) => {
          if (config.isDev) console.warn('Provably-fair sync failed:', err);
          dispatch({ type: 'SET_ERROR', error: 'Failed to sync game data' });
        });

      apiFetch(`${config.apiUrl}/games/current`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!data) return;
          currentRoundIdRef.current = data.id ?? null;
          const state = data.state.toLowerCase() as RoundState;
          dispatch({ type: 'INIT_ROUND', state, multiplier: data.currentMultiplier });
          if (state === 'betting') {
            dispatch({ type: 'INCREMENT_ROUND' });
          }
        })
        .catch((err) => {
          if (config.isDev) console.warn('Current round fetch failed:', err);
          dispatch({ type: 'SET_ERROR', error: 'Failed to connect to game server' });
        });

      if (userIdRef.current) refreshBalance(userIdRef.current);
    });

    socket.on('disconnect', () => dispatch({ type: 'DISCONNECTED' }));

    socket.on(
      'round:state-changed',
      (data: { roundId: string; state: string; crashPoint: number | null }) => {
        currentRoundIdRef.current = data.roundId;
        const socketState = data.state.toLowerCase() as RoundState;
        if (socketState === 'betting') {
          dispatch({ type: 'START_BETTING' });
          dispatch({ type: 'INCREMENT_ROUND' });
          setBets([]);
          if (userIdRef.current) refreshBalance(userIdRef.current);
        } else {
          dispatch({ type: 'STATE_CHANGED', state: socketState });
        }
      },
    );

    socket.on('round:multiplier-updated', (data: { roundId: string; multiplier: number }) => {
      if (data.roundId !== currentRoundIdRef.current) return;
      dispatch({ type: 'UPDATE_MULTIPLIER', multiplier: data.multiplier });
    });

    socket.on(
      'round:bet-placed',
      (data: {
        roundId: string;
        bet: { id: string; userId: string; demoSessionId: string | null; amountInMainUnit: number };
      }) => {
        if (data.roundId !== currentRoundIdRef.current) return;
        if (data.bet.userId === userIdRef.current) dispatch({ type: 'SET_HAS_BET' });
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

      const userBet = betsRef.current.find((b) => b.user === userIdRef.current);
      const type: CrashRound['type'] = !userBet
        ? 'none'
        : userBet.outcome.type === 'cashed'
          ? 'cashed'
          : 'crashed';

      dispatch({ type: 'CRASHED', crashPoint: data.crashPoint, userBetType: type });
    });

    return () => {
      clearMockTimer();
      socket.disconnect();
    };
  }, [clearMockTimer, refreshBalance, dispatch, setBets, setSeedHash]);

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
