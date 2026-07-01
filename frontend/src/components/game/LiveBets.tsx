import { useSocket } from '@/contexts/SocketContext';

const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function LiveBets() {
  const { bets, playingCount } = useSocket();

  return (
    <section className="hidden md:flex w-[25rem] shrink-0 flex-col overflow-hidden border-r border-slate-800/60 px-6 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Live Bets
        </h2>
        <span className="rounded-full bg-neon-green/10 border border-neon-green/30 px-3 py-0.5 text-xs font-medium text-neon-green">
          {playingCount} Playing
        </span>
      </div>

      {/* Column labels */}
      <div className="flex items-center pb-2 text-[11px] font-medium uppercase tracking-wider text-slate-600">
        <span className="flex-1">Player</span>
        <span className="flex-1 text-left">Bet</span>
        <span className="flex-1 text-left">Payout</span>
      </div>

      {/* Scrollable list */}
      <ul className="flex flex-1 flex-col overflow-y-auto">
        {bets.map((bet, i) => {
          let displayText: string;
          let dotColor: string;

          if (bet.outcome.type === 'pending') {
            displayText = '-';
            dotColor = 'bg-slate-500';
          } else if (bet.outcome.type === 'cashed') {
            displayText = `${bet.outcome.multiplier.toFixed(2)}x`;
            dotColor = 'bg-neon-green';
          } else {
            displayText = 'LOST';
            dotColor = 'bg-loss-red';
          }

          return (
            <li
              key={bet.id}
              className={`flex items-center px-3 py-2 text-sm border-b border-slate-800/20 last:border-b-0 ${i % 2 === 0 ? 'bg-slate-800/20' : ''}`}
            >
              <span className="flex-1 truncate text-slate-300">{bet.displayName}</span>
              <span className="flex-1 font-medium text-white tabular-nums">${fmt(bet.amount)}</span>
              <span className="flex flex-1 items-center gap-1.5 font-medium tabular-nums text-slate-300">
                <span className={`inline-block size-1.5 rounded-full ${dotColor}`} />
                {displayText}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
