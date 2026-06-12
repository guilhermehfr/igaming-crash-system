import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { IConsumedEventRepository, EventType } from '@domain/consumed-event.repository';

@Injectable()
export class ConsumedEventRepository implements IConsumedEventRepository {
  constructor(private readonly dataSource: DataSource) {}

  async tryClaimEvent(eventId: string, eventType: EventType, userId: string): Promise<boolean> {
    try {
      await this.dataSource.query(
        `INSERT INTO consumed_events ("event_id", "event_type", "user_id", "processed_at")
         VALUES ($1, $2, $3, NOW())`,
        [eventId, eventType, userId]
      );
      return true;
    } catch {
      return false;
    }
  }
}
