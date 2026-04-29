import { Injectable, Logger } from '@nestjs/common';
import { Bet } from '../../domain/bet.entity';
import { RoundLifecycleService } from '../services/round-lifecycle.service';
import { PlaceBetDto } from '../dtos/place-bet.dto';
import { BetResponseDto } from '../dtos/bet-response.dto';

/**
 * PlaceBetUseCase
 *
 * Allows a player to place a bet on the current round.
 * Only executable during BETTING phase.
 *
 * Business Rules:
 * - Round must exist and be in BETTING state
 * - Bet amount must be positive
 * - User balance validation handled by wallet service (RabbitMQ event: BetPlaced)
 * - Bet is added to round's aggregate
 *
 * Flow:
 * 1. Validate input (userId, amount > 0)
 * 2. Create domain Bet entity
 * 3. Delegate to RoundLifecycleService.placeBet()
 * 4. Service persists round snapshot
 * 5. Return BetResponseDto
 *
 * Errors:
 * - InvalidStateTransitionError: If round not in BETTING state
 * - Error: No active round exists
 * - Error: Bet amount must be > 0
 *
 * @example
 * const useCase = new PlaceBetUseCase(roundLifecycleService);
 * const dto = new PlaceBetDto('user-123', 100.50);
 * const result = await useCase.execute(dto);
 * // result.state === 'PENDING'
 */
@Injectable()
export class PlaceBetUseCase {
  private readonly logger = new Logger(PlaceBetUseCase.name);

  constructor(private readonly roundLifecycleService: RoundLifecycleService) {}

  /**
   * Execute the use case
   *
   * @param input PlaceBetDto with userId and amountInMainUnit
   * @returns BetResponseDto with created bet data
   * @throws Error if invalid input or wrong round state
   */
  async execute(input: PlaceBetDto): Promise<BetResponseDto> {
    // Validate input
    if (!input.userId || input.userId.trim() === '') {
      throw new Error('User ID must be non-empty');
    }

    if (input.amountInMainUnit <= 0) {
      throw new Error('Bet amount must be greater than zero');
    }

    this.logger.debug(
      `Placing bet: userId=${input.userId}, amount=${input.amountInMainUnit}`,
    );

    try {
      // Get current round
      const currentRound = this.roundLifecycleService.getCurrentRound();
      if (!currentRound) {
        throw new Error('No active round available');
      }

      // Create bet entity (Bet.create expects: id, roundId, playerId, betAmountInCentavos)
      const betId = `bet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const betAmountInCentavos = BigInt(Math.round(input.amountInMainUnit * 100));
      const bet = Bet.create(
        betId,
        currentRound.id,
        input.userId,
        betAmountInCentavos,
      );

      // Delegate to RoundLifecycleService (handles state validation + persistence)
      await this.roundLifecycleService.placeBet(bet);

      this.logger.log(`Bet ${betId} placed successfully for user ${input.userId}`);

      // Return DTO representation
      return BetResponseDto.fromDomain(bet);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error placing bet: ${errorMessage}`);
      throw error;
    }
  }
}
