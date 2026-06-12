import { Money } from './money.vo';

export class Wallet {
  private _id: string;
  private _userId: string;
  private _balance: Money;
  private _createdAt: Date;
  private _updatedAt: Date;

  constructor(
    id: string,
    userId: string,
    balance: Money,
    createdAt: Date = new Date(),
    updatedAt: Date = new Date(),
  ) {
    this._id = id;
    this._userId = userId;
    this._balance = balance;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  static create(
    id: string,
    userId: string,
    initialBalance: Money = Money.zero(),
  ): Wallet {
    return new Wallet(id, userId, initialBalance);
  }

  get id(): string {
    return this._id;
  }

  get userId(): string {
    return this._userId;
  }

  get balance(): Money {
    return this._balance;
  }

  get balanceInCentavos(): bigint {
    return this._balance.amountInCentavos;
  }

  get balanceInMainUnit(): number {
    return this._balance.amountInMainUnit;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  deposit(amount: Money): void {
    if (amount.isZero()) {
      throw new Error('Deposit amount must be greater than zero');
    }
    this._balance = this._balance.add(amount);
    this._updatedAt = new Date();
  }

  withdraw(amount: Money): void {
    if (amount.isZero()) {
      throw new Error('Withdrawal amount must be greater than zero');
    }
    this._balance = this._balance.subtract(amount);
    this._updatedAt = new Date();
  }

  hasSufficientFunds(amount: Money): boolean {
    return !this._balance.isLessThan(amount) || this._balance.equals(amount);
  }

  resetBalance(): void {
    this._balance = Money.zero();
    this._updatedAt = new Date();
  }

  setBalance(newBalance: Money): void {
    this._balance = newBalance;
    this._updatedAt = new Date();
  }
}
