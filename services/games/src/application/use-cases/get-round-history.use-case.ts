import { Injectable, Logger } from '@nestjs/common';
import { RoundLifecycleService } from '../services/round-lifecycle.service';
import { RoundResponseDto } from '../dtos/round-response.dto';

/**
 * GetRoundHistoryUseCase
 *
 * Retrieves historical (completed) rounds from the repository with pagination.
 * Used by stats/analytics API to display past game results.
 *
 * Business Rules:
 * - Returns only CRASHED rounds (settled and final)
 * - Supports pagination (page + limit)
 * - Results ordered by most recent first (descending by createdAt)
 * - Each round contains all bets with final states (CASHED_OUT or LOST)
 *
 * Flow:
 * 1. Validate pagination input (page >= 1, limit > 0)
 * 2. Call RoundLifecycleService.getRoundHistory()
 * 3. Repository returns paginated results
 * 4. Convert each Round to RoundResponseDto
 * 5. Return array
 *
 * Errors:
 * - Error: Invalid page (< 1)
 * - Error: Invalid limit (<= 0 or > max)
 *
 * @example
 * const useCase = new GetRoundHistoryUseCase(roundLifecycleService);
 * const results = await useCase.execute({ page: 1, limit: 10 });
 * // results.length === 10
 * // results[0].state === 'CRASHED'
 */
@Injectable()
export class GetRoundHistoryUseCase {
  private readonly logger = new Logger(GetRoundHistoryUseCase.name);

  private readonly MAX_LIMIT = 100; // Prevent abuse

  constructor(private readonly roundLifecycleService: RoundLifecycleService) {}

  /**
   * Execute the use case
   *
   * @param input Object with page and limit
   * @returns Array of RoundResponseDto
   * @throws Error if invalid pagination input
   */
  async execute(input: { page: number; limit: number }): Promise<RoundResponseDto[]> {
    // Validate input
    if (input.page < 1) {
      throw new Error('Page must be >= 1');
    }

    if (input.limit <= 0) {
      throw new Error('Limit must be > 0');
    }

    if (input.limit > this.MAX_LIMIT) {
      throw new Error(`Limit cannot exceed ${this.MAX_LIMIT}`);
    }

    this.logger.debug(`Fetching round history: page=${input.page}, limit=${input.limit}`);

    try {
      // Get historical rounds from service (queries repository)
      const rounds = await this.roundLifecycleService.getRoundHistory(
        input.page,
        input.limit,
      );

      // Convert to DTOs
      const roundDtos = rounds.map((round) => RoundResponseDto.fromDomain(round));

      this.logger.debug(`Retrieved ${roundDtos.length} historical rounds`);

      return roundDtos;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error fetching round history: ${errorMessage}`);
      throw error;
    }
  }
}
