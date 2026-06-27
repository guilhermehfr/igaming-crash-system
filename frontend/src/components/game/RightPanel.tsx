import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';
import { config } from '@/config';
import { useSocket, type RoundState } from '@/contexts/SocketContext';

type RightPanelProps = {
  roundState: RoundState;
  setRoundState: (s: RoundState) => void;
  connected: boolean;
};

const next: Record<string, RoundState> = {
  betting: 'running',
  running: 'crashed',
  crashed: 'betting',
};

export function RightPanel({ roundState, setRoundState, connected }: RightPanelProps) {
  const { user } = useAuth();
  const { balance, refreshBalance } = useSocket();
  const [betAmount, setBetAmount] = useState(10.0);
  const [myBetId, setMyBetId] = useState<string | null>(null);
  const [myBetAmount, setMyBetAmount] = useState<number>(0);
  const [myBetMultiplier, setMyBetMultiplier] = useState<number | null>(null);
  const [myBetState, setMyBetState] = useState<'none' | 'pending' | 'cashed_out' | 'lost'>('none');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (roundState === 'betting') {
      setMyBetId(null);
      setMyBetState('none');
      setMyBetAmount(0);
      setMyBetMultiplier(null);
    }
  }, [roundState]);

  useEffect(() => {
    if (roundState === 'crashed') {
      if (myBetState === 'pending') {
        setMyBetState('lost');
      }
    }
  }, [roundState, myBetState]);

  const handlePlaceBet = async () => {
    if (!user || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await apiFetch(
        `${config.apiUrl}/games/bets`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amountInMainUnit: betAmount }),
        },
      );
      if (!res.ok) {
        const text = await res.text();
        console.error('Place bet failed:', text);
        return;
      }
      const data = await res.json();
      setMyBetId(data.id);
      setMyBetAmount(data.amountInMainUnit);
      setMyBetState('pending');
      await refreshBalance(user.id);
    } catch (err) {
      console.error('Place bet error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCashOut = async () => {
    if (!myBetId || !user || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await apiFetch(
        `${config.apiUrl}/games/bets/${myBetId}/cash-out`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ multiplier: currentMultiplierRef.current ?? 1.0 }),
        },
      );
      if (!res.ok) {
        const text = await res.text();
        console.error('Cash out failed:', text);
        return;
      }
      const data = await res.json();
      setMyBetState('cashed_out');
      setMyBetMultiplier(data.multiplier);
      await refreshBalance(user.id);
    } catch (err) {
      console.error('Cash out error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const showingBetAmount = myBetState !== 'none' ? myBetAmount : null;
  const busted = myBetState === 'lost';

  let winnings = 0;
  if (myBetState === 'cashed_out' && myBetMultiplier) {
    winnings = myBetAmount * myBetMultiplier;
  }

  if (!connected) {
    return (
      <aside className="flex w-[25rem] shrink-0 flex-col border-l border-slate-800/60 bg-deep-slate/80">
        <PanelContent
          roundState={roundState ?? 'betting'}
          betAmount={betAmount}
          setBetAmount={setBetAmount}
          balance={balance}
          myBetState={myBetState}
          showingBetAmount={showingBetAmount}
          showPayout={false}
          busted={false}
          winnings={0}
          actionLoading={false}
          handlePlaceBet={() => {}}
          handleCashOut={() => {}}
          connected={false}
          setRoundState={setRoundState}
          cashOutMultiplier={1.0}
          notReady={false}
        />
      </aside>
    );
  }

  return (
    <aside className="flex w-[25rem] shrink-0 flex-col border-l border-slate-800/60 bg-deep-slate/80">
      <PanelContent
        roundState={roundState ?? 'betting'}
        betAmount={betAmount}
        setBetAmount={setBetAmount}
        balance={balance}
        myBetState={myBetState}
        showingBetAmount={showingBetAmount}
        showPayout={myBetState === 'cashed_out' || myBetState === 'lost'}
        busted={busted}
        winnings={winnings}
        actionLoading={actionLoading}
        handlePlaceBet={handlePlaceBet}
        handleCashOut={handleCashOut}
        connected={true}
        setRoundState={() => {}}
        cashOutMultiplier={currentMultiplierRef.current ?? 1.0}
        notReady={roundState === null}
      />
    </aside>
  );
}

const currentMultiplierRef = { current: 1.0 };
export function setCurrentMultiplierRef(m: number) {
  currentMultiplierRef.current = m;
}

type PanelContentProps = {
  roundState: 'betting' | 'running' | 'crashed';
  betAmount: number;
  setBetAmount: (n: number | ((prev: number) => number)) => void;
  balance: number | null;
  myBetState: 'none' | 'pending' | 'cashed_out' | 'lost';
  showingBetAmount: number | null;
  showPayout: boolean;
  busted: boolean;
  winnings: number;
  actionLoading: boolean;
  handlePlaceBet: () => void;
  handleCashOut: () => void;
  connected: boolean;
  setRoundState: (s: RoundState) => void;
  cashOutMultiplier: number;
  notReady: boolean;
};

function PanelContent({
  roundState,
  betAmount,
  setBetAmount,
  balance,
  myBetState,
  showingBetAmount,
  showPayout,
  busted,
  winnings,
  actionLoading,
  handlePlaceBet,
  handleCashOut,
  connected,
  setRoundState,
  cashOutMultiplier,
  notReady,
}: PanelContentProps) {
  const positionLabel =
    busted ? 'BUSTED'
    : myBetState === 'cashed_out' ? 'CASHED OUT'
    : myBetState === 'pending' ? 'In Position'
    : roundState === 'betting' ? 'No Position'
    : roundState === 'running' ? 'In Position'
    : roundState === 'crashed' ? 'BUSTED'
    : 'No Position';

  const dotColor =
    busted || myBetState === 'lost' ? 'bg-loss-red'
    : myBetState === 'cashed_out' ? 'bg-neon-green'
    : myBetState === 'pending' ? 'bg-neon-green'
    : roundState === 'running' ? 'bg-neon-green'
    : roundState === 'crashed' ? 'bg-loss-red'
    : 'bg-slate-500';

  const dotGlow = dotColor === 'bg-neon-green' ? 'shadow-[0_0_6px_theme(colors.neon-green/40)]' : '';

  const inputDisabled = roundState !== 'betting' || !connected || myBetState === 'pending' || notReady;
  const inputOpacity = inputDisabled ? 'opacity-40' : '';

  const buttonDisabled =
    notReady ||
    actionLoading ||
    (roundState === 'betting' && (myBetState === 'pending' || balance === null || betAmount <= 0)) ||
    (roundState === 'running' && myBetState !== 'pending');

  const isCrashedState = roundState === 'crashed' || busted;
  const isRunningState = roundState === 'running' && myBetState === 'pending';
  const isLoading = notReady && connected;

  return (
    <>
      <div className="border-b border-slate-800/60 px-5 py-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Balance
          </span>
          <span className="text-sm font-semibold text-cyber-green tabular-nums">
            {balance !== null ? `$${balance.toFixed(2)}` : '---'}
          </span>
        </div>
      </div>

      <div className="border-b border-slate-800/60 px-5 py-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Position Status
          </span>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <span className={`inline-block size-2 rounded-full ${dotColor} ${dotGlow}`} />
            {positionLabel}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
          <span className="text-slate-500">Bet</span>
          <span className="text-right font-medium text-white tabular-nums">
            {showingBetAmount !== null ? `$${showingBetAmount.toFixed(2)}` : '$0.00'}
          </span>
          {showPayout && (
            <>
              <span className="text-slate-500">Payout</span>
              <span
                className={`text-right font-medium tabular-nums ${winnings > 0 ? 'text-neon-green' : 'text-loss-red'}`}
              >
                {winnings > 0 ? `+$${winnings.toFixed(2)}` : '$0.00'}
              </span>
            </>
          )}
          {myBetState === 'pending' && (
            <>
              <span className="text-slate-500">Payout</span>
              <span className="text-right font-medium text-slate-400 tabular-nums">---</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center px-5 py-4">
        <button
          type="button"
          disabled={buttonDisabled}
          onClick={isCrashedState && !connected ? () => setRoundState(next[roundState]) : isRunningState ? handleCashOut : handlePlaceBet}
          className={`group relative flex w-full flex-col items-center justify-center rounded-xl border font-heading font-bold tracking-tight transition-all duration-200 ${
            isRunningState
              ? 'py-6 border-neon-green/70 bg-neon-green text-deep-slate shadow-[0_0_20px_theme(colors.neon-green/25)] hover:bg-neon-green/90 hover:shadow-[0_0_30px_theme(colors.neon-green/40)] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed'
              : roundState === 'betting'
                ? 'py-6 border-slate-600/70 bg-slate-700/60 text-slate-300 hover:border-slate-500/70 hover:bg-slate-700/80 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed'
                : 'py-6 border-loss-red/70 bg-loss-red text-white shadow-[0_0_20px_theme(colors.loss-red/25)] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed bg-[linear-gradient(135deg,transparent_28%,rgba(0,0,0,0.2)_28%,rgba(0,0,0,0.2)_32%,transparent_32%,transparent_64%,rgba(0,0,0,0.15)_64%,rgba(0,0,0,0.15)_68%,transparent_68%)]'
          }`}
        >
          <>
            <span className="text-3xl tracking-wide text-center">
              {actionLoading ? '...' :
                isLoading ? 'LOADING'
                : isRunningState ? 'CASH OUT'
                : roundState === 'betting' ? 'PLACE BET'
                : 'CRASH'}
            </span>
            {isRunningState && (
              <span className="mt-1 text-sm font-medium text-center opacity-80">
                @ {cashOutMultiplier.toFixed(2)}x
              </span>
            )}
          </>
        </button>
      </div>

      <div className="px-5 pb-4">
        <label
          htmlFor="next-bet"
          className="mb-1.5 block text-xs font-medium text-slate-500 uppercase tracking-wider"
        >
          Next Bet
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-500">
            $
          </span>
          <input
            id="next-bet"
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(Number(e.target.value))}
            step="0.50"
            min="0.50"
            disabled={inputDisabled}
            className={`w-full rounded-lg border border-slate-700/60 bg-slate-800/60 py-2.5 pl-7 pr-3 text-sm font-medium text-white tabular-nums placeholder-slate-600 outline-none transition-colors focus:border-neon-green/50 focus:ring-1 focus:ring-neon-green/20 ${inputOpacity} disabled:cursor-not-allowed [&::-webkit-inner-spin-button]:appearance-none`}
          />
        </div>
      </div>

      <div className="flex gap-2 px-5 pb-4">
        {[
          { label: '1x', fn: () => setBetAmount(Math.max(0.50, Math.round((balance ?? 0) * 0.01 * 100) / 100)) },
          { label: '2x', fn: () => setBetAmount(Math.max(0.50, Math.min(balance ?? 0, Math.round((balance ?? 0) * 0.02 * 100) / 100))) },
          { label: 'MAX', fn: () => setBetAmount(Math.max(0.50, balance ?? 0)) },
        ].map(({ label, fn }) => (
          <button
            key={label}
            type="button"
            disabled={inputDisabled}
            onClick={fn}
            className={`flex-1 rounded-lg border border-slate-700/50 bg-slate-800/40 py-2 text-xs font-semibold text-slate-400 transition-colors hover:border-slate-600/50 hover:bg-slate-700/50 hover:text-slate-200 active:scale-[0.97] ${inputOpacity} disabled:cursor-not-allowed`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="border-t border-slate-800/60 px-5 py-4">
        {!connected ? (
          <button
            type="button"
            onClick={() => setRoundState(next[roundState])}
            className="w-full rounded-lg bg-slate-800/60 px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-700/60 hover:text-slate-300 transition-colors"
          >
            DEV: cycle state ({roundState})
          </button>
        ) : (
          <div className="flex items-center justify-center gap-2 rounded-lg bg-slate-800/40 px-3 py-2 text-xs font-medium text-neon-green">
            <span className="inline-block size-1.5 rounded-full bg-neon-green animate-pulse" />
            LIVE — {isLoading ? 'SYNCING' : roundState.toUpperCase()}
          </div>
        )}
      </div>
    </>
  );
}
