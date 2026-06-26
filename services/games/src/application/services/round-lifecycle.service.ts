import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import type { CrashPointGenerator } from "@application/services/crash-point-generator";
import type {
	IBetCashedOutEvent,
	IBetLostEvent,
	IBetPlacedEvent,
} from "@crash/events";
import type { Bet } from "@domain/bet.entity";
import { CrashPoint } from "@domain/crash-point.vo";
import { Round } from "@domain/round.entity";
import type { IRoundRepository } from "@domain/round.repository";
import { RabbitMQPublisherService } from "@infrastructure/rabbitmq/rabbitmq-publisher.service";
import {
	Inject,
	Injectable,
	Logger,
	type OnModuleDestroy,
	type OnModuleInit,
} from "@nestjs/common";
import { GamesGateway } from "@presentation/gateway/games.gateway";

@Injectable()
export class RoundLifecycleService implements OnModuleDestroy, OnModuleInit {
	private readonly logger = new Logger(RoundLifecycleService.name);

	private currentRound: Round | null = null;
	private bettingTimerId: NodeJS.Timeout | null = null;
	private multiplierTimerId: NodeJS.Timeout | null = null;

	private readonly BETTING_PHASE_DURATION_MS = 5000;
	private readonly MULTIPLIER_INCREMENT_INTERVAL_MS = 100;
	private readonly MULTIPLIER_INCREMENT_RATE = 0.01;
	private readonly CRASHED_PAUSE_DURATION_MS = 5000;
	private hasBetBeenPlaced = false;

	private _serverSeed: string;
	private _serverSeedHash: string;
	private _clientSeed: string;
	private _nonce: number;

	constructor(
		@Inject("IRoundRepository")
		private readonly roundRepository: IRoundRepository,
		private readonly gamesGateway: GamesGateway,
		private readonly rabbitmqPublisher: RabbitMQPublisherService,
		@Inject("CrashPointGenerator")
		private readonly crashPointGenerator: CrashPointGenerator,
	) {
		this._serverSeed = this.generateSeed();
		this._serverSeedHash = this.hashSeed(this._serverSeed);
		this._clientSeed = this.generateSeed();
		this._nonce = 1;
	}

	async onModuleInit(): Promise<void> {
		this.logger.log("Game service ready. Starting first round...");
		await this.initializeNewRound();
	}

	private generateSeed(): string {
		return randomBytes(32).toString("hex");
	}

	private hashSeed(seed: string): string {
		return createHash("sha256").update(seed).digest("hex");
	}

	getServerSeedHash(): string {
		return this._serverSeedHash;
	}

	getServerSeed(): string {
		return this._serverSeed;
	}

	revealServerSeed(): {
		serverSeed: string;
		serverSeedHash: string;
		clientSeed: string;
		nonce: number;
	} {
		const revealed = this._serverSeed;

		this._serverSeed = this.generateSeed();
		this._serverSeedHash = this.hashSeed(this._serverSeed);

		this.logger.log("Server seed rotated after reveal");

		return {
			serverSeed: revealed,
			serverSeedHash: this._serverSeedHash,
			clientSeed: this._clientSeed,
			nonce: this._nonce,
		};
	}

	getClientSeed(): string {
		return this._clientSeed;
	}

	setClientSeed(seed: string): void {
		if (!seed || seed.trim().length === 0) {
			throw new Error("Client seed must be non-empty");
		}
		this._clientSeed = seed;
		this.logger.log("Client seed updated");
	}

	getNonce(): number {
		return this._nonce;
	}

	async initializeNewRound(): Promise<void> {
		this.logger.log("Initializing new round");

		const roundId = `round-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		this.currentRound = Round.create(roundId);

		await this.roundRepository.save(this.currentRound);
		this.logger.log(`Round ${roundId} created in BETTING state`);

		this.hasBetBeenPlaced = true;
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
			const combinedSeed = `${this._clientSeed}-${this._nonce}`;
			const hash = createHmac("sha256", this._serverSeed)
				.update(combinedSeed)
				.digest("hex");
			const crashPointMultiplier = this.crashPointGenerator.generate(hash);

			const crashPoint = CrashPoint.create(
				crashPointMultiplier,
				hash,
				this._clientSeed,
				this._nonce,
			);

			this._nonce++;

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

		const timerId = setInterval(async () => {
			if (!this.currentRound) {
				clearInterval(timerId);
				return;
			}

			try {
				currentMultiplier =
					Math.round(
						(currentMultiplier + this.MULTIPLIER_INCREMENT_RATE) * 1000,
					) / 1000;

				this.currentRound.updateMultiplier(currentMultiplier);

				this.gamesGateway.emitMultiplierUpdate(
					this.currentRound.id,
					currentMultiplier,
					this.currentRound.state,
				);

				if (this.currentRound.hasCrashed()) {
					clearInterval(timerId);
					await this.transitionToCrashed();
				}
			} catch (error) {
				this.logger.error(
					`Error in multiplier loop: ${error instanceof Error ? error.message : String(error)}`,
				);
				clearInterval(timerId);
			}
		}, this.MULTIPLIER_INCREMENT_INTERVAL_MS);
		this.multiplierTimerId = timerId;
	}

	private async transitionToCrashed(): Promise<void> {
		if (!this.currentRound) return;

		this.logger.log(
			`Round ${this.currentRound.id} crashed at multiplier ${this.currentRound.currentMultiplier}`,
		);

		try {
			if (this.currentRound.state !== "CRASHED") {
				this.currentRound.crash();
			}

			await this.roundRepository.save(this.currentRound);

			const stats = this.currentRound.getStatistics();
			this.logger.log(`Round settled: ${JSON.stringify(stats)}`);

			this.gamesGateway.emitRoundCrashed(
				this.currentRound.id,
				this.currentRound.currentMultiplier,
				stats,
			);

			for (const bet of this.currentRound.bets) {
				if (bet.state === "PENDING") {
					const betLostEvent: IBetLostEvent = {
						type: "bet.lost",
						version: 1,
						eventId: randomUUID(),
						timestamp: new Date().toISOString(),
						betId: bet.id,
						userId: bet.playerId,
						amountInCentavos: bet.betAmountInCentavos.toString(),
						roundId: this.currentRound.id,
						crashPoint: this.currentRound.crashPoint?.multiplier ?? 0,
					};
					await this.rabbitmqPublisher.publishBetLost(betLostEvent);
				}
			}

			setTimeout(async () => {
				try {
					await this.initializeNewRound();
				} catch (error) {
					this.logger.error(
						`Error initializing new round: ${error instanceof Error ? error.message : String(error)}`,
					);
				}
			}, this.CRASHED_PAUSE_DURATION_MS);
		} catch (error) {
			this.logger.error(
				`Error transitioning to CRASHED: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	async placeBet(bet: Bet): Promise<void> {
		if (!this.currentRound) {
			throw new Error("No active round");
		}

		try {
			this.currentRound.placeBet(bet);
			await this.roundRepository.save(this.currentRound);
			this.logger.log(`Bet placed: ${bet.id} in round ${this.currentRound.id}`);

			this.gamesGateway.emitBetPlaced(this.currentRound.id, {
				id: bet.id,
				userId: bet.playerId,
				demoSessionId: bet.demoSessionId,
				amountInMainUnit: Number(bet.betAmountInCentavos) / 100,
				state: bet.state,
			});

			if (!this.hasBetBeenPlaced) {
				this.hasBetBeenPlaced = true;
				this.startBettingPhase();
				this.logger.log(
					`First bet placed, starting ${this.BETTING_PHASE_DURATION_MS}ms betting timer...`,
				);
			}

			try {
				const betPlacedEvent: IBetPlacedEvent = {
					type: "bet.placed",
					version: 1,
					eventId: randomUUID(),
					timestamp: new Date().toISOString(),
					betId: bet.id,
					userId: bet.playerId,
					amountInCentavos: bet.betAmountInCentavos.toString(),
					roundId: this.currentRound.id,
				};
				await this.rabbitmqPublisher.publishBetPlaced(betPlacedEvent);
			} catch (mqError) {
				this.logger.warn(
					`RabbitMQ publish failed (non-blocking): ${mqError instanceof Error ? mqError.message : String(mqError)}`,
				);
			}
		} catch (error) {
			this.logger.error(
				`Error placing bet: ${error instanceof Error ? error.message : String(error)}`,
			);
			throw error;
		}
	}

	async cashOutBet(betId: string, multiplier: number): Promise<void> {
		if (!this.currentRound) {
			throw new Error("No active round");
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
					demoSessionId: bet.demoSessionId,
					multiplier: bet.cashOutMultiplier,
					winningsInMainUnit: Number(bet.winningsInCentavos ?? 0n) / 100,
				});

				const betCashedOutEvent: IBetCashedOutEvent = {
					type: "bet.cashed-out",
					version: 1,
					eventId: randomUUID(),
					timestamp: new Date().toISOString(),
					betId: bet.id,
					userId: bet.playerId,
					amountInCentavos: bet.betAmountInCentavos.toString(),
					winningsInCentavos: (bet.winningsInCentavos ?? 0n).toString(),
					multiplier: bet.cashOutMultiplier ?? 1,
					roundId: this.currentRound.id,
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

	onModuleDestroy(): void {
		if (this.bettingTimerId) clearTimeout(this.bettingTimerId);
		if (this.multiplierTimerId) clearInterval(this.multiplierTimerId);
		this.logger.log("RoundLifecycleService destroyed");
	}
}
