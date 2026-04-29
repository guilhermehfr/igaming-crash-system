import { CrashPoint } from './crash-point.vo';

/**
 * Bet Entity States
 */
export enum BetState {
  PENDING = 'PENDING',      // Bet placed, waiting for cash out or crash
  CASHED_OUT = 'CASHED_OUT', // Player cashed out before crash
  LOST = 'LOST',            // Game crashed before cash out
}

/**
 * Bet Entity
 * Represents a player's bet in a crash game round
 */
export class Bet {
  private _id: string;
  private _roundId: string;
  private _playerId: string;
  private _betAmountInCentavos: bigint;
  private _state: BetState;
  private _cashOutMultiplier: number | null;
  private _winningsInCentavos: bigint | null;
  private _crashPoint: CrashPoint | null;
  private _createdAt: Date;
  private _updatedAt: Date;

  constructor(
    id: string,
    roundId: string,
    playerId: string,
    betAmountInCentavos: bigint,
    state: BetState = BetState.PENDING,
    cashOutMultiplier: number | null = null,
    winningsInCentavos: bigint | null = null,
    crashPoint: CrashPoint | null = null,
    createdAt: Date = new Date(),
    updatedAt: Date = new Date(),
  ) {
    this._id = id;
    this._roundId = roundId;
    this._playerId = playerId;
    this._betAmountInCentavos = betAmountInCentavos;
    this._state = state;
    this._cashOutMultiplier = cashOutMultiplier;
    this._winningsInCentavos = winningsInCentavos;
    this._crashPoint = crashPoint;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  /**
   * Creates a new Bet
   * @param id - The bet unique identifier
   * @param roundId - The round this bet belongs to
   * @param playerId - The player who placed the bet
   * @param betAmountInCentavos - The bet amount in centavos
   * @returns A new Bet instance
   * @throws Error if bet amount is negative or zero
   */
  static create(
    id: string,
    roundId: string,
    playerId: string,
    betAmountInCentavos: bigint,
  ): Bet {
    if (betAmountInCentavos <= 0n) {
      throw new Error('Bet amount must be greater than zero');
    }

    return new Bet(id, roundId, playerId, betAmountInCentavos);
  }

  /**
   * Gets the bet ID
   */
  get id(): string {
    return this._id;
  }

  /**
   * Gets the round ID
   */
  get roundId(): string {
    return this._roundId;
  }

  /**
   * Gets the player ID
   */
  get playerId(): string {
    return this._playerId;
  }

  /**
   * Gets the bet amount in centavos
   */
  get betAmountInCentavos(): bigint {
    return this._betAmountInCentavos;
  }

  /**
   * Gets the current bet state
   */
  get state(): BetState {
    return this._state;
  }

  /**
   * Gets the cash out multiplier (only if cashed out)
   */
  get cashOutMultiplier(): number | null {
    return this._cashOutMultiplier;
  }

  /**
   * Gets the winnings in centavos (only if won)
   */
  get winningsInCentavos(): bigint | null {
    return this._winningsInCentavos;
  }

  /**
   * Gets the crash point for this bet's round
   */
  get crashPoint(): CrashPoint | null {
    return this._crashPoint;
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
   * Checks if the bet is still pending
   */
  isPending(): boolean {
    return this._state === BetState.PENDING;
  }

  /**
   * Checks if the bet has been cashed out
   */
  isCashedOut(): boolean {
    return this._state === BetState.CASHED_OUT;
  }

  /**
   * Checks if the bet has lost
   */
  isLost(): boolean {
    return this._state === BetState.LOST;
  }

  /**
   * Checks if the bet has a result (either cashed out or lost)
   */
  hasResult(): boolean {
    return this._state !== BetState.PENDING;
  }

  /**
   * Sets the crash point for this bet's round
   * @param crashPoint - The crash point that will crash this round
   */
  setCrashPoint(crashPoint: CrashPoint): void {
    if (this._state !== BetState.PENDING) {
      throw new Error('Cannot set crash point for a bet that already has a result');
    }
    this._crashPoint = crashPoint;
    this._updatedAt = new Date();
  }

  /**
   * Cashes out the bet at a specific multiplier
   * @param multiplier - The multiplier at which the player cashes out
   * @throws Error if bet is not pending or multiplier is invalid
   */
  cashOut(multiplier: number): void {
    if (!this.isPending()) {
      throw new Error('Can only cash out pending bets');
    }

    if (multiplier < 1.0) {
      throw new Error('Cash out multiplier must be at least 1.0');
    }

    if (this._crashPoint && this._crashPoint.hasCrashed(multiplier)) {
      throw new Error('Cannot cash out after crash point');
    }

    this._cashOutMultiplier = multiplier;
    this._winningsInCentavos = BigInt(
      Math.floor(Number(this._betAmountInCentavos) * multiplier),
    );
    this._state = BetState.CASHED_OUT;
    this._updatedAt = new Date();
  }

  /**
   * Marks the bet as lost
   * @throws Error if bet is not pending
   */
  lose(): void {
    if (!this.isPending()) {
      throw new Error('Can only lose pending bets');
    }

    this._state = BetState.LOST;
    this._winningsInCentavos = 0n;
    this._updatedAt = new Date();
  }

  /**
   * Calculates the profit/loss in centavos
   * Positive: profit, Negative: loss, Zero: break-even
   */
  calculateProfitLoss(): bigint {
    if (this._state === BetState.PENDING) {
      return 0n;
    }

    if (this._state === BetState.LOST) {
      return -this._betAmountInCentavos;
    }

    if (this._winningsInCentavos === null) {
      return 0n;
    }

    return this._winningsInCentavos - this._betAmountInCentavos;
  }

  /**
   * Calculates the return on investment (ROI) as a percentage
   */
  calculateROI(): number {
    if (this._state === BetState.PENDING) {
      return 0;
    }

    const profitLoss = this.calculateProfitLoss();
    return (Number(profitLoss) / Number(this._betAmountInCentavos)) * 100;
  }
}
