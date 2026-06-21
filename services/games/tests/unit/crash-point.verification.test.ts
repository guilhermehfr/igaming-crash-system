import { describe, expect, it } from "bun:test";
import { createHmac, randomBytes } from "node:crypto";
import { CrashPoint } from "../../src/domain/crash-point.vo";

describe("CrashPoint Provably Fair Verification", () => {
	const clientSeed = "test-client-seed";
	const nonce = 1;

	function generateCrashPoint(serverSeed: string) {
		const combinedSeed = `${clientSeed}-${nonce}`;
		const hash = createHmac("sha256", serverSeed)
			.update(combinedSeed)
			.digest("hex");

		const h = parseInt(hash.slice(0, 8), 16);
		const e = 2 ** 32;
		const multiplier =
			h % 100 === 0 ? 1.0 : Math.floor((100 * e - h) / (e - h)) / 100;

		return { multiplier, hash, serverSeed };
	}

	it("should verify a valid crash point", () => {
		const serverSeed = randomBytes(32).toString("hex");
		const { multiplier, hash } = generateCrashPoint(serverSeed);

		const crashPoint = CrashPoint.create(multiplier, hash, clientSeed, nonce);

		const isValid = crashPoint.verifyProvablyFair(serverSeed);
		expect(isValid).toBe(true);
	});

	it("should detect tampered hash", () => {
		const serverSeed = randomBytes(32).toString("hex");
		const { multiplier, hash } = generateCrashPoint(serverSeed);

		const tamperedHash =
			(parseInt(hash.slice(0, 8), 16) ^ 1).toString(16).padStart(8, "0") +
			hash.slice(8);

		const crashPoint = CrashPoint.create(
			multiplier,
			tamperedHash,
			clientSeed,
			nonce,
		);

		const isValid = crashPoint.verifyProvablyFair(serverSeed);
		expect(isValid).toBe(false);
	});

	it("should fail with wrong server seed", () => {
		const serverSeed = randomBytes(32).toString("hex");
		const { multiplier, hash } = generateCrashPoint(serverSeed);

		const crashPoint = CrashPoint.create(multiplier, hash, clientSeed, nonce);

		const wrongServerSeed = randomBytes(32).toString("hex");
		expect(crashPoint.verifyProvablyFair(wrongServerSeed)).toBe(false);
	});

	it("should fail with wrong client seed", () => {
		const serverSeed = randomBytes(32).toString("hex");
		const { multiplier, hash } = generateCrashPoint(serverSeed);

		const crashPoint = CrashPoint.create(multiplier, hash, clientSeed, nonce);

		const wrongClientSeed = "wrong-client-seed";
		const wrongCombinedSeed = `${wrongClientSeed}-${nonce}`;
		const wrongHash = createHmac("sha256", serverSeed)
			.update(wrongCombinedSeed)
			.digest("hex");
		const h = parseInt(wrongHash.slice(0, 8), 16);
		const e = 2 ** 32;
		const wrongMultiplier =
			h % 100 === 0 ? 1.0 : Math.floor((100 * e - h) / (e - h)) / 100;

		const wrongCp = CrashPoint.create(
			wrongMultiplier,
			wrongHash,
			wrongClientSeed,
			nonce,
		);

		expect(crashPoint.verifyProvablyFair(serverSeed)).toBe(true);
		expect(wrongCp.verifyProvablyFair(serverSeed)).toBe(true);
		expect(crashPoint.equals(wrongCp)).toBe(false);
	});

	it("should detect instant crash correctly", () => {
		let found = false;
		let hash = "";
		let h = 0;

		for (let i = 0; i < 10000 && !found; i++) {
			const serverSeed = randomBytes(32).toString("hex");
			const combinedSeed = `${clientSeed}-${nonce}`;
			hash = createHmac("sha256", serverSeed)
				.update(combinedSeed)
				.digest("hex");

			h = parseInt(hash.slice(0, 8), 16);
			if (h % 100 === 0) {
				found = true;
				const crashPoint = CrashPoint.create(1.0, hash, clientSeed, nonce);
				const isValid = crashPoint.verifyProvablyFair(serverSeed);
				expect(isValid).toBe(true);
				expect(crashPoint.isInstantCrash()).toBe(true);
				break;
			}
		}

		if (!found) {
			console.log(
				"Skipped instant crash test (probability ~1%, didn't hit it in 10000 tries)",
			);
		}
	});

	it("should handle edge cases", () => {
		const serverSeed = "test-server-seed-12345";
		const combinedSeed = `${clientSeed}-${nonce}`;
		const hash = createHmac("sha256", serverSeed)
			.update(combinedSeed)
			.digest("hex");

		const h = parseInt(hash.slice(0, 8), 16);
		const e = 2 ** 32;
		const multiplier =
			h % 100 === 0 ? 1.0 : Math.floor((100 * e - h) / (e - h)) / 100;

		const crashPoint = CrashPoint.create(multiplier, hash, clientSeed, nonce);

		expect(crashPoint.verifyProvablyFair(serverSeed)).toBe(true);

		expect(crashPoint.verifyProvablyFair("wrong-server-seed")).toBe(false);

		expect(() => CrashPoint.create(0.5, hash, clientSeed, nonce)).toThrow();

		expect(() => CrashPoint.create(1.5, "", clientSeed, nonce)).toThrow();

		expect(() => CrashPoint.create(1.5, hash, "", nonce)).toThrow();

		expect(() => CrashPoint.create(1.5, hash, clientSeed, 0)).toThrow();
	});
});
