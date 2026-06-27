import { RoundLifecycleService } from "@application/services/round-lifecycle.service";
import type { IRoundRepository } from "@domain/round.repository";
import { config } from "@config/configuration";
import { Inject, Injectable, Logger } from "@nestjs/common";

@Injectable()
export class VerifyRoundUseCase {
	private readonly logger = new Logger(VerifyRoundUseCase.name);

	constructor(
		@Inject("IRoundRepository")
		private readonly roundRepository: IRoundRepository,
		private readonly roundLifecycleService: RoundLifecycleService,
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

		const serverSeed = this.roundLifecycleService.getServerSeed();
		const { pointMin, pointMax } = config.crash;

		const isValid = crashPoint.verifyProvablyFair(serverSeed, pointMin, pointMax);

		this.logger.log(
			`Round ${roundId} verification: ${isValid ? "✓ VALID" : "✗ INVALID"}`,
		);

		return {
			roundId,
			isValid,
			multiplier: crashPoint.multiplier,
			hash: crashPoint.hash,
			clientSeed: crashPoint.clientSeed,
			nonce: crashPoint.nonce,
			formula:
				"hash = HMAC-SHA256(serverSeed, clientSeed-nonce), multiplier = clamp(min, max, floor((100 * 2^32 - h) / (2^32 - h)) / 100) where h = first 4 bytes of hash",
			houseEdge: `~1% house edge: h % 100 === 0 maps to min (${pointMin}x). Range: ${pointMin}x–${pointMax}x.`,
		};
	}
}

export interface VerifyRoundResponse {
	roundId: string;
	isValid: boolean;
	multiplier: number;
	hash: string;
	clientSeed: string;
	nonce: number;
	formula: string;
	houseEdge: string;
}
