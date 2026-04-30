import { IWalletRepository } from '../../domain/wallet.repository';
import { WalletResponseDto } from '../dtos/wallet-response.dto';
export class GetWalletUseCase {
  constructor(private readonly walletRepository: IWalletRepository) {}

  async execute(userId: string): Promise<WalletResponseDto> {
    if (!userId || userId.trim() === '') {
      throw new Error('User ID must be non-empty');
    }

    const wallet = await this.walletRepository.findByUserId(userId);

    if (!wallet) {
      throw new Error(`Wallet not found for user ${userId}`);
    }

    return WalletResponseDto.fromDomain(wallet);
  }
}
