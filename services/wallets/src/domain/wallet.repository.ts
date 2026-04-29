import { Wallet } from './wallet.entity';

/**
 * Wallet Repository Interface (Port)
 * Defines the contract for wallet persistence operations
 * This is a port in the hexagonal architecture pattern
 */
export interface IWalletRepository {
  /**
   * Finds a wallet by its ID
   * @param id - The wallet ID
   * @returns The wallet if found, null otherwise
   */
  findById(id: string): Promise<Wallet | null>;

  /**
   * Finds a wallet by user ID
   * @param userId - The user ID
   * @returns The wallet if found, null otherwise
   */
  findByUserId(userId: string): Promise<Wallet | null>;

  /**
   * Saves a wallet (create or update)
   * @param wallet - The wallet to save
   * @returns The saved wallet
   */
  save(wallet: Wallet): Promise<Wallet>;

  /**
   * Deletes a wallet by ID
   * @param id - The wallet ID
   * @returns true if deleted, false if not found
   */
  delete(id: string): Promise<boolean>;

  /**
   * Checks if a wallet exists
   * @param id - The wallet ID
   * @returns true if the wallet exists, false otherwise
   */
  exists(id: string): Promise<boolean>;
}
