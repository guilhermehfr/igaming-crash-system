import { useEffect, useState } from 'react';
import { GameCanvas } from '@/components/game/GameCanvas';
import { LiveBets } from '@/components/game/LiveBets';
import { RightPanel, setCurrentMultiplierRef } from '@/components/game/RightPanel';
import { TopBar } from '@/components/game/TopBar';
import type { RoundState } from '@/contexts/SocketContext';
import { SocketProvider, useSocket } from '@/contexts/SocketContext';

function GamePageContent() {
  const { roundState, roundNumber, currentMultiplier, connected, seedHash, seedHistory, revealSeed } = useSocket();

  const [localState, setLocalState] = useState<RoundState>('betting');
  const [localRound, setLocalRound] = useState(8291);

  useEffect(() => {
    setCurrentMultiplierRef(currentMultiplier);
  }, [currentMultiplier]);

  const effectiveState = connected ? roundState : localState;
  const effectiveRound = connected ? roundNumber : localRound;

  const handleLocalState = (state: RoundState) => {
    setLocalState(state);
    if (state === 'betting') setLocalRound((n) => n + 1);
  };

  return (
    <main className="flex min-h-dvh w-full flex-col bg-deep-slate">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <LiveBets />
        <GameCanvas
          roundState={effectiveState}
          roundNumber={effectiveRound}
          currentMultiplier={connected ? currentMultiplier : undefined}
          seedHash={connected ? seedHash : ''}
          seedHistory={seedHistory}
          revealSeed={revealSeed}
        />
        <RightPanel
          roundState={effectiveState}
          setRoundState={connected ? () => {} : handleLocalState}
          connected={connected}
        />
      </div>
    </main>
  );
}

export function GamePage() {
  return (
    <SocketProvider>
      <GamePageContent />
    </SocketProvider>
  );
}
