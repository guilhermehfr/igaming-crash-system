import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { CrashHistoryPills } from '@/components/game/CrashHistoryPills';

const mockHistory = [
  { multiplier: 3.45, busted: false },
  { multiplier: 1.22, busted: true },
  { multiplier: 12.05, busted: false },
  { multiplier: 1.85, busted: true },
  { multiplier: 1.98, busted: false },
  { multiplier: 4.5, busted: true },
  { multiplier: 2.11, busted: false },
  { multiplier: 1.5, busted: true },
  { multiplier: 9.5, busted: false },
  { multiplier: 8.83, busted: true },
];

export function TopBar() {
  const [pillsOpen, setPillsOpen] = useState(false);

  return (
    <header className="border-b border-slate-800/60 px-4 py-3 lg:px-6">
      <div className="flex items-center justify-between lg:grid lg:grid-cols-3 lg:items-center">
        <div className="flex items-center gap-4">
          <span className="text-white font-bold font-heading tracking-tight text-base lg:text-lg">
            CRASH SYSTEM
          </span>

          <span className="hidden lg:flex items-center gap-1.5 rounded-full bg-neon-green/10 border border-neon-green/30 px-3 py-1 text-xs font-medium text-neon-green">
            <span className="size-1.5 rounded-full bg-neon-green" />
            CONNECTED
          </span>
        </div>

        <button
          type="button"
          onClick={() => setPillsOpen((v) => !v)}
          className="lg:hidden flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-white transition-colors"
        >
          <span className="bg-slate-800/60 rounded-full px-2 py-0.5">{mockHistory.length}</span>
          {pillsOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </button>

        <div className="hidden lg:flex justify-center">
          <CrashHistoryPills history={mockHistory} />
        </div>

        <div className="flex items-center gap-4 justify-self-end">
          <span className="text-xs text-white">OPERATOR_01</span>
          <span className="text-cyber-green font-semibold text-sm lg:text-base">$1,248.50</span>
        </div>
      </div>

      {pillsOpen && (
        <div className="mt-3 lg:hidden">
          <CrashHistoryPills history={mockHistory} />
        </div>
      )}
    </header>
  );
}
