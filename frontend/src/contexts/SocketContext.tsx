import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { config } from '@/config';

export type RoundState = 'betting' | 'running' | 'crashed';

export type LiveBet = {
  id: string;
  user: string;
  amount: number;
  outcome: { type: 'pending' } | { type: 'cashed'; multiplier: number } | { type: 'lost' };
};

type SocketContextValue = {
  bets: LiveBet[];
  playingCount: number;
  roundState: RoundState;
  roundNumber: number;
  currentMultiplier: number;
  connected: boolean;
};

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const roundCountRef = useRef(8291);

  const [connected, setConnected] = useState(false);
  const [roundState, setRoundState] = useState<RoundState>('betting');
  const [currentMultiplier, setCurrentMultiplier] = useState(1.0);
  const [roundNumber, setRoundNumber] = useState(8291);
  const [bets, setBets] = useState<LiveBet[]>([]);

  useEffect(() => {
    const url = config.wsUrl || undefined;
    const socket = io(url, { transports: ['websocket', 'polling'] });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on(
      'round:state-changed',
      (data: { roundId: string; state: string; crashPoint: number | null }) => {
        const state = data.state.toLowerCase() as RoundState;
        setRoundState(state);
        if (state === 'betting') {
          roundCountRef.current += 1;
          setRoundNumber(roundCountRef.current);
          setCurrentMultiplier(1.0);
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
        bet: { id: string; userId: string; amountInMainUnit: number };
      }) => {
        const newBet: LiveBet = {
          id: data.bet.id,
          user: data.bet.userId,
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
        bet: { id: string; userId: string; multiplier: number | null };
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
      socket.disconnect();
    };
  }, []);

  const playingCount = bets.filter((b) => b.outcome.type === 'pending').length;

  return (
    <SocketContext.Provider
      value={{
        bets,
        playingCount,
        roundState,
        roundNumber,
        currentMultiplier,
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
