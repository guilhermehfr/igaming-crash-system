import { beforeEach, describe, expect, it } from "bun:test";
import { createHmac } from "node:crypto";
import { VerifyRoundUseCase } from "../../src/application/use-cases/verify-round.use-case";
import { CrashPoint } from "../../src/domain/crash-point.vo";
import { Round } from "../../src/domain/round.entity";
import type { IRoundRepository } from "../../src/domain/round.repository";

class MockRoundRepository implements IRoundRepository {
	private rounds: Map<string, Round> = new Map();

	setRound(id: string, round: Round): void {
		this.rounds.set(id, round);
	}

	async findById(id: string): Promise<Round | null> {
		return this.rounds.get(id) || null;
	}

	async save(round: Round): Promise<Round> {
		this.rounds.set(round.id, round);
		return round;
	}

	async findMostRecent(): Promise<Round | null> {
		return null;
	}

	async findAll(): Promise<Round[]> {
		return [];
	}

	async delete(): Promise<boolean> {
		return true;
	}

	async exists(): Promise<boolean> {
		return true;
	}

	async count(): Promise<number> {
		return 0;
	}
}

class MockRoundLifecycleService {
	private _serverSeed: string;

	constructor(serverSeed: string) {
		this._serverSeed = serverSeed;
	}

	getServerSeed(): string {
		return this._serverSeed;
	}
}

function createCrashedRound(
	roundId: string,
	multiplier: number,
	hash: string,
	clientSeed: string,
	nonce: number,
): Round {
	const crashPoint = CrashPoint.create(multiplier, hash, clientSeed, nonce);
	const round = Round.create(roundId);
	round.setCrashPoint(crashPoint);
	round.startRound();
	round.crash();
	return round;
}

function generateCrashPoint(
	serverSeed: string,
	clientSeed: string,
	nonce: number,
): { multiplier: number; hash: string } {
	const combinedSeed = `${clientSeed}-${nonce}`;
	const hash = createHmac("sha256", serverSeed)
		.update(combinedSeed)
		.digest("hex");

	const h = parseInt(hash.slice(0, 8), 16);
	const e = 2 ** 32;
	const multiplier =
		h % 100 === 0 ? 1.0 : Math.floor((100 * e - h) / (e - h)) / 100;

	return { multiplier, hash };
}

describe("VerifyRoundUseCase", () => {
	const serverSeed =
		"abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
	const clientSeed = "test-client-seed";
	const nonce = 1;

	let roundRepository: MockRoundRepository;
	let roundLifecycleService: MockRoundLifecycleService;
	let useCase: VerifyRoundUseCase;

	beforeEach(() => {
		roundRepository = new MockRoundRepository();
		roundLifecycleService = new MockRoundLifecycleService(serverSeed);
		useCase = new VerifyRoundUseCase(
			roundRepository as unknown as IRoundRepository,
			roundLifecycleService as unknown as never,
		);
	});

	it("should verify valid round and detect tampered data", async () => {
		const { multiplier, hash } = generateCrashPoint(
			serverSeed,
			clientSeed,
			nonce,
		);
		const round = createCrashedRound(
			"round-1",
			multiplier,
			hash,
			clientSeed,
			nonce,
		);
		roundRepository.setRound("round-1", round);

		const result = await useCase.execute("round-1");

		expect(result.isValid).toBe(true);
		expect(result.roundId).toBe("round-1");
		expect(result.formula).toBeTruthy();
		expect(result.houseEdge).toBeTruthy();

		const tamperedHash =
			(parseInt(hash.slice(0, 8), 16) ^ 1).toString(16).padStart(8, "0") +
			hash.slice(8);
		const tamperedRound = createCrashedRound(
			"round-2",
			multiplier,
			tamperedHash,
			clientSeed,
			nonce,
		);
		roundRepository.setRound("round-2", tamperedRound);

		const tamperedResult = await useCase.execute("round-2");
		expect(tamperedResult.isValid).toBe(false);

		const wrongSeedResult = await useCase.execute("round-1");
		expect(wrongSeedResult.isValid).toBe(true);
	});

	it("should throw for non-existent or non-crashed round", async () => {
		await expect(useCase.execute("non-existent")).rejects.toThrow(
			"not found",
		);

		const round = Round.create("round-1");
		roundRepository.setRound("round-1", round);
		await expect(useCase.execute("round-1")).rejects.toThrow(
			"not yet crashed",
		);
	});
});
