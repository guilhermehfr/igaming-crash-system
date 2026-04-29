import { BetResponseDto } from './bet-response.dto';

/**
 * RoundResponseDto
 *
 * Output DTO representing a round with all relevant data.
 * Factory method converts domain Round to DTO.
 */
export class RoundResponseDto {
  constructor(
    readonly id: string,
    readonly state: 'BETTING' | 'RUNNING' | 'CRASHED',
    readonly currentMultiplier: number,
    readonly crashPointMultiplier: number | null,
    readonly totalWageredInMainUnit: number,
    readonly totalWageredInCentavos: bigint,
    readonly totalWinningsInMainUnit: number,
    readonly totalWinningsInCentavos: bigint,
    readonly houseResultInMainUnit: number,
    readonly houseResultInCentavos: bigint,
    readonly bets: BetResponseDto[],
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}

  /**
   * Factory method to convert domain Round entity to DTO
   * @param round - Domain Round entity
   * @returns RoundResponseDto
   */
  static fromDomain(round: any): RoundResponseDto {
    const bets = round.bets.map((bet: any) => BetResponseDto.fromDomain(bet));

    return new RoundResponseDto(
      round.id,
      round.state,
      round.currentMultiplier,
      round.crashPoint?.multiplier || null,
      round.calculateTotalWageredInMainUnit(),
      round.calculateTotalWagered(),
      round.calculateTotalWinningsInMainUnit(),
      round.calculateTotalWinnings(),
      round.calculateHouseResultInMainUnit(),
      round.calculateHouseResult(),
      bets,
      round.createdAt,
      round.updatedAt,
    );
  }
}
