import { Lock } from 'lucide-react';
import type { RevealedSeed, RoundState } from '@/contexts/SocketContext';

export function GameCanvas({
  roundState,
  roundNumber,
  currentMultiplier,
  seedHash,
  seedHistory,
  revealSeed,
}: {
  roundState: RoundState;
  roundNumber: number;
  currentMultiplier?: number;
  seedHash: string;
  seedHistory: RevealedSeed[];
  revealSeed: () => Promise<void>;
}) {
  if (roundState === null) {
    return (
      <div className="relative flex flex-1 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 1px, transparent 1px, transparent 60px),' +
              'repeating-linear-gradient(90deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 1px, transparent 1px, transparent 60px)',
          }}
        />
      </div>
    );
  }

  const multiplier = currentMultiplier ?? 1.0;
  const displayM = roundState === 'betting' ? 1.0 : multiplier;
  const textColor =
    roundState === 'crashed'
      ? 'text-loss-red'
      : roundState === 'running'
        ? 'text-neon-green'
        : 'text-slate-500';

  return (
    <div className="relative flex flex-1 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 1px, transparent 1px, transparent 60px),' +
            'repeating-linear-gradient(90deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 1px, transparent 1px, transparent 60px)',
        }}
      />

      <div className="absolute top-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1.5 z-10">
        <span className="text-xs font-medium uppercase tracking-widest text-slate-500">
          ROUND #{roundNumber}
        </span>
        {seedHash && (
          <SeedRevealPanel seedHash={seedHash} seedHistory={seedHistory} revealSeed={revealSeed} />
        )}
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={`font-heading font-bold tabular-nums tracking-tight transition-colors duration-200 ${textColor}`}
          style={{
            fontSize: 'clamp(3rem, 14vw, 9rem)',
            lineHeight: 1,
            filter:
              roundState === 'running'
                ? 'drop-shadow(0 0 30px rgba(34,255,122,0.25))'
                : roundState === 'crashed'
                  ? 'drop-shadow(0 0 30px rgba(255,68,68,0.25))'
                  : 'none',
          }}
        >
          {displayM.toFixed(2)}x
        </span>
      </div>
    </div>
  );
}

function SeedRevealPanel({
  seedHash,
  seedHistory,
  revealSeed,
}: {
  seedHash: string;
  seedHistory: RevealedSeed[];
  revealSeed: () => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [revealing, setRevealing] = useState(false);

  const handleClick = async () => {
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
        <div className="flex flex-col gap-1 max-h-48 overflow-y-auto rounded-lg border border-slate-700/50 bg-slate-900/90 px-2.5 py-2 w-72">
          {seedHistory.map((entry, i) => (
            <div key={entry.serverSeedHash + i} className="flex flex-col gap-0.5 border-b border-slate-700/30 pb-1.5 last:border-0 last:pb-0">
              <span className="text-[10px] text-slate-500">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>
              <span className="text-[11px] font-mono text-slate-300 break-all">
                serverSeed: {entry.serverSeed}
              </span>
              <span className="text-[10px] font-mono text-slate-500 break-all">
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

import { useState } from 'react';
