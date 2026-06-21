import { createHmac } from "node:crypto";

export class CrashPoint {
	private readonly _multiplier: number;
	private readonly _hash: string;
	private readonly _clientSeed: string;
	private readonly _nonce: number;

	private constructor(
		multiplier: number,
		hash: string,
		clientSeed: string,
		nonce: number,
	) {
		this._multiplier = multiplier;
		this._hash = hash;
		this._clientSeed = clientSeed;
		this._nonce = nonce;
	}

	static create(
		multiplier: number,
		hash: string,
		clientSeed: string,
		nonce: number,
	): CrashPoint {
		if (multiplier < 1.0) {
			throw new Error("Crash point multiplier must be at least 1.0");
		}

		if (!hash || hash.trim().length === 0) {
			throw new Error("Hash cannot be empty");
		}

		if (!clientSeed || clientSeed.trim().length === 0) {
			throw new Error("Client seed cannot be empty");
		}

		if (nonce < 1) {
			throw new Error("Nonce must be at least 1");
		}

		return new CrashPoint(multiplier, hash, clientSeed, nonce);
	}

	static instantCrash(
		hash: string,
		clientSeed: string,
		nonce: number,
	): CrashPoint {
		return CrashPoint.create(1.0, hash, clientSeed, nonce);
	}

	get multiplier(): number {
		return this._multiplier;
	}

	get hash(): string {
		return this._hash;
	}

	get clientSeed(): string {
		return this._clientSeed;
	}

	get nonce(): number {
		return this._nonce;
	}

	isInstantCrash(): boolean {
		return this._multiplier === 1.0;
	}

	hasCrashed(currentMultiplier: number): boolean {
		return currentMultiplier >= this._multiplier;
	}

	verifyProvablyFair(serverSeed: string): boolean {
		try {
			const combinedSeed = `${this._clientSeed}-${this._nonce}`;
			const computedHash = createHmac("sha256", serverSeed)
				.update(combinedSeed)
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
			this._clientSeed === other._clientSeed &&
			this._nonce === other._nonce
		);
	}

	toString(): string {
		return `CrashPoint(${this._multiplier.toFixed(2)}x)`;
	}
}
