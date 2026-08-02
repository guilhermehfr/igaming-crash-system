import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useMockBets } from '@/features/mock-bets/model/useMockBets';
import { apiFetch } from '@/shared/api/api';
import { config } from '@/shared/config/config';
import { toDisplayName } from '@/shared/lib/display';
import { useBalance } from '@/shared/lib/hooks';
import type { CrashRound, LiveBet, RoundState } from '@/shared/lib/socket-types';
import { useAuthStore, useBalanceStore, useGameStore, useSeedStore } from '@/shared/lib/stores';

export function useSocketConnection() {
  const user = useAuthStore((s) => s.user);

  const setConnected = useGameStore((s) => s.setConnected);
  const setDisconnected = useGameStore((s) => s.setDisconnected);
  const setError = useGameStore((s) => s.setError);
  const initRound = useGameStore((s) => s.initRound);
  const startBetting = useGameStore((s) => s.startBetting);
  const setRoundState = useGameStore((s) => s.setRoundState);
  const updateMultiplier = useGameStore((s) => s.updateMultiplier);
  const setHasBetAction = useGameStore((s) => s.setHasBet);
  const setCrashed = useGameStore((s) => s.setCrashed);
  const incrementRound = useGameStore((s) => s.incrementRound);
  const setBets = useGameStore((s) => s.setBets);
  const updateBet = useGameStore((s) => s.updateBet);
  const setSeedHash = useSeedStore((s) => s.setSeedHash);
  const setBalance = useBalanceStore((s) => s.setBalance);
  const roundState = useGameStore((s) => s.roundState);
  const currentMultiplier = useGameStore((s) => s.currentMultiplier);

  const { balance, refreshBalance } = useBalance(user?.id);
  const { bets, clearMockTimer } = useMockBets(roundState, currentMultiplier);

  const currentRoundIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  userIdRef.current = user?.id ?? null;

  useEffect(() => {
    setBalance(balance);
  }, [balance, setBalance]);

  useEffect(() => {
    setBets((prev) => [...prev.filter((b) => !b.id.startsWith('mock-')), ...bets]);
  }, [bets, setBets]);

  useEffect(() => {
    const socket = io(config.isDev ? undefined : config.apiUrl, {
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      setConnected();

      apiFetch(`${config.apiUrl}/games/provably-fair`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.serverSeedHash) setSeedHash(data.serverSeedHash);
        })
        .catch(() => {
          if (config.isDev) return;
          setError('Failed to sync game data');
        });

      apiFetch(`${config.apiUrl}/games/current`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!data) return;
          currentRoundIdRef.current = data.id ?? null;
          const state = data.state.toLowerCase() as RoundState;
          initRound(state, data.currentMultiplier);
          if (state === 'betting') incrementRound();
        })
        .catch(() => {
          if (config.isDev) return;
          setError('Failed to connect to game server');
        });

      if (userIdRef.current) refreshBalance(userIdRef.current);
    });

    socket.on('disconnect', () => setDisconnected());

    socket.on(
      'round:state-changed',
      (data: { roundId: string; state: string; crashPoint: number | null }) => {
        currentRoundIdRef.current = data.roundId;
        const socketState = data.state.toLowerCase() as RoundState;
        if (socketState === 'betting') {
          startBetting();
          incrementRound();
          setBets([]);
          if (userIdRef.current) refreshBalance(userIdRef.current);
        } else {
          setRoundState(socketState);
        }
      },
    );

    socket.on('round:multiplier-updated', (data: { roundId: string; multiplier: number }) => {
      if (data.roundId !== currentRoundIdRef.current) return;
      updateMultiplier(data.multiplier);
    });

    socket.on(
      'round:bet-placed',
      (data: {
        roundId: string;
        bet: { id: string; userId: string; demoSessionId: string | null; amountInMainUnit: number };
      }) => {
        if (data.roundId !== currentRoundIdRef.current) return;
        const isOwnBet = data.bet.id === useGameStore.getState().myBetId;
        if (isOwnBet) setHasBetAction();
        const newBet: LiveBet = {
          id: data.bet.id,
          user: data.bet.userId,
          displayName: isOwnBet ? 'demo' : toDisplayName(data.bet.userId, data.bet.demoSessionId),
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
        updateBet(data.bet.id, { type: 'cashed', multiplier: data.bet.multiplier ?? 0 });
      },
    );

    socket.on('round:crashed', (data: { roundId: string; crashPoint: number }) => {
      if (data.roundId !== currentRoundIdRef.current) return;

      const userBet = useGameStore
        .getState()
        .bets.find((b) => b.id === useGameStore.getState().myBetId);
      const type: CrashRound['type'] = !userBet
        ? 'none'
        : userBet.outcome.type === 'cashed'
          ? 'cashed'
          : 'crashed';

      setCrashed(data.crashPoint, type);
    });

    return () => {
      clearMockTimer();
      socket.disconnect();
    };
  }, [
    clearMockTimer,
    refreshBalance,
    setConnected,
    setDisconnected,
    setError,
    initRound,
    startBetting,
    setRoundState,
    updateMultiplier,
    setHasBetAction,
    setCrashed,
    incrementRound,
    setBets,
    updateBet,
    setSeedHash,
  ]);
}
