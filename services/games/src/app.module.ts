import type { CrashPointGenerator } from "@application/services/crash-point-generator";
import {
	FixedCrashPointGenerator,
	ProvablyFairCrashPointGenerator,
} from "@application/services/crash-point-generator";
import { RoundLifecycleService } from "@application/services/round-lifecycle.service";
import { CashOutUseCase } from "@application/use-cases/cash-out.use-case";
import { GetBetUseCase } from "@application/use-cases/get-bet.use-case";
import { GetCurrentRoundUseCase } from "@application/use-cases/get-current-round.use-case";
import { GetRoundHistoryUseCase } from "@application/use-cases/get-round-history.use-case";
import { PlaceBetUseCase } from "@application/use-cases/place-bet.use-case";
import { VerifyRoundUseCase } from "@application/use-cases/verify-round.use-case";
import { config } from "@config/configuration";
import { RabbitMQPublisherService } from "@infrastructure/rabbitmq/rabbitmq-publisher.service";
import { BetTypeormEntity } from "@infrastructure/typeorm/bet.typeorm-entity";
import { RoundRepository } from "@infrastructure/typeorm/round.repository";
import { RoundTypeormEntity } from "@infrastructure/typeorm/round.typeorm-entity";
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { GamesController } from "@presentation/controllers/games.controller";
import { GamesGateway } from "@presentation/gateway/games.gateway";

@Module({
	imports: [
		TypeOrmModule.forRoot({
			type: "postgres",
			host: config.database.host,
			port: config.database.port,
			username: config.database.user,
			password: config.database.pass,
			database: config.database.name,
			ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
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
				const override = config.crash.pointOverride;
				if (override !== undefined) {
					if (override >= config.crash.pointMin && override <= config.crash.pointMax) {
						return new FixedCrashPointGenerator(
							override,
							config.crash.pointMin,
							config.crash.pointMax,
						);
					}
				}
				return new ProvablyFairCrashPointGenerator(
					config.crash.pointMin,
					config.crash.pointMax,
				);
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
		VerifyRoundUseCase,
	],
	controllers: [GamesController],
})
export class AppModule {}
