import { useState } from 'react';
import type { RoundState } from '@/shared/lib/socket-types';

export function useDisconnectedGame() {
  const [localState, setLocalState] = useState<RoundState>('betting');
  const [localRound, setLocalRound] = useState(8291);

  const handleLocalState = (state: RoundState) => {
    setLocalState(state);
    if (state === 'betting') setLocalRound((n) => n + 1);
  };

  return { localState, localRound, handleLocalState };
}
