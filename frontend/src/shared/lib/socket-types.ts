export type RoundState = 'betting' | 'running' | 'crashed' | null;

export type LiveBet = {
  id: string;
  user: string;
  displayName: string;
  amount: number;
  outcome: { type: 'pending' } | { type: 'cashed'; multiplier: number } | { type: 'lost' };
};

export type RevealedSeed = {
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  timestamp: string;
};

export type CrashRound = {
  id: number;
  multiplier: number;
  type: 'cashed' | 'busted' | 'none';
};
