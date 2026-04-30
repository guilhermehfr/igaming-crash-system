import { describe, it, expect } from 'bun:test';
import { CrashPoint } from '../../src/domain/crash-point.vo';
import { createHmac, randomBytes } from 'crypto';

describe('CrashPoint Provably Fair Verification', () => {
  const serverSecret = 'dev-secret-key-change-in-prod';

  it('should verify a valid crash point', () => {
    // Generate a valid crash point
    const seed = randomBytes(16).toString('hex');
    const hmac = createHmac('sha256', serverSecret);
    hmac.update(seed);
    const hash = hmac.digest('hex');

    const h = parseInt(hash.slice(0, 8), 16);
    const e = 2 ** 32;
    const multiplier = h % 100 === 0 ? 1.0 : Math.floor((100 * e - h) / (e - h)) / 100;

    // Create crash point
    const crashPoint = CrashPoint.create(multiplier, hash, seed);

    // Verify it
    const isValid = crashPoint.verifyProvablyFair(serverSecret);
    expect(isValid).toBe(true);
  });

  it('should detect tampered hash', () => {
    const seed = randomBytes(16).toString('hex');
    const hmac = createHmac('sha256', serverSecret);
    hmac.update(seed);
    let hash = hmac.digest('hex');

    // Tamper with hash (flip a bit)
    const tamperedHash = (parseInt(hash.slice(0, 8), 16) ^ 1).toString(16).padStart(8, '0') + hash.slice(8);

    const e = 2 ** 32;
    const h = parseInt(hash.slice(0, 8), 16);
    const multiplier = h % 100 === 0 ? 1.0 : Math.floor((100 * e - h) / (e - h)) / 100;

    // Create crash point with tampered hash
    const crashPoint = CrashPoint.create(multiplier, tamperedHash, seed);

    // Verification should fail
    const isValid = crashPoint.verifyProvablyFair(serverSecret);
    expect(isValid).toBe(false);
  });

  it('should detect instant crash correctly', () => {
    // Generate seeds until we get an instant crash
    let found = false;
    let seed = '';
    let hash = '';
    let h = 0;

    // Try up to 10000 seeds to find one with instant crash
    for (let i = 0; i < 10000 && !found; i++) {
      seed = randomBytes(16).toString('hex');
      const hmac = createHmac('sha256', serverSecret);
      hmac.update(seed);
      hash = hmac.digest('hex');

      h = parseInt(hash.slice(0, 8), 16);
      if (h % 100 === 0) {
        found = true;
        break;
      }
    }

    if (found) {
      // Create instant crash crash point (1.0x)
      const crashPoint = CrashPoint.create(1.0, hash, seed);
      const isValid = crashPoint.verifyProvablyFair(serverSecret);
      expect(isValid).toBe(true);
      expect(crashPoint.isInstantCrash()).toBe(true);
    } else {
      // If we couldn't find an instant crash in 10000 tries, skip
      console.log('Skipped instant crash test (probability ~1%, didn\'t hit it in 10000 tries)');
    }
  });

  it('should handle edge cases', () => {
    const seed = 'test-seed-12345';
    const hmac = createHmac('sha256', serverSecret);
    hmac.update(seed);
    const hash = hmac.digest('hex');

    const h = parseInt(hash.slice(0, 8), 16);
    const e = 2 ** 32;
    const multiplier = h % 100 === 0 ? 1.0 : Math.floor((100 * e - h) / (e - h)) / 100;

    const crashPoint = CrashPoint.create(multiplier, hash, seed);

    // Should verify correctly
    expect(crashPoint.verifyProvablyFair(serverSecret)).toBe(true);

    // Should fail with wrong secret
    expect(crashPoint.verifyProvablyFair('wrong-secret')).toBe(false);

    // Should reject multiplier < 1.0
    expect(() => CrashPoint.create(0.5, hash, seed)).toThrow();

    // Should reject empty hash
    expect(() => CrashPoint.create(1.5, '', seed)).toThrow();

    // Should reject empty seed
    expect(() => CrashPoint.create(1.5, hash, '')).toThrow();
  });
});
