import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { BigIntTransformer } from './transformers/bigint.transformer';

/**
 * Wallet TypeORM Entity
 * 
 * Persists Wallet aggregate root to PostgreSQL.
 * 
 * Key design:
 * - id: Primary key (string, UUID)
 * - userId: Unique user identifier (indexed for fast lookup)
 * - balanceInCentavos: BigInt with transformer (stored as varchar, read as bigint)
 *   - This ensures monetary precision without floating-point errors
 *   - All operations in application layer use Money value object
 *   - Transformer handles DB ↔ Domain conversion
 * - createdAt, updatedAt: Audit timestamps
 * 
 * Index on userId for O(1) lookup by user.
 */
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
