import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import type { CrashPointGenerator } from "@application/services/crash-point-generator";
import { RoundLifecycleService } from "../../src/application/services/round-lifecycle.service";
import { Bet } from "../../src/domain/bet.entity";
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
			roundRepository as any,
			gamesGateway as any,
			rabbitmqPublisher as any,
			new MockCrashPointGenerator(),
		);
	});

	afterEach(() => {
		service.onModuleDestroy();
	});

	it("should initialize round in BETTING state and emit event", async () => {
		await service.initializeNewRound();

		const round = service.getCurrentRound();
		expect(round).not.toBeNull();
		expect(round?.state).toBe(RoundState.BETTING);
		expect(gamesGateway.events).toContainEqual(
			expect.objectContaining({
				event: "round:state-changed",
				data: expect.objectContaining({ state: RoundState.BETTING }),
			}),
		);
	});

	it("should place bet and emit bet-placed event", async () => {
		await service.initializeNewRound();

		const bet = Bet.create("bet-1", "round-1", "user-1", 1000n);
		await service.placeBet(bet);

		const round = service.getCurrentRound();
		expect(round?.bets).toHaveLength(1);
		expect(gamesGateway.events).toContainEqual(
			expect.objectContaining({ event: "round:bet-placed" }),
		);
	});

	it("should throw when placing bet with no active round", async () => {
		const bet = Bet.create("bet-1", "round-1", "user-1", 1000n);

		await expect(service.placeBet(bet)).rejects.toThrow("No active round");
	});

	it("should return empty history when no rounds exist", async () => {
		const history = await service.getRoundHistory(1, 10);
		expect(history).toEqual([]);
	});

	it("should return rounds from history", async () => {
		await service.initializeNewRound();

		const history = await service.getRoundHistory(1, 10);
		expect(history.length).toBeGreaterThan(0);
	});

	it("should return current round or null when not initialized", () => {
		expect(service.getCurrentRound()).toBeNull();

		// After initialization it should return the round
	});
});
