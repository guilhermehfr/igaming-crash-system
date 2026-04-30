import { Injectable, Logger } from '@nestjs/common';
import { Bet } from '../../domain/bet.entity';
import { RoundLifecycleService } from '../services/round-lifecycle.service';
import { PlaceBetDto } from '../dtos/place-bet.dto';
import { BetResponseDto } from '../dtos/bet-response.dto';
@Injectable()
export class PlaceBetUseCase {
  private readonly logger = new Logger(PlaceBetUseCase.name);

  constructor(private readonly roundLifecycleService: RoundLifecycleService) {}

  async execute(input: PlaceBetDto): Promise<BetResponseDto> {
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
      const currentRound = this.roundLifecycleService.getCurrentRound();
      if (!currentRound) {
        throw new Error('No active round available');
      }

      const betId = `bet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const betAmountInCentavos = BigInt(Math.round(input.amountInMainUnit * 100));
      const bet = Bet.create(
        betId,
        currentRound.id,
        input.userId,
        betAmountInCentavos,
      );

      await this.roundLifecycleService.placeBet(bet);

      this.logger.log(`Bet ${betId} placed successfully for user ${input.userId}`);

      return BetResponseDto.fromDomain(bet);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error placing bet: ${errorMessage}`);
      throw error;
    }
  }
}
