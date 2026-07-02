import { useSocket } from '@/contexts/SocketContext';
import { formatCurrency } from '@/lib/format';
import { betOutcomeToColor, betOutcomeToDisplayText } from '@/lib/round-state';

export function LiveBets() {
  const { bets, playingCount } = useSocket();

  return (
    <section className="hidden w-[25rem] shrink-0 flex-col overflow-hidden border-r border-slate-800/60 px-6 pt-6 md:flex">
      <div className="flex items-center justify-between pb-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Live Bets
        </h2>
        <span className="rounded-full border border-neon-green/30 bg-neon-green/10 px-3 py-0.5 text-xs font-medium text-neon-green">
          {playingCount} Playing
        </span>
      </div>

      <div className="flex items-center pb-2 text-[11px] font-medium uppercase tracking-wider text-slate-600">
        <span className="flex-1">Player</span>
        <span className="flex-1 text-left">Bet</span>
        <span className="flex-1 text-left">Payout</span>
      </div>

      <ul className="flex flex-1 flex-col overflow-y-auto" aria-live="polite">
        {bets.map((bet, i) => (
          <li
            key={bet.id}
            className={`flex items-center border-b border-slate-800/20 px-3 py-2 text-sm last:border-b-0 ${i % 2 === 0 ? 'bg-slate-800/20' : ''}`}
          >
            <span className="flex-1 truncate text-slate-300">{bet.displayName}</span>
            <span className="flex-1 font-medium tabular-nums text-white">
              {formatCurrency(bet.amount)}
            </span>
            <span className="flex flex-1 items-center gap-1.5 font-medium tabular-nums text-slate-300">
              <span
                className={`inline-block size-1.5 rounded-full ${betOutcomeToColor(bet.outcome)}`}
              />
              {betOutcomeToDisplayText(bet.outcome)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
