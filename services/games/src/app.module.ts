import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { RoundLifecycleService } from "./application/services/round-lifecycle.service";
import type { CrashPointGenerator } from "./application/services/crash-point-generator";
import {
	ProvablyFairCrashPointGenerator,
	FixedCrashPointGenerator,
} from "./application/services/crash-point-generator";

import { PlaceBetUseCase } from "./application/use-cases/place-bet.use-case";
import { CashOutUseCase } from "./application/use-cases/cash-out.use-case";
import { GetCurrentRoundUseCase } from "./application/use-cases/get-current-round.use-case";
import { GetRoundHistoryUseCase } from "./application/use-cases/get-round-history.use-case";
import { GetBetUseCase } from "./application/use-cases/get-bet.use-case";

import { GamesController } from "./presentation/controllers/games.controller";
import { GamesGateway } from "./presentation/gateway/games.gateway";

import { RoundTypeormEntity } from "./infrastructure/typeorm/round.typeorm-entity";
import { BetTypeormEntity } from "./infrastructure/typeorm/bet.typeorm-entity";
import { RoundRepository } from "./infrastructure/typeorm/round.repository";
import { RabbitMQPublisherService } from "./infrastructure/rabbitmq/rabbitmq-publisher.service";

@Module({
	imports: [
		TypeOrmModule.forRoot({
			type: "postgres",
			host: process.env.DB_HOST ?? "localhost",
			port: Number(process.env.DB_PORT ?? 5432),
			username: process.env.DB_USER ?? "admin",
			password: process.env.DB_PASS ?? "admin",
			database: process.env.DB_NAME ?? "games",
			entities: [RoundTypeormEntity, BetTypeormEntity],
			migrations: ["dist/infrastructure/typeorm/migrations/*.js"],
			migrationsRun: true,
			synchronize: false,
		}),
		TypeOrmModule.forFeature([RoundTypeormEntity, BetTypeormEntity]),
	],
	providers: [
		{
			provide: "IRoundRepository",
			useClass: RoundRepository,
		},
		{
			provide: "CrashPointGenerator",
			useFactory: (): CrashPointGenerator => {
				const override = process.env.CRASH_POINT_OVERRIDE;
				if (override !== undefined) {
					const fixed = parseFloat(override);
					if (!Number.isNaN(fixed) && fixed >= 1.0) {
						return new FixedCrashPointGenerator(fixed);
					}
				}
				return new ProvablyFairCrashPointGenerator();
			},
		},
		GamesGateway,
		RabbitMQPublisherService,
		RoundLifecycleService,
		PlaceBetUseCase,
		CashOutUseCase,
		GetCurrentRoundUseCase,
		GetRoundHistoryUseCase,
		GetBetUseCase,
	],
	controllers: [GamesController],
})
export class AppModule {}
