import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { WalletTypeormEntity } from "@infrastructure/typeorm/wallet.typeorm-entity";
import { ConsumedEventTypeormEntity } from "@infrastructure/typeorm/consumed-event.typeorm-entity";
import { WalletRepository } from "@infrastructure/typeorm/wallet.repository";
import { ConsumedEventRepository } from "@infrastructure/typeorm/consumed-event.repository";
import { CreateWalletUseCase } from "@application/use-cases/create-wallet";
import { GetWalletUseCase } from "@application/use-cases/get-wallet";
import { DebitWalletUseCase } from "@application/use-cases/debit-wallet";
import { CreditWalletUseCase } from "@application/use-cases/credit-wallet";
import { DemoXUserIdGuard } from "./auth/demo-x-user-id.guard";
import { DemoWalletsController } from "./controllers/demo-wallets.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([WalletTypeormEntity, ConsumedEventTypeormEntity]),
  ],
  providers: [
    { provide: "IWalletRepository", useClass: WalletRepository },
    { provide: "IConsumedEventRepository", useClass: ConsumedEventRepository },
    DemoXUserIdGuard,
    CreateWalletUseCase,
    GetWalletUseCase,
    DebitWalletUseCase,
    CreditWalletUseCase,
  ],
  controllers: [DemoWalletsController],
  exports: [CreateWalletUseCase, DebitWalletUseCase, CreditWalletUseCase, GetWalletUseCase],
})
export class WalletsModule {}
