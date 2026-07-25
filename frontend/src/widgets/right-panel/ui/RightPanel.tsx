import { useAuth, useSocket } from '@/app/providers';
import { BalanceDisplay } from '@/entities/wallet';
import { ActionButton, BetInput, BetMessages, PositionStatus, useBet } from '@/features/place-bet';
import type { RoundState } from '@/shared/lib/socket-types';
import { useRightPanel } from '@/widgets/right-panel/model/useRightPanel';

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

  const {
    effectiveState,
    isLoadingRound,
    actionType,
    showingBetAmount,
    inputDisabled,
    buttonDisabled,
    handleClick,
    cycleState,
  } = useRightPanel(
    roundState,
    connected,
    myBetState,
    myBetAmount,
    actionLoading,
    betAmount,
    balance,
    handlePlaceBet,
    handleCashOut,
    setRoundState,
  );

  if (!user) return null;

  return (
    <aside className="flex w-full shrink-0 flex-col border-t border-slate-800/60 bg-deep-slate/80 md:w-100 md:border-l">
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
            onClick={cycleState}
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
