import { describe, expect, it } from "bun:test";
import http from "node:http";

const GAMES_URL = "http://localhost:4001";

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

describe("Games E2E", () => {
	describe("Health", () => {
		it("should return health status", async () => {
			const { status, data } = await request(`${GAMES_URL}/games/health`);
			expect(status).toBe(200);
			expect(data.status).toBe("ok");
		});
	});

	describe("POST /games/rounds", () => {
		it("should create new round or return 400 if round already active", async () => {
			const { status, data } = await request(`${GAMES_URL}/games/rounds`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
			});
			expect(status === 201 || status === 400).toBe(true);
			if (status === 201) {
				expect(data.id).toBeDefined();
				expect(data.state).toBe("BETTING");
			}
		});
	});

	describe("GET /games/current", () => {
		it("should return current round", async () => {
			await request(`${GAMES_URL}/games/rounds`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
			});

			const { status, data } = await request(`${GAMES_URL}/games/current`);
			expect(status).toBe(200);
			expect(data.state).toBeDefined();
		});
	});

	describe("POST /games/bets", () => {
		it("should reject missing X-User-Id header", async () => {
			const { status } = await request(`${GAMES_URL}/games/bets`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ amountInMainUnit: 10 }),
			});

			expect(status).toBeGreaterThanOrEqual(400);
		});

		it("should reject userId in body", async () => {
			const { status } = await request(`${GAMES_URL}/games/bets`, {
				method: "POST",
				headers: { "Content-Type": "application/json", "X-User-Id": "user-1" },
				body: JSON.stringify({ userId: "user-1", amountInMainUnit: 10 }),
			});

			expect(status).toBeGreaterThanOrEqual(400);
		});

		it("should reject invalid input (zero amount)", async () => {
			const { status } = await request(`${GAMES_URL}/games/bets`, {
				method: "POST",
				headers: { "Content-Type": "application/json", "X-User-Id": "user-1" },
				body: JSON.stringify({ amountInMainUnit: 0 }),
			});

			expect(status).toBeGreaterThanOrEqual(400);
		});

		it("should reject invalid input (negative amount)", async () => {
			const { status } = await request(`${GAMES_URL}/games/bets`, {
				method: "POST",
				headers: { "Content-Type": "application/json", "X-User-Id": "user-1" },
				body: JSON.stringify({ amountInMainUnit: -10 }),
			});

			expect(status).toBeGreaterThanOrEqual(400);
		});
	});

	describe("GET /games/history", () => {
		it("should return round history", async () => {
			const { status, data } = await request(
				`${GAMES_URL}/games/history?page=1&limit=10`,
			);
			expect(status).toBe(200);
			expect(Array.isArray(data)).toBe(true);
		});

		it("should validate pagination", async () => {
			const { status } = await request(
				`${GAMES_URL}/games/history?page=0&limit=10`,
			);
			expect(status).toBeGreaterThanOrEqual(400);
		});
	});
});

