export class BetResponseDto {
  constructor(
    readonly id: string,
    readonly userId: string,
    readonly amountInMainUnit: number,
    readonly state: 'PENDING' | 'CASHED_OUT' | 'LOST',
    readonly winningsInMainUnit: number,
    readonly multiplier: number | null,
    readonly profitLossInMainUnit: number,
    readonly roi: number | null,
    readonly createdAt: Date,
  ) {}

  static fromDomain(bet: any): BetResponseDto {
    const betAmountInCentavos = bet.betAmountInCentavos;
    const winningsInCentavos = bet.winningsInCentavos ?? 0n;
    const profitLossInCentavos = bet.calculateProfitLoss();

    return new BetResponseDto(
      bet.id,
      bet.playerId,
      Number(betAmountInCentavos) / 100,
      bet.state,
      Number(winningsInCentavos) / 100,
      bet.cashOutMultiplier,
      Number(profitLossInCentavos) / 100,
      bet.calculateROI(),
      bet.createdAt,
    );
  }
}
