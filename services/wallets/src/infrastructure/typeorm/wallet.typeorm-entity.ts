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
@Index(['userId'], { unique: true })
export class WalletTypeormEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column('varchar', { length: 255, unique: true })
  userId: string;

  @Column('bigint', { transformer: BigIntTransformer, default: '0' })
  balanceInCentavos: bigint;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
