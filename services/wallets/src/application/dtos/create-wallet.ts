export class CreateWalletDto {
  userId: string;

  initialBalanceInMainUnit?: number;

  demoSessionId?: string;

  constructor(userId?: string, initialBalanceInMainUnit?: number, bodyUserId?: string) {
    if (bodyUserId) {
      throw new Error('User ID must not be provided in the request body');
    }
    if (!userId || userId.trim() === '') {
      throw new Error('User ID must be non-empty');
    }
    this.userId = userId;
    this.initialBalanceInMainUnit = initialBalanceInMainUnit;
  }
}
