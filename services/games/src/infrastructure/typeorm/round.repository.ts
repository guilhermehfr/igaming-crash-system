import { Bet } from "@domain/bet.entity";
import { CrashPoint } from "@domain/crash-point.vo";
import { Round } from "@domain/round.entity";
import type { IRoundRepository } from "@domain/round.repository";
import { BetTypeormEntity } from "@infrastructure/typeorm/bet.typeorm-entity";
import { RoundTypeormEntity } from "@infrastructure/typeorm/round.typeorm-entity";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, type Repository } from "typeorm";

@Injectable()
export class RoundRepository implements IRoundRepository {
	constructor(
		@InjectRepository(RoundTypeormEntity)
		private readonly roundRepository: Repository<RoundTypeormEntity>,
		@InjectRepository(BetTypeormEntity)
		private readonly betRepository: Repository<BetTypeormEntity>,
	) {}

	async save(round: Round): Promise<Round> {
		const roundEntity = this.mapDomainToTypeorm(round);

		await this.roundRepository.save(roundEntity);

		const betEntities = round.bets.map((bet) =>
			this.mapBetDomainToTypeorm(bet),
		);
		await this.betRepository.save(betEntities);

		return round;
	}

	async findById(id: string): Promise<Round | null> {
		const roundEntity = await this.roundRepository.findOne({
			where: { id },
			relations: ["bets"],
		});

		if (!roundEntity) {
			return null;
		}

		return this.mapTypeormToDomain(roundEntity);
	}

	async findMostRecent(): Promise<Round | null> {
		const roundEntity = await this.roundRepository.findOne({
			where: { state: In(["BETTING", "RUNNING"]) },
			relations: ["bets"],
			order: { createdAt: "DESC" },
		});

		if (!roundEntity) {
			return null;
		}

		return this.mapTypeormToDomain(roundEntity);
	}

	async findAll(skip: number, take: number): Promise<Round[]> {
		const roundEntities = await this.roundRepository.find({
			relations: ["bets"],
			order: { createdAt: "DESC" },
			skip,
			take,
		});

		return roundEntities.map((entity) => this.mapTypeormToDomain(entity));
	}

	async delete(id: string): Promise<boolean> {
		const result = await this.roundRepository.delete(id);
		return result.affected ? result.affected > 0 : false;
	}

	async exists(id: string): Promise<boolean> {
		const count = await this.roundRepository.count({ where: { id } });
		return count > 0;
	}

	async count(): Promise<number> {
		return this.roundRepository.count();
	}

	private mapDomainToTypeorm(round: Round): RoundTypeormEntity {
		const entity = new RoundTypeormEntity();
		entity.id = round.id;
		entity.state = round.state;
		entity.currentMultiplier = round.currentMultiplier;

		if (round.crashPoint) {
			entity.crashPointMultiplier = round.crashPoint.multiplier;
			entity.crashPointHash = round.crashPoint.hash;
			entity.crashPointClientSeed = round.crashPoint.clientSeed;
			entity.crashPointNonce = round.crashPoint.nonce;
		}

		entity.bettingStartedAt = round.bettingStartedAt;
		entity.gameStartedAt = round.gameStartedAt;
		entity.gameEndedAt = round.gameEndedAt;

		return entity;
	}

	private mapBetDomainToTypeorm(bet: Bet): BetTypeormEntity {
		const entity = new BetTypeormEntity();
		entity.id = bet.id;
		entity.roundId = bet.roundId;
		entity.playerId = bet.playerId;
		entity.demoSessionId = bet.demoSessionId;
		entity.betAmountInCentavos = bet.betAmountInCentavos;
		entity.state = bet.state;
		entity.cashOutMultiplier = bet.cashOutMultiplier;
		entity.winningsInCentavos = bet.winningsInCentavos;

		if (bet.crashPoint) {
			entity.crashPointMultiplier = bet.crashPoint.multiplier;
		}

		return entity;
	}

	private mapTypeormToDomain(entity: RoundTypeormEntity): Round {
		let crashPoint: CrashPoint | null = null;
		if (
			entity.crashPointMultiplier !== null &&
			entity.crashPointHash &&
			entity.crashPointClientSeed &&
			entity.crashPointNonce !== null
		) {
			crashPoint = CrashPoint.create(
				entity.crashPointMultiplier,
				entity.crashPointHash,
				entity.crashPointClientSeed,
				entity.crashPointNonce,
			);
		}

		const betsMap = new Map<string, Bet>();
		if (entity.bets && entity.bets.length > 0) {
			entity.bets.forEach((betEntity) => {
				const bet = this.mapTypeormBetToDomain(betEntity, crashPoint);
				betsMap.set(bet.id, bet);
			});
		}

		return new Round(
			entity.id,
			entity.state,
			betsMap,
			entity.currentMultiplier,
			crashPoint,
			entity.bettingStartedAt,
			entity.gameStartedAt,
			entity.gameEndedAt,
		);
	}

	private mapTypeormBetToDomain(
		entity: BetTypeormEntity,
		roundCrashPoint: CrashPoint | null,
	): Bet {
		return new Bet(
			entity.id,
			entity.roundId,
			entity.playerId,
			entity.betAmountInCentavos,
			entity.demoSessionId,
			entity.state,
			entity.cashOutMultiplier,
			entity.winningsInCentavos,
			roundCrashPoint,
			entity.createdAt,
			entity.updatedAt,
		);
	}
}
