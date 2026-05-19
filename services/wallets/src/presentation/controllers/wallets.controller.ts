import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
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
    @Headers('x-user-id') userId: string | undefined,
    @Body() body: { initialBalanceInMainUnit?: number; userId?: string },
  ): Promise<WalletResponseDto> {
    try {
      if (body.userId) {
        throw new Error('User ID must not be provided in the request body');
      }
      if (!userId) {
        throw new HttpException('Missing X-User-Id header', HttpStatus.BAD_REQUEST);
      }
      const dto = new CreateWalletDto(userId, body.initialBalanceInMainUnit);
      return await this.createWalletUseCase.execute(dto);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new HttpException(message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get(':userId')
  async getWallet(
    @Headers('x-user-id') headerUserId: string | undefined,
    @Param('userId') userId: string,
  ): Promise<WalletResponseDto> {
    try {
      if (!headerUserId) {
        throw new HttpException('Missing X-User-Id header', HttpStatus.BAD_REQUEST);
      }
      if (userId !== headerUserId) {
        throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
      }
      return await this.getWalletUseCase.execute(userId);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new HttpException(message, HttpStatus.NOT_FOUND);
    }
  }

  @Post(':userId/debit')
  async debitWallet(
    @Headers('x-user-id') headerUserId: string | undefined,
    @Param('userId') userId: string,
    @Body() body: { amountInMainUnit: number },
  ): Promise<WalletResponseDto> {
    try {
      if (!headerUserId) {
        throw new HttpException('Missing X-User-Id header', HttpStatus.BAD_REQUEST);
      }
      if (userId !== headerUserId) {
        throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
      }
      return await this.debitWalletUseCase.execute(userId, body.amountInMainUnit);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new HttpException(message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post(':userId/credit')
  async creditWallet(
    @Headers('x-user-id') headerUserId: string | undefined,
    @Param('userId') userId: string,
    @Body() body: { amountInMainUnit: number },
  ): Promise<WalletResponseDto> {
    try {
      if (!headerUserId) {
        throw new HttpException('Missing X-User-Id header', HttpStatus.BAD_REQUEST);
      }
      if (userId !== headerUserId) {
        throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
      }
      return await this.creditWalletUseCase.execute(userId, body.amountInMainUnit);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new HttpException(message, HttpStatus.BAD_REQUEST);
    }
  }
}
