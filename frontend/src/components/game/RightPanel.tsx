import { useAuth } from '@/contexts/AuthContext';
import type { RoundState } from '@/contexts/SocketContext';
import { useSocket } from '@/contexts/SocketContext';
import { useBet } from '@/hooks/useBet';
import { getActionType } from '@/lib/action-button';
import { NEXT_STATE } from '@/lib/round-state';
import { ActionButton } from './ActionButton';
import { BalanceDisplay } from './BalanceDisplay';
import { BetInput } from './BetInput';
import { BetMessages } from './BetMessages';
import { PositionStatus } from './PositionStatus';

type RightPanelProps = {
  roundState: RoundState;
  setRoundState: (s: RoundState) => void;
  connected: boolean;
};

export function RightPanel({ roundState, setRoundState, connected }: RightPanelProps) {
  const { user } = useAuth();
  const { balance } = useSocket();
  const {
    betAmount,
    setBetAmount,
    myBetState,
    myBetAmount,
    myBetMultiplier,
    actionLoading,
    betError,
    showInsufficientBalance,
    winnings,
    showPayout,
    handlePlaceBet,
    handleCashOut,
  } = useBet(roundState ?? 'betting');

  if (!user) return null;

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

  return (
    <aside className="flex w-full shrink-0 flex-col border-t border-slate-800/60 bg-deep-slate/80 md:w-[25rem] md:border-l">
      <BalanceDisplay balance={balance} />

      <PositionStatus
        myBetState={myBetState}
        showingBetAmount={showingBetAmount}
        showPayout={showPayout}
        winnings={winnings}
      />

      <ActionButton
        actionType={actionType}
        myBetState={myBetState}
        roundState={effectiveState}
        disabled={buttonDisabled}
        onClick={handleClick}
        multiplier={myBetMultiplier ?? 1.0}
      />

      <BetMessages error={betError} showInsufficientBalance={showInsufficientBalance} />

      {(!connected || effectiveState === 'betting') && (
        <BetInput
          value={betAmount}
          onChange={setBetAmount}
          disabled={inputDisabled}
          balance={balance}
        />
      )}

      <div className="border-t border-slate-800/60 px-5 py-4">
        {!connected ? (
          <button
            type="button"
            onClick={() => setRoundState(NEXT_STATE[effectiveState])}
            className="w-full rounded-lg bg-slate-800/60 px-3 py-2 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-700/60 hover:text-slate-300"
          >
            DEV: cycle state ({effectiveState})
          </button>
        ) : (
          <div className="flex items-center justify-center gap-2 rounded-lg bg-slate-800/40 px-3 py-2 text-xs font-medium text-neon-green">
            <span className="inline-block size-1.5 animate-pulse rounded-full bg-neon-green" />
            LIVE - {isLoadingRound ? 'SYNCING' : effectiveState.toUpperCase()}
          </div>
        )}
      </div>
    </aside>
  );
}
