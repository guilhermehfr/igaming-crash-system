import { describe, expect, it } from "bun:test";
import { Bet, BetState } from "../../src/domain/bet.entity";

describe("Bet Entity", () => {
	describe("Creation", () => {
		it("should create bet in PENDING state with given values", () => {
			const bet = Bet.create("bet-1", "round-1", "user-1", 1000n);

			expect(bet.id).toBe("bet-1");
			expect(bet.roundId).toBe("round-1");
			expect(bet.playerId).toBe("user-1");
			expect(bet.betAmountInCentavos).toBe(1000n);
			expect(bet.state).toBe(BetState.PENDING);
			expect(bet.cashOutMultiplier).toBeNull();
			expect(bet.winningsInCentavos).toBeNull();
		});

		it("should reject zero or negative amount", () => {
			expect(() => Bet.create("b1", "r1", "u1", 0n)).toThrow(
				"Bet amount must be greater than zero",
			);
			expect(() => Bet.create("b1", "r1", "u1", -1n)).toThrow(
				"Bet amount must be greater than zero",
			);
		});
	});

	describe("State Transitions", () => {
		it("should cash out with correct winnings", () => {
			const bet = Bet.create("bet-1", "round-1", "user-1", 1000n);

			bet.cashOut(2.5);

			expect(bet.state).toBe(BetState.CASHED_OUT);
			expect(bet.cashOutMultiplier).toBe(2.5);
			expect(bet.winningsInCentavos).toBe(2500n);
		});

		it("should handle 1.0x cashout (no profit)", () => {
			const bet = Bet.create("bet-1", "round-1", "user-1", 1000n);

			bet.cashOut(1.0);

			expect(bet.winningsInCentavos).toBe(1000n);
			expect(bet.calculateProfitLoss()).toBe(0n);
		});

		it("should mark as lost with zero winnings", () => {
			const bet = Bet.create("bet-1", "round-1", "user-1", 1000n);

			bet.lose();

			expect(bet.state).toBe(BetState.LOST);
			expect(bet.winningsInCentavos).toBe(0n);
		});

		it("should reject cashout after already cashed out or lost", () => {
			const bet = Bet.create("bet-1", "round-1", "user-1", 1000n);
			bet.cashOut(2.0);
			expect(() => bet.cashOut(3.0)).toThrow("Can only cash out pending bets");

			const bet2 = Bet.create("bet-2", "round-1", "user-1", 1000n);
			bet2.lose();
			expect(() => bet2.cashOut(2.0)).toThrow("Can only cash out pending bets");
		});
	});

	describe("Calculations", () => {
		it("should calculate profit/loss correctly", () => {
			const winner = Bet.create("b1", "r1", "u1", 1000n);
			winner.cashOut(2.5);
			expect(winner.calculateProfitLoss()).toBe(1500n);

			const loser = Bet.create("b2", "r1", "u1", 1000n);
			loser.lose();
			expect(loser.calculateProfitLoss()).toBe(-1000n);

			const even = Bet.create("b3", "r1", "u1", 1000n);
			even.cashOut(1.0);
			expect(even.calculateProfitLoss()).toBe(0n);
		});

		it("should calculate ROI percentage", () => {
			const winner = Bet.create("b1", "r1", "u1", 1000n);
			winner.cashOut(2.0);
			expect(winner.calculateROI()).toBe(100);

			const loser = Bet.create("b2", "r1", "u1", 1000n);
			loser.lose();
			expect(loser.calculateROI()).toBe(-100);
		});
	});
});
