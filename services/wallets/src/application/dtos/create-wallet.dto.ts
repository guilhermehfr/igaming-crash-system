export class CreateWalletDto {
  userId: string;

  initialBalanceInMainUnit?: number;

  constructor(userId: string, initialBalanceInMainUnit?: number) {
    this.userId = userId;
    this.initialBalanceInMainUnit = initialBalanceInMainUnit;
  }
}
