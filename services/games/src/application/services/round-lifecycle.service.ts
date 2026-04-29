import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Round } from '../../domain/round.entity';
import { Bet } from '../../domain/bet.entity';
import { CrashPoint } from '../../domain/crash-point.vo';
import { IRoundRepository } from '../../domain/round.repository';

/**
 * RoundLifecycleService
 *
 * CRITICAL: Orchestrates the entire crash game loop with three phases:
 * 1. BETTING (fixed duration, e.g., 10s) - accept player bets
 * 2. RUNNING (until crash) - multiplier increments, players cash out
 * 3. CRASHED (final state) - all pending bets marked lost, settle winnings
 *
 * Managed as a NestJS singleton with setInterval-based state machine.
 *
 * Architecture:
 * - currentRound: Held in memory for fast reads/writes
 * - Repository: Persists round snapshots after each state change
 * - Timer: Separate interval per round (can pause/resume)
 *
 * Event Emission (via WebSocket/RabbitMQ):
 * - round:started
 * - round:multiplier-updated (broadcasts current multiplier)
 * - round:crashed
 * - round:settled (final results)
 *
 * @example
 * // NestJS module setup
 * @Module({
 *   providers: [RoundLifecycleService, RoundRepository],
 * })
 * export class GameModule {}
 *
 * // In controller/gateway:
 * const bet = new Bet('user-123', Money.fromMainUnit(100));
 * await roundLifecycleService.placeBet(bet);
 */
@Injectable()
export class RoundLifecycleService implements OnModuleDestroy {
  private readonly logger = new Logger(RoundLifecycleService.name);

  // Current active round (held in memory for performance)
  private currentRound: Round | null = null;

  // Timer handles for cleanup
  private bettingTimerId: NodeJS.Timeout | null = null;
  private multiplierTimerId: NodeJS.Timeout | null = null;

  // Configuration (injectable in real setup)
  private readonly BETTING_PHASE_DURATION_MS = 10000; // 10 seconds
  private readonly MULTIPLIER_INCREMENT_INTERVAL_MS = 100; // 100ms between multiplier updates
  private readonly MULTIPLIER_INCREMENT_RATE = 0.001; // Increment by 0.001 per interval

  constructor(private readonly roundRepository: IRoundRepository) {}

  /**
   * Initializes a new round and starts the betting phase
   * Called once on server startup or after previous round settled
   */
  async initializeNewRound(): Promise<void> {
    this.logger.log('Initializing new round');

    // Create new round aggregate root
    const roundId = `round-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.currentRound = Round.create(roundId);

    // Persist empty round to repository
    await this.roundRepository.save(this.currentRound);

    this.logger.log(`Round ${roundId} created in BETTING state`);

    // Start betting phase timer
    this.startBettingPhase();
  }

  /**
   * BETTING Phase: Accepts bets for BETTING_PHASE_DURATION_MS
   * After timeout, automatically transitions to RUNNING phase
   */
  private startBettingPhase(): void {
    if (!this.currentRound) return;

    this.logger.log(`Betting phase started for round ${this.currentRound.id}`);

    this.bettingTimerId = setTimeout(async () => {
      await this.transitionToRunning();
    }, this.BETTING_PHASE_DURATION_MS);
  }

  /**
   * Transitions from BETTING to RUNNING state
   * Sets crash point (Provably Fair) and starts multiplier loop
   */
  private async transitionToRunning(): Promise<void> {
    if (!this.currentRound) return;

    this.logger.log(`Transitioning round ${this.currentRound.id} to RUNNING`);

    try {
      // Generate Provably Fair crash point
      // TODO: Replace with actual Provably Fair cryptographic hash
      const crashPointMultiplier = this.generateRandomCrashPoint();
      const crashPoint = CrashPoint.create(
        crashPointMultiplier,
        'mock-hash', // TODO: Generate actual hash
        'mock-seed', // TODO: Generate actual seed
      );

      // Set crash point (must be done before startRound())
      this.currentRound.setCrashPoint(crashPoint);

      // Transition to RUNNING state
      this.currentRound.startRound();

      // Persist state change
      await this.roundRepository.save(this.currentRound);

      this.logger.log(
        `Round ${this.currentRound.id} now RUNNING with crash point ${crashPointMultiplier}`,
      );

      // Emit WebSocket event
      // TODO: await this.eventEmitter.emit('round:started', this.currentRound);

      // Start multiplier loop
      this.startMultiplierLoop();
    } catch (error) {
      this.logger.error(
        `Error transitioning to RUNNING: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * RUNNING Phase: Increments multiplier and checks for auto-crash
   * Loop runs every MULTIPLIER_INCREMENT_INTERVAL_MS
   * Stops when multiplier >= crashPoint (auto-crash triggered)
   */
  private startMultiplierLoop(): void {
    if (!this.currentRound) return;

    let currentMultiplier = 1.0;

    this.multiplierTimerId = setInterval(async () => {
      if (!this.currentRound) {
        clearInterval(this.multiplierTimerId!);
        return;
      }

      try {
        // Increment multiplier
        currentMultiplier += this.MULTIPLIER_INCREMENT_RATE;

        // Update multiplier in round (triggers auto-crash if m >= crashPoint)
        this.currentRound.updateMultiplier(currentMultiplier);

        // Emit WebSocket broadcast (fast - no DB write yet)
        // TODO: await this.eventEmitter.emit('round:multiplier-updated', {
        //   roundId: this.currentRound.id,
        //   multiplier: currentMultiplier,
        // });

        // Check if round crashed (auto-crash detected)
        if (this.currentRound.hasCrashed()) {
          clearInterval(this.multiplierTimerId!);
          await this.transitionToCrashed();
        } else {
          // Persist multiplier update (can batch these for performance)
          // For now, persist on each update for accuracy
          await this.roundRepository.save(this.currentRound);
        }
      } catch (error) {
        this.logger.error(
          `Error in multiplier loop: ${error instanceof Error ? error.message : String(error)}`,
        );
        clearInterval(this.multiplierTimerId!);
      }
    }, this.MULTIPLIER_INCREMENT_INTERVAL_MS);
  }

  /**
   * CRASHED Phase: Settles all pending bets and computes final results
   * Called when multiplier >= crashPoint (auto-crash)
   */
  private async transitionToCrashed(): Promise<void> {
    if (!this.currentRound) return;

    this.logger.log(
      `Round ${this.currentRound.id} crashed at multiplier ${this.currentRound.currentMultiplier}`,
    );

    try {
      // Trigger crash (marks all PENDING bets as LOST)
      this.currentRound.crash();

      // Persist final state
      await this.roundRepository.save(this.currentRound);

      // Compute final statistics
      const stats = this.currentRound.getStatistics();
      this.logger.log(`Round settled: ${JSON.stringify(stats)}`);

      // Emit final settlement event (triggers RabbitMQ notifications to wallets service)
      // TODO: await this.eventEmitter.emit('round:settled', {
      //   roundId: this.currentRound.id,
      //   crashPoint: this.currentRound.crashPoint?.multiplier,
      //   totalWagered: this.currentRound.calculateTotalWagered(),
      //   totalWinnings: this.currentRound.calculateTotalWinnings(),
      //   houseResult: this.currentRound.calculateHouseResult(),
      // });

      // Schedule next round initialization (after delay for UI display)
      setTimeout(() => {
        this.initializeNewRound();
      }, 5000); // 5 second delay before next round
    } catch (error) {
      this.logger.error(
        `Error transitioning to CRASHED: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Places a bet in the current round (BETTING state only)
   * Called by PlaceBetUseCase
   *
   * @param bet - Domain Bet entity
   * @throws Error if round not in BETTING state
   */
  async placeBet(bet: Bet): Promise<void> {
    if (!this.currentRound) {
      throw new Error('No active round');
    }

    try {
      this.currentRound.placeBet(bet);
      await this.roundRepository.save(this.currentRound);
      this.logger.log(`Bet placed: ${bet.id} in round ${this.currentRound.id}`);
    } catch (error) {
      this.logger.error(
        `Error placing bet: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Cashes out a bet in the current round (RUNNING state only)
   * Called by CashOutUseCase
   *
   * @param betId - Bet ID to cash out
   * @param multiplier - Current multiplier at cash out
   * @throws Error if round not in RUNNING state or bet not found
   */
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
    } catch (error) {
      this.logger.error(
        `Error cashing out bet: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Retrieves the current active round
   * Called by GetCurrentRoundUseCase
   *
   * @returns Current round or null if no active round
   */
  getCurrentRound(): Round | null {
    return this.currentRound;
  }

  /**
   * Retrieves historical rounds (from repository)
   * Called by GetRoundHistoryUseCase
   *
   * @param page - Page number (1-indexed)
   * @param limit - Items per page
   * @returns Array of rounds
   */
  async getRoundHistory(page: number, limit: number): Promise<Round[]> {
    return this.roundRepository.findAll(page, limit);
  }

  /**
   * Generates a random crash point between 1.0 and 10.0
   * TODO: Replace with Provably Fair algorithm
   *
   * @returns Random multiplier
   */
  private generateRandomCrashPoint(): number {
    return 1.0 + Math.random() * 9.0; // 1.0 to 10.0
  }

  /**
   * NestJS lifecycle hook - cleanup on module destroy
   */
  onModuleDestroy(): void {
    if (this.bettingTimerId) clearTimeout(this.bettingTimerId);
    if (this.multiplierTimerId) clearInterval(this.multiplierTimerId);
    this.logger.log('RoundLifecycleService destroyed');
  }
}
