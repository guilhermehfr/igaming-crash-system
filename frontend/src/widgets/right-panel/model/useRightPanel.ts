import { useCallback } from 'react';
import type { BetState } from '@/features/place-bet/model/useBetState';
import { getActionType } from '@/shared/lib/action-button';
import { NEXT_STATE } from '@/shared/lib/round-state';
import type { RoundState } from '@/shared/lib/socket-types';

export function useRightPanel(
  roundState: RoundState,
  connected: boolean,
  myBetState: BetState,
  myBetAmount: number,
  actionLoading: boolean,
  betAmount: number,
  balance: number | null,
  handlePlaceBet: () => Promise<void>,
  handleCashOut: () => Promise<void>,
  setRoundState: (s: RoundState) => void,
) {
  const effectiveState = roundState ?? 'betting';
  const isLoadingRound = roundState === null && connected;
  const actionType = getActionType(
    myBetState,
    effectiveState,
    connected,
    actionLoading,
    isLoadingRound,
  );
  const isDevCycle = !connected && (myBetState === 'lost' || effectiveState === 'crashed');

  const showingBetAmount = myBetState !== 'none' ? myBetAmount : null;

  const inputDisabled =
    effectiveState !== 'betting' || !connected || myBetState === 'pending' || isLoadingRound;

  const buttonDisabled =
    isLoadingRound ||
    actionLoading ||
    myBetState === 'cashed_out' ||
    myBetState === 'lost' ||
    (effectiveState === 'betting' && myBetState === 'pending') ||
    (effectiveState === 'betting' && (balance === null || betAmount <= 0 || betAmount > balance)) ||
    (effectiveState === 'running' && myBetState !== 'pending');

  const handleClick = isDevCycle
    ? () => setRoundState(NEXT_STATE[effectiveState])
    : effectiveState === 'running' && myBetState === 'pending'
      ? handleCashOut
      : effectiveState === 'betting' && myBetState === 'none'
        ? handlePlaceBet
        : () => {};

  const cycleState = useCallback(
    () => setRoundState(NEXT_STATE[effectiveState]),
    [effectiveState, setRoundState],
  );

  return {
    effectiveState,
    isLoadingRound,
    actionType,
    isDevCycle,
    showingBetAmount,
    inputDisabled,
    buttonDisabled,
    handleClick,
    cycleState,
  };
}
