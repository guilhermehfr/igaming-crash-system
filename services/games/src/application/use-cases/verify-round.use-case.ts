import { config } from "@config/configuration";
import type { IRoundRepository } from "@domain/round.repository";
import { Inject, Injectable, Logger } from "@nestjs/common";
@Injectable()
export class VerifyRoundUseCase {
	private readonly logger = new Logger(VerifyRoundUseCase.name);

	constructor(
		@Inject("IRoundRepository")
		private readonly roundRepository: IRoundRepository,
	) {}

	async execute(roundId: string): Promise<VerifyRoundResponse> {
		this.logger.debug(`Verifying round: ${roundId}`);

		const round = await this.roundRepository.findById(roundId);
		if (!round) {
			throw new Error(`Round ${roundId} not found`);
		}

		if (!round.hasCrashed()) {
			throw new Error(
				`Round ${roundId} is not yet crashed. Cannot verify ongoing rounds.`,
			);
		}

		const crashPoint = round.crashPoint;
		if (!crashPoint) {
			throw new Error(`Round ${roundId} has no crash point`);
		}

		const serverSecret = config.crash.serverSecret;

		const isValid = crashPoint.verifyProvablyFair(serverSecret);

		this.logger.log(
			`Round ${roundId} verification: ${isValid ? "✓ VALID" : "✗ INVALID"}`,
		);

		return {
			roundId,
			isValid,
			multiplier: crashPoint.multiplier,
			seed: crashPoint.seed,
			hash: crashPoint.hash,
			formula:
				"multiplier = floor((100 * 2^32 - h) / (2^32 - h)) / 100 where h = HMAC-SHA256(seed)[0:8]",
			houseEdge: "~1% (instant crash if h % 100 === 0)",
		};
	}
}

export interface VerifyRoundResponse {
	roundId: string;
	isValid: boolean;
	multiplier: number;
	seed: string;
	hash: string;
	formula: string;
	houseEdge: string;
}
