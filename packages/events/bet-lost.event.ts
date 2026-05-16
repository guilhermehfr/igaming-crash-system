export interface IBetLostEvent {
  type: 'bet.lost';
  version: 1;
  eventId: string;
  timestamp: string;
  betId: string;
  userId: string;
  amountInCentavos: string;
  roundId: string;
  crashPoint: number;
}