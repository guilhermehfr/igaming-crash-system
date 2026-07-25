import { useEffect, useRef, useState } from 'react';
import type { RoundState } from '@/shared/lib/socket-types';

export function useFallbackTimer(roundState: RoundState, currentMultiplier?: number) {
  const isDisconnected = currentMultiplier === undefined;
  const [localMult, setLocalMult] = useState(0);
  const fallbackRef = useRef(1);

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

  return { effectiveMult, displayM, crashPoint, isDisconnected };
}
