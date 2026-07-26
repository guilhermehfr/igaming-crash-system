import { useCallback, useEffect, useRef, useState } from 'react';
import { useBetActions } from '@/features/place-bet/model/useBetActions';
import { useBetState } from '@/features/place-bet/model/useBetState';
import { BET, calculateWinnings } from '@/shared/lib/bet-utils';
import { useBalance } from '@/shared/lib/hooks';
import type { RoundState } from '@/shared/lib/socket-types';
import { useAuthStore, useGameStore } from '@/shared/lib/stores';

export function useBet(roundState: RoundState) {
  const user = useAuthStore((s) => s.user);
  const currentMultiplier = useGameStore((s) => s.currentMultiplier);
  const { balance: rawBalance, refreshBalance } = useBalance(user?.id);
  const balance = rawBalance ?? 0;

  const [betState, dispatch] = useBetState();
  const [betAmount, setBetAmount] = useState<number>(BET.DEFAULT);
  const [actionLoading, setActionLoading] = useState(false);
  const currentMultiplierRef = useRef(1.0);

  useEffect(() => {
    currentMultiplierRef.current = currentMultiplier;
  }, [currentMultiplier]);

  useEffect(() => {
    if (roundState === 'betting') {
      dispatch({ type: 'RESET' });
    }
  }, [roundState, dispatch]);

  useEffect(() => {
    if (roundState === 'crashed' && betState.state === 'pending') {
      dispatch({ type: 'LOSE' });
    }
  }, [roundState, betState.state, dispatch]);

  const { handlePlaceBet: rawPlaceBet, handleCashOut: rawCashOut } = useBetActions(
    dispatch,
    user,
    betAmount,
    betState.betId,
    refreshBalance,
    currentMultiplierRef,
  );

  const handlePlaceBet = useCallback(async () => {
    if (actionLoading) return;
    setActionLoading(true);
    await rawPlaceBet();
    setActionLoading(false);
  }, [actionLoading, rawPlaceBet]);

  const handleCashOut = useCallback(async () => {
    if (actionLoading || !betState.betId) return;
    setActionLoading(true);
    await rawCashOut();
    setActionLoading(false);
  }, [actionLoading, betState.betId, rawCashOut]);

  const showInsufficientBalance =
    betState.error === null &&
    betAmount > balance &&
    roundState === 'betting' &&
    betState.state === 'none';

  const winnings =
    betState.state === 'cashed_out' && betState.multiplier
      ? calculateWinnings(betState.amount, betState.multiplier)
      : 0;

  const showPayout = betState.state === 'cashed_out' || betState.state === 'lost';

  const setBetAmountWithErrorClear = useCallback(
    (n: number | ((prev: number) => number)) => {
      setBetAmount(n);
      dispatch({ type: 'CLEAR_ERROR' });
    },
    [dispatch],
  );

  return {
    betAmount,
    setBetAmount: setBetAmountWithErrorClear,
    myBetId: betState.betId,
    myBetState: betState.state,
    myBetAmount: betState.amount,
    myBetMultiplier: betState.multiplier,
    actionLoading,
    betError: betState.error,
    showInsufficientBalance,
    winnings,
    showPayout,
    handlePlaceBet,
    handleCashOut,
  };
}
