import { formatCurrency } from '@/lib/format';

type BalanceDisplayProps = {
  balance: number | null;
};

export function BalanceDisplay({ balance }: BalanceDisplayProps) {
  return (
    <div className="flex items-center justify-between border-b border-slate-800/60 px-5 py-3">
      <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Balance</span>
      <span className="text-sm font-semibold tabular-nums text-cyber-green" aria-live="polite">
        {balance !== null ? formatCurrency(balance) : '---'}
      </span>
    </div>
  );
}
