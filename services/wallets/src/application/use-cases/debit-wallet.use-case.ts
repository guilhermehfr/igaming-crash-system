import { IWalletRepository } from '../../domain/wallet.repository';
import { Money } from '../../domain/money.value-object';
import { WalletResponseDto } from '../dtos/wallet-response.dto';

/**
 * DebitWallet Use Case
 *
 * Deducts funds from a wallet when a bet is placed.
 * This is typically invoked by a RabbitMQ consumer listening to BetPlaced events.
 *
 * Business Rules:
 * - User must have sufficient funds
 * - Amount must be positive
 * - Throws error if insufficient balance
 * - Persists updated balance to repository
 *
 * Flow:
 * 1. Games Service publishes "BetPlaced" event with (userId, amount)
 * 2. RabbitMQ consumer receives event
 * 3. Calls this use case: debitWallet.execute(userId, amountInMainUnit)
 * 4. Wallet balance is reduced by amount
 * 5. Updated wallet is persisted
 *
 * @example
 * const useCase = new DebitWalletUseCase(walletRepository);
 * await useCase.execute('user-123', 100.50);  // Debit 100.50
 */
export class DebitWalletUseCase {
  /**
   * @param walletRepository - Repository for wallet persistence (injected)
   */
  constructor(private readonly walletRepository: IWalletRepository) {}

  /**
   * Execute the use case
   *
   * @param userId - User ID
   * @param amountInMainUnit - Amount to debit in main units (e.g., 100.50)
   * @returns WalletResponseDto with updated wallet data
   * @throws Error if wallet not found
   * @throws Error if insufficient funds
   * @throws Error if amount is invalid
   */
  async execute(userId: string, amountInMainUnit: number): Promise<WalletResponseDto> {
    // Validate input
    if (!userId || userId.trim() === '') {
      throw new Error('User ID must be non-empty');
    }

    if (typeof amountInMainUnit !== 'number' || amountInMainUnit <= 0) {
      throw new Error('Amount must be a positive number');
    }

    // Fetch wallet from repository
    const wallet = await this.walletRepository.findByUserId(userId);
    if (!wallet) {
      throw new Error(`Wallet not found for user ${userId}`);
    }

    // Create Money value object
    const amountToDebit = Money.fromMainUnit(amountInMainUnit);

    // Check sufficient funds before attempting withdrawal
    if (!wallet.hasSufficientFunds(amountToDebit)) {
      throw new Error(
        `Insufficient funds: wallet balance is ${wallet.balance.amountInMainUnit}, ` +
        `but ${amountInMainUnit} is required`,
      );
    }

    // Perform withdrawal (throws if balance would go negative)
    wallet.withdraw(amountToDebit);

    // Persist updated wallet
    await this.walletRepository.save(wallet);

    // Return response DTO
    return WalletResponseDto.fromDomain(wallet);
  }
}
