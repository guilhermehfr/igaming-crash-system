import { beforeEach, describe, expect, it } from "bun:test";
import type { RoundLifecycleService } from "../../src/application/services/round-lifecycle.service";
import { GetCurrentRoundUseCase } from "../../src/application/use-cases/get-current-round.use-case";
import { GetRoundHistoryUseCase } from "../../src/application/use-cases/get-round-history.use-case";
import { PlaceBetUseCase } from "../../src/application/use-cases/place-bet.use-case";
import type { Bet } from "../../src/domain/bet.entity";
import { Round } from "../../src/domain/round.entity";

class MockRoundLifecycleService {
	currentRound: Round | null = null;
	placedBets: Bet[] = [];
	historyRounds: Round[] = [];

	getCurrentRound() {
		return this.currentRound;
	}

	async initializeNewRound() {
		this.currentRound = Round.create(`round-${Date.now()}`);
	}

	async placeBet(bet: Bet) {
		if (!this.currentRound) throw new Error("No active round");
		this.currentRound.placeBet(bet);
		this.placedBets.push(bet);
	}

	async cashOutBet(_betId: string, _multiplier: number) {
		if (!this.currentRound) throw new Error("No active round");
	}

	async getRoundHistory(page: number, limit: number): Promise<Round[]> {
		return this.historyRounds.slice((page - 1) * limit, page * limit);
	}
}

describe("PlaceBetUseCase", () => {
	let mockService: MockRoundLifecycleService;
	let useCase: PlaceBetUseCase;

	beforeEach(() => {
		mockService = new MockRoundLifecycleService();
		useCase = new PlaceBetUseCase(
			mockService as unknown as RoundLifecycleService,
		);
	});

	it("should place bet with valid input and convert to centavos", async () => {
		mockService.currentRound = Round.create("round-1");

		const result = await useCase.execute({
			userId: "user-1",
			amountInMainUnit: 10.5,
		});

		expect(result.userId).toBe("user-1");
		expect(result.amountInMainUnit).toBe(10.5);
		expect(mockService.placedBets).toHaveLength(1);
	});

	it("should reject invalid input", async () => {
		await expect(
			useCase.execute({ userId: "", amountInMainUnit: 10 }),
		).rejects.toThrow("User ID must be non-empty");

		await expect(
			useCase.execute({ userId: "   ", amountInMainUnit: 10 }),
		).rejects.toThrow("User ID must be non-empty");

		mockService.currentRound = Round.create("round-1");
		await expect(
			useCase.execute({ userId: "user-1", amountInMainUnit: 0 }),
		).rejects.toThrow("Bet amount must be greater than zero");

		await expect(
			useCase.execute({ userId: "user-1", amountInMainUnit: -5 }),
		).rejects.toThrow("Bet amount must be greater than zero");
	});

	it("should create round when no active round exists", async () => {
		const result = await useCase.execute({
			userId: "user-1",
			amountInMainUnit: 10,
		});

		expect(result).toBeDefined();
		expect(mockService.currentRound).not.toBeNull();
	});
});

describe("GetCurrentRoundUseCase", () => {
	let mockService: MockRoundLifecycleService;
	let useCase: GetCurrentRoundUseCase;

	beforeEach(() => {
		mockService = new MockRoundLifecycleService();
		useCase = new GetCurrentRoundUseCase(
			mockService as unknown as RoundLifecycleService,
		);
	});

	it("should return round when exists or throw when not", async () => {
		mockService.currentRound = Round.create("round-1");

		const result = await useCase.execute();

		expect(result).not.toBeNull();
		expect(result?.id).toBe("round-1");

		mockService.currentRound = null;
		await expect(useCase.execute()).rejects.toThrow("No active round");
	});
});

describe("GetRoundHistoryUseCase", () => {
	let mockService: MockRoundLifecycleService;
	let useCase: GetRoundHistoryUseCase;

	beforeEach(() => {
		mockService = new MockRoundLifecycleService();
		useCase = new GetRoundHistoryUseCase(
			mockService as unknown as RoundLifecycleService,
		);
	});

	it("should return empty array when no rounds", async () => {
		const result = await useCase.execute({ page: 1, limit: 10 });
		expect(result).toEqual([]);
	});

	it("should return rounds with pagination", async () => {
		mockService.historyRounds = [
			Round.create("round-1"),
			Round.create("round-2"),
			Round.create("round-3"),
		];

		const result = await useCase.execute({ page: 1, limit: 2 });
		expect(result).toHaveLength(2);
	});

	it("should validate pagination params", async () => {
		await expect(
			useCase.execute({ page: 0, limit: 10 }),
		).rejects.toThrow(">= 1");

		await expect(useCase.execute({ page: 1, limit: 0 })).rejects.toThrow(
			"> 0",
		);

		await expect(
			useCase.execute({ page: 1, limit: 200 }),
		).rejects.toThrow("Limit cannot exceed 100");
	});
});
