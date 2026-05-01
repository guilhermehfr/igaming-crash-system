import { Injectable, Inject, Logger, OnModuleDestroy } from '@nestjs/common';
import { createHmac } from 'crypto';
import { Round } from '../../domain/round.entity';
import { Bet } from '../../domain/bet.entity';
import { CrashPoint } from '../../domain/crash-point.vo';
import type { IRoundRepository } from '../../domain/round.repository';
import { GamesGateway } from '../../presentation/gateway/games.gateway';
import { RabbitMQPublisherService } from '../../infrastructure/rabbitmq/rabbitmq-publisher.service';
import type { IBetPlacedEvent, IBetCashedOutEvent } from '../../../../packages/events';

@Injectable()
export class RoundLifecycleService implements OnModuleDestroy {
  private readonly logger = new Logger(RoundLifecycleService.name);

  private currentRound: Round | null = null;
  private bettingTimerId: NodeJS.Timeout | null = null;
  private multiplierTimerId: NodeJS.Timeout | null = null;

  private readonly BETTING_PHASE_DURATION_MS = 10000;
  private readonly MULTIPLIER_INCREMENT_INTERVAL_MS = 100;
  private readonly MULTIPLIER_INCREMENT_RATE = 0.001;

  constructor(
    @Inject('IRoundRepository')
    private readonly roundRepository: IRoundRepository,
    private readonly gamesGateway: GamesGateway,
    private readonly rabbitmqPublisher: RabbitMQPublisherService,
  ) {}

  async initializeNewRound(): Promise<void> {
    this.logger.log('Initializing new round');

    const roundId = `round-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.currentRound = Round.create(roundId);

    await this.roundRepository.save(this.currentRound);
    this.logger.log(`Round ${roundId} created in BETTING state`);

    this.startBettingPhase();
  }

  private startBettingPhase(): void {
    if (!this.currentRound) return;

    this.logger.log(`Betting phase started for round ${this.currentRound.id}`);

    this.gamesGateway.emitRoundStateChange(
      this.currentRound.id,
      this.currentRound.state,
      null,
    );

    this.bettingTimerId = setTimeout(async () => {
      await this.transitionToRunning();
    }, this.BETTING_PHASE_DURATION_MS);
  }

  private async transitionToRunning(): Promise<void> {
    if (!this.currentRound) return;

    this.logger.log(`Transitioning round ${this.currentRound.id} to RUNNING`);

    try {
      const seed = `${Date.now()}-${Math.random().toString(36).substr(2, 16)}`;
      const hash = createHmac('sha256', seed).digest('hex');
      const crashPointMultiplier = this.generateCrashPoint(seed);

      const crashPoint = CrashPoint.create(crashPointMultiplier, hash, seed);

      this.currentRound.setCrashPoint(crashPoint);
      this.currentRound.startRound();

      await this.roundRepository.save(this.currentRound);

      this.logger.log(
        `Round ${this.currentRound.id} now RUNNING with crash point ${crashPointMultiplier}`,
      );

      this.gamesGateway.emitRoundStateChange(
        this.currentRound.id,
        this.currentRound.state,
        crashPointMultiplier,
      );

      this.startMultiplierLoop();
    } catch (error) {
      this.logger.error(
        `Error transitioning to RUNNING: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private startMultiplierLoop(): void {
    if (!this.currentRound) return;

    let currentMultiplier = 1.0;

    this.multiplierTimerId = setInterval(async () => {
      if (!this.currentRound) {
        clearInterval(this.multiplierTimerId!);
        return;
      }

      try {
        currentMultiplier = Math.round((currentMultiplier + this.MULTIPLIER_INCREMENT_RATE) * 1000) / 1000;

        this.currentRound.updateMultiplier(currentMultiplier);

        this.gamesGateway.emitMultiplierUpdate(
          this.currentRound.id,
          currentMultiplier,
          this.currentRound.state,
        );

        if (this.currentRound.hasCrashed()) {
          clearInterval(this.multiplierTimerId!);
          await this.transitionToCrashed();
        }
      } catch (error) {
        this.logger.error(
          `Error in multiplier loop: ${error instanceof Error ? error.message : String(error)}`,
        );
        clearInterval(this.multiplierTimerId!);
      }
    }, this.MULTIPLIER_INCREMENT_INTERVAL_MS);
  }

  private async transitionToCrashed(): Promise<void> {
    if (!this.currentRound) return;

    this.logger.log(
      `Round ${this.currentRound.id} crashed at multiplier ${this.currentRound.currentMultiplier}`,
    );

    try {
      this.currentRound.crash();

      await this.roundRepository.save(this.currentRound);

      const stats = this.currentRound.getStatistics();
      this.logger.log(`Round settled: ${JSON.stringify(stats)}`);

      this.gamesGateway.emitRoundCrashed(
        this.currentRound.id,
        this.currentRound.currentMultiplier,
        stats,
      );

      for (const bet of this.currentRound.bets) {
        if (bet.state === 'PENDING') {
          const betLostEvent: IBetPlacedEvent = {
            betId: bet.id,
            userId: bet.playerId,
            amountInCentavos: bet.betAmountInCentavos.toString(),
            roundId: this.currentRound.id,
            timestamp: new Date().toISOString(),
          };
          await this.rabbitmqPublisher.publishBetLost(betLostEvent);
        }
      }

      setTimeout(() => {
        this.initializeNewRound();
      }, 5000);
    } catch (error) {
      this.logger.error(
        `Error transitioning to CRASHED: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async placeBet(bet: Bet): Promise<void> {
    if (!this.currentRound) {
      throw new Error('No active round');
    }

    try {
      this.currentRound.placeBet(bet);
      await this.roundRepository.save(this.currentRound);
      this.logger.log(`Bet placed: ${bet.id} in round ${this.currentRound.id}`);

      this.gamesGateway.emitBetPlaced(this.currentRound.id, {
        id: bet.id,
        userId: bet.playerId,
        amountInMainUnit: Number(bet.betAmountInCentavos) / 100,
        state: bet.state,
      });

      const betPlacedEvent: IBetPlacedEvent = {
        betId: bet.id,
        userId: bet.playerId,
        amountInCentavos: bet.betAmountInCentavos.toString(),
        roundId: this.currentRound.id,
        timestamp: new Date().toISOString(),
      };
      await this.rabbitmqPublisher.publishBetPlaced(betPlacedEvent);
    } catch (error) {
      this.logger.error(
        `Error placing bet: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async cashOutBet(betId: string, multiplier: number): Promise<void> {
    if (!this.currentRound) {
      throw new Error('No active round');
    }

    try {
      this.currentRound.cashOut(betId, multiplier);
      await this.roundRepository.save(this.currentRound);
      this.logger.log(
        `Bet cashed out: ${betId} at multiplier ${multiplier} in round ${this.currentRound.id}`,
      );

      const bet = this.currentRound.bets.find((b) => b.id === betId);
      if (bet) {
        this.gamesGateway.emitBetCashedOut(this.currentRound.id, {
          id: bet.id,
          userId: bet.playerId,
          multiplier: bet.cashOutMultiplier,
          winningsInMainUnit: Number(bet.winningsInCentavos ?? 0n) / 100,
        });

        const betCashedOutEvent: IBetCashedOutEvent = {
          betId: bet.id,
          userId: bet.playerId,
          amountInCentavos: bet.betAmountInCentavos.toString(),
          winningsInCentavos: (bet.winningsInCentavos ?? 0n).toString(),
          multiplier: bet.cashOutMultiplier!,
          roundId: this.currentRound.id,
          timestamp: new Date().toISOString(),
        };
        await this.rabbitmqPublisher.publishBetCashedOut(betCashedOutEvent);
      }
    } catch (error) {
      this.logger.error(
        `Error cashing out bet: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  getCurrentRound(): Round | null {
    return this.currentRound;
  }

  async getRoundHistory(page: number, limit: number): Promise<Round[]> {
    return this.roundRepository.findAll(page, limit);
  }

  private generateCrashPoint(seed: string): number {
    const hash = createHmac('sha256', seed).digest('hex');
    const h = parseInt(hash.slice(0, 8), 16);
    const e = 2 ** 32;

    if (h % 100 === 0) return 1.0;

    return Math.floor((100 * e - h) / (e - h)) / 100;
  }

  onModuleDestroy(): void {
    if (this.bettingTimerId) clearTimeout(this.bettingTimerId);
    if (this.multiplierTimerId) clearInterval(this.multiplierTimerId);
    this.logger.log('RoundLifecycleService destroyed');
  }
}