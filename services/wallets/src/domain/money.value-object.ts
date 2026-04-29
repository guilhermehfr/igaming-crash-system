/**
 * Money Value Object
 * Represents a monetary amount in centavos (smallest currency unit)
 * Ensures immutability and validation of monetary values
 */
export class Money {
  private readonly _amount: bigint;

  private constructor(amountInCentavos: bigint) {
    this._amount = amountInCentavos;
  }

  /**
   * Creates a Money instance from an amount in centavos
   * @param amountInCentavos - The amount in centavos (must be non-negative)
   * @returns A new Money instance
   * @throws Error if amount is negative
   */
  static fromCentavos(amountInCentavos: bigint | number): Money {
    const cents = typeof amountInCentavos === 'number' 
      ? BigInt(Math.floor(amountInCentavos)) 
      : BigInt(amountInCentavos);

    if (cents < 0n) {
      throw new Error('Amount cannot be negative');
    }

    return new Money(cents);
  }

  /**
   * Creates a Money instance from an amount in the main currency unit (e.g., reais)
   * @param amountInMainUnit - The amount in main currency units
   * @returns A new Money instance
   * @throws Error if amount is negative
   */
  static fromMainUnit(amountInMainUnit: number): Money {
    const cents = BigInt(Math.floor(amountInMainUnit * 100));
    return Money.fromCentavos(cents);
  }

  /**
   * Creates a Money instance with zero amount
   */
  static zero(): Money {
    return new Money(0n);
  }

  /**
   * Gets the amount in centavos
   */
  get amountInCentavos(): bigint {
    return this._amount;
  }

  /**
   * Gets the amount in the main currency unit (e.g., reais)
   */
  get amountInMainUnit(): number {
    return Number(this._amount) / 100;
  }

  /**
   * Adds another Money value to this one
   * @param other - The Money to add
   * @returns A new Money instance with the sum
   */
  add(other: Money): Money {
    return new Money(this._amount + other._amount);
  }

  /**
   * Subtracts another Money value from this one
   * @param other - The Money to subtract
   * @returns A new Money instance with the difference
   * @throws Error if the result would be negative
   */
  subtract(other: Money): Money {
    const result = this._amount - other._amount;
    if (result < 0n) {
      throw new Error('Insufficient funds: result cannot be negative');
    }
    return new Money(result);
  }

  /**
   * Checks if this Money value is zero
   */
  isZero(): boolean {
    return this._amount === 0n;
  }

  /**
   * Checks if this Money value is greater than another
   */
  isGreaterThan(other: Money): boolean {
    return this._amount > other._amount;
  }

  /**
   * Checks if this Money value is less than another
   */
  isLessThan(other: Money): boolean {
    return this._amount < other._amount;
  }

  /**
   * Checks if this Money value equals another
   */
  equals(other: Money): boolean {
    return this._amount === other._amount;
  }

  /**
   * Returns the string representation of the Money value
   */
  toString(): string {
    return `Money(${this.amountInMainUnit.toFixed(2)})`;
  }
}
