import { BetResponseDto } from "@application/dtos/bet-response.dto";
import { RoundLifecycleService } from "@application/services/round-lifecycle.service";
import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class GetBetUseCase {
	private readonly logger = new Logger(GetBetUseCase.name);

	constructor(private readonly roundLifecycleService: RoundLifecycleService) {}

	async execute(betId: string): Promise<BetResponseDto | null> {
		this.logger.debug(`Getting bet: ${betId}`);

		const round = this.roundLifecycleService.getCurrentRound();
		if (!round) {
			return null;
		}

		const bet = round.bets.find((b) => b.id === betId);
		if (!bet) {
			return null;
		}

		return BetResponseDto.fromDomain(bet);
	}
}
