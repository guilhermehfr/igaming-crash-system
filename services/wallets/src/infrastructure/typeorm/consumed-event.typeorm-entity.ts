import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from 'typeorm';

export enum EventType {
  BET_PLACED = 'BET_PLACED',
  BET_CASHED_OUT = 'BET_CASHED_OUT',
  BET_LOST = 'BET_LOST',
}

@Entity('consumed_events')
@Index(['eventId'], { unique: true })
@Index(['userId'])
@Index(['eventType'])
export class ConsumedEventTypeormEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 255, unique: true })
  eventId: string;

  @Column('varchar', { length: 50 })
  eventType: EventType;

  @Column('varchar', { length: 255 })
  userId: string;

  @Column('timestamp')
  processedAt: Date;
}