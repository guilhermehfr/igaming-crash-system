import { Injectable, Logger } from '@nestjs/common';
import { RoundLifecycleService } from '../services/round-lifecycle.service';
import { CashOutDto } from '../dtos/cash-out.dto';
import { BetResponseDto } from '../dtos/bet-response.dto';

/**
 * CashOutUseCase
 *
 * Allows a player to cash out their bet at the current multiplier.
 * Only executable during RUNNING phase.
 *
 * Business Rules:
 * - Round must exist and be in RUNNING state
 * - Bet must exist and be in PENDING state
 * - Multiplier must be >= 1.0 (floor value)
 * - Once cashed out, bet is locked (cannot cash out twice)
 * - Winnings = bet amount * multiplier
 * - RabbitMQ event: BetCashedOut (triggers wallet service credit)
 *
 * Flow:
 * 1. Validate input (betId, multiplier >= 1.0)
 * 2. Retrieve current round (must be RUNNING)
 * 3. Call round.cashOut(betId, multiplier)
 * 4. Delegate to RoundLifecycleService.cashOutBet()
 * 5. Service persists round snapshot
 * 6. Emit RabbitMQ event (BetCashedOut) for wallet service
 * 7. Return updated BetResponseDto
 *
 * Errors:
 * - InvalidStateTransitionError: If round not in RUNNING state
 * - Error: Bet not found in round
 * - Error: Bet not in PENDING state (already cashed out or lost)
 * - Error: Multiplier must be >= 1.0
 *
 * @example
 * const useCase = new CashOutUseCase(roundLifecycleService, eventEmitter);
 * const dto = new CashOutDto('bet-123', 1.5);
 * const result = await useCase.execute(dto);
 * // result.state === 'CASHED_OUT'
 * // result.winningsInMainUnit === betAmount * 1.5
 */
@Injectable()
export class CashOutUseCase {
  private readonly logger = new Logger(CashOutUseCase.name);

  constructor(private readonly roundLifecycleService: RoundLifecycleService) {
    // TODO: Inject EventEmitter for RabbitMQ publishing
  }

  /**
   * Execute the use case
   *
   * @param input CashOutDto with betId and multiplier
   * @returns BetResponseDto with updated bet data
   * @throws Error if invalid input or wrong round state
   */
  async execute(input: CashOutDto): Promise<BetResponseDto> {
    // Validate input
    if (!input.betId || input.betId.trim() === '') {
      throw new Error('Bet ID must be non-empty');
    }

    if (input.multiplier < 1.0) {
      throw new Error('Multiplier must be at least 1.0');
    }

    this.logger.debug(
      `Cashing out bet: betId=${input.betId}, multiplier=${input.multiplier}`,
    );

    try {
      // Get current round
      const currentRound = this.roundLifecycleService.getCurrentRound();
      if (!currentRound) {
        throw new Error('No active round available');
      }

      // Validate round is in RUNNING state
      if (currentRound.state !== 'RUNNING') {
        throw new Error(
          `Cannot cash out: round is in ${currentRound.state} state, not RUNNING`,
        );
      }

      // Delegate to RoundLifecycleService (handles round.cashOut + persistence)
      await this.roundLifecycleService.cashOutBet(input.betId, input.multiplier);

      // Retrieve updated bet from round
      const updatedRound = this.roundLifecycleService.getCurrentRound();
      if (!updatedRound) {
        throw new Error('Round unexpectedly disappeared');
      }

      const bet = updatedRound.bets.find((b) => b.id === input.betId);
      if (!bet) {
        throw new Error(`Bet ${input.betId} not found in round`);
      }

      this.logger.log(
        `Bet ${input.betId} cashed out at multiplier ${input.multiplier}`,
      );

      // TODO: Emit RabbitMQ event for wallet service
      // await this.eventEmitter.emit('games.bet-cashed-out', {
      //   betId: input.betId,
      //   userId: bet.userId,
      //   winningsInCentavos: bet.getWinningsInCentavos(),
      //   multiplier: input.multiplier,
      // });

      // Return DTO representation
      return BetResponseDto.fromDomain(bet);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error cashing out bet: ${errorMessage}`);
      throw error;
    }
  }
}
