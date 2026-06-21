import { BetResponseDto } from "@application/dtos/bet-response.dto";
import type { CashOutDto } from "@application/dtos/cash-out.dto";
import { RoundLifecycleService } from "@application/services/round-lifecycle.service";
import { Injectable, Logger } from "@nestjs/common";
@Injectable()
export class CashOutUseCase {
	private readonly logger = new Logger(CashOutUseCase.name);

	constructor(private readonly roundLifecycleService: RoundLifecycleService) {}

	async execute(input: CashOutDto): Promise<BetResponseDto> {
		if (!input.betId || input.betId.trim() === "") {
			throw new Error("Bet ID must be non-empty");
		}

		if (input.multiplier < 1.0) {
			throw new Error("Multiplier must be at least 1.0");
		}

		if (!input.userId || input.userId.trim() === "") {
			throw new Error("User ID must be non-empty");
		}

		this.logger.debug(
			`Cashing out bet: betId=${input.betId}, userId=${input.userId}, multiplier=${input.multiplier}`,
		);

		try {
			const currentRound = this.roundLifecycleService.getCurrentRound();
			if (!currentRound) {
				throw new Error("No active round available");
			}

			const bet = currentRound.bets.find((b) => b.id === input.betId);
			if (!bet) {
				throw new Error(`Bet ${input.betId} not found in round`);
			}

			if (bet.playerId !== input.userId) {
				throw new Error("Bet does not belong to user");
			}

			if (currentRound.state !== "RUNNING") {
				throw new Error(
					`Cannot cash out: round is in ${currentRound.state} state, not RUNNING`,
				);
			}

			await this.roundLifecycleService.cashOutBet(
				input.betId,
				input.multiplier,
			);

			const updatedRound = this.roundLifecycleService.getCurrentRound();
			if (!updatedRound) {
				throw new Error("Round unexpectedly disappeared");
			}

			this.logger.log(
				`Bet ${input.betId} cashed out at multiplier ${input.multiplier}`,
			);

			return BetResponseDto.fromDomain(bet);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			this.logger.error(`Error cashing out bet: ${errorMessage}`);
			throw error;
		}
	}
}
