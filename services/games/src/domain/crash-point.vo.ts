import { createHmac } from "node:crypto";

export class CrashPoint {
	private readonly _multiplier: number;
	private readonly _hash: string;
	private readonly _seed: string;

	private constructor(multiplier: number, hash: string, seed: string) {
		this._multiplier = multiplier;
		this._hash = hash;
		this._seed = seed;
	}

	static create(multiplier: number, hash: string, seed: string): CrashPoint {
		if (multiplier < 1.0) {
			throw new Error("Crash point multiplier must be at least 1.0");
		}

		if (!hash || hash.trim().length === 0) {
			throw new Error("Hash cannot be empty");
		}

		if (!seed || seed.trim().length === 0) {
			throw new Error("Seed cannot be empty");
		}

		return new CrashPoint(multiplier, hash, seed);
	}

	static instantCrash(hash: string, seed: string): CrashPoint {
		return CrashPoint.create(1.0, hash, seed);
	}

	get multiplier(): number {
		return this._multiplier;
	}

	get hash(): string {
		return this._hash;
	}

	get seed(): string {
		return this._seed;
	}

	isInstantCrash(): boolean {
		return this._multiplier === 1.0;
	}

	hasCrashed(currentMultiplier: number): boolean {
		return currentMultiplier >= this._multiplier;
	}

	verifyProvablyFair(serverSecret: string): boolean {
		try {
			const computedHash = createHmac("sha256", serverSecret)
				.update(this._seed)
				.digest("hex");

			if (computedHash !== this._hash) {
				return false;
			}

			const h = parseInt(computedHash.slice(0, 8), 16);
			const e = 2 ** 32;

			if (h % 100 === 0) {
				return this._multiplier === 1.0;
			}

			const computedMultiplier = Math.floor((100 * e - h) / (e - h)) / 100;

			return Math.abs(this._multiplier - computedMultiplier) < 0.01;
		} catch {
			return false;
		}
	}

	equals(other: CrashPoint): boolean {
		return (
			this._multiplier === other._multiplier &&
			this._hash === other._hash &&
			this._seed === other._seed
		);
	}

	toString(): string {
		return `CrashPoint(${this._multiplier.toFixed(2)}x)`;
	}
}
