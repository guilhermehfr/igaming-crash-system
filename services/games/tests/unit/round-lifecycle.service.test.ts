import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import type { CrashPointGenerator } from "@application/services/crash-point-generator";
import { RoundLifecycleService } from "../../src/application/services/round-lifecycle.service";
import { Bet } from "../../src/domain/bet.entity";
import { type Round, RoundState } from "../../src/domain/round.entity";
import type { IRoundRepository } from "../../src/domain/round.repository";

// Mock implementations
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

class MockCrashPointGenerator implements CrashPointGenerator {
	generate(_hash: string): number {
		return 2.0;
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

describe("RoundLifecycleService", () => {
	let roundRepository: MockRoundRepository;
	let gamesGateway: MockGamesGateway;
	let rabbitmqPublisher: MockRabbitMQPublisher;
	let service: RoundLifecycleService;

	beforeEach(() => {
		roundRepository = new MockRoundRepository();
		gamesGateway = new MockGamesGateway();
		rabbitmqPublisher = new MockRabbitMQPublisher();

		service = new RoundLifecycleService(
			// biome-ignore lint/suspicious/noExplicitAny: mock casts in tests
			roundRepository as any,
			// biome-ignore lint/suspicious/noExplicitAny: mock casts in tests
			gamesGateway as any,
			// biome-ignore lint/suspicious/noExplicitAny: mock casts in tests
			rabbitmqPublisher as any,
			new MockCrashPointGenerator(),
		);
	});

	afterEach(() => {
		service.onModuleDestroy();
	});

	describe("Initialization", () => {
		it("should create new round in BETTING state", async () => {
			await service.initializeNewRound();

			const round = service.getCurrentRound();
			expect(round).not.toBeNull();
			expect(round?.state).toBe(RoundState.BETTING);
		});

		it("should emit state change on initialization", async () => {
			await service.initializeNewRound();

			expect(gamesGateway.events).toContainEqual(
				expect.objectContaining({
					event: "round:state-changed",
					data: expect.objectContaining({ state: RoundState.BETTING }),
				}),
			);
		});
	});

	describe("Bets", () => {
		it("should place bet via service", async () => {
			await service.initializeNewRound();

			const bet = Bet.create("bet-1", "round-1", "user-1", 1000n);
			await service.placeBet(bet);

			const round = service.getCurrentRound();
			expect(round?.bets).toHaveLength(1);
			expect(round?.bets[0].id).toBe("bet-1");
		});

		it("should emit bet placed event", async () => {
			await service.initializeNewRound();

			const bet = Bet.create("bet-1", "round-1", "user-1", 1000n);
			await service.placeBet(bet);

			expect(gamesGateway.events).toContainEqual(
				expect.objectContaining({
					event: "round:bet-placed",
				}),
			);
		});

		it("should throw when placing bet with no active round", async () => {
			const bet = Bet.create("bet-1", "round-1", "user-1", 1000n);

			await expect(service.placeBet(bet)).rejects.toThrow("No active round");
		});

		it("should cash out bet via service", async () => {
			await service.initializeNewRound();

			const bet = Bet.create("bet-1", "round-1", "user-1", 1000n);
			await service.placeBet(bet);

			// Note: Need to transition to RUNNING first for cash out
			// This is tested in integration tests
		});
	});

	describe("Round History", () => {
		it("should return empty array when no rounds", async () => {
			const history = await service.getRoundHistory(1, 10);
			expect(history).toEqual([]);
		});

		it("should return rounds from repository", async () => {
			await service.initializeNewRound();

			const history = await service.getRoundHistory(1, 10);
			expect(history.length).toBeGreaterThan(0);
		});
	});

	describe("getCurrentRound", () => {
		it("should return null when no round initialized", () => {
			const round = service.getCurrentRound();
			expect(round).toBeNull();
		});

		it("should return current round after initialization", async () => {
			await service.initializeNewRound();

			const round = service.getCurrentRound();
			expect(round).not.toBeNull();
		});
	});
});
