import { Lock } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useCanvasRenderer } from '@/shared/lib/canvas/useCanvasRenderer';
import { formatMultiplier } from '@/shared/lib/format';
import { roundStateToTextColor } from '@/shared/lib/round-state';
import type { RevealedSeed, RoundState } from '@/shared/lib/socket-types';
import { gridBackgroundStyle } from '@/shared/lib/styles';

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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fallbackRef = useRef(1);
  const [localMult, setLocalMult] = useState(0);

  const isDisconnected = currentMultiplier === undefined;

  const prevStateRef = useRef(roundState);
  const runningStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (roundState === 'running' && prevStateRef.current !== 'running') {
      runningStartRef.current = Date.now();
    } else if (roundState !== 'running') {
      runningStartRef.current = null;
    }
    prevStateRef.current = roundState;
  }, [roundState]);

  useEffect(() => {
    if (roundState === 'betting') {
      fallbackRef.current = 1;
      setLocalMult(0);
      return;
    }
    if (roundState === 'running' && isDisconnected) {
      fallbackRef.current = 1;
      const id = setInterval(() => {
        fallbackRef.current += 0.01;
        setLocalMult(fallbackRef.current);
      }, 100);
      return () => clearInterval(id);
    }
  }, [roundState, isDisconnected]);

  const effectiveMult = isDisconnected
    ? roundState === 'betting'
      ? 0
      : localMult
    : (currentMultiplier ?? 0);

  const displayM = effectiveMult === 0 && roundState === 'betting' ? 1.0 : effectiveMult;

  const crashPoint = roundState === 'crashed' ? effectiveMult : Math.max(effectiveMult * 2, 3);

  useCanvasRenderer(canvasRef, roundState, effectiveMult, crashPoint, runningStartRef.current);

  if (roundState === null) {
    return (
      <div className="relative flex flex-1 overflow-hidden">
        <div className="absolute inset-0" style={gridBackgroundStyle()} />
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 overflow-hidden">
      <div className="absolute inset-0" style={gridBackgroundStyle()} />

      <canvas ref={canvasRef} className="absolute inset-0 z-[1]" />

      <div className="absolute top-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-1.5">
        <span className="text-xs font-medium uppercase tracking-widest text-slate-500">
          ROUND #{roundNumber}
        </span>
        {seedHash && (
          <SeedRevealPanel seedHash={seedHash} seedHistory={seedHistory} revealSeed={revealSeed} />
        )}
      </div>

      <div className="absolute inset-0 z-10 flex items-center justify-center">
        <span
          className={`font-heading font-bold tabular-nums tracking-tight mt-16 md:mt-0 ${roundStateToTextColor(roundState)}`}
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
          {formatMultiplier(displayM)}
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
