import { Round } from './round.entity';

/**
 * Round Repository Interface (Port)
 * Defines the contract for round persistence operations
 * This is a port in the hexagonal architecture pattern
 */
export interface IRoundRepository {
  /**
   * Finds a round by its ID
   * @param id - The round ID
   * @returns The round if found, null otherwise
   */
  findById(id: string): Promise<Round | null>;

  /**
   * Finds the most recent round
   * @returns The most recent round if any exists, null otherwise
   */
  findMostRecent(): Promise<Round | null>;

  /**
   * Finds all rounds with pagination
   * @param skip - Number of rounds to skip
   * @param take - Number of rounds to retrieve
   * @returns Array of rounds
   */
  findAll(skip: number, take: number): Promise<Round[]>;

  /**
   * Saves a round (create or update)
   * @param round - The round to save
   * @returns The saved round
   */
  save(round: Round): Promise<Round>;

  /**
   * Deletes a round by ID
   * @param id - The round ID
   * @returns true if deleted, false if not found
   */
  delete(id: string): Promise<boolean>;

  /**
   * Checks if a round exists
   * @param id - The round ID
   * @returns true if the round exists, false otherwise
   */
  exists(id: string): Promise<boolean>;

  /**
   * Counts total number of rounds
   * @returns Total count of rounds
   */
  count(): Promise<number>;
}
