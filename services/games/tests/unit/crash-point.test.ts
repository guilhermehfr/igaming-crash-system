import { describe, expect, it } from "bun:test";
import { CrashPoint } from "../../src/domain/crash-point.vo";

describe("CrashPoint Value Object", () => {
	describe("Creation", () => {
		it("should create with valid values", () => {
			const cp = CrashPoint.create(2.5, "hash123", "clientSeed123", 1);

			expect(cp.multiplier).toBe(2.5);
			expect(cp.hash).toBe("hash123");
			expect(cp.clientSeed).toBe("clientSeed123");
			expect(cp.nonce).toBe(1);
		});

		it("should reject invalid inputs", () => {
			expect(() => CrashPoint.create(0.99, "hash", "client", 1)).toThrow(
				"at least 1.0",
			);
			expect(() => CrashPoint.create(1.5, "", "client", 1)).toThrow("empty");
			expect(() => CrashPoint.create(1.5, "hash", "", 1)).toThrow("empty");
			expect(() => CrashPoint.create(1.5, "hash", "client", 0)).toThrow(
				"at least 1",
			);
		});
	});

	describe("Helpers", () => {
		it("should detect instant crash at 1.0", () => {
			const cp = CrashPoint.create(1.0, "hash", "client", 1);

			expect(cp.isInstantCrash()).toBe(true);
			expect(cp.hasCrashed(1.0)).toBe(true);
		});

		it("should detect crash when multiplier >= threshold", () => {
			const cp = CrashPoint.create(2.0, "hash", "client", 1);

			expect(cp.hasCrashed(1.5)).toBe(false);
			expect(cp.hasCrashed(2.0)).toBe(true);
			expect(cp.hasCrashed(2.5)).toBe(true);
		});

		it("should not detect instant crash above 1.0", () => {
			const cp = CrashPoint.create(1.5, "hash", "client", 1);

			expect(cp.isInstantCrash()).toBe(false);
		});
	});

	describe("Equality", () => {
		it("should equal with same values", () => {
			const cp1 = CrashPoint.create(2.5, "hash", "client", 1);
			const cp2 = CrashPoint.create(2.5, "hash", "client", 1);

			expect(cp1.equals(cp2)).toBe(true);
		});

		it("should not equal with different values", () => {
			const cp1 = CrashPoint.create(2.5, "hash", "client", 1);

			expect(cp1.equals(CrashPoint.create(3.0, "hash", "client", 1))).toBe(
				false,
			);
			expect(cp1.equals(CrashPoint.create(2.5, "hash2", "client", 1))).toBe(
				false,
			);
			expect(cp1.equals(CrashPoint.create(2.5, "hash", "client2", 1))).toBe(
				false,
			);
			expect(cp1.equals(CrashPoint.create(2.5, "hash", "client", 2))).toBe(
				false,
			);
		});
	});
});
