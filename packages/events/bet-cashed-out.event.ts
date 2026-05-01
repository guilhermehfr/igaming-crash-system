export interface IBetCashedOutEvent {
  betId: string;
  userId: string;
  amountInCentavos: string;
  winningsInCentavos: string;
  multiplier: number;
  roundId: string;
  timestamp: string;
}