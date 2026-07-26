import { create } from 'zustand';

type BalanceState = {
  balance: number | null;
};

type BalanceActions = {
  setBalance: (b: number | null) => void;
};

export const useBalanceStore = create<BalanceState & BalanceActions>((set) => ({
  balance: null,
  setBalance: (balance) => set({ balance }),
}));
