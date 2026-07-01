import type {
  IBetCashedOutEvent,
  IBetLostEvent,
  IBetPlacedEvent,
} from "@crash/events";
import { Injectable, Logger } from "@nestjs/common";
import { WalletSyncService } from "./wallet-sync.service";

@Injectable()
export class DemoRabbitMQPublisherService {
  private readonly logger = new Logger(DemoRabbitMQPublisherService.name);

  constructor(private readonly walletSyncService: WalletSyncService) {}

  async publishBetPlaced(event: IBetPlacedEvent): Promise<void> {
    this.logger.log(`Syncing wallet debit for bet ${event.betId}`);
    const amountInCentavos = BigInt(event.amountInCentavos);
    await this.walletSyncService.debit(event.userId, amountInCentavos);
  }

  async publishBetCashedOut(event: IBetCashedOutEvent): Promise<void> {
    this.logger.log(`Syncing wallet credit for bet ${event.betId}`);
    const winningsInCentavos = BigInt(event.winningsInCentavos);
    await this.walletSyncService.credit(event.userId, winningsInCentavos);
  }

  async publishBetLost(_event: IBetLostEvent): Promise<void> {
    this.logger.log("Bet lost — no wallet action needed (already debited)");
  }

  async onModuleDestroy(): Promise<void> {
  }
}
