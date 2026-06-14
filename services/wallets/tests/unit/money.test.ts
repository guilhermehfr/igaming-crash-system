import { describe, it, expect } from 'bun:test';
import { Money } from '@domain/money.vo';

describe('Money Value Object', () => {
  describe('Creation', () => {
    it('should create from centavos as BigInt', () => {
      const money = Money.fromCentavos(1050n);

      expect(money.amountInCentavos).toBe(1050n);
      expect(money.amountInMainUnit).toBe(10.5);
    });

    it('should create from centavos as number', () => {
      const money = Money.fromCentavos(100);

      expect(money.amountInCentavos).toBe(100n);
      expect(money.amountInMainUnit).toBe(1);
    });

    it('should create from main unit', () => {
      const money = Money.fromMainUnit(10.50);

      expect(money.amountInCentavos).toBe(1050n);
      expect(money.amountInMainUnit).toBe(10.5);
    });

    it('should handle decimal truncation', () => {
      const money = Money.fromMainUnit(10.555);

      expect(money.amountInCentavos).toBe(1055n);
    });

    it('should create zero money', () => {
      const money = Money.zero();

      expect(money.amountInCentavos).toBe(0n);
      expect(money.amountInMainUnit).toBe(0);
    });

    it('should reject negative amount', () => {
      expect(() => Money.fromCentavos(-100n)).toThrow('Amount cannot be negative');
    });

    it('should reject negative from main unit', () => {
      expect(() => Money.fromMainUnit(-10)).toThrow('Amount cannot be negative');
    });
  });

  describe('Operations', () => {
    it('should add money correctly', () => {
      const money1 = Money.fromCentavos(1000n);
      const money2 = Money.fromCentavos(500n);
      const result = money1.add(money2);

      expect(result.amountInCentavos).toBe(1500n);
    });

    it('should add multiple times immutably', () => {
      const money1 = Money.fromCentavos(1000n);
      const money2 = Money.fromCentavos(500n);
      const money3 = Money.fromCentavos(250n);

      const result = money1.add(money2).add(money3);

      expect(result.amountInCentavos).toBe(1750n);
      expect(money1.amountInCentavos).toBe(1000n);
    });

    it('should subtract money correctly', () => {
      const money1 = Money.fromCentavos(1000n);
      const money2 = Money.fromCentavos(300n);
      const result = money1.subtract(money2);

      expect(result.amountInCentavos).toBe(700n);
    });

    it('should reject subtraction resulting in negative', () => {
      const money1 = Money.fromCentavos(100n);
      const money2 = Money.fromCentavos(500n);

      expect(() => money1.subtract(money2)).toThrow('Insufficient funds');
    });

    it('should subtract to zero', () => {
      const money1 = Money.fromCentavos(500n);
      const money2 = Money.fromCentavos(500n);
      const result = money1.subtract(money2);

      expect(result.amountInCentavos).toBe(0n);
    });
  });

  describe('Comparisons', () => {
    it('should check equality', () => {
      const money1 = Money.fromCentavos(1000n);
      const money2 = Money.fromCentavos(1000n);

      expect(money1.equals(money2)).toBe(true);
    });

    it('should detect inequality', () => {
      const money1 = Money.fromCentavos(1000n);
      const money2 = Money.fromCentavos(500n);

      expect(money1.equals(money2)).toBe(false);
    });

    it('should check greater than', () => {
      const money1 = Money.fromCentavos(1000n);
      const money2 = Money.fromCentavos(500n);

      expect(money1.isGreaterThan(money2)).toBe(true);
      expect(money2.isGreaterThan(money1)).toBe(false);
    });

    it('should check less than', () => {
      const money1 = Money.fromCentavos(500n);
      const money2 = Money.fromCentavos(1000n);

      expect(money1.isLessThan(money2)).toBe(true);
      expect(money2.isLessThan(money1)).toBe(false);
    });

    it('should detect zero', () => {
      const money = Money.zero();

      expect(money.isZero()).toBe(true);
    });

    it('should detect non-zero', () => {
      const money = Money.fromCentavos(100n);

      expect(money.isZero()).toBe(false);
    });
  });

  describe('Immutability', () => {
    it('should not mutate on add', () => {
      const original = Money.fromCentavos(1000n);
      const added = Money.fromCentavos(500n);

      original.add(added);

      expect(original.amountInCentavos).toBe(1000n);
    });

    it('should not mutate on subtract', () => {
      const original = Money.fromCentavos(1000n);
      const subtracted = Money.fromCentavos(300n);

      original.subtract(subtracted);

      expect(original.amountInCentavos).toBe(1000n);
    });
  });
});