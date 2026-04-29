import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { RoundState } from '../../domain/round.entity';
import { BetTypeormEntity } from './bet.typeorm-entity';

/**
 * Round TypeORM Entity
 * 
 * Persists Round aggregate root to PostgreSQL.
 * Maintains one-to-many relationship with Bets.
 * 
 * Key design:
 * - id: Primary key (string)
 * - state: Enum (BETTING, RUNNING, CRASHED)
 * - currentMultiplier: Stored as decimal (precision 10, scale 3) for game loop
 * - crashPointMultiplier: Stored as decimal (precision 10, scale 3)
 * - crashPointHash: Provably Fair hash
 * - crashPointSeed: Provably Fair seed (encrypted in production)
 * - One Round has many Bets (OneToMany relationship)
 */
@Entity('rounds')
export class RoundTypeormEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column({
    type: 'enum',
    enum: RoundState,
    default: RoundState.BETTING,
  })
  state: RoundState;

  @Column('decimal', { precision: 10, scale: 3, default: 1.0 })
  currentMultiplier: number;

  @Column('decimal', { precision: 10, scale: 3, nullable: true })
  crashPointMultiplier: number | null;

  @Column('varchar', { length: 255, nullable: true })
  crashPointHash: string | null;

  @Column('varchar', { length: 255, nullable: true })
  crashPointSeed: string | null;

  @CreateDateColumn()
  bettingStartedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  gameStartedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  gameEndedAt: Date | null;

  @OneToMany(() => BetTypeormEntity, (bet) => bet.round, {
    cascade: true,
    eager: false,
  })
  bets: BetTypeormEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
