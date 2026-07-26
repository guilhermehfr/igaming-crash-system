import { useCallback } from 'react';
import type { BetAction } from '@/features/place-bet/model/useBetState';
import { apiFetch } from '@/shared/api/api';
import { config } from '@/shared/config/config';
import type { AuthUser } from '@/shared/lib/stores';

export function useBetActions(
  dispatch: React.Dispatch<BetAction>,
  user: AuthUser | null,
  betAmount: number,
  betId: string | null,
  refreshBalance: (userId: string) => Promise<void>,
  currentMultiplierRef: React.MutableRefObject<number>,
) {
  const handlePlaceBet = useCallback(async () => {
    if (!user) return;
    dispatch({ type: 'CLEAR_ERROR' });
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
          dispatch({ type: 'SET_ERROR', error: data.message || 'Bet rejected' });
        } else {
          dispatch({ type: 'SET_ERROR', error: 'Bet rejected' });
        }
        return;
      }
      const data = await res.json();
      dispatch({ type: 'PLACE', betId: data.id, amount: data.amountInMainUnit });
      await refreshBalance(user.id);
    } catch (err) {
      if (config.isDev) console.error('Place bet error:', err);
      dispatch({ type: 'SET_ERROR', error: 'Network error — please try again' });
    }
  }, [user, betAmount, refreshBalance, dispatch]);

  const handleCashOut = useCallback(async () => {
    if (!user) return;
    try {
      const res = await apiFetch(`${config.apiUrl}/games/bets/${betId}/cash-out`, {
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
      dispatch({ type: 'CASH_OUT', multiplier: data.multiplier });
      await refreshBalance(user.id);
    } catch (err) {
      if (config.isDev) console.error('Cash out error:', err);
    }
  }, [user, betId, refreshBalance, dispatch, currentMultiplierRef]);

  return { handlePlaceBet, handleCashOut };
}
