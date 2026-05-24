import { describe, it, expect, afterEach } from 'bun:test';
import http from 'http';

const GAMES_URL = 'http://localhost:4001';
const WALLETS_URL = 'http://localhost:4002';

interface RequestResult {
  status: number;
  data: any;
}

async function request(url: string, options: any = {}): Promise<RequestResult> {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const data = body ? JSON.parse(body) : null;
          resolve({ status: res?.statusCode || 0, data });
        } catch {
          resolve({ status: res?.statusCode || 0, data: body });
        }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function pollUntil<T>(
  fn: () => Promise<T>,
  condition: (value: T) => boolean,
  timeoutMs: number = 5000,
  intervalMs: number = 200
): Promise<T> {
  const start = Date.now();
  let lastValue: T | null = null;
  
  while (Date.now() - start < timeoutMs) {
    const value = await fn();
    lastValue = value;
    if (condition(value)) return value;
    await new Promise(r => setTimeout(r, intervalMs));
  }
  throw new Error(`Poll timeout after ${timeoutMs}ms. Last value: ${JSON.stringify(lastValue)}`);
}

async function waitForNoActiveRound(timeoutMs: number = 10000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const roundRes = await request(`${GAMES_URL}/games/current`);
      if (!roundRes.data || roundRes.data.state === 'CRASHED') {
        return;
      }
    } catch (e) {
      // Ignore errors, keep polling
    }
    await new Promise(r => setTimeout(r, 500));
  }
  console.log('[Cleanup] Warning: timeout waiting for round to clear');
}

describe('E2E Smoke Test - Distributed System Integration', () => {
  const TEST_TIMEOUT_MS = 45000;
  const INITIAL_BALANCE = 100;
  const BET_AMOUNT = 10;
  const MULTIPLIER = 1.5;
  const WINNINGS = BET_AMOUNT * MULTIPLIER;

  afterEach(async () => {
    await waitForNoActiveRound(30000);
  });

  it('should complete full win flow with balance consistency', async () => {
    const userId = `smoke-win-${Date.now()}`;
    
    // Step 1: Create wallet with initial balance
    const createWalletRes = await request(`${WALLETS_URL}/wallets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
      body: JSON.stringify({ initialBalanceInMainUnit: INITIAL_BALANCE }),
    });
    expect(createWalletRes.status).toBeGreaterThanOrEqual(200);
    expect(createWalletRes.status).toBeLessThan(300);
    expect(createWalletRes.data.balanceInMainUnit).toBe(INITIAL_BALANCE);
    console.log(`[Win] Created wallet: ${userId} with balance ${INITIAL_BALANCE}`);

    // Step 2: Create game round
    const createRoundRes = await request(`${GAMES_URL}/games/rounds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    expect(createRoundRes.status).toBe(201);
    expect(createRoundRes.data.state).toBe('BETTING');
    console.log(`[Win] Created round: ${createRoundRes.data.id} in BETTING state`);

    // Step 3: Place bet
    const placeBetRes = await request(`${GAMES_URL}/games/bets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
      body: JSON.stringify({ amountInMainUnit: BET_AMOUNT }),
    });
    expect(placeBetRes.status).toBe(201);
    const betId = placeBetRes.data.id;
    console.log(`[Win] Placed bet: ${betId} for ${BET_AMOUNT}`);

    // Step 4: Wait for round to transition to RUNNING
    console.log('[Win] Waiting for RUNNING state...');
    const runningRound = await pollUntil(
      () => request(`${GAMES_URL}/games/current`),
      (res) => res.data?.state === 'RUNNING',
      15000
    );
    console.log(`[Win] Round is RUNNING (multiplier: ${runningRound.data?.currentMultiplier})`);

    // Step 5: Cash out
    console.log(`[Win] Attempting cash-out at ${MULTIPLIER}x...`);
    const cashOutRes = await request(`${GAMES_URL}/games/bets/${betId}/cash-out`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ multiplier: MULTIPLIER }),
    });
    
    expect(cashOutRes.status).toBeGreaterThanOrEqual(200);
    expect(cashOutRes.status).toBeLessThan(300);
    console.log(`[Win] Cashed out bet at ${MULTIPLIER}x`);

    // Step 6: Poll wallet until final balance reflects debit + credit
    const finalBalance = INITIAL_BALANCE - BET_AMOUNT + WINNINGS;
    console.log(`[Win] Polling wallet for final balance: ${finalBalance}`);

    const walletAfterSettle = await pollUntil(
      () => request(`${WALLETS_URL}/wallets/${userId}`, { headers: { 'X-User-Id': userId } }),
      (res) => res.data?.balanceInMainUnit === finalBalance,
      30000
    );
    expect(walletAfterSettle.data.balanceInMainUnit).toBe(finalBalance);
    console.log(`[Win] Balance consistency: ${INITIAL_BALANCE} - ${BET_AMOUNT} + ${WINNINGS} = ${finalBalance} ✅`);

    // Step 7: Assert bet state
    const betRes = await request(`${GAMES_URL}/games/bets/${betId}`);
    expect(betRes.data.state).toBe('CASHED_OUT');
    expect(betRes.data.winningsInMainUnit).toBe(WINNINGS);
    console.log(`[Win] Bet state: ${betRes.data.state} ✅`);

    // Step 8: Wait for round to crash (at 2.0x crash point)
    const crashedRound = await pollUntil(
      () => request(`${GAMES_URL}/games/current`),
      (res) => res.data?.state === 'CRASHED',
      30000
    );
    expect(crashedRound.data.state).toBe('CRASHED');
    console.log(`[Win] Round state: ${crashedRound.data.state} ✅`);
  }, TEST_TIMEOUT_MS);

  it('should complete loss flow with balance consistency', async () => {
    const userId = `smoke-loss-${Date.now()}`;
    
    // Step 1: Create wallet with initial balance
    const createWalletRes = await request(`${WALLETS_URL}/wallets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
      body: JSON.stringify({ initialBalanceInMainUnit: INITIAL_BALANCE }),
    });
    expect(createWalletRes.status).toBeGreaterThanOrEqual(200);
    expect(createWalletRes.status).toBeLessThan(300);
    expect(createWalletRes.data.balanceInMainUnit).toBe(INITIAL_BALANCE);
    console.log(`[Loss] Created wallet: ${userId} with balance ${INITIAL_BALANCE}`);

    // Step 2: Create game round
    const createRoundRes = await request(`${GAMES_URL}/games/rounds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    expect(createRoundRes.status).toBe(201);
    expect(createRoundRes.data.state).toBe('BETTING');
    const roundId = createRoundRes.data.id;
    console.log(`[Loss] Created round: ${roundId} in BETTING state`);

    // Step 3: Place bet
    const placeBetRes = await request(`${GAMES_URL}/games/bets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
      body: JSON.stringify({ amountInMainUnit: BET_AMOUNT }),
    });
    expect(placeBetRes.status).toBe(201);
    const betId = placeBetRes.data.id;
    console.log(`[Loss] Placed bet: ${betId} for ${BET_AMOUNT}`);

    // Step 4: Do NOT cash out - wait for round to crash automatically
    console.log(`[Loss] Waiting for round to crash (no cashout)...`);
    
    const crashedRound = await pollUntil(
      () => request(`${GAMES_URL}/games/current`),
      (res) => res.data?.state === 'CRASHED',
      30000
    );
    expect(crashedRound.data.state).toBe('CRASHED');
    console.log(`[Loss] Round crashed: ${crashedRound.data.crashPointMultiplier}x`);

    // Step 5: Poll wallet until debited
    const debitedBalance = INITIAL_BALANCE - BET_AMOUNT;
    console.log(`[Loss] Polling for debit: expected balance = ${debitedBalance}`);
    
    const walletAfterDebit = await pollUntil(
      () => request(`${WALLETS_URL}/wallets/${userId}`, { headers: { 'X-User-Id': userId } }),
      (res) => res.data?.balanceInMainUnit === debitedBalance,
      30000
    );
    expect(walletAfterDebit.data.balanceInMainUnit).toBe(debitedBalance);
    console.log(`[Loss] Wallet debited: ${debitedBalance}`);

    // Step 6: Wallet should still be debited (no credit on loss)
    expect(walletAfterDebit.data.balanceInMainUnit).toBe(debitedBalance);
    console.log(`[Loss] Wallet after crash: ${walletAfterDebit.data.balanceInMainUnit} (no credit)`);

    // Step 7: Assert balance consistency - no winnings added
    const expectedFinal = INITIAL_BALANCE - BET_AMOUNT;
    expect(walletAfterDebit.data.balanceInMainUnit).toBe(expectedFinal);
    console.log(`[Loss] Balance consistency: ${INITIAL_BALANCE} - ${BET_AMOUNT} = ${expectedFinal} ✅`);

    // Step 8: Assert bet state is LOST
    const betRes = await request(`${GAMES_URL}/games/bets/${betId}`);
    expect(betRes.data.state).toBe('LOST');
    console.log(`[Loss] Bet state: ${betRes.data.state} ✅`);

    // Step 9: Assert round state is CRASHED
    const roundRes = await request(`${GAMES_URL}/games/current`);
    expect(roundRes.data.state).toBe('CRASHED');
    console.log(`[Loss] Round state: ${roundRes.data.state} ✅`);
  }, TEST_TIMEOUT_MS);
});
