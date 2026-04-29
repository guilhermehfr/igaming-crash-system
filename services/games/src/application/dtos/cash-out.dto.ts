/**
 * CashOutDto
 *
 * Input DTO for cashing out a bet during a running round.
 * Used by CashOutUseCase.
 *
 * @example
 * const dto = new CashOutDto('bet-123', 1.5);
 */
export class CashOutDto {
  /**
   * @param betId - The bet ID to cash out
   * @param multiplier - The current multiplier at cash out time
   */
  constructor(
    readonly betId: string,
    readonly multiplier: number,
  ) {}
}
