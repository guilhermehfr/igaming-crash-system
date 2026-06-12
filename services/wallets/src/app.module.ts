import { APP_FILTER } from '@nestjs/core'
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { WalletTypeormEntity } from '@infrastructure/typeorm/wallet.typeorm-entity'
import { ConsumedEventTypeormEntity } from '@infrastructure/typeorm/consumed-event.typeorm-entity'
import { WalletRepository } from '@infrastructure/typeorm/wallet.repository'
import { ConsumedEventRepository } from '@infrastructure/typeorm/consumed-event.repository'
import { CreateWalletUseCase } from '@application/use-cases/create-wallet'
import { GetWalletUseCase } from '@application/use-cases/get-wallet'
import { DebitWalletUseCase } from '@application/use-cases/debit-wallet'
import { CreditWalletUseCase } from '@application/use-cases/credit-wallet'
import { WalletsController } from '@presentation/controllers/wallets.controller'
import { GlobalExceptionFilter } from '@presentation/filters/global-exception.filter'
import { RabbitMQConsumerService } from '@infrastructure/rabbitmq/rabbitmq-consumer.service'

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USER ?? 'admin',
      password: process.env.DB_PASS ?? 'admin',
      database: process.env.DB_NAME ?? 'wallets',
      entities: [WalletTypeormEntity, ConsumedEventTypeormEntity],
      migrations: ['dist/infrastructure/typeorm/migrations/*.js'],
      migrationsRun: true,
      synchronize: false,
    }),
    TypeOrmModule.forFeature([WalletTypeormEntity, ConsumedEventTypeormEntity]),
  ],
  providers: [
    {
      provide: 'IWalletRepository',
      useClass: WalletRepository,
    },
    {
      provide: 'IConsumedEventRepository',
      useClass: ConsumedEventRepository,
    },
    CreateWalletUseCase,
    GetWalletUseCase,
    DebitWalletUseCase,
    CreditWalletUseCase,
    RabbitMQConsumerService,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
  controllers: [WalletsController],
})
export class AppModule {}