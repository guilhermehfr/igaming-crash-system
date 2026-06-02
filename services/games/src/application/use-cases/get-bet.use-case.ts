import { Injectable, Logger } from "@nestjs/common";
import type { RoundLifecycleService } from "../services/round-lifecycle.service";
import { BetResponseDto } from "../dtos/bet-response.dto";

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
