export class Money {
  private readonly _amount: bigint;

  private constructor(amountInCentavos: bigint) {
    this._amount = amountInCentavos;
  }

  static fromCentavos(amountInCentavos: bigint | number): Money {
    const cents = typeof amountInCentavos === 'number'
      ? BigInt(Math.floor(amountInCentavos))
      : BigInt(amountInCentavos);

    if (cents < 0n) {
      throw new Error('Amount cannot be negative');
    }

    return new Money(cents);
  }

  static fromMainUnit(amountInMainUnit: number): Money {
    const cents = BigInt(Math.floor(amountInMainUnit * 100));
    return Money.fromCentavos(cents);
  }

  static zero(): Money {
    return new Money(0n);
  }

  get amountInCentavos(): bigint {
    return this._amount;
  }

  get amountInMainUnit(): number {
    return Number(this._amount) / 100;
  }

  add(other: Money): Money {
    return new Money(this._amount + other._amount);
  }

  subtract(other: Money): Money {
    const result = this._amount - other._amount;
    if (result < 0n) {
      throw new Error('Insufficient funds: result cannot be negative');
    }
    return new Money(result);
  }

  isZero(): boolean {
    return this._amount === 0n;
  }

  isGreaterThan(other: Money): boolean {
    return this._amount > other._amount;
  }

  isLessThan(other: Money): boolean {
    return this._amount < other._amount;
  }

  equals(other: Money): boolean {
    return this._amount === other._amount;
  }

  toString(): string {
    return `Money(${this.amountInMainUnit.toFixed(2)})`;
  }
}
