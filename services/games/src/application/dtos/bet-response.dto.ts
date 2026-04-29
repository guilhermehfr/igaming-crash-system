/**
 * BetResponseDto
 *
 * Output DTO representing a bet with all relevant data.
 * Factory method converts domain Bet to DTO.
 */
export class BetResponseDto {
  constructor(
    readonly id: string,
    readonly userId: string,
    readonly amountInMainUnit: number,
    readonly amountInCentavos: bigint,
    readonly state: 'PENDING' | 'CASHED_OUT' | 'LOST',
    readonly winningsInMainUnit: number,
    readonly winningsInCentavos: bigint,
    readonly multiplier: number | null,
    readonly profitLossInMainUnit: number,
    readonly profitLossInCentavos: bigint,
    readonly roi: number | null,
    readonly createdAt: Date,
  ) {}

  /**
   * Factory method to convert domain Bet entity to DTO
   * @param bet - Domain Bet entity
   * @returns BetResponseDto
   */
  static fromDomain(bet: any): BetResponseDto {
    return new BetResponseDto(
      bet.id,
      bet.userId,
      bet.amountInMainUnit,
      bet.amountInCentavos,
      bet.getState(),
      bet.getWinningsInMainUnit(),
      bet.getWinningsInCentavos(),
      bet.multiplier || null,
      bet.calculateProfitLossInMainUnit(),
      bet.calculateProfitLossInCentavos(),
      bet.calculateROI(),
      bet.createdAt,
    );
  }
}
