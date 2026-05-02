import { BetResponseDto } from './bet-response.dto';

export class RoundResponseDto {
  constructor(
    readonly id: string,
    readonly state: 'BETTING' | 'RUNNING' | 'CRASHED',
    readonly currentMultiplier: number,
    readonly crashPointMultiplier: number | null,
    readonly totalWageredInMainUnit: number,
    readonly totalWinningsInMainUnit: number,
    readonly houseResultInMainUnit: number,
    readonly bets: BetResponseDto[],
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}

  static fromDomain(round: any): RoundResponseDto {
    const bets = round.bets.map((bet: any) => BetResponseDto.fromDomain(bet));

    const totalWageredInCentavos = round.calculateTotalWagered();
    const totalWinningsInCentavos = round.calculateTotalWinnings();
    const houseResultInCentavos = round.calculateHouseResult();

    return new RoundResponseDto(
      round.id,
      round.state,
      round.currentMultiplier,
      round.crashPoint?.multiplier || null,
      Number(totalWageredInCentavos) / 100,
      Number(totalWinningsInCentavos) / 100,
      Number(houseResultInCentavos) / 100,
      bets,
      round.createdAt,
      round.updatedAt,
    );
  }
}
