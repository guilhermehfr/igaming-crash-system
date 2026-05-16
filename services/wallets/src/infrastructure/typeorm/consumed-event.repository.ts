import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { IConsumedEventRepository, EventType } from '../../domain/consumed-event.repository';

@Injectable()
export class ConsumedEventRepository implements IConsumedEventRepository {
  constructor(private readonly dataSource: DataSource) {}

  async tryClaimEvent(eventId: string, eventType: EventType, userId: string): Promise<boolean> {
    const result = await this.dataSource.query(
      `INSERT INTO consumed_events ("eventId", "eventType", "userId", "processedAt")
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT ("eventId") DO NOTHING`,
      [eventId, eventType, userId]
    );

    const rowCount = (result as any)?.rowCount ?? 0;
    return rowCount === 1;
  }
}