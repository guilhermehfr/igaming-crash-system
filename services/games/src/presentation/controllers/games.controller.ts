import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PlaceBetUseCase } from '../../application/use-cases/place-bet.use-case';
import { CashOutUseCase } from '../../application/use-cases/cash-out.use-case';
import { GetCurrentRoundUseCase } from '../../application/use-cases/get-current-round.use-case';
import { GetRoundHistoryUseCase } from '../../application/use-cases/get-round-history.use-case';
import { RoundLifecycleService } from '../../application/services/round-lifecycle.service';
import { PlaceBetDto } from '../../application/dtos/place-bet.dto';
import { CashOutDto } from '../../application/dtos/cash-out.dto';
import { BetResponseDto } from '../../application/dtos/bet-response.dto';
import { RoundResponseDto } from '../../application/dtos/round-response.dto';
import { HealthCheckResponseDto } from '../dtos/health-check-response.dto';

@Controller('games')
export class GamesController {
  constructor(
    private readonly placeBetUseCase: PlaceBetUseCase,
    private readonly cashOutUseCase: CashOutUseCase,
    private readonly getCurrentRoundUseCase: GetCurrentRoundUseCase,
    private readonly getRoundHistoryUseCase: GetRoundHistoryUseCase,
    private readonly roundLifecycleService: RoundLifecycleService,
  ) {}

  @Get('health')
  check(): HealthCheckResponseDto {
    return { status: 'ok', service: 'games' };
  }

  @Post('bets')
  async placeBet(@Body() body: { userId: string; amountInMainUnit: number }): Promise<BetResponseDto> {
    try {
      const dto = new PlaceBetDto(body.userId, body.amountInMainUnit);
      return await this.placeBetUseCase.execute(dto);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new HttpException(message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('bets/:betId/cash-out')
  async cashOut(
    @Param('betId') betId: string,
    @Body() body: { multiplier: number },
  ): Promise<BetResponseDto> {
    try {
      const dto = new CashOutDto(betId, body.multiplier);
      return await this.cashOutUseCase.execute(dto);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new HttpException(message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('current')
  async getCurrentRound(): Promise<RoundResponseDto> {
    try {
      return await this.getCurrentRoundUseCase.execute();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new HttpException(message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('history')
  async getRoundHistory(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ): Promise<RoundResponseDto[]> {
    try {
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      return await this.getRoundHistoryUseCase.execute({ page: pageNum, limit: limitNum });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new HttpException(message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('rounds')
  async createRound(): Promise<RoundResponseDto> {
    try {
      const existingRound = this.roundLifecycleService.getCurrentRound();
      if (existingRound) {
        throw new Error('A round is already active');
      }

      await this.roundLifecycleService.initializeNewRound();

      const currentRound = this.roundLifecycleService.getCurrentRound();
      if (!currentRound) {
        throw new Error('Failed to create round');
      }

      return RoundResponseDto.fromDomain(currentRound);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new HttpException(message, HttpStatus.BAD_REQUEST);
    }
  }
}