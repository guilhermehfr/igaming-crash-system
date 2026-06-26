import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { BigIntTransformer } from './transformers/bigint.transformer';

@Entity('wallets')
@Index(['userId', 'demoSessionId'], { unique: true })
export class WalletTypeormEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column('varchar', { length: 255 })
  userId: string;

  @Column('varchar', { length: 36, nullable: true })
  demoSessionId: string | null;

  @Column('bigint', { transformer: BigIntTransformer, default: '0' })
  balanceInCentavos: bigint;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
