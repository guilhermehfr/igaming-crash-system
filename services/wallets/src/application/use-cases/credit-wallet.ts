import { Inject, Injectable } from '@nestjs/common';
import type { IWalletRepository } from '@domain/wallet.repository';
import { Money } from '@domain/money.vo';
import { WalletResponseDto } from '@application/dtos/wallet-response';

@Injectable()
export class CreditWalletUseCase {
  constructor(
    @Inject('IWalletRepository')
    private readonly walletRepository: IWalletRepository,
  ) {}

  async execute(userId: string, amountInMainUnit: number, demoSessionId?: string): Promise<WalletResponseDto> {
    if (!userId || userId.trim() === '') {
      throw new Error('User ID must be non-empty');
    }

    if (typeof amountInMainUnit !== 'number' || amountInMainUnit <= 0) {
      throw new Error('Amount must be a positive number');
    }

    const wallet = demoSessionId
      ? await this.walletRepository.findByUserIdAndDemoSessionId(userId, demoSessionId)
      : await this.walletRepository.findByUserId(userId);

    if (!wallet) {
      throw new Error(`Wallet not found for user ${userId}`);
    }

    const amountToCredit = Money.fromMainUnit(amountInMainUnit);

    wallet.deposit(amountToCredit);

    await this.walletRepository.save(wallet);

    return WalletResponseDto.fromDomain(wallet);
  }
}
