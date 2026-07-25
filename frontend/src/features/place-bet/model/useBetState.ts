import { useReducer } from 'react';

export type BetState = 'none' | 'pending' | 'cashed_out' | 'lost';

type BetStateValue = {
  betId: string | null;
  amount: number;
  multiplier: number | null;
  state: BetState;
  error: string | null;
};

export type BetAction =
  | { type: 'PLACE'; betId: string; amount: number }
  | { type: 'CASH_OUT'; multiplier: number }
  | { type: 'LOSE' }
  | { type: 'RESET' }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' };

const INITIAL: BetStateValue = {
  betId: null,
  amount: 0,
  multiplier: null,
  state: 'none',
  error: null,
};

function reducer(state: BetStateValue, action: BetAction): BetStateValue {
  switch (action.type) {
    case 'PLACE':
      return {
        ...state,
        betId: action.betId,
        amount: action.amount,
        multiplier: null,
        state: 'pending',
        error: null,
      };
    case 'CASH_OUT':
      return {
        ...state,
        multiplier: action.multiplier,
        state: 'cashed_out',
        error: null,
      };
    case 'LOSE':
      if (state.state !== 'pending') return state;
      return { ...state, state: 'lost', error: null };
    case 'RESET':
      return { ...INITIAL };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

export function useBetState() {
  return useReducer(reducer, INITIAL);
}
