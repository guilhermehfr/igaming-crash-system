import type { CrashPoint } from "./crash-point.vo";

export enum BetState {
	PENDING = "PENDING",
	CASHED_OUT = "CASHED_OUT",
	LOST = "LOST",
}

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

	static create(
		id: string,
		roundId: string,
		playerId: string,
		betAmountInCentavos: bigint,
	): Bet {
		if (betAmountInCentavos < 0n) {
			throw new Error("Bet amount must be zero or greater");
		}

		return new Bet(id, roundId, playerId, betAmountInCentavos);
	}

	get id(): string {
		return this._id;
	}

	get roundId(): string {
		return this._roundId;
	}

	get playerId(): string {
		return this._playerId;
	}

	get betAmountInCentavos(): bigint {
		return this._betAmountInCentavos;
	}

	get state(): BetState {
		return this._state;
	}

	get cashOutMultiplier(): number | null {
		return this._cashOutMultiplier;
	}

	get winningsInCentavos(): bigint | null {
		return this._winningsInCentavos;
	}

	get crashPoint(): CrashPoint | null {
		return this._crashPoint;
	}

	get createdAt(): Date {
		return this._createdAt;
	}

	get updatedAt(): Date {
		return this._updatedAt;
	}

	isPending(): boolean {
		return this._state === BetState.PENDING;
	}

	isCashedOut(): boolean {
		return this._state === BetState.CASHED_OUT;
	}

	isLost(): boolean {
		return this._state === BetState.LOST;
	}

	hasResult(): boolean {
		return this._state !== BetState.PENDING;
	}

	setCrashPoint(crashPoint: CrashPoint): void {
		if (this._state !== BetState.PENDING) {
			throw new Error(
				"Cannot set crash point for a bet that already has a result",
			);
		}
		this._crashPoint = crashPoint;
		this._updatedAt = new Date();
	}

	cashOut(multiplier: number): void {
		if (!this.isPending()) {
			throw new Error("Can only cash out pending bets");
		}

		if (multiplier < 1.0) {
			throw new Error("Cash out multiplier must be at least 1.0");
		}

		if (this._crashPoint?.hasCrashed(multiplier)) {
			throw new Error("Cannot cash out after crash point");
		}

		this._cashOutMultiplier = multiplier;
		this._winningsInCentavos = BigInt(
			Math.floor(Number(this._betAmountInCentavos) * multiplier),
		);
		this._state = BetState.CASHED_OUT;
		this._updatedAt = new Date();
	}

	lose(): void {
		if (!this.isPending()) {
			throw new Error("Can only lose pending bets");
		}

		this._state = BetState.LOST;
		this._winningsInCentavos = 0n;
		this._updatedAt = new Date();
	}

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

	calculateROI(): number {
		if (this._state === BetState.PENDING) {
			return 0;
		}

		const profitLoss = this.calculateProfitLoss();
		return (Number(profitLoss) / Number(this._betAmountInCentavos)) * 100;
	}
}
