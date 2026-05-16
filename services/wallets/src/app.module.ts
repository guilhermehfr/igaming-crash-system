import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { WalletTypeormEntity } from './infrastructure/typeorm/wallet.typeorm-entity'
import { ConsumedEventTypeormEntity } from './infrastructure/typeorm/consumed-event.typeorm-entity'
import { WalletRepository } from './infrastructure/typeorm/wallet.repository'
import { ConsumedEventRepository } from './infrastructure/typeorm/consumed-event.repository'
import { CreateWalletUseCase } from './application/use-cases/create-wallet.use-case'
import { GetWalletUseCase } from './application/use-cases/get-wallet.use-case'
import { DebitWalletUseCase } from './application/use-cases/debit-wallet.use-case'
import { CreditWalletUseCase } from './application/use-cases/credit-wallet.use-case'
import { WalletsController } from './presentation/controllers/wallets.controller'
import { RabbitMQConsumerService } from './infrastructure/rabbitmq/rabbitmq-consumer.service'

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
      synchronize: true,
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
  ],
  controllers: [WalletsController],
})
export class AppModule {}