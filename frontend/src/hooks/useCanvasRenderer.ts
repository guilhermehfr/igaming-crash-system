import { useEffect, useRef } from 'react';
import { computePoints, drawLine } from '@/lib/canvas/crash-curve';

type RoundState = 'betting' | 'running' | 'crashed' | null;

export function useCanvasRenderer(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  roundState: RoundState,
  currentMultiplier: number,
  crashPoint: number,
  runningStartTime: number | null,
) {
  const multRef = useRef(currentMultiplier);
  multRef.current = currentMultiplier;

  const cpRef = useRef(crashPoint);
  cpRef.current = crashPoint;

  const rsRef = useRef(runningStartTime);
  rsRef.current = runningStartTime;

  const totalElapsedRef = useRef(0);
  const frozenPointsRef = useRef<{ x: number; y: number }[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const setupSize = () => {
      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    setupSize();

    const ro = new ResizeObserver(setupSize);
    ro.observe(parent);

    let id: number | null = null;

    if (roundState === 'running') {
      totalElapsedRef.current = 0;
      frozenPointsRef.current = [];

      const render = (now: number) => {
        const rect = parent.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;

        const start = rsRef.current;
        if (start !== null) {
          totalElapsedRef.current = now - start;
        }

        const elapsed = totalElapsedRef.current;
        const cp = cpRef.current;

        ctx.clearRect(0, 0, w, h);

        const points = computePoints(elapsed, cp, w, h);
        if (points.length > 1) {
          frozenPointsRef.current = points;
          drawLine(ctx, points, '#00ff88');
        }

        id = requestAnimationFrame(render);
      };

      id = requestAnimationFrame(render);
    }

    if (roundState === 'crashed') {
      const rect = parent.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      ctx.clearRect(0, 0, w, h);

      const points =
        frozenPointsRef.current.length > 1
          ? frozenPointsRef.current
          : computePoints(totalElapsedRef.current, totalElapsedRef.current, w, h);

      if (points.length > 1) {
        drawLine(ctx, points, '#ff4444');
      }
    }

    if (roundState === 'betting' || roundState === null) {
      const rect = parent.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
    }

    return () => {
      if (id !== null) cancelAnimationFrame(id);
      ro.disconnect();
    };
  }, [canvasRef, roundState]);
}
