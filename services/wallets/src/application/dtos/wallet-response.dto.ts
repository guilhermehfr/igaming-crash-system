/**
 * DTO for wallet response
 * Used in GET /wallets/me and other wallet endpoints
 */
export class WalletResponseDto {
  /**
   * Wallet ID
   */
  id: string;

  /**
   * User ID
   */
  userId: string;

  /**
   * Balance in main units (e.g., 100.50 for $100.50)
   */
  balanceInMainUnit: number;

  /**
   * Balance in centavos (raw bigint value)
   */
  balanceInCentavos: string;

  /**
   * Wallet creation timestamp
   */
  createdAt: Date;

  /**
   * Wallet last update timestamp
   */
  updatedAt: Date;

  constructor(
    id: string,
    userId: string,
    balanceInMainUnit: number,
    balanceInCentavos: string,
    createdAt: Date,
    updatedAt: Date,
  ) {
    this.id = id;
    this.userId = userId;
    this.balanceInMainUnit = balanceInMainUnit;
    this.balanceInCentavos = balanceInCentavos;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Factory method to create response DTO from Wallet domain entity
   * @param wallet Domain wallet entity
   * @returns WalletResponseDto
   */
  static fromDomain(wallet: any): WalletResponseDto {
    return new WalletResponseDto(
      wallet.id,
      wallet.userId,
      wallet.balance.amountInMainUnit,
      wallet.balance.amountInCentavos.toString(),
      wallet.createdAt,
      wallet.updatedAt,
    );
  }
}
