import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from '@domain/wallet.entity';
import { Money } from '@domain/money.vo';
import { IWalletRepository } from '@domain/wallet.repository';
import { WalletTypeormEntity } from './wallet.typeorm-entity';

@Injectable()
export class WalletRepository implements IWalletRepository {
  constructor(
    @InjectRepository(WalletTypeormEntity)
    private readonly walletRepository: Repository<WalletTypeormEntity>,
  ) {}

  async findById(id: string): Promise<Wallet | null> {
    const walletEntity = await this.walletRepository.findOne({
      where: { id },
    });

    if (!walletEntity) {
      return null;
    }

    return this.mapTypeormToDomain(walletEntity);
  }

  async findByUserId(userId: string): Promise<Wallet | null> {
    const walletEntity = await this.walletRepository.findOne({
      where: { userId },
    });

    if (!walletEntity) {
      return null;
    }

    return this.mapTypeormToDomain(walletEntity);
  }

  async save(wallet: Wallet): Promise<Wallet> {
    const walletEntity = this.mapDomainToTypeorm(wallet);
    await this.walletRepository.save(walletEntity);
    return wallet;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.walletRepository.delete(id);
    return result.affected ? result.affected > 0 : false;
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.walletRepository.count({ where: { id } });
    return count > 0;
  }

  private mapDomainToTypeorm(wallet: Wallet): WalletTypeormEntity {
    const entity = new WalletTypeormEntity();
    entity.id = wallet.id;
    entity.userId = wallet.userId;
    entity.balanceInCentavos = wallet.balance.amountInCentavos;
    return entity;
  }

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
