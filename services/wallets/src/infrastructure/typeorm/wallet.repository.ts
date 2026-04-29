import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from '../../domain/wallet.entity';
import { Money } from '../../domain/money.value-object';
import { IWalletRepository } from '../../domain/wallet.repository';
import { WalletTypeormEntity } from './wallet.typeorm-entity';

/**
 * Wallet Repository Implementation
 * 
 * Implements IWalletRepository interface with TypeORM.
 * Handles mapping between domain entities (Wallet, Money) and TypeORM entities.
 * 
 * Key responsibilities:
 * - Persist and retrieve wallets
 * - Domain → TypeORM conversion on save
 * - TypeORM → Domain conversion on read
 * - Handle BigInt precision for balance via transformer
 * - Fast lookup by userId using unique index
 */
@Injectable()
export class WalletRepository implements IWalletRepository {
  constructor(
    @InjectRepository(WalletTypeormEntity)
    private readonly walletRepository: Repository<WalletTypeormEntity>,
  ) {}

  /**
   * Finds a wallet by ID
   * Converts TypeORM entity → domain Wallet
   */
  async findById(id: string): Promise<Wallet | null> {
    const walletEntity = await this.walletRepository.findOne({
      where: { id },
    });

    if (!walletEntity) {
      return null;
    }

    return this.mapTypeormToDomain(walletEntity);
  }

  /**
   * Finds a wallet by user ID (fast lookup via unique index)
   */
  async findByUserId(userId: string): Promise<Wallet | null> {
    const walletEntity = await this.walletRepository.findOne({
      where: { userId },
    });

    if (!walletEntity) {
      return null;
    }

    return this.mapTypeormToDomain(walletEntity);
  }

  /**
   * Saves a wallet (create or update)
   * Converts domain Wallet → TypeORM entity
   */
  async save(wallet: Wallet): Promise<Wallet> {
    const walletEntity = this.mapDomainToTypeorm(wallet);
    await this.walletRepository.save(walletEntity);
    return wallet;
  }

  /**
   * Deletes a wallet by ID
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.walletRepository.delete(id);
    return result.affected ? result.affected > 0 : false;
  }

  /**
   * Checks if a wallet exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.walletRepository.count({ where: { id } });
    return count > 0;
  }

  // ============================================================================
  // PRIVATE MAPPING METHODS
  // ============================================================================

  /**
   * Maps domain Wallet → TypeORM entity
   * Extracts balance in centavos from Money value object
   */
  private mapDomainToTypeorm(wallet: Wallet): WalletTypeormEntity {
    const entity = new WalletTypeormEntity();
    entity.id = wallet.id;
    entity.userId = wallet.userId;
    entity.balanceInCentavos = wallet.balance.amountInCentavos;
    return entity;
  }

  /**
   * Maps TypeORM Wallet entity → domain Wallet
   * Reconstructs Money value object from balance in centavos
   */
  private mapTypeormToDomain(entity: WalletTypeormEntity): Wallet {
    const balance = Money.fromCentavos(entity.balanceInCentavos);
    return new Wallet(
      entity.id,
      entity.userId,
      balance,
      entity.createdAt,
      entity.updatedAt,
    );
  }
}
