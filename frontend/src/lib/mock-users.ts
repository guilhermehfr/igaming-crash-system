export const MOCK_USERS = [
  { userId: 'mock-001', displayName: 'PlayerOne' },
  { userId: 'mock-002', displayName: 'LuckyStar' },
  { userId: 'mock-003', displayName: 'HighRoller' },
  { userId: 'mock-004', displayName: 'CashKing' },
  { userId: 'mock-005', displayName: 'MoonWalker' },
  { userId: 'mock-006', displayName: 'RiskyBet' },
];

export type MockBet = {
  id: string;
  userId: string;
  displayName: string;
  amount: number;
  outcome: { type: 'pending' } | { type: 'cashed'; multiplier: number } | { type: 'lost' };
};

function randBetween(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

let mockIdCounter = 0;

export function generateMockBets(): MockBet[] {
  const count = 3 + Math.floor(Math.random() * 4);
  const shuffled = [...MOCK_USERS].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);
  mockIdCounter = 0;

  return selected.map((user) => {
    mockIdCounter++;
    return {
      id: `mock-${Date.now()}-${mockIdCounter}`,
      userId: user.userId,
      displayName: user.displayName,
      amount: randBetween(0.5, 50),
      outcome: { type: 'pending' as const },
    };
  });
}

export function cashOutRandomMocks(bets: MockBet[], currentMultiplier: number): MockBet[] {
  return bets.map((b) => {
    if (b.outcome.type !== 'pending') return b;
    const cashOutChance = currentMultiplier > 1.5 ? 0.5 + (currentMultiplier - 1.5) * 0.1 : 0.2;
    if (Math.random() < cashOutChance) {
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
