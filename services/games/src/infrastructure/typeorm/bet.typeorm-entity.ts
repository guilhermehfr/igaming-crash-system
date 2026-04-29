import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BetState } from '../../domain/bet.entity';
import { RoundTypeormEntity } from './round.typeorm-entity';
import { BigIntTransformer } from './transformers/bigint.transformer';

/**
 * Bet TypeORM Entity
 * 
 * Persists Bet entity to PostgreSQL.
 * Maintains many-to-one relationship with Round.
 * 
 * Key design:
 * - id: Primary key (string, format: bet-{timestamp}-{random})
 * - roundId: Foreign key to rounds table
 * - playerId: Player/User identifier
 * - betAmountInCentavos: BigInt with transformer (stored as varchar, read as bigint)
 * - state: Enum (PENDING, CASHED_OUT, LOST)
 * - cashOutMultiplier: Decimal where player cashed out (nullable)
 * - winningsInCentavos: BigInt with transformer (nullable until cashed out)
 * - crashPointMultiplier: Stored for audit trail (the crash point at time of crash)
 */
@Entity('bets')
export class BetTypeormEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column('varchar', { length: 36 })
  roundId: string;

  @Column('varchar', { length: 255 })
  playerId: string;

  @Column('bigint', { transformer: BigIntTransformer })
  betAmountInCentavos: bigint;

  @Column({
    type: 'enum',
    enum: BetState,
    default: BetState.PENDING,
  })
  state: BetState;

  @Column('decimal', { precision: 10, scale: 3, nullable: true })
  cashOutMultiplier: number | null;

  @Column('bigint', { transformer: BigIntTransformer, nullable: true })
  winningsInCentavos: bigint | null;

  @Column('decimal', { precision: 10, scale: 3, nullable: true })
  crashPointMultiplier: number | null;

  @ManyToOne(() => RoundTypeormEntity, (round) => round.bets, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'roundId' })
  round: RoundTypeormEntity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
