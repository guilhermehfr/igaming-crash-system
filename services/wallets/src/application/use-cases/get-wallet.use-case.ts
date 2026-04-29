import { IWalletRepository } from '../../domain/wallet.repository';
import { WalletResponseDto } from '../dtos/wallet-response.dto';

/**
 * GetWallet Use Case
 *
 * Retrieves wallet information for a user by user ID.
 * Used in GET /wallets/me and GET /wallets/:userId endpoints.
 *
 * Business Rules:
 * - User must have a wallet (created previously via CreateWalletUseCase)
 * - Returns current balance in both main units and centavos
 * - Read-only operation
 *
 * @example
 * const useCase = new GetWalletUseCase(walletRepository);
 * const result = await useCase.execute('user-123');
 */
export class GetWalletUseCase {
  /**
   * @param walletRepository - Repository for wallet persistence (injected)
   */
  constructor(private readonly walletRepository: IWalletRepository) {}

  /**
   * Execute the use case
   *
   * @param userId - User ID to fetch wallet for
   * @returns WalletResponseDto with wallet data
   * @throws Error if wallet not found for user
   */
  async execute(userId: string): Promise<WalletResponseDto> {
    // Validate input
    if (!userId || userId.trim() === '') {
      throw new Error('User ID must be non-empty');
    }

    // Fetch wallet from repository
    const wallet = await this.walletRepository.findByUserId(userId);

    // Check if wallet exists
    if (!wallet) {
      throw new Error(`Wallet not found for user ${userId}`);
    }

    // Return response DTO
    return WalletResponseDto.fromDomain(wallet);
  }
}
