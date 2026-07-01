import { Controller, Get, Post, Body, Req, UseGuards } from "@nestjs/common";
import { DemoXUserIdGuard } from "../auth/demo-x-user-id.guard";
import { CreateWalletUseCase } from "@application/use-cases/create-wallet";
import { GetWalletUseCase } from "@application/use-cases/get-wallet";
import { DebitWalletUseCase } from "@application/use-cases/debit-wallet";
import { CreditWalletUseCase } from "@application/use-cases/credit-wallet";
import { CreateWalletDto } from "@application/dtos/create-wallet";
import { WalletResponseDto } from "@application/dtos/wallet-response";
import type { HealthCheckResponseDto } from "@presentation/dtos/health-check-response.dto";

@Controller("wallets")
export class DemoWalletsController {
  constructor(
    private readonly createWalletUseCase: CreateWalletUseCase,
    private readonly getWalletUseCase: GetWalletUseCase,
    private readonly debitWalletUseCase: DebitWalletUseCase,
    private readonly creditWalletUseCase: CreditWalletUseCase,
  ) {}

  @Get("health")
  check(): HealthCheckResponseDto {
    return { status: "ok", service: "wallets" };
  }

  @Post()
  @UseGuards(DemoXUserIdGuard)
  async createWallet(
    @Req() req: Record<string, unknown>,
    @Body() body: { initialBalanceInMainUnit?: number },
  ): Promise<WalletResponseDto> {
    const dto = new CreateWalletDto(
      req.userId as string,
      body.initialBalanceInMainUnit,
    );
    return await this.createWalletUseCase.execute(dto);
  }

  @Get(":userId")
  @UseGuards(DemoXUserIdGuard)
  async getWallet(
    @Req() req: Record<string, unknown>,
  ): Promise<WalletResponseDto> {
    return await this.getWalletUseCase.execute(req.userId as string);
  }

  @Post(":userId/debit")
  @UseGuards(DemoXUserIdGuard)
  async debitWallet(
    @Req() req: Record<string, unknown>,
    @Body() body: { amountInMainUnit: number },
  ): Promise<WalletResponseDto> {
    return await this.debitWalletUseCase.execute(
      req.userId as string,
      body.amountInMainUnit,
    );
  }

  @Post(":userId/credit")
  @UseGuards(DemoXUserIdGuard)
  async creditWallet(
    @Req() req: Record<string, unknown>,
    @Body() body: { amountInMainUnit: number },
  ): Promise<WalletResponseDto> {
    return await this.creditWalletUseCase.execute(
      req.userId as string,
      body.amountInMainUnit,
    );
  }
}
