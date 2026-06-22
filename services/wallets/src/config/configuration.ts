import "dotenv/config";

function parseDatabaseUrl(url: string): {
	host: string;
	port: number;
	user: string;
	pass: string;
	name: string;
} | null {
	try {
		const parsed = new URL(url);
		return {
			host: parsed.hostname,
			port: parseInt(parsed.port || "5432", 10),
			user: decodeURIComponent(parsed.username),
			pass: decodeURIComponent(parsed.password),
			name: parsed.pathname.replace(/^\//, ""),
		};
	} catch {
		return null;
	}
}

const dbUrl = process.env.DATABASE_URL;
const parsed = dbUrl ? parseDatabaseUrl(dbUrl) : null;

export const config = {
	port: parseInt(process.env.PORT || "4002", 10),
	nodeEnv: process.env.NODE_ENV || "development",
	database: {
		host: parsed?.host ?? process.env.DB_HOST ?? "localhost",
		port: parsed?.port ?? parseInt(process.env.DB_PORT || "5432", 10),
		user: parsed?.user ?? process.env.DB_USER ?? "admin",
		pass: parsed?.pass ?? process.env.DB_PASS ?? "admin",
		name: parsed?.name ?? process.env.DB_NAME ?? "wallets",
		ssl:
			process.env.DB_SSL === "true" ||
			process.env.NODE_ENV === "production",
	},
	rabbitmq: {
		url:
			process.env.RABBITMQ_URL ?? "amqp://admin:admin@localhost:5672",
	},
	cors: {
		origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
	},
};

export type Config = typeof config;
