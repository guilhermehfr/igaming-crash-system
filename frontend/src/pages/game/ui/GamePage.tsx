import { useState } from 'react';
import { SocketProvider, useSocket } from '@/app/providers/SocketContext';
import type { RoundState } from '@/shared/lib/socket-types';
import { GameCanvas } from '@/widgets/game-canvas';
import { LiveBets } from '@/widgets/live-bets';
import { RightPanel } from '@/widgets/right-panel';
import { TopBar } from '@/widgets/top-bar';

function GamePageContent() {
  const {
    roundState,
    roundNumber,
    currentMultiplier,
    connected,
    seedHash,
    seedHistory,
    revealSeed,
  } = useSocket();

  const [localState, setLocalState] = useState<RoundState>('betting');
  const [localRound, setLocalRound] = useState(8291);

  const effectiveState = connected ? roundState : localState;
  const effectiveRound = connected ? roundNumber : localRound;

  const handleLocalState = (state: RoundState) => {
    setLocalState(state);
    if (state === 'betting') setLocalRound((n) => n + 1);
  };

  return (
    <main className="flex min-h-dvh w-full flex-col bg-deep-slate">
      <TopBar />
      <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
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
