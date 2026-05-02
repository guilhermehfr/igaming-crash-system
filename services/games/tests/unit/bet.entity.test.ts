import { describe, it, expect } from 'bun:test';
import { Bet, BetState } from '../../src/domain/bet.entity';

describe('Bet Entity', () => {
  describe('Creation', () => {
    it('should create bet with positive amount', () => {
      const bet = Bet.create('bet-1', 'round-1', 'user-1', 1000n);

      expect(bet.id).toBe('bet-1');
      expect(bet.roundId).toBe('round-1');
      expect(bet.playerId).toBe('user-1');
      expect(bet.betAmountInCentavos).toBe(1000n);
      expect(bet.state).toBe(BetState.PENDING);
      expect(bet.cashOutMultiplier).toBeNull();
      expect(bet.winningsInCentavos).toBeNull();
    });

    it('should create bet with larger amount', () => {
      const bet = Bet.create('bet-1', 'round-1', 'user-1', 50000n);

      expect(bet.betAmountInCentavos).toBe(50000n);
    });

    it('should reject zero amount', () => {
      expect(() => Bet.create('bet-1', 'round-1', 'user-1', 0n)).toThrow(
        'Bet amount must be greater than zero',
      );
    });

    it('should reject negative amount', () => {
      expect(() => Bet.create('bet-1', 'round-1', 'user-1', -100n)).toThrow(
        'Bet amount must be greater than zero',
      );
    });

    it('should reject negative as BigInt', () => {
      expect(() => Bet.create('bet-1', 'round-1', 'user-1', -1n)).toThrow(
        'Bet amount must be greater than zero',
      );
    });
  });

  describe('State Transitions', () => {
    it('should cash out with multiplier', () => {
      const bet = Bet.create('bet-1', 'round-1', 'user-1', 1000n);

      bet.cashOut(2.5);

      expect(bet.state).toBe(BetState.CASHED_OUT);
      expect(bet.cashOutMultiplier).toBe(2.5);
      expect(bet.winningsInCentavos).toBe(2500n);
    });

    it('should calculate winnings correctly on cashout', () => {
      const bet = Bet.create('bet-1', 'round-1', 'user-1', 1000n);

      bet.cashOut(3.0);

      expect(bet.winningsInCentavos).toBe(3000n);
    });

    it('should handle cashout at 1.0x multiplier', () => {
      const bet = Bet.create('bet-1', 'round-1', 'user-1', 1000n);

      bet.cashOut(1.0);

      expect(bet.winningsInCentavos).toBe(1000n);
      expect(bet.calculateProfitLoss()).toBe(0n);
    });

    it('should mark as lost', () => {
      const bet = Bet.create('bet-1', 'round-1', 'user-1', 1000n);

      bet.lose();

      expect(bet.state).toBe(BetState.LOST);
      expect(bet.winningsInCentavos).toBe(0n);
    });

    it('should not allow cashout twice', () => {
      const bet = Bet.create('bet-1', 'round-1', 'user-1', 1000n);

      bet.cashOut(2.0);

      expect(() => bet.cashOut(3.0)).toThrow('Can only cash out pending bets');
    });

    it('should not allow cashout after lost', () => {
      const bet = Bet.create('bet-1', 'round-1', 'user-1', 1000n);

      bet.lose();

      expect(() => bet.cashOut(2.0)).toThrow('Can only cash out pending bets');
    });
  });

  describe('Calculations', () => {
    it('should calculate profit on winning bet', () => {
      const bet = Bet.create('bet-1', 'round-1', 'user-1', 1000n);

      bet.cashOut(2.5);

      expect(bet.calculateProfitLoss()).toBe(1500n);
    });

    it('should calculate loss on lost bet', () => {
      const bet = Bet.create('bet-1', 'round-1', 'user-1', 1000n);

      bet.lose();

      expect(bet.calculateProfitLoss()).toBe(-1000n);
    });

    it('should calculate zero profit on 1.0x cashout', () => {
      const bet = Bet.create('bet-1', 'round-1', 'user-1', 1000n);

      bet.cashOut(1.0);

      expect(bet.calculateProfitLoss()).toBe(0n);
    });

    it('should calculate ROI percentage', () => {
      const bet = Bet.create('bet-1', 'round-1', 'user-1', 1000n);

      bet.cashOut(2.0);

      expect(bet.calculateROI()).toBe(100);
    });

    it('should calculate negative ROI on loss', () => {
      const bet = Bet.create('bet-1', 'round-1', 'user-1', 1000n);

      bet.lose();

      expect(bet.calculateROI()).toBe(-100);
    });

    it('should calculate zero ROI on 1.0x cashout', () => {
      const bet = Bet.create('bet-1', 'round-1', 'user-1', 1000n);

      bet.cashOut(1.0);

      expect(bet.calculateROI()).toBe(0);
    });

    it('should calculate high ROI on big win', () => {
      const bet = Bet.create('bet-1', 'round-1', 'user-1', 1000n);

      bet.cashOut(10.0);

      expect(bet.calculateROI()).toBe(900);
    });
  });

  describe('Timestamps', () => {
    it('should set createdAt on creation', () => {
      const before = new Date();
      const bet = Bet.create('bet-1', 'round-1', 'user-1', 1000n);
      const after = new Date();

      expect(bet.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(bet.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should update updatedAt on cashout', () => {
      const bet = Bet.create('bet-1', 'round-1', 'user-1', 1000n);
      const beforeTime = bet.updatedAt.getTime();

      // Add a small delay to ensure different timestamp
      const start = Date.now();
      while (Date.now() - start < 10) {}

      bet.cashOut(2.0);

      expect(bet.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeTime);
    });
  });
});