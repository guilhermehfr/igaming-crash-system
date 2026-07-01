import { Injectable, Logger } from "@nestjs/common";
import { DebitWalletUseCase } from "@application/use-cases/debit-wallet";
import { CreditWalletUseCase } from "@application/use-cases/credit-wallet";

@Injectable()
export class WalletSyncService {
  private readonly logger = new Logger(WalletSyncService.name);

  constructor(
    private readonly debitWalletUseCase: DebitWalletUseCase,
    private readonly creditWalletUseCase: CreditWalletUseCase,
  ) {}

  async debit(userId: string, amountInCentavos: bigint, demoSessionId?: string | null): Promise<void> {
    const amountInMainUnit = Number(amountInCentavos) / 100;
    this.logger.log(`Syncing wallet debit: userId=${userId}, amount=${amountInMainUnit}`);
    await this.debitWalletUseCase.execute(userId, amountInMainUnit, demoSessionId ?? undefined);
    this.logger.log(`Wallet debited: ${amountInMainUnit} from user ${userId}`);
  }

  async credit(userId: string, amountInCentavos: bigint, demoSessionId?: string | null): Promise<void> {
    const amountInMainUnit = Number(amountInCentavos) / 100;
    this.logger.log(`Syncing wallet credit: userId=${userId}, amount=${amountInMainUnit}`);
    await this.creditWalletUseCase.execute(userId, amountInMainUnit, demoSessionId ?? undefined);
    this.logger.log(`Wallet credited: ${amountInMainUnit} to user ${userId}`);
  }
}
