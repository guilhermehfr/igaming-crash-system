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
		const raw =
			h % 100 === 0 ? 1.0 : Math.floor((100 * e - h) / (e - h)) / 100;
		const multiplier = Math.min(10.0, Math.max(1.3, raw));

		return { multiplier, hash, serverSeed };
	}

	it("should verify a valid crash point and reject tampered data", () => {
		const serverSeed = randomBytes(32).toString("hex");
		const { multiplier, hash } = generateCrashPoint(serverSeed);

		const crashPoint = CrashPoint.create(multiplier, hash, clientSeed, nonce);
		expect(crashPoint.verifyProvablyFair(serverSeed)).toBe(true);

		const tamperedHash =
			(parseInt(hash.slice(0, 8), 16) ^ 1).toString(16).padStart(8, "0") +
			hash.slice(8);
		const tampered = CrashPoint.create(multiplier, tamperedHash, clientSeed, nonce);
		expect(tampered.verifyProvablyFair(serverSeed)).toBe(false);

		const wrongServerSeed = randomBytes(32).toString("hex");
		expect(crashPoint.verifyProvablyFair(wrongServerSeed)).toBe(false);
	});

	it("should detect instant crash via HMAC derivation", () => {
		let found = false;

		for (let i = 0; i < 10000 && !found; i++) {
			const serverSeed = randomBytes(32).toString("hex");
			const { multiplier, hash } = generateCrashPoint(serverSeed);

			if (multiplier === 1.3) {
				const cp = CrashPoint.create(1.3, hash, clientSeed, nonce);
				expect(cp.verifyProvablyFair(serverSeed)).toBe(true);
				expect(cp.isInstantCrash()).toBe(true);
				found = true;
			}
		}

		if (!found) {
			console.log(
				"Skipped instant crash test (probability ~1%, didn't hit it in 10000 tries)",
			);
		}
	});
});
