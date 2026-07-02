import { useCallback, useEffect, useRef, useState } from 'react';
import { config } from '@/config';
import { useAuth } from '@/contexts/AuthContext';
import type { RoundState } from '@/contexts/SocketContext';
import { useSocket } from '@/contexts/SocketContext';
import { apiFetch } from '@/lib/api';
import { BET, calculateWinnings } from '@/lib/bet-utils';

export function useBet(roundState: RoundState) {
  const { user } = useAuth();
  const { balance, refreshBalance, currentMultiplier } = useSocket();

  const [betAmount, setBetAmount] = useState<number>(BET.DEFAULT);
  const [myBetId, setMyBetId] = useState<string | null>(null);
  const [myBetAmount, setMyBetAmount] = useState(0);
  const [myBetMultiplier, setMyBetMultiplier] = useState<number | null>(null);
  const [myBetState, setMyBetState] = useState<'none' | 'pending' | 'cashed_out' | 'lost'>('none');
  const [actionLoading, setActionLoading] = useState(false);
  const [betError, setBetError] = useState<string | null>(null);
  const currentMultiplierRef = useRef(1.0);

  useEffect(() => {
    currentMultiplierRef.current = currentMultiplier;
  }, [currentMultiplier]);

  useEffect(() => {
    if (roundState === 'betting') {
      setMyBetId(null);
      setMyBetState('none');
      setMyBetAmount(0);
      setMyBetMultiplier(null);
      setBetError(null);
    }
  }, [roundState]);

  useEffect(() => {
    if (roundState === 'crashed' && myBetState === 'pending') {
      setMyBetState('lost');
    }
  }, [roundState, myBetState]);

  const showInsufficientBalance =
    betError === null &&
    betAmount > (balance ?? 0) &&
    roundState === 'betting' &&
    myBetState === 'none';

  const winnings =
    myBetState === 'cashed_out' && myBetMultiplier
      ? calculateWinnings(myBetAmount, myBetMultiplier)
      : 0;

  const showPayout = myBetState === 'cashed_out' || myBetState === 'lost';

  const handlePlaceBet = useCallback(async () => {
    if (!user || actionLoading) return;
    setActionLoading(true);
    setBetError(null);
    try {
      const res = await apiFetch(`${config.apiUrl}/games/bets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountInMainUnit: betAmount }),
      });
      if (!res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          setBetError(data.message || 'Bet rejected');
        } else {
          setBetError('Bet rejected');
        }
        return;
      }
      const data = await res.json();
      setMyBetId(data.id);
      setMyBetAmount(data.amountInMainUnit);
      setMyBetState('pending');
      await refreshBalance(user.id);
    } catch (err) {
      if (config.isDev) console.error('Place bet error:', err);
      setBetError('Network error — please try again');
    } finally {
      setActionLoading(false);
    }
  }, [user, actionLoading, betAmount, refreshBalance]);

  const handleCashOut = useCallback(async () => {
    if (!myBetId || !user || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await apiFetch(`${config.apiUrl}/games/bets/${myBetId}/cash-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          multiplier: currentMultiplierRef.current > 0 ? currentMultiplierRef.current : 1.0,
        }),
      });
      if (!res.ok) {
        if (config.isDev) console.error('Cash out failed:', await res.text());
        return;
      }
      const data = await res.json();
      setMyBetState('cashed_out');
      setMyBetMultiplier(data.multiplier);
      await refreshBalance(user.id);
    } catch (err) {
      if (config.isDev) console.error('Cash out error:', err);
    } finally {
      setActionLoading(false);
    }
  }, [myBetId, user, actionLoading, refreshBalance]);

  const setBetAmountWithErrorClear = useCallback((n: number | ((prev: number) => number)) => {
    setBetAmount(n);
    setBetError(null);
  }, []);

  return {
    betAmount,
    setBetAmount: setBetAmountWithErrorClear,
    myBetId,
    myBetState,
    myBetAmount,
    myBetMultiplier,
    actionLoading,
    betError,
    showInsufficientBalance,
    winnings,
    showPayout,
    handlePlaceBet,
    handleCashOut,
  };
}
