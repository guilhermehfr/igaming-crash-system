import { IWalletRepository } from '../../domain/wallet.repository';
import { Money } from '../../domain/money.value-object';
import { WalletResponseDto } from '../dtos/wallet-response.dto';

/**
 * CreditWallet Use Case
 *
 * Adds funds to a wallet when a player cashes out a bet.
 * This is typically invoked by a RabbitMQ consumer listening to BetCashedOut events.
 *
 * Business Rules:
 * - User must have a wallet
 * - Amount must be positive
 * - Amount includes original bet + winnings
 * - Persists updated balance to repository
 *
 * Flow:
 * 1. Games Service publishes "BetCashedOut" event with (userId, winningsInMainUnit)
 * 2. RabbitMQ consumer receives event
 * 3. Calls this use case: creditWallet.execute(userId, winningsInMainUnit)
 * 4. Wallet balance is increased by amount
 * 5. Updated wallet is persisted
 *
 * Example:
 * - User bets 100, multiplier 1.5
 * - Winnings = 100 * 1.5 = 150
 * - Credit wallet with 150 (original bet returns + profit)
 *
 * @example
 * const useCase = new CreditWalletUseCase(walletRepository);
 * await useCase.execute('user-123', 150.00);  // Credit 150.00
 */
export class CreditWalletUseCase {
  /**
   * @param walletRepository - Repository for wallet persistence (injected)
   */
  constructor(private readonly walletRepository: IWalletRepository) {}

  /**
   * Execute the use case
   *
   * @param userId - User ID
   * @param amountInMainUnit - Amount to credit in main units (e.g., 150.00)
   * @returns WalletResponseDto with updated wallet data
   * @throws Error if wallet not found
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
    const amountToCredit = Money.fromMainUnit(amountInMainUnit);

    // Perform deposit (always succeeds for positive amounts)
    wallet.deposit(amountToCredit);

    // Persist updated wallet
    await this.walletRepository.save(wallet);

    // Return response DTO
    return WalletResponseDto.fromDomain(wallet);
  }
}
