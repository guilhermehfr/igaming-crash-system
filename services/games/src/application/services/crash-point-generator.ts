export interface CrashPointGenerator {
	generate(hash: string): number;
}

export class ProvablyFairCrashPointGenerator implements CrashPointGenerator {
	constructor(
		private readonly min: number = 1.3,
		private readonly max: number = 10.0,
	) {}

	generate(hash: string): number {
		const h = parseInt(hash.slice(0, 8), 16);
		const e = 2 ** 32;

		const raw =
			h % 100 === 0 ? 1.0 : Math.floor((100 * e - h) / (e - h)) / 100;

		return Math.min(this.max, Math.max(this.min, raw));
	}
}

export class FixedCrashPointGenerator implements CrashPointGenerator {
	constructor(
		private readonly fixedMultiplier: number,
		private readonly min: number = 1.3,
		private readonly max: number = 10.0,
	) {
		if (
			Number.isNaN(fixedMultiplier) ||
			fixedMultiplier < this.min ||
			fixedMultiplier > this.max
		) {
			throw new Error(
				`Fixed crash point must be between ${this.min} and ${this.max}`,
			);
		}
	}

	generate(_hash: string): number {
		return this.fixedMultiplier;
	}
}
