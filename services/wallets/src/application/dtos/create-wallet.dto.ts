/**
 * DTO for wallet creation
 * Used in POST /wallets endpoint
 */
export class CreateWalletDto {
  /**
   * User ID (from JWT token or request body)
   * Must be unique and non-empty
   */
  userId: string;

  /**
   * Initial balance in main units (e.g., 100.50 for $100.50)
   * Optional, defaults to 0
   */
  initialBalanceInMainUnit?: number;

  constructor(userId: string, initialBalanceInMainUnit?: number) {
    this.userId = userId;
    this.initialBalanceInMainUnit = initialBalanceInMainUnit;
  }
}
