import { describe, it, expect, beforeEach } from 'bun:test';
import { CreateWalletUseCase } from '@application/use-cases/create-wallet';
import { GetWalletUseCase } from '@application/use-cases/get-wallet';
import { DebitWalletUseCase } from '@application/use-cases/debit-wallet';
import { CreditWalletUseCase } from '@application/use-cases/credit-wallet';
import { Wallet } from '@domain/wallet.entity';
import { Money } from '@domain/money.vo';
import type { IWalletRepository } from '@domain/wallet.repository';

// Mock IWalletRepository
class MockWalletRepository implements IWalletRepository {
  wallets: Map<string, Wallet> = new Map();

  async save(wallet: Wallet): Promise<void> {
    this.wallets.set(wallet.userId, wallet);
  }

  async findById(id: string): Promise<Wallet | null> {
    for (const w of this.wallets.values()) {
      if (w.id === id) return w;
    }
    return null;
  }

  async findByUserId(userId: string): Promise<Wallet | null> {
    return this.wallets.get(userId) || null;
  }

  async delete(id: string): Promise<void> {
    for (const [key, w] of this.wallets.entries()) {
      if (w.id === id) {
        this.wallets.delete(key);
        break;
      }
    }
  }

  async exists(id: string): Promise<boolean> {
    for (const w of this.wallets.values()) {
      if (w.id === id) return true;
    }
    return false;
  }
}

describe('CreateWalletUseCase', () => {
  let mockRepo: MockWalletRepository;
  let useCase: CreateWalletUseCase;

  beforeEach(() => {
    mockRepo = new MockWalletRepository();
    useCase = new CreateWalletUseCase(mockRepo as any);
  });

  describe('execute', () => {
    it('should create wallet with valid input', async () => {
      const result = await useCase.execute({
        userId: 'user-1',
        initialBalanceInMainUnit: 100,
      });

      expect(result.userId).toBe('user-1');
      expect(result.balanceInMainUnit).toBe(100);
    });

    it('should create wallet with default zero balance', async () => {
      const result = await useCase.execute({
        userId: 'user-1',
      });

      expect(result.balanceInMainUnit).toBe(0);
    });

    it('should throw when userId is empty', async () => {
      await expect(
        useCase.execute({ userId: '', initialBalanceInMainUnit: 100 })
      ).rejects.toThrow('User ID must be non-empty');
    });

    it('should throw when userId is whitespace', async () => {
      await expect(
        useCase.execute({ userId: '   ', initialBalanceInMainUnit: 100 })
      ).rejects.toThrow('User ID must be non-empty');
    });

    it('should throw when wallet already exists', async () => {
      const existing = Wallet.create('wallet-1', 'user-1', Money.fromMainUnit(50));
      await mockRepo.save(existing);

      await expect(
        useCase.execute({ userId: 'user-1', initialBalanceInMainUnit: 100 })
      ).rejects.toThrow('Wallet already exists');
    });

    it('should throw when initial balance is negative', async () => {
      await expect(
        useCase.execute({ userId: 'user-1', initialBalanceInMainUnit: -10 })
      ).rejects.toThrow('cannot be negative');
    });
  });
});

describe('GetWalletUseCase', () => {
  let mockRepo: MockWalletRepository;
  let useCase: GetWalletUseCase;

  beforeEach(() => {
    mockRepo = new MockWalletRepository();
    useCase = new GetWalletUseCase(mockRepo as any);
  });

  describe('execute', () => {
    it('should return wallet when exists', async () => {
      const wallet = Wallet.create('wallet-1', 'user-1', Money.fromMainUnit(100));
      await mockRepo.save(wallet);

      const result = await useCase.execute('user-1');

      expect(result).not.toBeNull();
      expect(result?.userId).toBe('user-1');
      expect(result?.balanceInMainUnit).toBe(100);
    });

    it('should throw when wallet not found', async () => {
      await expect(
        useCase.execute('non-existent')
      ).rejects.toThrow('Wallet not found for user non-existent');
    });

    it('should throw when userId is empty', async () => {
      await expect(
        useCase.execute('')
      ).rejects.toThrow('User ID must be non-empty');
    });
  });
});

describe('DebitWalletUseCase', () => {
  let mockRepo: MockWalletRepository;
  let useCase: DebitWalletUseCase;

  beforeEach(() => {
    mockRepo = new MockWalletRepository();
    useCase = new DebitWalletUseCase(mockRepo as any);
  });

  describe('execute', () => {
    it('should debit wallet with valid amount', async () => {
      const wallet = Wallet.create('wallet-1', 'user-1', Money.fromMainUnit(100));
      await mockRepo.save(wallet);

      const result = await useCase.execute('user-1', 30);

      expect(result.balanceInMainUnit).toBe(70);
    });

    it('should throw when wallet not found', async () => {
      await expect(
        useCase.execute('non-existent', 10)
      ).rejects.toThrow('Wallet not found');
    });

    it('should throw when insufficient funds', async () => {
      const wallet = Wallet.create('wallet-1', 'user-1', Money.fromMainUnit(20));
      await mockRepo.save(wallet);

      await expect(
        useCase.execute('user-1', 50)
      ).rejects.toThrow('Insufficient funds');
    });

    it('should throw with zero amount', async () => {
      const wallet = Wallet.create('wallet-1', 'user-1', Money.fromMainUnit(100));
      await mockRepo.save(wallet);

      await expect(
        useCase.execute('user-1', 0)
      ).rejects.toThrow('Amount must be a positive number');
    });

    it('should throw with negative amount', async () => {
      const wallet = Wallet.create('wallet-1', 'user-1', Money.fromMainUnit(100));
      await mockRepo.save(wallet);

      await expect(
        useCase.execute('user-1', -10)
      ).rejects.toThrow('Amount must be a positive number');
    });

    it('should throw when userId is empty', async () => {
      await expect(
        useCase.execute('', 10)
      ).rejects.toThrow('User ID must be non-empty');
    });

    it('should debit exact remaining balance', async () => {
      const wallet = Wallet.create('wallet-1', 'user-1', Money.fromMainUnit(50));
      await mockRepo.save(wallet);

      const result = await useCase.execute('user-1', 50);

      expect(result.balanceInMainUnit).toBe(0);
    });
  });
});

describe('CreditWalletUseCase', () => {
  let mockRepo: MockWalletRepository;
  let useCase: CreditWalletUseCase;

  beforeEach(() => {
    mockRepo = new MockWalletRepository();
    useCase = new CreditWalletUseCase(mockRepo as any);
  });

  describe('execute', () => {
    it('should credit wallet with valid amount', async () => {
      const wallet = Wallet.create('wallet-1', 'user-1', Money.fromMainUnit(100));
      await mockRepo.save(wallet);

      const result = await useCase.execute('user-1', 50);

      expect(result.balanceInMainUnit).toBe(150);
    });

    it('should throw when wallet not found', async () => {
      await expect(
        useCase.execute('non-existent', 10)
      ).rejects.toThrow('Wallet not found');
    });

    it('should throw with zero amount', async () => {
      const wallet = Wallet.create('wallet-1', 'user-1', Money.fromMainUnit(100));
      await mockRepo.save(wallet);

      await expect(
        useCase.execute('user-1', 0)
      ).rejects.toThrow('Amount must be a positive number');
    });

    it('should throw with negative amount', async () => {
      const wallet = Wallet.create('wallet-1', 'user-1', Money.fromMainUnit(100));
      await mockRepo.save(wallet);

      await expect(
        useCase.execute('user-1', -10)
      ).rejects.toThrow('Amount must be a positive number');
    });

    it('should throw when userId is empty', async () => {
      await expect(
        useCase.execute('', 10)
      ).rejects.toThrow('User ID must be non-empty');
    });

    it('should succeed with positive amount even if wallet has zero balance', async () => {
      const wallet = Wallet.create('wallet-1', 'user-1', Money.zero());
      await mockRepo.save(wallet);

      const result = await useCase.execute('user-1', 100);

      expect(result.balanceInMainUnit).toBe(100);
    });
  });
});