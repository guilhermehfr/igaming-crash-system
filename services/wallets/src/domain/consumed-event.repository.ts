export enum EventType {
  BET_PLACED = 'BET_PLACED',
  BET_CASHED_OUT = 'BET_CASHED_OUT',
  BET_LOST = 'BET_LOST',
}

export interface IConsumedEventRepository {
  tryClaimEvent(eventId: string, eventType: EventType, userId: string): Promise<boolean>;
}