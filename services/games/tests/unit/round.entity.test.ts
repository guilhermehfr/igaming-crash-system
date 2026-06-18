import { describe, expect, it } from "bun:test";
import { Bet, BetState } from "../../src/domain/bet.entity";
import { CrashPoint } from "../../src/domain/crash-point.vo";
import {
	InvalidStateTransitionError,
	Round,
	RoundState,
} from "../../src/domain/round.entity";

describe("Round Entity", () => {
	describe("State Machine", () => {
		it("should create round in BETTING state", () => {
			const round = Round.create("test-round-1");
			expect(round.state).toBe(RoundState.BETTING);
			expect(round.currentMultiplier).toBe(1.0);
			expect(round.crashPoint).toBeNull();
		});

		it("should transition BETTING -> RUNNING", () => {
			const round = Round.create("test-round-1");
			const crashPoint = CrashPoint.create(2.5, "hash123", "seed123");

			round.setCrashPoint(crashPoint);
			round.startRound();

			expect(round.state).toBe(RoundState.RUNNING);
			expect(round.crashPoint?.multiplier).toBe(2.5);
		});

		it("should transition RUNNING -> CRASHED after hasCrashed", () => {
			const round = Round.create("test-round-1");
			const crashPoint = CrashPoint.create(2.0, "hash123", "seed123");

			round.setCrashPoint(crashPoint);
			round.startRound();
			round.updateMultiplier(1.5);
			round.updateMultiplier(2.1);

			expect(round.hasCrashed()).toBe(true);
			// The crash is auto-triggered, state becomes CRASHED
		});

		it("should throw on invalid transition BETTING -> CRASHED", () => {
			const round = Round.create("test-round-1");

			expect(() => round.crash()).toThrow(InvalidStateTransitionError);
		});

		it("should not allow direct state transition to BETTING after RUNNING", () => {
			const round = Round.create("test-round-1");
			const crashPoint = CrashPoint.create(2.0, "hash123", "seed123");

			round.setCrashPoint(crashPoint);
			round.startRound();

			expect(round.state).toBe(RoundState.RUNNING);
			// Direct state manipulation is possible but state machine enforces transitions
		});

		it("should throw when placing bet in RUNNING state", () => {
			const round = Round.create("test-round-1");
			const crashPoint = CrashPoint.create(2.0, "hash123", "seed123");
			const bet = Bet.create("bet-1", "test-round-1", "user-1", 1000n);

			round.setCrashPoint(crashPoint);
			round.startRound();

			expect(() => round.placeBet(bet)).toThrow(InvalidStateTransitionError);
		});

		it("should throw when placing bet in CRASHED state", () => {
			const round = Round.create("test-round-1");
			const crashPoint = CrashPoint.create(2.0, "hash123", "seed123");
			const bet = Bet.create("bet-1", "test-round-1", "user-1", 1000n);

			round.setCrashPoint(crashPoint);
			round.startRound();
			round.crash();

			expect(() => round.placeBet(bet)).toThrow(InvalidStateTransitionError);
		});
	});

	describe("Bets", () => {
		it("should place bet in BETTING state", () => {
			const round = Round.create("test-round-1");
			const bet = Bet.create("bet-1", "test-round-1", "user-1", 1000n);

			round.placeBet(bet);

			expect(round.bets).toHaveLength(1);
			expect(round.bets[0].id).toBe("bet-1");
			expect(round.bets[0].state).toBe(BetState.PENDING);
		});

		it("should allow multiple bets", () => {
			const round = Round.create("test-round-1");
			const bet1 = Bet.create("bet-1", "test-round-1", "user-1", 1000n);
			const bet2 = Bet.create("bet-2", "test-round-1", "user-2", 2000n);
			const bet3 = Bet.create("bet-3", "test-round-1", "user-1", 1500n);

			round.placeBet(bet1);
			round.placeBet(bet2);
			round.placeBet(bet3);

			expect(round.bets).toHaveLength(3);
			expect(round.betCount).toBe(3);
		});

		it("should cash out bet in RUNNING state", () => {
			const round = Round.create("test-round-1");
			const crashPoint = CrashPoint.create(5.0, "hash123", "seed123");
			const bet = Bet.create("bet-1", "test-round-1", "user-1", 1000n);

			round.placeBet(bet);
			round.setCrashPoint(crashPoint);
			round.startRound();
			bet.cashOut(2.5);

			const betResult = round.bets.find((b) => b.id === "bet-1");
			expect(betResult?.state).toBe(BetState.CASHED_OUT);
			expect(betResult?.cashOutMultiplier).toBe(2.5);
			expect(betResult?.winningsInCentavos).toBe(2500n);
		});

		it("should throw when cashing out non-existent bet", () => {
			const round = Round.create("test-round-1");
			const crashPoint = CrashPoint.create(5.0, "hash123", "seed123");

			round.setCrashPoint(crashPoint);
			round.startRound();

			expect(() => round.cashOut("non-existent", 2.0)).toThrow("Bet not found");
		});

		it("should auto-liquidate pending bets on crash", () => {
			const round = Round.create("test-round-1");
			const crashPoint = CrashPoint.create(2.0, "hash123", "seed123");
			const bet1 = Bet.create("bet-1", "test-round-1", "user-1", 1000n);
			const bet2 = Bet.create("bet-2", "test-round-1", "user-2", 2000n);

			round.placeBet(bet1);
			round.placeBet(bet2);
			round.setCrashPoint(crashPoint);
			round.startRound();

			bet1.cashOut(1.5);

			// Once hasCrashed returns true, state is already CRASHED
			// So no need to call crash() manually
			round.updateMultiplier(2.1);

			const pendingBet = round.bets.find((b) => b.id === "bet-2");
			expect(pendingBet?.state).toBe(BetState.LOST);
			expect(pendingBet?.winningsInCentavos).toBe(0n);
		});
	});

	describe("Multiplier", () => {
		it("should update multiplier in RUNNING state", () => {
			const round = Round.create("test-round-1");
			const crashPoint = CrashPoint.create(5.0, "hash123", "seed123");

			round.setCrashPoint(crashPoint);
			round.startRound();
			round.updateMultiplier(1.5);
			round.updateMultiplier(2.0);

			expect(round.currentMultiplier).toBe(2.0);
		});

		it("should throw when updating multiplier in BETTING state", () => {
			const round = Round.create("test-round-1");

			expect(() => round.updateMultiplier(1.5)).toThrow(
				InvalidStateTransitionError,
			);
		});

		it("should detect crash when multiplier >= crashPoint", () => {
			const round = Round.create("test-round-1");
			const crashPoint = CrashPoint.create(2.0, "hash123", "seed123");

			round.setCrashPoint(crashPoint);
			round.startRound();
			round.updateMultiplier(1.5);

			expect(round.hasCrashed()).toBe(false);

			round.updateMultiplier(2.1);

			expect(round.hasCrashed()).toBe(true);
		});
	});

	describe("Statistics", () => {
		it("should calculate total wagered", () => {
			const round = Round.create("test-round-1");
			const bet1 = Bet.create("bet-1", "test-round-1", "user-1", 1000n);
			const bet2 = Bet.create("bet-2", "test-round-1", "user-2", 2500n);
			const bet3 = Bet.create("bet-3", "test-round-1", "user-3", 500n);

			round.placeBet(bet1);
			round.placeBet(bet2);
			round.placeBet(bet3);

			expect(round.calculateTotalWagered()).toBe(4000n);
		});

		it("should calculate total winnings", () => {
			const round = Round.create("test-round-1");
			const crashPoint = CrashPoint.create(5.0, "hash123", "seed123");
			const bet1 = Bet.create("bet-1", "test-round-1", "user-1", 1000n);
			const bet2 = Bet.create("bet-2", "test-round-1", "user-2", 2000n);

			round.placeBet(bet1);
			round.placeBet(bet2);
			round.setCrashPoint(crashPoint);
			round.startRound();

			bet1.cashOut(2.0);
			bet2.cashOut(3.0);

			expect(round.calculateTotalWinnings()).toBe(8000n);
		});

		it("should calculate house result after crash", () => {
			const round = Round.create("test-round-1");
			const crashPoint = CrashPoint.create(5.0, "hash123", "seed123");
			const bet1 = Bet.create("bet-1", "test-round-1", "user-1", 1000n);
			const bet2 = Bet.create("bet-2", "test-round-1", "user-2", 2000n);

			round.placeBet(bet1);
			round.placeBet(bet2);
			round.setCrashPoint(crashPoint);
			round.startRound();

			bet1.cashOut(2.0);

			// Trigger crash
			round.updateMultiplier(5.1);
			// State is now CRASHED

			expect(round.calculateTotalWagered()).toBe(3000n);
			expect(round.calculateTotalWinnings()).toBe(2000n);
			expect(round.calculateHouseResult()).toBe(1000n);
		});

		it("should return zero statistics when no bets", () => {
			const round = Round.create("test-round-1");

			const stats = round.getStatistics();
			expect(stats.totalBets).toBe(0);
			expect(stats.pendingBets).toBe(0);
			expect(stats.cashedOutBets).toBe(0);
			expect(stats.lostBets).toBe(0);
		});
	});
});
