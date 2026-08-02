import { useEffect, useRef } from 'react';
import { formatMultiplier } from '@/shared/lib/format';
import { roundStateToTextColor } from '@/shared/lib/round-state';
import type { RevealedSeed, RoundState } from '@/shared/lib/socket-types';
import { gridBackgroundStyle } from '@/shared/lib/styles';
import { useCanvasRenderer } from '@/widgets/game-canvas/model/useCanvasRenderer';
import { useFallbackTimer } from '@/widgets/game-canvas/model/useFallbackTimer';
import { SeedRevealPanel } from '@/widgets/game-canvas/ui/SeedRevealPanel';

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

  const { effectiveMult, displayM, crashPoint } = useFallbackTimer(roundState, currentMultiplier);

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

      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
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
