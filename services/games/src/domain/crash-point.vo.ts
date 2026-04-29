/**
 * CrashPoint Value Object
 * Represents the crash point in a game round, generated via Provably Fair algorithm
 * This is a cryptographically derived value that determines when the game ends
 */
export class CrashPoint {
  private readonly _multiplier: number;
  private readonly _hash: string;
  private readonly _seed: string;

  private constructor(multiplier: number, hash: string, seed: string) {
    this._multiplier = multiplier;
    this._hash = hash;
    this._seed = seed;
  }

  /**
   * Creates a CrashPoint from a multiplier value
   * @param multiplier - The crash multiplier (e.g., 2.5 means 2.5x)
   * @param hash - The cryptographic hash (Provably Fair)
   * @param seed - The seed used to generate the hash
   * @returns A new CrashPoint instance
   * @throws Error if multiplier is invalid
   */
  static create(multiplier: number, hash: string, seed: string): CrashPoint {
    if (multiplier < 1.0) {
      throw new Error('Crash point multiplier must be at least 1.0');
    }

    if (!hash || hash.trim().length === 0) {
      throw new Error('Hash cannot be empty');
    }

    if (!seed || seed.trim().length === 0) {
      throw new Error('Seed cannot be empty');
    }

    return new CrashPoint(multiplier, hash, seed);
  }

  /**
   * Creates a CrashPoint with instant crash (multiplier of 1.0)
   * @param hash - The cryptographic hash
   * @param seed - The seed used to generate the hash
   */
  static instantCrash(hash: string, seed: string): CrashPoint {
    return CrashPoint.create(1.0, hash, seed);
  }

  /**
   * Gets the multiplier value
   */
  get multiplier(): number {
    return this._multiplier;
  }

  /**
   * Gets the cryptographic hash
   */
  get hash(): string {
    return this._hash;
  }

  /**
   * Gets the seed value
   */
  get seed(): string {
    return this._seed;
  }

  /**
   * Checks if the crash point is an instant crash
   */
  isInstantCrash(): boolean {
    return this._multiplier === 1.0;
  }

  /**
   * Checks if a given multiplier has crashed
   * @param currentMultiplier - The current game multiplier to check
   * @returns true if currentMultiplier >= crash point
   */
  hasCrashed(currentMultiplier: number): boolean {
    return currentMultiplier >= this._multiplier;
  }

  /**
   * Verifies the crash point using Provably Fair algorithm
   * This method should be implemented with actual cryptographic verification
   * @returns true if the hash and seed combination is valid
   */
  verifyProvablyFair(): boolean {
    // TODO: Implement actual cryptographic verification
    // This should validate that:
    // 1. The seed produces the given hash
    // 2. The hash correctly derives the multiplier
    return true;
  }

  /**
   * Checks if two CrashPoint instances are equal
   */
  equals(other: CrashPoint): boolean {
    return (
      this._multiplier === other._multiplier &&
      this._hash === other._hash &&
      this._seed === other._seed
    );
  }

  /**
   * Returns the string representation
   */
  toString(): string {
    return `CrashPoint(${this._multiplier.toFixed(2)}x)`;
  }
}
