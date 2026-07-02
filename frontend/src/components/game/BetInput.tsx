import { BET, calculate1xPreset, calculate2xPreset, calculateMaxPreset } from '@/lib/bet-utils';

type BetInputProps = {
  value: number;
  onChange: (n: number | ((prev: number) => number)) => void;
  disabled: boolean;
  balance: number | null;
};

export function BetInput({ value, onChange, disabled, balance }: BetInputProps) {
  const inputOpacity = disabled ? 'opacity-40' : '';

  const presets = [
    { label: '1x', fn: () => onChange(calculate1xPreset(balance ?? 0)) },
    {
      label: '2x',
      fn: () => onChange(calculate2xPreset(value, balance ?? 0)),
    },
    { label: 'MAX', fn: () => onChange(calculateMaxPreset(balance ?? 0)) },
  ];

  return (
    <>
      <div className="px-5 pb-4">
        <label
          htmlFor="next-bet"
          className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500"
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
            value={value}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === '' || raw === '0.') {
                onChange(0);
                return;
              }
              const val = parseFloat(raw);
              if (!Number.isNaN(val) && val >= 0) onChange(val);
            }}
            step={BET.STEP}
            min={BET.MIN}
            disabled={disabled}
            className={`w-full rounded-lg border border-slate-700/60 bg-slate-800/60 py-2.5 pl-7 pr-3 text-sm font-medium tabular-nums text-white placeholder-slate-600 outline-none transition-colors focus:border-neon-green/50 focus:ring-1 focus:ring-neon-green/20 ${inputOpacity} disabled:cursor-not-allowed [&::-webkit-inner-spin-button]:appearance-none`}
          />
        </div>
      </div>

      <div className="flex gap-2 px-5 pb-4">
        {presets.map(({ label, fn }) => (
          <button
            key={label}
            type="button"
            disabled={disabled}
            onClick={fn}
            className={`flex-1 rounded-lg border border-slate-700/50 bg-slate-800/40 py-2 text-xs font-semibold text-slate-400 transition-colors hover:border-slate-600/50 hover:bg-slate-700/50 hover:text-slate-200 active:scale-[0.97] ${inputOpacity} disabled:cursor-not-allowed`}
          >
            {label}
          </button>
        ))}
      </div>
    </>
  );
}
