/**
 * PlaceBetDto
 *
 * Input DTO for placing a bet in the current round.
 * Used by PlaceBetUseCase.
 *
 * @example
 * const dto = new PlaceBetDto('user-123', 100.50);
 */
export class PlaceBetDto {
  /**
   * @param userId - The user placing the bet
   * @param amountInMainUnit - Bet amount in main currency unit (e.g., USD)
   */
  constructor(
    readonly userId: string,
    readonly amountInMainUnit: number,
  ) {}
}
