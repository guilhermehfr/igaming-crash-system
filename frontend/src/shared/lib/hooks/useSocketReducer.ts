import { useReducer } from 'react';
import type { CrashRound, RoundState } from '@/shared/lib/socket-types';

export type SocketState = {
  connected: boolean;
  roundState: RoundState;
  currentMultiplier: number;
  syncError: string | null;
  roundNumber: number;
  crashHistory: CrashRound[];
  hasBet: boolean;
};

export type SocketAction =
  | { type: 'CONNECTED' }
  | { type: 'DISCONNECTED' }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'INIT_ROUND'; state: RoundState; multiplier: number }
  | { type: 'START_BETTING' }
  | { type: 'STATE_CHANGED'; state: RoundState }
  | { type: 'UPDATE_MULTIPLIER'; multiplier: number }
  | { type: 'SET_HAS_BET' }
  | { type: 'CRASHED'; crashPoint: number; userBetType: CrashRound['type'] }
  | { type: 'INCREMENT_ROUND' };

const INITIAL: SocketState = {
  connected: false,
  roundState: null,
  currentMultiplier: 0,
  syncError: null,
  roundNumber: 0,
  crashHistory: [],
  hasBet: false,
};

export function socketReducer(state: SocketState, action: SocketAction): SocketState {
  switch (action.type) {
    case 'CONNECTED':
      return { ...state, connected: true };
    case 'DISCONNECTED':
      return { ...state, connected: false };
    case 'SET_ERROR':
      return { ...state, syncError: action.error };
    case 'CLEAR_ERROR':
      return { ...state, syncError: null };
    case 'INIT_ROUND':
      return {
        ...state,
        roundState: action.state,
        currentMultiplier: action.multiplier,
      };
    case 'START_BETTING':
      return {
        ...state,
        roundState: 'betting',
        hasBet: false,
        syncError: null,
        currentMultiplier: 0,
      };
    case 'STATE_CHANGED':
      return { ...state, roundState: action.state };
    case 'UPDATE_MULTIPLIER':
      return { ...state, currentMultiplier: action.multiplier };
    case 'SET_HAS_BET':
      return { ...state, hasBet: true };
    case 'CRASHED':
      return {
        ...state,
        roundState: 'crashed',
        currentMultiplier: action.crashPoint,
        crashHistory: [
          { id: Date.now(), multiplier: action.crashPoint, type: action.userBetType },
          ...state.crashHistory,
        ].slice(0, 50),
      };
    case 'INCREMENT_ROUND':
      return { ...state, roundNumber: state.roundNumber + 1 };
    default:
      return state;
  }
}

export function useSocketReducer() {
  return useReducer(socketReducer, INITIAL);
}
