import { describe, expect, it } from "bun:test";
import http from "node:http";

const WALLETS_URL = "http://localhost:4002";

async function request(
	url: string,
	options: Record<string, unknown> = {},
): Promise<{ status: number; data: Record<string, unknown> | string | null }> {
	return new Promise((resolve, reject) => {
		const req = http.request(url, options, (res) => {
			let body = "";
			res.on("data", (chunk) => (body += chunk));
			res.on("end", () => {
				try {
					const data = body ? JSON.parse(body) : null;
					resolve({ status: res.statusCode || 0, data });
				} catch {
					resolve({ status: res.statusCode || 0, data: body });
				}
			});
		});
		req.on("error", reject);
		req.write((options.body as string) || "");
		req.end();
	});
}

describe("Wallets E2E", () => {
	const testUserId = `test-user-${Date.now()}`;

	describe("Health", () => {
		it("should return health status", async () => {
			const { status, data } = await request(`${WALLETS_URL}/wallets/health`);
			expect(status).toBe(200);
			expect(data.status).toBe("ok");
		});
	});

	describe("POST /wallets", () => {
		it("should create wallet", async () => {
			const { status, data } = await request(`${WALLETS_URL}/wallets`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-User-Id": testUserId,
				},
				body: JSON.stringify({ initialBalanceInMainUnit: 100 }),
			});

			expect(status).toBeGreaterThanOrEqual(200);
			expect(status).toBeLessThan(300);
			expect(data.userId).toBe(testUserId);
			expect(data.balanceInMainUnit).toBe(100);
		});

		it("should reject missing X-User-Id header", async () => {
			const { status } = await request(`${WALLETS_URL}/wallets`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({}),
			});

			expect(status).toBeGreaterThanOrEqual(400);
		});

		it("should reject userId in body", async () => {
			const { status } = await request(`${WALLETS_URL}/wallets`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-User-Id": testUserId,
				},
				body: JSON.stringify({ userId: testUserId }),
			});

			expect(status).toBeGreaterThanOrEqual(400);
		});
	});

	describe("GET /wallets/:userId", () => {
		it("should return wallet", async () => {
			const userId = `get-user-${Date.now()}`;

			await request(`${WALLETS_URL}/wallets`, {
				method: "POST",
				headers: { "Content-Type": "application/json", "X-User-Id": userId },
				body: JSON.stringify({}),
			});

			const { status, data } = await request(
				`${WALLETS_URL}/wallets/${userId}`,
				{
					headers: { "X-User-Id": userId },
				},
			);
			expect(status).toBe(200);
			expect(data.userId).toBeDefined();
		});

		it("should return 404 for non-existent wallet", async () => {
			const { status } = await request(
				`${WALLETS_URL}/wallets/non-existent-user-xyz`,
				{
					headers: { "X-User-Id": "non-existent-user-xyz" },
				},
			);
			expect(status).toBe(404);
		});

		it("should return 403 when path and header user mismatch", async () => {
			const { status } = await request(`${WALLETS_URL}/wallets/path-user`, {
				headers: { "X-User-Id": "header-user" },
			});
			expect(status).toBe(403);
		});
	});

	describe("POST /wallets/:userId/debit", () => {
		it("should debit wallet", async () => {
			const userId = `debit-user-${Date.now()}`;

			await request(`${WALLETS_URL}/wallets`, {
				method: "POST",
				headers: { "Content-Type": "application/json", "X-User-Id": userId },
				body: JSON.stringify({ initialBalanceInMainUnit: 100 }),
			});

			const { status, data } = await request(
				`${WALLETS_URL}/wallets/${userId}/debit`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-User-Id": userId,
					},
					body: JSON.stringify({ amountInMainUnit: 30 }),
				},
			);

			expect(status).toBe(201);
			expect(data.balanceInMainUnit).toBe(70);
		});

		it("should reject insufficient funds", async () => {
			const userId = `insufficient-${Date.now()}`;

			await request(`${WALLETS_URL}/wallets`, {
				method: "POST",
				headers: { "Content-Type": "application/json", "X-User-Id": userId },
				body: JSON.stringify({ initialBalanceInMainUnit: 10 }),
			});

			const { status } = await request(
				`${WALLETS_URL}/wallets/${userId}/debit`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-User-Id": userId,
					},
					body: JSON.stringify({ amountInMainUnit: 50 }),
				},
			);

			expect(status).toBeGreaterThanOrEqual(400);
		});
	});

	describe("POST /wallets/:userId/credit", () => {
		it("should credit wallet", async () => {
			const userId = `credit-user-${Date.now()}`;

			await request(`${WALLETS_URL}/wallets`, {
				method: "POST",
				headers: { "Content-Type": "application/json", "X-User-Id": userId },
				body: JSON.stringify({ initialBalanceInMainUnit: 50 }),
			});

			const { status, data } = await request(
				`${WALLETS_URL}/wallets/${userId}/credit`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-User-Id": userId,
					},
					body: JSON.stringify({ amountInMainUnit: 25 }),
				},
			);

			expect(status).toBe(201);
			expect(data.balanceInMainUnit).toBe(75);
		});
	});
});
