import { Lock } from 'lucide-react';
import { useState } from 'react';
import type { RevealedSeed } from '@/shared/lib/socket-types';

type SeedRevealPanelProps = {
  seedHash: string;
  seedHistory: RevealedSeed[];
  revealSeed: () => Promise<void>;
};

export function SeedRevealPanel({ seedHash, seedHistory, revealSeed }: SeedRevealPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [revealing, setRevealing] = useState(false);

  const handleClick = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    if (revealing) return;
    setRevealing(true);
    await revealSeed();
    setRevealing(false);
    setExpanded(true);
  };

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={revealing}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-700/50 bg-slate-800/60 px-2.5 py-0.5 text-[11px] font-medium text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-300 disabled:opacity-50"
      >
        <Lock className="size-3" />
        SEED HASH: {seedHash.slice(0, 4)}...{seedHash.slice(-3)}
      </button>

      {expanded && seedHistory.length > 0 && (
        <div className="custom-scrollbar flex max-h-48 w-72 flex-col gap-1 overflow-y-auto rounded-lg border border-slate-700/50 bg-slate-900/90 px-2.5 py-2">
          {seedHistory.map((entry) => (
            <div
              key={`${entry.timestamp}-${entry.serverSeedHash}`}
              className="flex flex-col gap-0.5 border-b border-slate-700/30 pb-1.5 last:border-0 last:pb-0"
            >
              <span className="text-[10px] text-slate-500">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>
              <span className="text-[11px] font-mono break-all text-slate-300">
                serverSeed: {entry.serverSeed}
              </span>
              <span className="text-[10px] font-mono break-all text-slate-500">
                hash: {entry.serverSeedHash}
              </span>
              <span className="text-[10px] text-slate-500">
                nonce: {entry.nonce} | clientSeed: {entry.clientSeed.slice(0, 8)}...
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
