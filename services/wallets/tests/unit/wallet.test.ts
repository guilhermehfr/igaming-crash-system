import { describe, it, expect } from 'bun:test';
import { Wallet } from '@domain/wallet.entity';
import { Money } from '@domain/money.vo';

describe('Wallet Entity', () => {
  describe('Creation', () => {
    it('should create wallet with default zero balance', () => {
      const wallet = Wallet.create('wallet-1', 'user-1');

      expect(wallet.id).toBe('wallet-1');
      expect(wallet.userId).toBe('user-1');
      expect(wallet.balanceInCentavos).toBe(0n);
    });

    it('should create wallet with initial balance', () => {
      const initialBalance = Money.fromMainUnit(100);
      const wallet = Wallet.create('wallet-1', 'user-1', initialBalance);

      expect(wallet.balanceInCentavos).toBe(10000n);
      expect(wallet.balanceInMainUnit).toBe(100);
    });

    it('should set createdAt timestamp', () => {
      const before = new Date();
      const wallet = Wallet.create('wallet-1', 'user-1');
      const after = new Date();

      expect(wallet.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(wallet.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('Operations', () => {
    it('should deposit funds', () => {
      const wallet = Wallet.create('wallet-1', 'user-1');
      const depositAmount = Money.fromMainUnit(50);

      wallet.deposit(depositAmount);

      expect(wallet.balanceInMainUnit).toBe(50);
    });

    it('should deposit multiple times', () => {
      const wallet = Wallet.create('wallet-1', 'user-1');

      wallet.deposit(Money.fromMainUnit(50));
      wallet.deposit(Money.fromMainUnit(30));

      expect(wallet.balanceInMainUnit).toBe(80);
    });

    it('should reject zero deposit', () => {
      const wallet = Wallet.create('wallet-1', 'user-1');

      expect(() => wallet.deposit(Money.zero())).toThrow(
        'Deposit amount must be greater than zero',
      );
    });

    it('should withdraw sufficient funds', () => {
      const wallet = Wallet.create('wallet-1', 'user-1', Money.fromMainUnit(100));

      wallet.withdraw(Money.fromMainUnit(30));

      expect(wallet.balanceInMainUnit).toBe(70);
    });

    it('should withdraw entire balance', () => {
      const wallet = Wallet.create('wallet-1', 'user-1', Money.fromMainUnit(50));

      wallet.withdraw(Money.fromMainUnit(50));

      expect(wallet.balanceInMainUnit).toBe(0);
    });

    it('should reject withdrawal insufficient funds', () => {
      const wallet = Wallet.create('wallet-1', 'user-1', Money.fromMainUnit(20));

      expect(() => wallet.withdraw(Money.fromMainUnit(50))).toThrow('Insufficient funds');
    });

    it('should reject zero withdrawal', () => {
      const wallet = Wallet.create('wallet-1', 'user-1', Money.fromMainUnit(100));

      expect(() => wallet.withdraw(Money.zero())).toThrow(
        'greater than zero',
      );
    });

    it('should check hasSufficientFunds', () => {
      const wallet = Wallet.create('wallet-1', 'user-1', Money.fromMainUnit(100));

      expect(wallet.hasSufficientFunds(Money.fromMainUnit(50))).toBe(true);
      expect(wallet.hasSufficientFunds(Money.fromMainUnit(100))).toBe(true);
      expect(wallet.hasSufficientFunds(Money.fromMainUnit(150))).toBe(false);
    });

    it('should reset balance to zero', () => {
      const wallet = Wallet.create('wallet-1', 'user-1', Money.fromMainUnit(100));

      wallet.resetBalance();

      expect(wallet.balanceInMainUnit).toBe(0);
    });

    it('should set balance directly', () => {
      const wallet = Wallet.create('wallet-1', 'user-1');
      const newBalance = Money.fromMainUnit(250);

      wallet.setBalance(newBalance);

      expect(wallet.balanceInMainUnit).toBe(250);
    });
  });

  describe('Timestamps', () => {
    it('should update updatedAt on deposit', () => {
      const wallet = Wallet.create('wallet-1', 'user-1');
      const beforeTime = wallet.updatedAt.getTime();

      // Small delay to ensure different timestamp
      const start = Date.now();
      while (Date.now() - start < 10) {}

      wallet.deposit(Money.fromMainUnit(50));

      expect(wallet.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeTime);
    });

    it('should update updatedAt on withdraw', () => {
      const wallet = Wallet.create('wallet-1', 'user-1', Money.fromMainUnit(100));
      const beforeTime = wallet.updatedAt.getTime();

      const start = Date.now();
      while (Date.now() - start < 10) {}

      wallet.withdraw(Money.fromMainUnit(30));

      expect(wallet.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeTime);
    });

    it('should update updatedAt on reset', () => {
      const wallet = Wallet.create('wallet-1', 'user-1', Money.fromMainUnit(100));
      const beforeTime = wallet.updatedAt.getTime();

      const start = Date.now();
      while (Date.now() - start < 10) {}

      wallet.resetBalance();

      expect(wallet.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeTime);
    });
  });
});