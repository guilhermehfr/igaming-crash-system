import { create } from 'zustand';
import type { CrashRound, LiveBet, RoundState } from '@/shared/lib/socket-types';

type GameState = {
  connected: boolean;
  roundState: RoundState;
  currentMultiplier: number;
  syncError: string | null;
  roundNumber: number;
  crashHistory: CrashRound[];
  hasBet: boolean;
  myBetId: string | null;
  bets: LiveBet[];
  playingCount: number;
};

type GameActions = {
  setConnected: () => void;
  setDisconnected: () => void;
  setError: (error: string) => void;
  clearError: () => void;
  initRound: (state: RoundState, multiplier: number) => void;
  startBetting: () => void;
  setRoundState: (state: RoundState) => void;
  updateMultiplier: (multiplier: number) => void;
  setHasBet: () => void;
  setMyBetId: (id: string | null) => void;
  setCrashed: (crashPoint: number, userBetType: CrashRound['type']) => void;
  incrementRound: () => void;
  setBets: (betsOrUpdater: LiveBet[] | ((prev: LiveBet[]) => LiveBet[])) => void;
  addBet: (bet: LiveBet) => void;
  updateBet: (id: string, outcome: LiveBet['outcome']) => void;
  reset: () => void;
};

const INITIAL: GameState = {
  connected: false,
  roundState: null,
  currentMultiplier: 0,
  syncError: null,
  roundNumber: 0,
  crashHistory: [],
  hasBet: false,
  myBetId: null,
  bets: [],
  playingCount: 0,
};

export const useGameStore = create<GameState & GameActions>((set) => ({
  ...INITIAL,

  setConnected: () => set({ connected: true }),
  setDisconnected: () => set({ connected: false }),
  setError: (error) => set({ syncError: error }),
  clearError: () => set({ syncError: null }),
  initRound: (state, multiplier) => set({ roundState: state, currentMultiplier: multiplier }),
  startBetting: () =>
    set({
      roundState: 'betting',
      hasBet: false,
      syncError: null,
      currentMultiplier: 0,
      myBetId: null,
    }),
  setRoundState: (state) => set({ roundState: state }),
  updateMultiplier: (multiplier) => set({ currentMultiplier: multiplier }),
  setHasBet: () => set({ hasBet: true }),
  setMyBetId: (id) =>
    set((s) => ({
      myBetId: id,
      bets: id ? s.bets.map((b) => (b.id === id ? { ...b, displayName: 'demo' } : b)) : s.bets,
    })),
  setCrashed: (crashPoint, userBetType) =>
    set((s) => ({
      roundState: 'crashed',
      currentMultiplier: crashPoint,
      crashHistory: [
        { id: Date.now(), multiplier: crashPoint, type: userBetType },
        ...s.crashHistory,
      ].slice(0, 50),
    })),
  incrementRound: () => set((s) => ({ roundNumber: s.roundNumber + 1 })),

  setBets: (betsOrUpdater) =>
    set((s) => {
      const newBets =
        typeof betsOrUpdater === 'function'
          ? (betsOrUpdater as (prev: LiveBet[]) => LiveBet[])(s.bets)
          : betsOrUpdater;
      return {
        bets: newBets,
        playingCount: newBets.filter((b) => b.outcome.type === 'pending').length,
      };
    }),
  addBet: (bet) =>
    set((s) => {
      const newBets = [bet, ...s.bets];
      return {
        bets: newBets,
        playingCount: newBets.filter((b) => b.outcome.type === 'pending').length,
      };
    }),
  updateBet: (id, outcome) =>
    set((s) => {
      const newBets = s.bets.map((b) => (b.id === id ? { ...b, outcome } : b));
      return {
        bets: newBets,
        playingCount: newBets.filter((b) => b.outcome.type === 'pending').length,
      };
    }),
  reset: () => set(INITIAL),
}));
