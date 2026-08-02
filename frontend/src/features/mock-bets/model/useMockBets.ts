import { useCallback, useEffect, useRef, useState } from 'react';
import {
  cashOutRandomMocks,
  generateMockBets,
  loseRemainingMocks,
  type MockBet,
} from '@/features/mock-bets/lib/mock-users';
import type { LiveBet, RoundState } from '@/shared/lib/socket-types';

export function useMockBets(roundState: RoundState, currentMultiplier: number) {
  const [bets, setBets] = useState<LiveBet[]>([]);
  const mockBetsRef = useRef<MockBet[]>([]);
  const mockTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const staggerTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mockRevealedRef = useRef(0);
  const currentMultiplierRef = useRef(currentMultiplier);
  currentMultiplierRef.current = currentMultiplier;

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
  }, [clearMockTimer, roundState]);

  return { bets, setBets, clearMockTimer };
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
