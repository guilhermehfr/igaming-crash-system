import { formatCurrency } from '@/lib/format';
import { betStateToColor, betStateToGlow, betStateToLabel } from '@/lib/round-state';

type PositionStatusProps = {
  myBetState: 'none' | 'pending' | 'cashed_out' | 'lost';
  showingBetAmount: number | null;
  showPayout: boolean;
  winnings: number;
};

export function PositionStatus({
  myBetState,
  showingBetAmount,
  showPayout,
  winnings,
}: PositionStatusProps) {
  return (
    <div className="border-b border-slate-800/60 px-5 py-4" aria-live="polite">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
          Position Status
        </span>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
          <span
            className={`inline-block size-2 rounded-full ${betStateToColor(myBetState)} ${betStateToGlow(myBetState)}`}
          />
          {betStateToLabel(myBetState)}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
        <span className="text-slate-500">Bet</span>
        <span className="text-right font-medium tabular-nums text-white">
          {showingBetAmount !== null ? formatCurrency(showingBetAmount) : '$0.00'}
        </span>

        {showPayout && (
          <>
            <span className="text-slate-500">Payout</span>
            <span
              className={`text-right font-medium tabular-nums ${winnings > 0 ? 'text-neon-green' : 'text-loss-red'}`}
            >
              {winnings > 0 ? `+${formatCurrency(winnings)}` : '$0.00'}
            </span>
          </>
        )}

        {myBetState === 'pending' && (
          <>
            <span className="text-slate-500">Payout</span>
            <span className="text-right font-medium tabular-nums text-slate-400">---</span>
          </>
        )}
      </div>
    </div>
  );
}
