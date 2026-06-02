import { Injectable, Logger } from "@nestjs/common";
import type { RoundLifecycleService } from "../services/round-lifecycle.service";
import { RoundResponseDto } from "../dtos/round-response.dto";
@Injectable()
export class GetCurrentRoundUseCase {
	private readonly logger = new Logger(GetCurrentRoundUseCase.name);

	constructor(private readonly roundLifecycleService: RoundLifecycleService) {}

	async execute(): Promise<RoundResponseDto> {
		this.logger.debug("Fetching current round");

		try {
			const currentRound = this.roundLifecycleService.getCurrentRound();
			if (!currentRound) {
				throw new Error("No active round available");
			}

			this.logger.debug(
				`Current round: ${currentRound.id}, state: ${currentRound.state}`,
			);

			return RoundResponseDto.fromDomain(currentRound);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			this.logger.error(`Error fetching current round: ${errorMessage}`);
			throw error;
		}
	}
}
