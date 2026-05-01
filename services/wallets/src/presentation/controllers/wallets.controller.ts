import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { CreateWalletUseCase } from '../../application/use-cases/create-wallet.use-case';
import { GetWalletUseCase } from '../../application/use-cases/get-wallet.use-case';
import { DebitWalletUseCase } from '../../application/use-cases/debit-wallet.use-case';
import { CreditWalletUseCase } from '../../application/use-cases/credit-wallet.use-case';
import { CreateWalletDto } from '../../application/dtos/create-wallet.dto';
import { WalletResponseDto } from '../../application/dtos/wallet-response.dto';
import { HealthCheckResponseDto } from '../dtos/health-check-response.dto';

@Controller('wallets')
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
    @Body() body: { userId: string; initialBalanceInMainUnit?: number },
  ): Promise<WalletResponseDto> {
    try {
      const dto = new CreateWalletDto(body.userId, body.initialBalanceInMainUnit);
      return await this.createWalletUseCase.execute(dto);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new HttpException(message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get(':userId')
  async getWallet(@Param('userId') userId: string): Promise<WalletResponseDto> {
    try {
      return await this.getWalletUseCase.execute(userId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new HttpException(message, HttpStatus.NOT_FOUND);
    }
  }

  @Post(':userId/debit')
  async debitWallet(
    @Param('userId') userId: string,
    @Body() body: { amountInMainUnit: number },
  ): Promise<WalletResponseDto> {
    try {
      return await this.debitWalletUseCase.execute(userId, body.amountInMainUnit);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new HttpException(message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post(':userId/credit')
  async creditWallet(
    @Param('userId') userId: string,
    @Body() body: { amountInMainUnit: number },
  ): Promise<WalletResponseDto> {
    try {
      return await this.creditWalletUseCase.execute(userId, body.amountInMainUnit);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new HttpException(message, HttpStatus.BAD_REQUEST);
    }
  }
}