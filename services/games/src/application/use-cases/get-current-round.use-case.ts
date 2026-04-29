import { Injectable, Logger } from '@nestjs/common';
import { RoundLifecycleService } from '../services/round-lifecycle.service';
import { RoundResponseDto } from '../dtos/round-response.dto';

/**
 * GetCurrentRoundUseCase
 *
 * Retrieves the currently active round with all bets and statistics.
 * Used by WebSocket gateway and REST API to display game state.
 *
 * Business Rules:
 * - Returns the in-memory current round from RoundLifecycleService
 * - If no round is active, throws error (should not happen in normal operation)
 * - Returns DTO with all bets, multiplier, state, crash point
 * - Non-blocking read (no DB access, only in-memory)
 *
 * Flow:
 * 1. Get current round from RoundLifecycleService
 * 2. Validate round exists
 * 3. Convert to RoundResponseDto
 * 4. Return to caller (controller/gateway)
 *
 * Errors:
 * - Error: No active round
 *
 * @example
 * const useCase = new GetCurrentRoundUseCase(roundLifecycleService);
 * const result = await useCase.execute();
 * // result.state === 'RUNNING'
 * // result.currentMultiplier === 2.45
 */
@Injectable()
export class GetCurrentRoundUseCase {
  private readonly logger = new Logger(GetCurrentRoundUseCase.name);

  constructor(private readonly roundLifecycleService: RoundLifecycleService) {}

  /**
   * Execute the use case
   *
   * @returns RoundResponseDto with current round data
   * @throws Error if no active round
   */
  async execute(): Promise<RoundResponseDto> {
    this.logger.debug('Fetching current round');

    try {
      // Get current round from service (in-memory, fast)
      const currentRound = this.roundLifecycleService.getCurrentRound();
      if (!currentRound) {
        throw new Error('No active round available');
      }

      this.logger.debug(`Current round: ${currentRound.id}, state: ${currentRound.state}`);

      // Convert to DTO
      return RoundResponseDto.fromDomain(currentRound);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error fetching current round: ${errorMessage}`);
      throw error;
    }
  }
}
