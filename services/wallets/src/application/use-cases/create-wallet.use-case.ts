import { Wallet } from '../../domain/wallet.entity';
import { Money } from '../../domain/money.value-object';
import { IWalletRepository } from '../../domain/wallet.repository';
import { CreateWalletDto } from '../dtos/create-wallet.dto';
import { WalletResponseDto } from '../dtos/wallet-response.dto';

/**
 * CreateWallet Use Case
 *
 * Creates a new wallet for a user with an optional initial balance.
 *
 * Business Rules:
 * - User ID must be unique (wallet already exists check handled by repository)
 * - Initial balance defaults to 0
 * - All monetary values are stored as BigInt centavos
 *
 * @example
 * const useCase = new CreateWalletUseCase(walletRepository);
 * const dto = new CreateWalletDto('user-123', 100.50);
 * const result = await useCase.execute(dto);
 */
export class CreateWalletUseCase {
  /**
   * @param walletRepository - Repository for wallet persistence (injected)
   */
  constructor(private readonly walletRepository: IWalletRepository) {}

  /**
   * Execute the use case
   *
   * @param input CreateWalletDto with userId and optional initialBalanceInMainUnit
   * @returns WalletResponseDto with created wallet data
   * @throws Error if user already has a wallet
   * @throws Error if initial balance is negative
   */
  async execute(input: CreateWalletDto): Promise<WalletResponseDto> {
    // Validate input
    if (!input.userId || input.userId.trim() === '') {
      throw new Error('User ID must be non-empty');
    }

    if (input.initialBalanceInMainUnit !== undefined && input.initialBalanceInMainUnit < 0) {
      throw new Error('Initial balance cannot be negative');
    }

    // Check if wallet already exists for this user
    const existingWallet = await this.walletRepository.findByUserId(input.userId);
    if (existingWallet) {
      throw new Error(`Wallet already exists for user ${input.userId}`);
    }

    // Create initial balance (default to 0)
    const initialBalance = input.initialBalanceInMainUnit ?? 0;
    const initialMoney = Money.fromMainUnit(initialBalance);

    // Generate unique wallet ID
    const walletId = `wallet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create new wallet aggregate root
    const wallet = Wallet.create(walletId, input.userId, initialMoney);

    // Persist to repository
    await this.walletRepository.save(wallet);

    // Return response DTO
    return WalletResponseDto.fromDomain(wallet);
  }
}
