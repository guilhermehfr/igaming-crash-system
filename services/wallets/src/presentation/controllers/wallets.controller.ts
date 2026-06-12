import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';

import { XUserIdGuard } from '@presentation/guards/x-user-id.guard';
import { CreateWalletUseCase } from '@application/use-cases/create-wallet';
import { GetWalletUseCase } from '@application/use-cases/get-wallet';
import { DebitWalletUseCase } from '@application/use-cases/debit-wallet';
import { CreditWalletUseCase } from '@application/use-cases/credit-wallet';
import { CreateWalletDto } from '@application/dtos/create-wallet';
import { WalletResponseDto } from '@application/dtos/wallet-response';
import type { HealthCheckResponseDto } from '@presentation/dtos/health-check-response.dto';

@Controller('wallets')
@UseGuards(XUserIdGuard)
export class WalletsController {
  constructor(
    private readonly createWalletUseCase: CreateWalletUseCase,
    private readonly getWalletUseCase: GetWalletUseCase,
    private readonly debitWalletUseCase: DebitWalletUseCase,
    private readonly creditWalletUseCase: CreditWalletUseCase,
  ) {}

  @Get('health')
  check(): HealthCheckResponseDto {
    return { status: 'ok', service: 'wallets' };
  }

  @Post()
  async createWallet(
    @Req() req: Record<string, unknown>,
    @Body() body: { initialBalanceInMainUnit?: number; userId?: string },
  ): Promise<WalletResponseDto> {
    const dto = new CreateWalletDto(
      req.userId as string,
      body.initialBalanceInMainUnit,
      body.userId,
    );
    return await this.createWalletUseCase.execute(dto);
  }

  @Get(':userId')
  async getWallet(@Req() req: Record<string, unknown>): Promise<WalletResponseDto> {
    return await this.getWalletUseCase.execute(req.userId as string);
  }

  @Post(':userId/debit')
  async debitWallet(
    @Req() req: Record<string, unknown>,
    @Body() body: { amountInMainUnit: number },
  ): Promise<WalletResponseDto> {
    return await this.debitWalletUseCase.execute(req.userId as string, body.amountInMainUnit);
  }

  @Post(':userId/credit')
  async creditWallet(
    @Req() req: Record<string, unknown>,
    @Body() body: { amountInMainUnit: number },
  ): Promise<WalletResponseDto> {
    return await this.creditWalletUseCase.execute(req.userId as string, body.amountInMainUnit);
  }
}
