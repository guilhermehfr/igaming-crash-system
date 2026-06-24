import { useEffect, useState } from 'react';

type RoundState = 'betting' | 'running' | 'crashed';

type RightPanelProps = {
  roundState: RoundState;
  setRoundState: (s: RoundState) => void;
  connected: boolean;
};

const next: Record<RoundState, RoundState> = {
  betting: 'running',
  running: 'crashed',
  crashed: 'betting',
};

const mock = {
  betting: { bet: 10.0, payout: 0, multiplier: 1.0, inPosition: false, busted: false },
  running: { bet: 10.0, payout: 25.0, multiplier: 2.5, inPosition: true, busted: false },
  crashed: { bet: 10.0, payout: 0, multiplier: 3.45, inPosition: false, busted: true },
};

export function RightPanel({ roundState, setRoundState, connected }: RightPanelProps) {
  const data = mock[roundState];
  const [betAmount, setBetAmount] = useState(10.0);

  useEffect(() => {
    setBetAmount(mock[roundState].bet);
  }, [roundState]);

  const positionLabel =
    roundState === 'betting' ? 'No Position' : roundState === 'running' ? 'In Position' : 'CRASH';
  const dotColor =
    roundState === 'running'
      ? 'bg-neon-green'
      : roundState === 'crashed'
        ? 'bg-loss-red'
        : 'bg-slate-500';
  const dotGlow = roundState === 'running' ? 'shadow-[0_0_6px_theme(colors.neon-green/40)]' : '';

  const inputDisabled = roundState !== 'betting';
  const inputOpacity = inputDisabled ? 'opacity-40' : '';

  return (
    <aside className="flex w-[35rem] shrink-0 flex-col border-l border-slate-800/60 bg-deep-slate/80">
      {/* Position status */}
      <div className="border-b border-slate-800/60 px-5 py-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Position Status
          </span>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <span className={`inline-block size-2 rounded-full ${dotColor} ${dotGlow}`} />
            {positionLabel}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
          <span className="text-slate-500">Bet</span>
          <span className="text-right font-medium text-white tabular-nums">
            ${betAmount.toFixed(2)}
          </span>
          <span className="text-slate-500">Payout</span>
          <span
            className={`text-right font-medium tabular-nums ${data.payout > 0 ? 'text-neon-green' : 'text-slate-400'}`}
          >
            {data.payout > 0 ? `+$${data.payout.toFixed(2)}` : '$0.00'}
          </span>
        </div>
      </div>

      {/* Cash Out / Place Bet button */}
      <div className="flex items-center justify-center px-5 py-4">
        <button
          type="button"
          className={`group relative flex w-full flex-col items-center justify-center rounded-xl border font-heading font-bold tracking-tight transition-all duration-200 ${
            roundState === 'running'
              ? 'py-6 border-neon-green/70 bg-neon-green text-deep-slate shadow-[0_0_20px_theme(colors.neon-green/25)] hover:bg-neon-green/90 hover:shadow-[0_0_30px_theme(colors.neon-green/40)] active:scale-[0.97]'
              : roundState === 'betting'
                ? 'py-6 border-slate-600/70 bg-slate-700/60 text-slate-300 hover:border-slate-500/70 hover:bg-slate-700/80 active:scale-[0.97]'
                : 'py-6 border-loss-red/70 bg-loss-red text-white shadow-[0_0_20px_theme(colors.loss-red/25)] active:scale-[0.97] bg-[linear-gradient(135deg,transparent_28%,rgba(0,0,0,0.2)_28%,rgba(0,0,0,0.2)_32%,transparent_32%,transparent_64%,rgba(0,0,0,0.15)_64%,rgba(0,0,0,0.15)_68%,transparent_68%)]'
          }`}
        >
          <>
            <span className="text-3xl tracking-wide text-center">
              {roundState === 'betting'
                ? 'PLACE BET'
                : roundState === 'running'
                  ? 'CASH OUT'
                  : 'CRASH'}
            </span>
            {roundState !== 'betting' && (
              <span className="mt-1 text-sm font-medium text-center opacity-80">
                @ {data.multiplier.toFixed(2)}x
              </span>
            )}
          </>
        </button>
      </div>

      {/* Next Bet input */}
      <div className="px-5 pb-4">
        <label
          htmlFor="next-bet"
          className="mb-1.5 block text-xs font-medium text-slate-500 uppercase tracking-wider"
        >
          Next Bet
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-500">
            $
          </span>
          <input
            id="next-bet"
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(Number(e.target.value))}
            step="0.50"
            min="0.50"
            disabled={inputDisabled}
            className={`w-full rounded-lg border border-slate-700/60 bg-slate-800/60 py-2.5 pl-7 pr-3 text-sm font-medium text-white tabular-nums placeholder-slate-600 outline-none transition-colors focus:border-neon-green/50 focus:ring-1 focus:ring-neon-green/20 ${inputOpacity} disabled:cursor-not-allowed [&::-webkit-inner-spin-button]:appearance-none`}
          />
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 px-5 pb-4">
        {[
          { label: '1x', fn: () => setBetAmount(10.0) },
          { label: '2x', fn: () => setBetAmount((v) => v * 2) },
          { label: 'MAX', fn: () => setBetAmount(100.0) },
        ].map(({ label, fn }) => (
          <button
            key={label}
            type="button"
            disabled={inputDisabled}
            onClick={fn}
            className={`flex-1 rounded-lg border border-slate-700/50 bg-slate-800/40 py-2 text-xs font-semibold text-slate-400 transition-colors hover:border-slate-600/50 hover:bg-slate-700/50 hover:text-slate-200 active:scale-[0.97] ${inputOpacity} disabled:cursor-not-allowed`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Dev cycle button or Live indicator */}
      <div className="border-t border-slate-800/60 px-5 py-4">
        {!connected ? (
          <button
            type="button"
            onClick={() => setRoundState(next[roundState])}
            className="w-full rounded-lg bg-slate-800/60 px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-700/60 hover:text-slate-300 transition-colors"
          >
            DEV: cycle state ({roundState})
          </button>
        ) : (
          <div className="flex items-center justify-center gap-2 rounded-lg bg-slate-800/40 px-3 py-2 text-xs font-medium text-neon-green">
            <span className="inline-block size-1.5 rounded-full bg-neon-green animate-pulse" />
            LIVE — {roundState.toUpperCase()}
          </div>
        )}
      </div>
    </aside>
  );
}
