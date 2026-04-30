import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  type Relation,
} from 'typeorm';
import { BetState } from '../../domain/bet.entity';
import { BigIntTransformer } from './transformers/bigint.transformer';

@Entity('bets')
export class BetTypeormEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id!: string;

  @Column('varchar', { length: 36 })
  roundId!: string;

  @Column('varchar', { length: 255 })
  playerId!: string;

  @Column('bigint', { transformer: BigIntTransformer })
  betAmountInCentavos!: bigint;

  @Column({
    type: 'enum',
    enum: BetState,
    default: BetState.PENDING,
  })
  state!: BetState;

  @Column('decimal', { precision: 10, scale: 3, nullable: true })
  cashOutMultiplier!: number | null;

  @Column('bigint', { transformer: BigIntTransformer, nullable: true })
  winningsInCentavos!: bigint | null;

  @Column('decimal', { precision: 10, scale: 3, nullable: true })
  crashPointMultiplier!: number | null;

  @ManyToOne(() => require('./round.typeorm-entity').RoundTypeormEntity as any, (round: any) => round.bets, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'roundId' })
  round!: Relation<any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
