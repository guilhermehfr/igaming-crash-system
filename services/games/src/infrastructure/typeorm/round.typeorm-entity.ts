import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  type Relation,
} from 'typeorm';
import { RoundState } from '../../domain/round.entity';

@Entity('rounds')
export class RoundTypeormEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id!: string;

  @Column({
    type: 'enum',
    enum: RoundState,
    default: RoundState.BETTING,
  })
  state!: RoundState;

  @Column('decimal', { precision: 10, scale: 3, default: 1.0 })
  currentMultiplier!: number;

  @Column('decimal', { precision: 10, scale: 3, nullable: true })
  crashPointMultiplier!: number | null;

  @Column('varchar', { length: 255, nullable: true })
  crashPointHash!: string | null;

  @Column('varchar', { length: 255, nullable: true })
  crashPointSeed!: string | null;

  @CreateDateColumn()
  bettingStartedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  gameStartedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  gameEndedAt!: Date | null;

  @OneToMany(() => require('./bet.typeorm-entity').BetTypeormEntity as any, (bet: any) => bet.round, {
    cascade: true,
    eager: false,
  })
  bets!: Relation<any>[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
