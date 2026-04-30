export class WalletResponseDto {
  id: string;

  userId: string;

  balanceInMainUnit: number;

  balanceInCentavos: string;

  createdAt: Date;

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
