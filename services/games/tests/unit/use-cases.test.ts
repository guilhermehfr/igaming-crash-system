import { beforeEach, describe, expect, it } from "bun:test";
import type { RoundLifecycleService } from "../../src/application/services/round-lifecycle.service";
import { GetCurrentRoundUseCase } from "../../src/application/use-cases/get-current-round.use-case";
import { GetRoundHistoryUseCase } from "../../src/application/use-cases/get-round-history.use-case";
import { PlaceBetUseCase } from "../../src/application/use-cases/place-bet.use-case";
import type { Bet } from "../../src/domain/bet.entity";
import { Round } from "../../src/domain/round.entity";

// Mock RoundLifecycleService
class MockRoundLifecycleService {
	currentRound: Round | null = null;
	placedBets: Bet[] = [];
	cashedOutBets: { betId: string; multiplier: number }[] = [];
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

	async cashOutBet(betId: string, multiplier: number) {
		if (!this.currentRound) throw new Error("No active round");
		this.currentRound.cashOut(betId, multiplier);
		this.cashedOutBets.push({ betId, multiplier });
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

	describe("execute", () => {
		it("should place bet with valid input", async () => {
			mockService.currentRound = Round.create("round-1");

			const result = await useCase.execute({
				userId: "user-1",
				amountInMainUnit: 10,
			});

			expect(result.userId).toBe("user-1");
			expect(result.amountInMainUnit).toBe(10);
			expect(mockService.placedBets).toHaveLength(1);
		});

		it("should throw with empty userId", async () => {
			await expect(
				useCase.execute({ userId: "", amountInMainUnit: 10 }),
			).rejects.toThrow("User ID must be non-empty");
		});

		it("should throw with whitespace-only userId", async () => {
			await expect(
				useCase.execute({ userId: "   ", amountInMainUnit: 10 }),
			).rejects.toThrow("User ID must be non-empty");
		});

		it("should reject zero amount", async () => {
			mockService.currentRound = Round.create("round-1");
			await expect(
				useCase.execute({ userId: "user-1", amountInMainUnit: 0 }),
			).rejects.toThrow("Bet amount must be greater than zero");
		});

		it("should throw with negative amount", async () => {
			mockService.currentRound = Round.create("round-1");

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

		it("should convert amount to centavos", async () => {
			mockService.currentRound = Round.create("round-1");

			const result = await useCase.execute({
				userId: "user-1",
				amountInMainUnit: 10.5,
			});

			expect(result.amountInMainUnit).toBe(10.5);
		});
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

	describe("execute", () => {
		it("should return round when exists", async () => {
			mockService.currentRound = Round.create("round-1");

			const result = await useCase.execute();

			expect(result).not.toBeNull();
			expect(result?.id).toBe("round-1");
		});

		it("should throw when no round exists", async () => {
			mockService.currentRound = null;

			await expect(useCase.execute()).rejects.toThrow("No active round");
		});
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

	describe("execute", () => {
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

		it("should respect max limit of 100", async () => {
			await expect(useCase.execute({ page: 1, limit: 200 })).rejects.toThrow(
				"Limit cannot exceed 100",
			);
		});

		it("should require page >= 1", async () => {
			await expect(useCase.execute({ page: 0, limit: 10 })).rejects.toThrow(
				">= 1",
			);
		});

		it("should require positive limit", async () => {
			await expect(useCase.execute({ page: 1, limit: 0 })).rejects.toThrow(
				"> 0",
			);
		});
	});
});
