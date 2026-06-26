import { Inject, Injectable } from '@nestjs/common';
import { Wallet } from '@domain/wallet.entity';
import { Money } from '@domain/money.vo';
import type { IWalletRepository } from '@domain/wallet.repository';
import { CreateWalletDto } from '@application/dtos/create-wallet';
import { WalletResponseDto } from '@application/dtos/wallet-response';

@Injectable()
export class CreateWalletUseCase {
  constructor(
    @Inject('IWalletRepository')
    private readonly walletRepository: IWalletRepository,
  ) {}

  async execute(input: CreateWalletDto): Promise<WalletResponseDto> {
    if (!input.userId || input.userId.trim() === '') {
      throw new Error('User ID must be non-empty');
    }

    if (input.initialBalanceInMainUnit !== undefined && input.initialBalanceInMainUnit < 0) {
      throw new Error('Initial balance cannot be negative');
    }

    const existingWallet = input.demoSessionId
      ? await this.walletRepository.findByUserIdAndDemoSessionId(input.userId, input.demoSessionId)
      : await this.walletRepository.findByUserId(input.userId);

    if (existingWallet) {
      throw new Error(`Wallet already exists for user ${input.userId}`);
    }

    const initialBalance = input.initialBalanceInMainUnit ?? 0;
    const initialMoney = Money.fromMainUnit(initialBalance);

    const walletId = `wallet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const wallet = Wallet.create(walletId, input.userId, initialMoney, input.demoSessionId ?? null);

    await this.walletRepository.save(wallet);

    return WalletResponseDto.fromDomain(wallet);
  }
}
