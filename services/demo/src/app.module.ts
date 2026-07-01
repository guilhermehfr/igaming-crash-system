import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RoundTypeormEntity } from "@infrastructure/typeorm/round.typeorm-entity";
import { BetTypeormEntity } from "@infrastructure/typeorm/bet.typeorm-entity";
import { WalletTypeormEntity } from "@infrastructure/typeorm/wallet.typeorm-entity";
import { ConsumedEventTypeormEntity } from "@infrastructure/typeorm/consumed-event.typeorm-entity";
import { config } from "./config/configuration";
import { GamesModule } from "./games.module";
import { WalletsModule } from "./wallets.module";
import { AuthController } from "./auth/auth.controller";

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
      entities: [
        RoundTypeormEntity,
        BetTypeormEntity,
        WalletTypeormEntity,
        ConsumedEventTypeormEntity,
      ],
      synchronize: true,
    }),
    GamesModule,
    WalletsModule,
  ],
  controllers: [AuthController],
})
export class AppModule {}
