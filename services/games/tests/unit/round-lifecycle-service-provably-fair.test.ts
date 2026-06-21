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
	events: Array<{ event: string; data: Record<string, unknown> }> = [];

	emitRoundStateChange(
		roundId: string,
		state: RoundState,
		crashPoint: number | null,
	) {
		this.events.push({
			event: "round:state-changed",
			data: { roundId, state, crashPoint },
		});
	}

	emitMultiplierUpdate(roundId: string, multiplier: number, state: RoundState) {
		this.events.push({
			event: "round:multiplier-updated",
			data: { roundId, multiplier, state },
		});
	}

	emitRoundCrashed(
		roundId: string,
		multiplier: number,
		stats: {
			totalBets: number;
			pendingBets: number;
			cashedOutBets: number;
			lostBets: number;
		},
	) {
		this.events.push({
			event: "round:crashed",
			data: { roundId, multiplier, stats },
		});
	}

	emitBetPlaced(
		roundId: string,
		bet: {
			id: string;
			userId: string;
			amountInMainUnit: number;
			state: string;
		},
	) {
		this.events.push({ event: "round:bet-placed", data: { roundId, bet } });
	}

	emitBetCashedOut(
		roundId: string,
		bet: {
			id: string;
			userId: string;
			multiplier: number | null;
			winningsInMainUnit: number;
		},
	) {
		this.events.push({ event: "round:bet-cashed-out", data: { roundId, bet } });
	}
}

class MockRabbitMQPublisher {
	events: Array<{ type: string; data: Record<string, unknown> }> = [];

	async publishBetPlaced(data: Record<string, unknown>) {
		this.events.push({ type: "BetPlaced", data });
	}

	async publishBetCashedOut(data: Record<string, unknown>) {
		this.events.push({ type: "BetCashedOut", data });
	}

	async publishBetLost(data: Record<string, unknown>) {
		this.events.push({ type: "BetLost", data });
	}
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
			// biome-ignore lint/suspicious/noExplicitAny: mock casts in tests
			new MockRoundRepository() as any,
			// biome-ignore lint/suspicious/noExplicitAny: mock casts in tests
			new MockGamesGateway() as any,
			// biome-ignore lint/suspicious/noExplicitAny: mock casts in tests
			new MockRabbitMQPublisher() as any,
			new MockCrashPointGenerator(),
		);
	});

	afterEach(() => {
		service.onModuleDestroy();
	});

	describe("getServerSeedHash", () => {
		it("should return a 64-char hex string", () => {
			const hash = service.getServerSeedHash();
			expect(hash).toMatch(/^[0-9a-f]{64}$/);
		});

		it("should return the SHA256 of the server seed", () => {
			const serverSeed = service.getServerSeed();
			const expectedHash = createHash("sha256")
				.update(serverSeed)
				.digest("hex");
			expect(service.getServerSeedHash()).toBe(expectedHash);
		});

		it("should not equal the server seed itself", () => {
			expect(service.getServerSeedHash()).not.toBe(service.getServerSeed());
		});
	});

	describe("getServerSeed", () => {
		it("should return a non-empty string", () => {
			expect(service.getServerSeed()).toBeTruthy();
		});

		it("should return a 64-char hex string", () => {
			expect(service.getServerSeed()).toMatch(/^[0-9a-f]{64}$/);
		});
	});

	describe("getClientSeed", () => {
		it("should return a non-empty string", () => {
			expect(service.getClientSeed()).toBeTruthy();
		});

		it("should return a 64-char hex string", () => {
			expect(service.getClientSeed()).toMatch(/^[0-9a-f]{64}$/);
		});
	});

	describe("setClientSeed", () => {
		it("should update the client seed", () => {
			service.setClientSeed("my-custom-seed");
			expect(service.getClientSeed()).toBe("my-custom-seed");
		});

		it("should reject empty seed", () => {
			expect(() => service.setClientSeed("")).toThrow("non-empty");
		});

		it("should reject whitespace-only seed", () => {
			expect(() => service.setClientSeed("   ")).toThrow("non-empty");
		});
	});

	describe("getNonce", () => {
		it("should start at 1", () => {
			expect(service.getNonce()).toBe(1);
		});
	});

	describe("revealServerSeed", () => {
		it("should return the current server seed", () => {
			const currentSeed = service.getServerSeed();
			const result = service.revealServerSeed();
			expect(result.serverSeed).toBe(currentSeed);
		});

		it("should generate a new server seed after reveal", () => {
			const currentSeed = service.getServerSeed();
			service.revealServerSeed();
			expect(service.getServerSeed()).not.toBe(currentSeed);
		});

		it("should update the server seed hash after reveal", () => {
			const oldHash = service.getServerSeedHash();
			service.revealServerSeed();
			expect(service.getServerSeedHash()).not.toBe(oldHash);
		});

		it("should return the new server seed hash", () => {
			const result = service.revealServerSeed();
			expect(result.serverSeedHash).toBe(service.getServerSeedHash());
		});

		it("should return the current client seed", () => {
			const result = service.revealServerSeed();
			expect(result.clientSeed).toBe(service.getClientSeed());
		});

		it("should return the current nonce", () => {
			const result = service.revealServerSeed();
			expect(result.nonce).toBe(service.getNonce());
		});

		it("should return the new hash matching SHA256 of new seed", () => {
			const result = service.revealServerSeed();
			const expectedHash = createHash("sha256")
				.update(service.getServerSeed())
				.digest("hex");
			expect(result.serverSeedHash).toBe(expectedHash);
		});
	});
});
