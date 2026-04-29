import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Round, RoundState } from '../../domain/round.entity';
import { Bet, BetState } from '../../domain/bet.entity';
import { CrashPoint } from '../../domain/crash-point.vo';
import { IRoundRepository } from '../../domain/round.repository';
import { RoundTypeormEntity } from './round.typeorm-entity';
import { BetTypeormEntity } from './bet.typeorm-entity';

/**
 * Round Repository Implementation
 * 
 * Implements IRoundRepository interface with TypeORM.
 * Handles mapping between domain entities (Round, Bet, CrashPoint) and TypeORM entities.
 * 
 * Key responsibilities:
 * - Persist and retrieve rounds with all bets
 * - Domain → TypeORM conversion on save
 * - TypeORM → Domain conversion on read
 * - Handle BigInt precision for bet amounts via transformer
 */
@Injectable()
export class RoundRepository implements IRoundRepository {
  constructor(
    @InjectRepository(RoundTypeormEntity)
    private readonly roundRepository: Repository<RoundTypeormEntity>,
    @InjectRepository(BetTypeormEntity)
    private readonly betRepository: Repository<BetTypeormEntity>,
  ) {}

  /**
   * Saves a round (create or update)
   * Converts domain Round → TypeORM entity
   * Persists all bets in transaction
   */
  async save(round: Round): Promise<Round> {
    // Convert domain Round to TypeORM entity
    const roundEntity = this.mapDomainToTypeorm(round);

    // Save round
    await this.roundRepository.save(roundEntity);

    // Save/update all bets
    const betEntities = round.bets.map((bet) => this.mapBetDomainToTypeorm(bet));
    await this.betRepository.save(betEntities);

    return round;
  }

  /**
   * Finds a round by ID with all bets
   * Converts TypeORM entities → domain Round
   */
  async findById(id: string): Promise<Round | null> {
    const roundEntity = await this.roundRepository.findOne({
      where: { id },
      relations: ['bets'],
    });

    if (!roundEntity) {
      return null;
    }

    return this.mapTypeormToDomain(roundEntity);
  }

  /**
   * Finds the most recent round (by createdAt DESC)
   */
  async findMostRecent(): Promise<Round | null> {
    const roundEntity = await this.roundRepository.findOne({
      where: {},
      relations: ['bets'],
      order: { createdAt: 'DESC' },
    });

    if (!roundEntity) {
      return null;
    }

    return this.mapTypeormToDomain(roundEntity);
  }

  /**
   * Finds all rounds with pagination
   */
  async findAll(skip: number, take: number): Promise<Round[]> {
    const roundEntities = await this.roundRepository.find({
      relations: ['bets'],
      order: { createdAt: 'DESC' },
      skip,
      take,
    });

    return roundEntities.map((entity) => this.mapTypeormToDomain(entity));
  }

  /**
   * Deletes a round by ID
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.roundRepository.delete(id);
    return result.affected ? result.affected > 0 : false;
  }

  /**
   * Checks if a round exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.roundRepository.count({ where: { id } });
    return count > 0;
  }

  /**
   * Counts total rounds
   */
  async count(): Promise<number> {
    return this.roundRepository.count();
  }

  // ============================================================================
  // PRIVATE MAPPING METHODS
  // ============================================================================

  /**
   * Maps domain Round → TypeORM entity
   * Extracts crash point components from CrashPoint value object
   */
  private mapDomainToTypeorm(round: Round): RoundTypeormEntity {
    const entity = new RoundTypeormEntity();
    entity.id = round.id;
    entity.state = round.state;
    entity.currentMultiplier = round.currentMultiplier;

    // Extract CrashPoint components
    if (round.crashPoint) {
      entity.crashPointMultiplier = round.crashPoint.multiplier;
      entity.crashPointHash = round.crashPoint.hash;
      entity.crashPointSeed = round.crashPoint.seed;
    }

    entity.bettingStartedAt = round.bettingStartedAt;
    entity.gameStartedAt = round.gameStartedAt;
    entity.gameEndedAt = round.gameEndedAt;

    return entity;
  }

  /**
   * Maps domain Bet → TypeORM entity
   */
  private mapBetDomainToTypeorm(bet: Bet): BetTypeormEntity {
    const entity = new BetTypeormEntity();
    entity.id = bet.id;
    entity.roundId = bet.roundId;
    entity.playerId = bet.playerId;
    entity.betAmountInCentavos = bet.betAmountInCentavos;
    entity.state = bet.state;
    entity.cashOutMultiplier = bet.cashOutMultiplier;
    entity.winningsInCentavos = bet.winningsInCentavos;

    // Extract CrashPoint if available
    if (bet.crashPoint) {
      entity.crashPointMultiplier = bet.crashPoint.multiplier;
    }

    return entity;
  }

  /**
   * Maps TypeORM Round entity → domain Round
   * Reconstructs CrashPoint value object from components
   */
  private mapTypeormToDomain(entity: RoundTypeormEntity): Round {
    // Reconstruct CrashPoint value object if available
    let crashPoint: CrashPoint | null = null;
    if (
      entity.crashPointMultiplier !== null &&
      entity.crashPointHash &&
      entity.crashPointSeed
    ) {
      crashPoint = CrashPoint.create(
        entity.crashPointMultiplier,
        entity.crashPointHash,
        entity.crashPointSeed,
      );
    }

    // Reconstruct bets collection as Map
    const betsMap = new Map<string, Bet>();
    if (entity.bets && entity.bets.length > 0) {
      entity.bets.forEach((betEntity) => {
        const bet = this.mapTypeormBetToDomain(betEntity, crashPoint);
        betsMap.set(bet.id, bet);
      });
    }

    // Reconstruct Round domain entity
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

  /**
   * Maps TypeORM Bet entity → domain Bet
   * Inherits CrashPoint from parent Round (no duplication on bet table)
   */
  private mapTypeormBetToDomain(entity: BetTypeormEntity, roundCrashPoint: CrashPoint | null): Bet {
    return new Bet(
      entity.id,
      entity.roundId,
      entity.playerId,
      entity.betAmountInCentavos,
      entity.state,
      entity.cashOutMultiplier,
      entity.winningsInCentavos,
      roundCrashPoint,
      entity.createdAt,
      entity.updatedAt,
    );
  }
}
