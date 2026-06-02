import { Injectable, Logger } from "@nestjs/common";
import { RoundResponseDto } from "../dtos/round-response.dto";
import { RoundLifecycleService } from "../services/round-lifecycle.service";
@Injectable()
export class GetRoundHistoryUseCase {
	private readonly logger = new Logger(GetRoundHistoryUseCase.name);

	private readonly MAX_LIMIT = 100;

	constructor(private readonly roundLifecycleService: RoundLifecycleService) {}

	async execute(input: {
		page: number;
		limit: number;
	}): Promise<RoundResponseDto[]> {
		if (input.page < 1) {
			throw new Error("Page must be >= 1");
		}

		if (input.limit <= 0) {
			throw new Error("Limit must be > 0");
		}

		if (input.limit > this.MAX_LIMIT) {
			throw new Error(`Limit cannot exceed ${this.MAX_LIMIT}`);
		}

		this.logger.debug(
			`Fetching round history: page=${input.page}, limit=${input.limit}`,
		);

		try {
			const rounds = await this.roundLifecycleService.getRoundHistory(
				input.page,
				input.limit,
			);

			const roundDtos = rounds.map((round) =>
				RoundResponseDto.fromDomain(round),
			);

			this.logger.debug(`Retrieved ${roundDtos.length} historical rounds`);

			return roundDtos;
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			this.logger.error(`Error fetching round history: ${errorMessage}`);
			throw error;
		}
	}
}
