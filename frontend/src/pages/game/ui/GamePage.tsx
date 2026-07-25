import { SocketProvider, useSocket } from '@/app/providers';
import { useDisconnectedGame } from '@/pages/game/model/useDisconnectedGame';
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

  const { localState, handleLocalState } = useDisconnectedGame();

  const effectiveState = connected ? roundState : localState;
  const effectiveRound = connected ? roundNumber : undefined;

  return (
    <main className="flex min-h-dvh w-full flex-col bg-deep-slate">
      <TopBar />
      <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
        <LiveBets />
        <GameCanvas
          roundState={effectiveState}
          roundNumber={effectiveRound ?? 0}
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
