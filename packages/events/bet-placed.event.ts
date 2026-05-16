export interface IBetPlacedEvent {
  type: 'bet.placed';
  version: 1;
  eventId: string;
  timestamp: string;
  betId: string;
  userId: string;
  amountInCentavos: string;
  roundId: string;
}