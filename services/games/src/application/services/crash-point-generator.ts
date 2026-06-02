export interface CrashPointGenerator {
	generate(hash: string): number;
}

export class ProvablyFairCrashPointGenerator implements CrashPointGenerator {
	generate(hash: string): number {
		const h = parseInt(hash.slice(0, 8), 16);
		const e = 2 ** 32;

		if (h % 100 === 0) return 1.0;

		return Math.floor((100 * e - h) / (e - h)) / 100;
	}
}

export class FixedCrashPointGenerator implements CrashPointGenerator {
	constructor(private readonly fixedMultiplier: number) {
		if (Number.isNaN(fixedMultiplier) || fixedMultiplier < 1.0) {
			throw new Error("Fixed crash point must be at least 1.0");
		}
	}

	generate(_hash: string): number {
		return this.fixedMultiplier;
	}
}
