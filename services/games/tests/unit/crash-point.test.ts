import { describe, expect, it } from "bun:test";
import { CrashPoint } from "../../src/domain/crash-point.vo";

describe("CrashPoint Value Object", () => {
	describe("Creation", () => {
		it("should create with valid multiplier 1.0", () => {
			const cp = CrashPoint.create(1.0, "hash123", "clientSeed123", 1);

			expect(cp.multiplier).toBe(1.0);
			expect(cp.hash).toBe("hash123");
			expect(cp.clientSeed).toBe("clientSeed123");
			expect(cp.nonce).toBe(1);
		});

		it("should create with valid multiplier 2.5", () => {
			const cp = CrashPoint.create(2.5, "hashabc", "clientSeed", 5);

			expect(cp.multiplier).toBe(2.5);
			expect(cp.nonce).toBe(5);
		});

		it("should create with high multiplier", () => {
			const cp = CrashPoint.create(100.0, "hash", "client", 10);

			expect(cp.multiplier).toBe(100.0);
		});

		it("should reject multiplier below 1.0", () => {
			expect(() => CrashPoint.create(0.99, "hash", "client", 1)).toThrow(
				"at least 1.0",
			);
		});

		it("should reject multiplier of 0", () => {
			expect(() => CrashPoint.create(0, "hash", "client", 1)).toThrow(
				"at least 1.0",
			);
		});

		it("should reject negative multiplier", () => {
			expect(() => CrashPoint.create(-1.0, "hash", "client", 1)).toThrow(
				"at least 1.0",
			);
		});

		it("should reject empty hash", () => {
			expect(() => CrashPoint.create(1.5, "", "client", 1)).toThrow("empty");
		});

		it("should reject empty client seed", () => {
			expect(() => CrashPoint.create(1.5, "hash", "", 1)).toThrow("empty");
		});

		it("should reject nonce below 1", () => {
			expect(() => CrashPoint.create(1.5, "hash", "client", 0)).toThrow(
				"at least 1",
			);
		});
	});

	describe("Helpers", () => {
		it("should detect instant crash at 1.0", () => {
			const cp = CrashPoint.create(1.0, "hash", "client", 1);

			expect(cp.isInstantCrash()).toBe(true);
		});

		it("should not detect instant crash above 1.0", () => {
			const cp = CrashPoint.create(1.5, "hash", "client", 1);

			expect(cp.isInstantCrash()).toBe(false);
		});

		it("should not detect instant crash at high value", () => {
			const cp = CrashPoint.create(50.0, "hash", "client", 1);

			expect(cp.isInstantCrash()).toBe(false);
		});

		it("should detect hasCrashed when current >= multiplier", () => {
			const cp = CrashPoint.create(2.0, "hash", "client", 1);

			expect(cp.hasCrashed(1.5)).toBe(false);
			expect(cp.hasCrashed(2.0)).toBe(true);
			expect(cp.hasCrashed(2.5)).toBe(true);
		});

		it("should detect hasCrashed at instant crash", () => {
			const cp = CrashPoint.create(1.0, "hash", "client", 1);

			expect(cp.hasCrashed(1.0)).toBe(true);
		});
	});

	describe("Immutability", () => {
		it("should return same values after creation", () => {
			const cp = CrashPoint.create(2.5, "hash", "client", 3);

			expect(cp.multiplier).toBe(2.5);
			expect(cp.hash).toBe("hash");
			expect(cp.clientSeed).toBe("client");
			expect(cp.nonce).toBe(3);
		});
	});

	describe("Equality", () => {
		it("should equal with same values", () => {
			const cp1 = CrashPoint.create(2.5, "hash", "client", 1);
			const cp2 = CrashPoint.create(2.5, "hash", "client", 1);

			expect(cp1.equals(cp2)).toBe(true);
		});

		it("should not equal with different multiplier", () => {
			const cp1 = CrashPoint.create(2.5, "hash", "client", 1);
			const cp2 = CrashPoint.create(3.0, "hash", "client", 1);

			expect(cp1.equals(cp2)).toBe(false);
		});

		it("should not equal with different hash", () => {
			const cp1 = CrashPoint.create(2.5, "hash1", "client", 1);
			const cp2 = CrashPoint.create(2.5, "hash2", "client", 1);

			expect(cp1.equals(cp2)).toBe(false);
		});

		it("should not equal with different client seed", () => {
			const cp1 = CrashPoint.create(2.5, "hash", "client1", 1);
			const cp2 = CrashPoint.create(2.5, "hash", "client2", 1);

			expect(cp1.equals(cp2)).toBe(false);
		});

		it("should not equal with different nonce", () => {
			const cp1 = CrashPoint.create(2.5, "hash", "client", 1);
			const cp2 = CrashPoint.create(2.5, "hash", "client", 2);

			expect(cp1.equals(cp2)).toBe(false);
		});
	});
});
