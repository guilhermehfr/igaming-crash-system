import { type ActionType, getActionLabel } from '@/lib/action-button';
import { formatMultiplier } from '@/lib/format';

type ActionButtonProps = {
  actionType: ActionType;
  myBetState: 'none' | 'pending' | 'cashed_out' | 'lost';
  roundState: 'betting' | 'running' | 'crashed';
  disabled: boolean;
  onClick: () => void;
  multiplier: number;
};

export function ActionButton({
  actionType,
  myBetState,
  roundState,
  disabled,
  onClick,
  multiplier,
}: ActionButtonProps) {
  const isCrashedState = roundState === 'crashed' || myBetState === 'lost';

  const baseClass =
    'group relative flex w-full flex-col items-center justify-center rounded-xl border font-heading font-bold tracking-tight transition-all duration-200';

  const variantClass =
    myBetState === 'cashed_out'
      ? 'py-6 border-emerald-700/60 bg-emerald-800/60 text-emerald-400 cursor-not-allowed'
      : isCrashedState
        ? 'py-6 border-red-800/40 bg-red-950 text-red-400/60 cursor-not-allowed bg-[linear-gradient(135deg,transparent_28%,rgba(0,0,0,0.2)_28%,rgba(0,0,0,0.2)_32%,transparent_32%,transparent_64%,rgba(0,0,0,0.15)_64%,rgba(0,0,0,0.15)_68%,transparent_68%)]'
        : actionType === 'cash_out'
          ? 'py-6 border-neon-green/70 bg-neon-green text-deep-slate shadow-[0_0_20px_theme(colors.neon-green/25)] hover:bg-neon-green/90 hover:shadow-[0_0_30px_theme(colors.neon-green/40)] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed'
          : 'py-6 border-slate-600/70 bg-slate-700/60 text-slate-300 hover:border-slate-500/70 hover:bg-slate-700/80 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed';

  const isRunningState = actionType === 'cash_out';

  return (
    <div className="flex items-center justify-center px-5 py-4">
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={`${baseClass} ${variantClass}`}
      >
        <span className="text-3xl tracking-wide text-center">{getActionLabel(actionType)}</span>
        {isRunningState && (
          <span className="mt-1 text-sm font-medium text-center opacity-80">
            @ {formatMultiplier(multiplier)}
          </span>
        )}
      </button>
    </div>
  );
}
