import { Bet } from './bet.entity';
import { CrashPoint } from './crash-point.vo';

export enum RoundState {
  BETTING = 'BETTING',
  RUNNING = 'RUNNING',
  CRASHED = 'CRASHED',
}

export class InvalidStateTransitionError extends Error {
  constructor(currentState: RoundState, attemptedAction: string) {
    super(
      `Invalid state transition: cannot perform "${attemptedAction}" while in "${currentState}" state`,
    );
    this.name = 'InvalidStateTransitionError';
  }
}

export class Round {
  private _id: string;
  private _state: RoundState;
  private _bets: Map<string, Bet>;
  private _currentMultiplier: number;
  private _crashPoint: CrashPoint | null;
  private _bettingStartedAt: Date;
  private _gameStartedAt: Date | null;
  private _gameEndedAt: Date | null;

  constructor(
    id: string,
    state: RoundState = RoundState.BETTING,
    bets: Map<string, Bet> = new Map(),
    currentMultiplier: number = 1.0,
    crashPoint: CrashPoint | null = null,
    bettingStartedAt: Date = new Date(),
    gameStartedAt: Date | null = null,
    gameEndedAt: Date | null = null,
  ) {
    this._id = id;
    this._state = state;
    this._bets = bets;
    this._currentMultiplier = currentMultiplier;
    this._crashPoint = crashPoint;
    this._bettingStartedAt = bettingStartedAt;
    this._gameStartedAt = gameStartedAt;
    this._gameEndedAt = gameEndedAt;
  }

  static create(id: string): Round {
    return new Round(id);
  }

  get id(): string {
    return this._id;
  }

  get state(): RoundState {
    return this._state;
  }

  get bets(): Bet[] {
    return Array.from(this._bets.values());
  }

  get betCount(): number {
    return this._bets.size;
  }

  get currentMultiplier(): number {
    return this._currentMultiplier;
  }

  get crashPoint(): CrashPoint | null {
    return this._crashPoint;
  }

  get bettingStartedAt(): Date {
    return this._bettingStartedAt;
  }

  get gameStartedAt(): Date | null {
    return this._gameStartedAt;
  }

  get gameEndedAt(): Date | null {
    return this._gameEndedAt;
  }

  get bettingDuration(): number {
    const endTime = this._gameStartedAt || new Date();
    return endTime.getTime() - this._bettingStartedAt.getTime();
  }

  isBetting(): boolean {
    return this._state === RoundState.BETTING;
  }

  isRunning(): boolean {
    return this._state === RoundState.RUNNING;
  }

  hasCrashed(): boolean {
    return this._state === RoundState.CRASHED;
  }

  private validateBettingToRunning(): void {
    if (!this.isBetting()) {
      throw new InvalidStateTransitionError(this._state, 'startRound');
    }
  }

  private validateRunningToCrashed(): void {
    if (!this.isRunning()) {
      throw new InvalidStateTransitionError(this._state, 'crash');
    }
  }

  private validateBettingOperationsAllowed(): void {
    if (!this.isBetting()) {
      throw new InvalidStateTransitionError(this._state, 'placeBet');
    }
  }

  private validateRunningOperationsAllowed(): void {
    if (!this.isRunning()) {
      throw new InvalidStateTransitionError(this._state, 'updateMultiplier');
    }
  }

  placeBet(bet: Bet): void {
    this.validateBettingOperationsAllowed();

    if (this._bets.has(bet.id)) {
      throw new Error(`Bet ${bet.id} already exists in this round`);
    }

    this._bets.set(bet.id, bet);
  }

  getBet(betId: string): Bet | null {
    return this._bets.get(betId) || null;
  }

  getPlayerBets(playerId: string): Bet[] {
    return this.bets.filter((bet) => bet.playerId === playerId);
  }

  setCrashPoint(crashPoint: CrashPoint): void {
    this.validateBettingOperationsAllowed();

    if (this._crashPoint !== null) {
      throw new Error('Crash point is already set for this round');
    }

    this._crashPoint = crashPoint;

    this.bets.forEach((bet) => {
      if (bet.isPending()) {
        bet.setCrashPoint(crashPoint);
      }
    });
  }

  startRound(): void {
    this.validateBettingToRunning();

    if (this._crashPoint === null) {
      throw new Error('Crash point must be set before starting the round');
    }

    this._state = RoundState.RUNNING;
    this._gameStartedAt = new Date();
    this._currentMultiplier = 1.0;
  }

  crash(): void {
    this.validateRunningToCrashed();

    this._state = RoundState.CRASHED;
    this._gameEndedAt = new Date();

    this.bets.forEach((bet) => {
      if (bet.isPending()) {
        bet.lose();
      }
    });
  }

  updateMultiplier(newMultiplier: number): void {
    this.validateRunningOperationsAllowed();

    if (newMultiplier < 1.0) {
      throw new Error('Multiplier must be at least 1.0');
    }

    if (newMultiplier < this._currentMultiplier) {
      throw new Error('Multiplier cannot decrease');
    }

    this._currentMultiplier = newMultiplier;

    if (this._crashPoint && this._crashPoint.hasCrashed(newMultiplier)) {
      this.crash();
    }
  }

  cashOut(betId: string, multiplier: number): void {
    this.validateRunningOperationsAllowed();

    const bet = this.getBet(betId);
    if (!bet) {
      throw new Error(`Bet ${betId} not found in this round`);
    }

    if (!bet.isPending()) {
      throw new Error(`Bet ${betId} is not in PENDING state`);
    }

    if (this._crashPoint && this._crashPoint.hasCrashed(multiplier)) {
      throw new Error('Cannot cash out after crash point');
    }

    bet.cashOut(multiplier);
  }

  calculateTotalWagered(): bigint {
    return this.bets.reduce(
      (total, bet) => total + bet.betAmountInCentavos,
      0n,
    );
  }

  calculateTotalWinnings(): bigint {
    return this.bets.reduce((total, bet) => {
      if (bet.isCashedOut() && bet.winningsInCentavos) {
        return total + bet.winningsInCentavos;
      }
      return total;
    }, 0n);
  }

  calculateHouseResult(): bigint {
    const totalWagered = this.calculateTotalWagered();
    const totalWinnings = this.calculateTotalWinnings();
    return totalWagered - totalWinnings;
  }

  getStatistics(): {
    totalBets: number;
    pendingBets: number;
    cashedOutBets: number;
    lostBets: number;
  } {
    let pendingBets = 0;
    let cashedOutBets = 0;
    let lostBets = 0;

    this.bets.forEach((bet) => {
      if (bet.isPending()) pendingBets++;
      else if (bet.isCashedOut()) cashedOutBets++;
      else if (bet.isLost()) lostBets++;
    });

    return {
      totalBets: this.betCount,
      pendingBets,
      cashedOutBets,
      lostBets,
    };
  }
}
