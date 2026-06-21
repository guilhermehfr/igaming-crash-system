import "dotenv/config";

export const config = {
	port: parseInt(process.env.PORT || "4001", 10),
	nodeEnv: process.env.NODE_ENV || "development",
	database: {
		host: process.env.DB_HOST ?? "localhost",
		port: parseInt(process.env.DB_PORT || "5432", 10),
		user: process.env.DB_USER ?? "admin",
		pass: process.env.DB_PASS ?? "admin",
		name: process.env.DB_NAME ?? "games",
	},
	rabbitmq: {
		url: process.env.RABBITMQ_URL ?? "amqp://admin:admin@localhost:5672",
	},
	crash: {
		pointOverride:
			process.env.CRASH_POINT_OVERRIDE !== undefined
				? parseFloat(process.env.CRASH_POINT_OVERRIDE)
				: undefined,
	},
};

export type Config = typeof config;
