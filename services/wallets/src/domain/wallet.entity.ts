import { Money } from './money.value-object';

/**
 * Wallet Entity
 * Represents a user's wallet with balance tracking in centavos
 * This is an aggregate root in the DDD pattern
 */
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

  /**
   * Creates a new Wallet for a user
   * @param id - The wallet unique identifier
   * @param userId - The user identifier
   * @param initialBalance - Optional initial balance (defaults to zero)
   * @returns A new Wallet instance
   */
  static create(
    id: string,
    userId: string,
    initialBalance: Money = Money.zero(),
  ): Wallet {
    return new Wallet(id, userId, initialBalance);
  }

  /**
   * Gets the wallet ID
   */
  get id(): string {
    return this._id;
  }

  /**
   * Gets the user ID
   */
  get userId(): string {
    return this._userId;
  }

  /**
   * Gets the current balance as Money
   */
  get balance(): Money {
    return this._balance;
  }

  /**
   * Gets the balance in centavos
   */
  get balanceInCentavos(): bigint {
    return this._balance.amountInCentavos;
  }

  /**
   * Gets the balance in the main currency unit
   */
  get balanceInMainUnit(): number {
    return this._balance.amountInMainUnit;
  }

  /**
   * Gets the creation timestamp
   */
  get createdAt(): Date {
    return this._createdAt;
  }

  /**
   * Gets the last update timestamp
   */
  get updatedAt(): Date {
    return this._updatedAt;
  }

  /**
   * Deposits money into the wallet
   * @param amount - The amount to deposit
   */
  deposit(amount: Money): void {
    if (amount.isZero()) {
      throw new Error('Deposit amount must be greater than zero');
    }
    this._balance = this._balance.add(amount);
    this._updatedAt = new Date();
  }

  /**
   * Withdraws money from the wallet
   * @param amount - The amount to withdraw
   * @throws Error if there are insufficient funds
   */
  withdraw(amount: Money): void {
    if (amount.isZero()) {
      throw new Error('Withdrawal amount must be greater than zero');
    }
    this._balance = this._balance.subtract(amount);
    this._updatedAt = new Date();
  }

  /**
   * Checks if the wallet has sufficient funds
   * @param amount - The amount to check
   * @returns true if balance >= amount
   */
  hasSufficientFunds(amount: Money): boolean {
    return !this._balance.isLessThan(amount) || this._balance.equals(amount);
  }

  /**
   * Resets the wallet balance to zero
   */
  resetBalance(): void {
    this._balance = Money.zero();
    this._updatedAt = new Date();
  }

  /**
   * Sets the wallet balance directly (use with caution)
   * @param newBalance - The new balance
   */
  setBalance(newBalance: Money): void {
    this._balance = newBalance;
    this._updatedAt = new Date();
  }
}
