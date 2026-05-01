import { describe, it, expect, beforeEach } from 'bun:test';
import { PlaceBetUseCase } from '../../src/application/use-cases/place-bet.use-case';
import { CashOutUseCase } from '../../src/application/use-cases/cash-out.use-case';
import { GetCurrentRoundUseCase } from '../../src/application/use-cases/get-current-round.use-case';
import { GetRoundHistoryUseCase } from '../../src/application/use-cases/get-round-history.use-case';
import { RoundLifecycleService } from '../../src/application/services/round-lifecycle.service';
import { Round, RoundState } from '../../src/domain/round.entity';
import type { IRoundRepository } from '../../src/domain/round.repository';

// Mock RoundLifecycleService
class MockRoundLifecycleService {
  currentRound: Round | null = null;
  placedBets: any[] = [];
  cashedOutBets: any[] = [];
  historyRounds: Round[] = [];

  getCurrentRound() {
    return this.currentRound;
  }

  async placeBet(bet: any) {
    if (!this.currentRound) throw new Error('No active round');
    this.currentRound.placeBet(bet);
    this.placedBets.push(bet);
  }

  async cashOutBet(betId: string, multiplier: number) {
    if (!this.currentRound) throw new Error('No active round');
    this.currentRound.cashOut(betId, multiplier);
    this.cashedOutBets.push({ betId, multiplier });
  }

  async getRoundHistory(page: number, limit: number): Promise<Round[]> {
    return this.historyRounds.slice((page - 1) * limit, page * limit);
  }
}

// Mock IRoundRepository
class MockRoundRepository implements IRoundRepository {
  rounds: Round[] = [];

  async save(round: Round): Promise<void> {
    this.rounds.push(round);
  }

  async findById(id: string): Promise<Round | null> {
    return this.rounds.find(r => r.id === id) || null;
  }

  async findMostRecent(): Promise<Round | null> {
    return this.rounds[this.rounds.length - 1] || null;
  }

  async findAll(page: number, limit: number): Promise<Round[]> {
    return this.rounds.slice((page - 1) * limit, page * limit);
  }

  async delete(id: string): Promise<void> {
    this.rounds = this.rounds.filter(r => r.id !== id);
  }

  async exists(id: string): Promise<boolean> {
    return this.rounds.some(r => r.id === id);
  }

  async count(): Promise<number> {
    return this.rounds.length;
  }
}

// Mock GamesGateway
class MockGamesGateway {
  events: any[] = [];
  emitRoundStateChange() { this.events.push('stateChange'); }
  emitMultiplierUpdate() { this.events.push('multiplierUpdate'); }
  emitRoundCrashed() { this.events.push('roundCrashed'); }
  emitBetPlaced() { this.events.push('betPlaced'); }
  emitBetCashedOut() { this.events.push('betCashedOut'); }
}

// Mock RabbitMQ Publisher
class MockRabbitMQPublisher {
  events: any[] = [];
  async publishBetPlaced(e: any) { this.events.push(e); }
  async publishBetCashedOut(e: any) { this.events.push(e); }
  async publishBetLost(e: any) { this.events.push(e); }
}

describe('PlaceBetUseCase', () => {
  let mockService: MockRoundLifecycleService;
  let useCase: PlaceBetUseCase;

  beforeEach(() => {
    mockService = new MockRoundLifecycleService();
    useCase = new PlaceBetUseCase(mockService as any);
  });

  describe('execute', () => {
    it('should place bet with valid input', async () => {
      mockService.currentRound = Round.create('round-1');
      
      const result = await useCase.execute({
        userId: 'user-1',
        amountInMainUnit: 10,
      });

      expect(result.userId).toBe('user-1');
      expect(result.amountInMainUnit).toBe(10);
      expect(mockService.placedBets).toHaveLength(1);
    });

    it('should throw with empty userId', async () => {
      await expect(
        useCase.execute({ userId: '', amountInMainUnit: 10 })
      ).rejects.toThrow('User ID must be non-empty');
    });

    it('should throw with whitespace-only userId', async () => {
      await expect(
        useCase.execute({ userId: '   ', amountInMainUnit: 10 })
      ).rejects.toThrow('User ID must be non-empty');
    });

    it('should throw with zero amount', async () => {
      mockService.currentRound = Round.create('round-1');
      
      await expect(
        useCase.execute({ userId: 'user-1', amountInMainUnit: 0 })
      ).rejects.toThrow('Bet amount must be greater than zero');
    });

    it('should throw with negative amount', async () => {
      mockService.currentRound = Round.create('round-1');
      
      await expect(
        useCase.execute({ userId: 'user-1', amountInMainUnit: -5 })
      ).rejects.toThrow('Bet amount must be greater than zero');
    });

    it('should throw when no active round', async () => {
      await expect(
        useCase.execute({ userId: 'user-1', amountInMainUnit: 10 })
      ).rejects.toThrow('No active round');
    });

    it('should convert amount to centavos', async () => {
      mockService.currentRound = Round.create('round-1');
      
      const result = await useCase.execute({
        userId: 'user-1',
        amountInMainUnit: 10.50,
      });

      expect(result.amountInMainUnit).toBe(10.5);
    });
  });
});

describe('GetCurrentRoundUseCase', () => {
  let mockService: MockRoundLifecycleService;
  let useCase: GetCurrentRoundUseCase;

  beforeEach(() => {
    mockService = new MockRoundLifecycleService();
    useCase = new GetCurrentRoundUseCase(mockService as any);
  });

  describe('execute', () => {
    it('should return round when exists', async () => {
      mockService.currentRound = Round.create('round-1');
      
      const result = await useCase.execute();

      expect(result).not.toBeNull();
      expect(result?.id).toBe('round-1');
    });

    it('should throw when no round exists', async () => {
      mockService.currentRound = null;
      
      await expect(useCase.execute()).rejects.toThrow('No active round');
    });
  });
});

describe('GetRoundHistoryUseCase', () => {
  let mockService: MockRoundLifecycleService;
  let useCase: GetRoundHistoryUseCase;

  beforeEach(() => {
    mockService = new MockRoundLifecycleService();
    useCase = new GetRoundHistoryUseCase(mockService as any);
  });

  describe('execute', () => {
    it('should return empty array when no rounds', async () => {
      const result = await useCase.execute({ page: 1, limit: 10 });
      expect(result).toEqual([]);
    });

    it('should return rounds with pagination', async () => {
      mockService.historyRounds = [
        Round.create('round-1'),
        Round.create('round-2'),
        Round.create('round-3'),
      ];

      const result = await useCase.execute({ page: 1, limit: 2 });
      expect(result).toHaveLength(2);
    });

    it('should respect max limit of 100', async () => {
      await expect(
        useCase.execute({ page: 1, limit: 200 })
      ).rejects.toThrow('Limit cannot exceed 100');
    });

    it('should require page >= 1', async () => {
      await expect(
        useCase.execute({ page: 0, limit: 10 })
      ).rejects.toThrow('>= 1');
    });

    it('should require positive limit', async () => {
      await expect(
        useCase.execute({ page: 1, limit: 0 })
      ).rejects.toThrow('> 0');
    });
  });
});