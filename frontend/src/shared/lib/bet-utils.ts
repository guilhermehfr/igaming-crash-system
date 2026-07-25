export const BET = {
  DEFAULT: 10.0,
  MIN: 0.5,
  STEP: 0.5,
} as const;

export function calculateWinnings(amount: number, multiplier: number): number {
  return amount * multiplier;
}

export function isBetValid(amount: number, balance: number | null): boolean {
  if (balance === null) return false;
  return amount > 0 && amount <= balance;
}

export function calculate1xPreset(balance: number): number {
  return Math.max(BET.MIN, Math.min(10, balance));
}

export function calculate2xPreset(betAmount: number, balance: number): number {
  return Math.max(BET.MIN, Math.min(balance, (Math.round(betAmount * 100) * 2) / 100));
}

export function calculateMaxPreset(balance: number): number {
  return Math.max(BET.MIN, balance);
}
