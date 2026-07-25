export const MOCK_USERS = [
  { userId: 'mock-001', displayName: 'PlayerOne' },
  { userId: 'mock-002', displayName: 'LuckyStar' },
  { userId: 'mock-003', displayName: 'HighRoller' },
  { userId: 'mock-004', displayName: 'CashKing' },
  { userId: 'mock-005', displayName: 'MoonWalker' },
  { userId: 'mock-006', displayName: 'RiskyBet' },
  { userId: 'mock-007', displayName: 'AllInAce' },
  { userId: 'mock-008', displayName: 'BetMaster' },
  { userId: 'mock-009', displayName: 'LuckyCharm' },
  { userId: 'mock-010', displayName: 'CryptoJake' },
];

export type MockBet = {
  id: string;
  userId: string;
  displayName: string;
  amount: number;
  cashOutAt: number | null;
  outcome: { type: 'pending' } | { type: 'cashed'; multiplier: number } | { type: 'lost' };
};

function randBetween(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

let mockIdCounter = 0;

export function generateMockBets(): MockBet[] {
  mockIdCounter = 0;

  return MOCK_USERS.map((user) => {
    mockIdCounter++;
    const r = Math.random();
    let cashOutAt: number | null;
    if (r < 0.35) cashOutAt = randBetween(1.01, 1.2);
    else if (r < 0.55) cashOutAt = randBetween(1.21, 2.0);
    else if (r < 0.7) cashOutAt = randBetween(2.01, 5.0);
    else cashOutAt = null;
    return {
      id: `mock-${Date.now()}-${mockIdCounter}`,
      userId: user.userId,
      displayName: user.displayName,
      amount: randBetween(0.5, 50),
      cashOutAt,
      outcome: { type: 'pending' as const },
    };
  });
}

export function cashOutRandomMocks(bets: MockBet[], currentMultiplier: number): MockBet[] {
  return bets.map((b) => {
    if (b.outcome.type !== 'pending') return b;
    if (b.cashOutAt !== null && currentMultiplier >= b.cashOutAt) {
      return { ...b, outcome: { type: 'cashed' as const, multiplier: currentMultiplier } };
    }
    return b;
  });
}

export function loseRemainingMocks(bets: MockBet[]): MockBet[] {
  return bets.map((b) => {
    if (b.outcome.type !== 'pending') return b;
    return { ...b, outcome: { type: 'lost' as const } };
  });
}
