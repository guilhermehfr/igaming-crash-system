import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { createHash } from "node:crypto";
import type { CrashPointGenerator } from "../../src/application/services/crash-point-generator";
import { RoundLifecycleService } from "../../src/application/services/round-lifecycle.service";
import { type Round, RoundState } from "../../src/domain/round.entity";
import type { IRoundRepository } from "../../src/domain/round.repository";

class MockRoundRepository implements IRoundRepository {
	savedRounds: Round[] = [];

	async save(round: Round): Promise<void> {
		this.savedRounds.push(round);
	}

	async findById(id: string): Promise<Round | null> {
		return this.savedRounds.find((r) => r.id === id) || null;
	}

	async findMostRecent(): Promise<Round | null> {
		return this.savedRounds[this.savedRounds.length - 1] || null;
	}

	async findAll(page: number, limit: number): Promise<Round[]> {
		return this.savedRounds.slice((page - 1) * limit, page * limit);
	}

	async delete(id: string): Promise<void> {
		this.savedRounds = this.savedRounds.filter((r) => r.id !== id);
	}

	async exists(id: string): Promise<boolean> {
		return this.savedRounds.some((r) => r.id === id);
	}

	async count(): Promise<number> {
		return this.savedRounds.length;
	}
}

class MockGamesGateway {
	emitRoundStateChange(
		_roundId: string,
		_state: RoundState,
		_crashPoint: number | null,
	) {}
	emitMultiplierUpdate(
		_roundId: string,
		_multiplier: number,
		_state: RoundState,
	) {}
	emitRoundCrashed(
		_roundId: string,
		_multiplier: number,
		_stats: Record<string, unknown>,
	) {}
	emitBetPlaced(_roundId: string, _bet: Record<string, unknown>) {}
	emitBetCashedOut(_roundId: string, _bet: Record<string, unknown>) {}
}

class MockRabbitMQPublisher {
	async publishBetPlaced(_data: Record<string, unknown>) {}
	async publishBetCashedOut(_data: Record<string, unknown>) {}
	async publishBetLost(_data: Record<string, unknown>) {}
}

class MockCrashPointGenerator implements CrashPointGenerator {
	generate(_hash: string): number {
		return 2.0;
	}
}

describe("RoundLifecycleService - Provably Fair", () => {
	let service: RoundLifecycleService;

	beforeEach(() => {
		service = new RoundLifecycleService(
			new MockRoundRepository() as any,
			new MockGamesGateway() as any,
			new MockRabbitMQPublisher() as any,
			new MockCrashPointGenerator(),
		);
	});

	afterEach(() => {
		service.onModuleDestroy();
	});

	it("should generate valid server seed with matching SHA256 hash", () => {
		const seed = service.getServerSeed();
		const hash = service.getServerSeedHash();

		expect(seed).toMatch(/^[0-9a-f]{64}$/);
		expect(hash).toMatch(/^[0-9a-f]{64}$/);
		expect(hash).not.toBe(seed);
		expect(hash).toBe(
			createHash("sha256").update(seed).digest("hex"),
		);
	});

	it("should manage client seed: get, set, reject empty", () => {
		expect(service.getClientSeed()).toMatch(/^[0-9a-f]{64}$/);

		service.setClientSeed("my-custom-seed");
		expect(service.getClientSeed()).toBe("my-custom-seed");

		expect(() => service.setClientSeed("")).toThrow("non-empty");
		expect(() => service.setClientSeed("   ")).toThrow("non-empty");
	});

	it("should start nonce at 1", () => {
		expect(service.getNonce()).toBe(1);
	});

	it("should reveal server seed, generate new one, and update hash", () => {
		const currentSeed = service.getServerSeed();
		const oldHash = service.getServerSeedHash();
		const clientSeed = service.getClientSeed();
		const nonce = service.getNonce();

		const result = service.revealServerSeed();

		expect(result.serverSeed).toBe(currentSeed);
		expect(result.clientSeed).toBe(clientSeed);
		expect(result.nonce).toBe(nonce);
		expect(result.serverSeedHash).toBe(service.getServerSeedHash());
		expect(service.getServerSeed()).not.toBe(currentSeed);
		expect(service.getServerSeedHash()).not.toBe(oldHash);
		expect(result.serverSeedHash).toBe(
			createHash("sha256").update(service.getServerSeed()).digest("hex"),
		);
	});
});
