# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**iGaming Crash System** is a microservices-based betting platform with an explicit state machine for crash game rounds. The codebase uses **Domain-Driven Design (DDD)** and **Hexagonal Architecture** with **Bun** as the runtime and **NestJS** as the application framework.

**Status**: Domain layer ✅ complete (1,247 lines). Wallets application layer ✅ complete (376 lines). Games application layer ✅ complete (824 lines). Infrastructure and Presentation layers require implementation.

## Core Architecture

### High-Level Structure

```
Presentation Layer (HTTP/WebSocket)
        ↓
Application Layer (Use Cases)
        ↓
Domain Layer (Business Logic - ✅ COMPLETE)
        ↓
Infrastructure Layer (Adapters, DB, Messaging)
```

### Services & Ports

| Service | Port | Purpose |
|---------|------|---------|
| **Games** | 4001 | Crash game rounds with state machine (BETTING→RUNNING→CRASHED) |
| **Wallets** | 4002 | User account balances with monetary precision (BigInt) |
| **Kong** | 8000 | API Gateway (routes /games → 4001, /wallets → 4002) |
| **Keycloak** | 8080 | Identity Provider (OAuth2/OIDC) |
| **PostgreSQL** | 5432 | Multi-database (games, wallets, keycloak) |
| **RabbitMQ** | 5672 | Message broker for async inter-service communication |

### Workspace Layout

```
services/
├── games/
│   └── src/
│       ├── domain/           ✅ Complete: Round, Bet, CrashPoint entities
│       ├── application/      ✅ Complete: RoundLifecycleService + 4 use cases (824 lines)
│       ├── infrastructure/   ❌ Empty: Repository implementations needed
│       └── presentation/     ⚠️  Minimal: Health check only
├── wallets/
│   └── src/
│       ├── domain/           ✅ Complete: Wallet, Money value objects
│       ├── application/      ✅ Complete: 4 use cases, 2 DTOs (376 lines)
│       ├── infrastructure/   ❌ Empty: Repository implementations needed
│       └── presentation/     ⚠️  Minimal: Health check only
```

## Domain Layer (The Heart of the System)

### Games Service Domain

#### Round (Aggregate Root) — `/services/games/src/domain/round.entity.ts` (513 lines)

**State Machine** (linear, no regression):
```
BETTING ──startRound()──→ RUNNING ──crash()──→ CRASHED
```

- **BETTING**: Accept player bets; crash point must be set before transition
- **RUNNING**: Multiplier increments; players can cash out; auto-crash when multiplier ≥ crashPoint
- **CRASHED**: All PENDING bets marked LOST; round is read-only

**Key Methods by State**:
```typescript
// BETTING phase
round.placeBet(bet: Bet): void              // Add wager
round.setCrashPoint(cp: CrashPoint): void  // Set Provably Fair crash point
round.startRound(): void                    // BETTING → RUNNING transition

// RUNNING phase
round.updateMultiplier(m: number): void     // Increment multiplier; auto-crash if m ≥ crashPoint
round.cashOut(betId: string, m: number): void  // Lock bet to CASHED_OUT at multiplier m

// Queries (any state)
round.calculateTotalWagered(): bigint
round.calculateTotalWinnings(): bigint
round.calculateHouseResult(): bigint
round.getStatistics(): RoundStatistics
```

**Critical Invariants**:
- No state regression (can't return to BETTING)
- Multiplier never decreases in RUNNING state
- All operations throw `InvalidStateTransitionError` if called in wrong state
- On crash: all PENDING bets automatically become LOST (0 winnings)
- Crash happens automatically when `updateMultiplier(m)` is called with `m ≥ crashPoint.multiplier`

**Example Flow**:
```typescript
const round = Round.create('round-1');
round.placeBet(bet1);  // User 1: 100 units
round.placeBet(bet2);  // User 2: 50 units
round.setCrashPoint(CrashPoint.create(2.5, hash, seed));
round.startRound();    // State: BETTING → RUNNING

round.updateMultiplier(1.5);
round.cashOut('bet1-id', 1.5);  // User 1 cashed out: 100 * 1.5 = 150

round.updateMultiplier(2.6);    // ≥ 2.5, auto-crash triggered
// Now state = CRASHED
// bet2 marked as LOST (0 winnings)
```

#### Bet (Entity) — `/services/games/src/domain/bet.entity.ts` (255 lines)

**State Lifecycle**:
```
PENDING → CASHED_OUT (player won)
       → LOST        (round crashed)
```

**Methods**:
```typescript
bet.cashOut(multiplier: number): void           // PENDING → CASHED_OUT
bet.lose(): void                                // PENDING → LOST
bet.calculateProfitLoss(): bigint               // Winnings - Original Bet
bet.calculateROI(): number                      // (ProfitLoss / Bet) * 100 %
```

#### CrashPoint (Value Object) — `/services/games/src/domain/crash-point.vo.ts` (117 lines)

Immutable Provably Fair representation.

```typescript
CrashPoint.create(multiplier: number, hash: string, seed: string)
cp.hasCrashed(currentMultiplier: number): boolean  // true if m ≥ multiplier
cp.isInstantCrash(): boolean                       // true if multiplier === 1.0
cp.verifyProvablyFair(): boolean                   // [TODO] Cryptographic validation
```

**Invariants**:
- Multiplier ≥ 1.0
- Hash and seed non-empty
- Immutable: all properties read-only

### Wallets Service Domain

#### Wallet (Aggregate Root) — `/services/wallets/src/domain/wallet.entity.ts` (143 lines)

No state machine; simple CRUD aggregate.

```typescript
wallet.deposit(amount: Money): void
wallet.withdraw(amount: Money): void              // Throws if insufficient balance
wallet.hasSufficientFunds(amount: Money): boolean
wallet.setBalance(amount: Money): void
wallet.resetBalance(): void
```

#### Money (Value Object) — `/services/wallets/src/domain/money.value-object.ts` (120 lines)

**Precision via BigInt** (centavos = 1/100 of main unit, no floating-point errors).

```typescript
// Creation
Money.fromCentavos(1050n)           // 10.50
Money.fromMainUnit(10.50)           // Converts to centavos internally
Money.zero()

// Operations (immutable)
money.add(other: Money): Money      // Returns new instance
money.subtract(other: Money): Money // Throws if result negative
money.multiply(factor: number): Money
money.divide(divisor: number): Money

// Comparisons
money.equals(other: Money): boolean
money.isGreaterThan(other: Money): boolean
money.isLessThan(other: Money): boolean
money.isZero(): boolean

// Access
money.amountInCentavos: bigint      // Raw value
money.amountInMainUnit: number      // Decimal representation
```

**Invariants**:
- Always ≥ 0 (enforced in constructor)
- Immutable (all operations return new instance)
- Precision: stored as bigint centavos

### Repository Interfaces (Ports)

#### IRoundRepository — `/services/games/src/domain/round.repository.ts`

```typescript
interface IRoundRepository {
  save(round: Round): Promise<void>;
  findById(id: string): Promise<Round | null>;
  findMostRecent(): Promise<Round | null>;
  findAll(page: number, limit: number): Promise<Round[]>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
  count(): Promise<number>;
}
```

#### IWalletRepository — `/services/wallets/src/domain/wallet.repository.ts`

```typescript
interface IWalletRepository {
  save(wallet: Wallet): Promise<void>;
  findById(id: string): Promise<Wallet | null>;
  findByUserId(userId: string): Promise<Wallet | null>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
}
```

## Key Design Decisions

1. **BigInt for Money**: All monetary values stored as centavos (bigint) to avoid floating-point errors. This is critical for financial accuracy.

2. **Explicit State Machine**: Round state is not implicit validation; it's explicit state objects (BETTING, RUNNING, CRASHED) with methods only available in specific states.

3. **Automatic Crash**: When `updateMultiplier(m)` is called with `m ≥ crashPoint.multiplier`, the round auto-crashes. No external orchestration needed.

4. **Auto-Liquidation**: On crash, all PENDING bets are automatically marked LOST. No manual settlement.

5. **Immutable Value Objects**: CrashPoint and Money are immutable; operations return new instances.

6. **InvalidStateTransitionError**: Custom error type for all state violations; makes error handling explicit.

7. **Bet Aggregation**: Round contains all bets; calculations use aggregate functions (`calculateTotalWagered`, `calculateHouseResult`).

## Technology Stack

- **Runtime**: Bun 1.x (Alpine Docker image)
- **Language**: TypeScript 5.8.3 (ES2021 target, strict mode)
- **Framework**: NestJS 11.1.17+
- **ORM**: TypeORM 0.3.28 (partially integrated)
- **Database**: PostgreSQL 18.3 (3 databases: games, wallets, keycloak)
- **Message Queue**: RabbitMQ 4.2.4
- **API Gateway**: Kong 3.9.1 (DB-less, declarative config)
- **Auth**: Keycloak 26.5.5 (OIDC/OAuth2)
- **Real-Time**: Socket.io 4.8.3 (games service only)
- **Testing**: Bun native test framework

## Common Development Commands

### Development

```bash
# Watch mode (with hot reload)
cd services/games && bun dev     # Games service
cd services/wallets && bun dev   # Wallets service

# Production build & run
cd services/games && bun start

# Install dependencies (after package.json changes)
cd services/games && bun install
```

### Testing

```bash
# Unit tests
cd services/games && bun test tests/unit

# E2E tests
cd services/games && bun test tests/e2e

# All tests with coverage
cd services/games && bun test --coverage

# Watch mode
cd services/games && bun test --watch
```

### Docker

```bash
# Start full stack (Postgres, RabbitMQ, Keycloak, Kong, services)
bun docker:up

# Stop all containers
bun docker:down

# Clean up volumes & images
bun docker:prune

# View logs
docker compose logs -f games       # Games service logs
docker compose logs -f wallets     # Wallets service logs
docker compose logs -f postgres    # Database logs
```

### Database & Migrations

```bash
# Connect to games database
psql -h localhost -U admin -d games -W

# Connect to wallets database
psql -h localhost -U admin -d wallets -W

# Default password: admin
```

### Debugging

```bash
# Health check endpoints
curl http://localhost:4001/health   # Games service
curl http://localhost:4002/health   # Wallets service

# Kong admin API
curl http://localhost:8001/services # List all Kong services

# RabbitMQ Management UI
# Open http://localhost:15672
# Default user: admin / admin

# Keycloak Admin Console
# Open http://localhost:8080
# Default user: admin / admin
```

## Code Organization Patterns

### Domain Layer Conventions

1. **Entities** should:
   - Inherit from a base Entity class with `_id` and timestamps
   - Use private fields prefixed with `_` (e.g., `_state`, `_balance`)
   - Expose read-only getters (e.g., `get state()`)
   - Validate invariants in constructor

2. **Value Objects** should:
   - Be immutable (readonly properties, no setters)
   - Override `equals()` for comparison
   - Implement factory methods (static `create()`)
   - Never modify internal state

3. **State Machines** should:
   - Use enum for states (e.g., `enum RoundState { BETTING, RUNNING, CRASHED }`)
   - Validate transitions before state change
   - Throw `InvalidStateTransitionError` on invalid transitions
   - Include private validation methods (`validateBettingToRunning()`, etc.)

4. **Repositories** should:
   - Be interfaces (ports) in the domain layer
   - Have implementations in the infrastructure layer
   - Never leak persistence details into domain logic

### File Naming

```
Domain layer:
  - Entities: entity.ts or {name}.entity.ts
  - Value Objects: value-object.ts or {name}.vo.ts
  - Repositories: repository.ts or {name}.repository.ts
  - Errors: error.ts or {name}.error.ts
  - Enums: enums.ts

Application layer:
  - Use Cases: {action}.use-case.ts
  - Services: {domain}.service.ts
  - DTOs: {entity}.dto.ts

Infrastructure layer:
  - TypeORM entities: {entity}.typeorm-entity.ts
  - Repository implementations: {entity}.repository.ts
  - External adapters: {service}.adapter.ts
```

## Hexagonal Architecture Layers

### Domain Layer (✅ Complete)
- **Location**: `services/*/src/domain/`
- **Responsibility**: Pure business logic, no framework dependencies
- **Key Files**: Round, Bet, CrashPoint, Wallet, Money, Repository interfaces
- **Status**: Ready for use

### Application Layer (✅ Complete)
- **Location**: `services/*/src/application/`
- **Responsibility**: Use cases, orchestration, transaction management

#### Wallets Service Application Layer (✅ Complete - 376 lines)

**Use Cases** (`services/wallets/src/application/use-cases/`):

1. **CreateWalletUseCase** (67 lines)
   - Input: `CreateWalletDto` with userId and optional initialBalanceInMainUnit
   - Output: `WalletResponseDto`
   - HTTP: `POST /wallets`
   - Validates unique user ID, creates wallet with Money value object

2. **GetWalletUseCase** (52 lines)
   - Input: userId (string)
   - Output: `WalletResponseDto`
   - HTTP: `GET /wallets/:userId`
   - Retrieves wallet by user ID, returns balance in mainUnit + centavos

3. **DebitWalletUseCase** (82 lines)
   - Input: userId, amountInMainUnit
   - Output: `WalletResponseDto`
   - RabbitMQ Event: `BetPlaced`
   - Validates sufficient funds BEFORE withdrawal, throws descriptive error if insufficient

4. **CreditWalletUseCase** (79 lines)
   - Input: userId, amountInMainUnit
   - Output: `WalletResponseDto`
   - RabbitMQ Event: `BetCashedOut`
   - Credits winnings to wallet, always succeeds for positive amounts

**DTOs** (`services/wallets/src/application/dtos/`):
- `CreateWalletDto`: userId, optional initialBalanceInMainUnit
- `WalletResponseDto`: id, userId, balanceInMainUnit, balanceInCentavos, timestamps, plus `fromDomain()` factory method

**Patterns**:
- Constructor injection of `IWalletRepository` (still interface, no implementation)
- Comprehensive input validation
- Descriptive error messages with context
- Factory methods for entity-to-DTO conversion
- No orchestrator service; use cases called directly by controllers/consumers

#### Games Service Application Layer (✅ Complete - 824 lines)

**Critical Service** (`services/games/src/application/services/`):

**RoundLifecycleService** (380 lines) - Orchestrates entire game loop:
- **BETTING Phase** (10s timer):
  - Accepts player bets via `placeBet(bet)`
  - Auto-transitions to RUNNING after timer expires
  - Timer: `bettingTimerId` managed by NestJS lifecycle
  
- **RUNNING Phase** (multiplier loop every 100ms):
  - Multiplier increments by 0.001 per interval
  - Players can cash out via `cashOutBet(betId, multiplier)`
  - Auto-crash triggered when multiplier ≥ crashPoint
  - Emit WebSocket event `round:multiplier-updated` (TODO: integrate emitter)
  
- **CRASHED Phase** (auto-liquidation):
  - All PENDING bets marked LOST
  - Compute final statistics (totalWagered, totalWinnings, houseResult)
  - Emit `round:settled` event for RabbitMQ
  - Schedule next round (5s delay)

- **Methods**:
  - `initializeNewRound()`: Create new Round in BETTING state
  - `placeBet(bet)`: Delegate to round.placeBet() + persist
  - `cashOutBet(betId, multiplier)`: Delegate to round.cashOut() + persist
  - `getCurrentRound()`: Fast in-memory read
  - `getRoundHistory(page, limit)`: Query repository

- **Error Handling**: Try/catch on each phase transition, descriptive logging

**Use Cases** (`services/games/src/application/use-cases/`):

1. **PlaceBetUseCase** (65 lines)
   - Input: `PlaceBetDto` with userId, amountInMainUnit
   - Output: `BetResponseDto`
   - HTTP: `POST /games/bets`
   - Validates input → Create Bet entity → Delegate to RoundLifecycleService.placeBet()
   - Only works in BETTING state (enforced by service)

2. **CashOutUseCase** (75 lines)
   - Input: `CashOutDto` with betId, multiplier
   - Output: `BetResponseDto`
   - HTTP: `POST /games/bets/:betId/cash-out`
   - Validates round in RUNNING → Delegate to RoundLifecycleService.cashOutBet()
   - Emits RabbitMQ `BetCashedOut` event (TODO: integrate)

3. **GetCurrentRoundUseCase** (45 lines)
   - Input: None
   - Output: `RoundResponseDto`
   - HTTP: `GET /games/current`
   - Fast in-memory read (no DB query)
   - Returns all bets + multiplier + crash point

4. **GetRoundHistoryUseCase** (55 lines)
   - Input: `{ page, limit }`
   - Output: `RoundResponseDto[]`
   - HTTP: `GET /games/history?page=1&limit=10`
   - Query repository with pagination (max limit: 100)
   - Returns only CRASHED (settled) rounds ordered by recent first

**DTOs** (`services/games/src/application/dtos/`):
- `PlaceBetDto`: userId, amountInMainUnit
- `CashOutDto`: betId, multiplier
- `BetResponseDto`: Full bet data with state, winnings, ROI; factory method `fromDomain(bet)`
- `RoundResponseDto`: Full round + all bets; factory method `fromDomain(round)`

**Patterns**:
- Constructor injection of `RoundLifecycleService`
- Comprehensive input validation (non-empty userId, amount > 0, multiplier >= 1.0, page >= 1, limit > 0)
- Descriptive error messages with context
- Factory methods for entity-to-DTO conversion
- Logging on all use case executions (debug on entry, log/error on result)
- Bet ID generation: `bet-{timestamp}-{random}` (9-char alphanumeric)
- Amount precision: Convert mainUnit to centavos via `BigInt(Math.round(amount * 100))`

### Infrastructure Layer (❌ Empty)
- **Location**: `services/*/src/infrastructure/`
- **Responsibility**: Adapters, external integrations, persistence
- **To Implement**:
  - TypeORM repository implementations
  - RabbitMQ publisher/subscriber
  - Database migrations
  - Cache layer (Redis)
  - External service clients

### Presentation Layer (⚠️ Minimal)
- **Location**: `services/*/src/presentation/`
- **Current State**: Only health check endpoint
- **To Implement**:
  - REST controllers for CRUD operations
  - WebSocket gateway for real-time multiplier updates
  - DTOs for request/response
  - Error handling & validation pipes
  - Swagger documentation

## Critical Context for Implementation

### State Machine in Round

When implementing application layer use cases:
- `CreateRound()` → Round state = BETTING
- `StartRound()` → Round state = RUNNING (crash point must exist)
- `PlaceBet()` → Can only be called in BETTING state
- `UpdateMultiplier()` → Only in RUNNING; auto-crashes when m ≥ crashPoint
- `CashOut()` → Only in RUNNING; moves bet from PENDING to CASHED_OUT
- After crash → Round is read-only; use `getStatistics()` to fetch results

### Money Precision

Always use `Money` value object for amounts:
```typescript
// ✅ Correct
const amount = Money.fromCentavos(1050n);  // 10.50
const newAmount = amount.add(Money.fromCentavos(50n));  // 11.00

// ❌ Wrong
const amount: number = 10.50;  // Floating-point error!
```

### Bet Liquidation

When a round crashes:
1. All PENDING bets are marked LOST
2. No winnings are credited (automatically in Round.crash())
3. Wallet should not be credited (already debited on placeBet)
4. Emit event "RoundCrashed" with bet results
5. Wallets service listens and updates user balance if needed

### RabbitMQ Event Flow

Expected inter-service communication:
- Games → Wallets: `BetPlaced` (deduct from wallet)
- Games → Wallets: `BetCashedOut` (credit winnings)
- Games → Wallets: `BetLost` (optional, for audit trail)

### Keycloak Integration

- All endpoints should require JWT token from Keycloak
- Extract `sub` (user ID) from token claims
- Realm: `crash-game`, Client: `crash-game-client`
- Test user: `player` / `player123`

## What NOT to Do

1. ❌ Don't modify domain layer entities without understanding state machine
2. ❌ Don't use floating-point numbers for money (use Money value object)
3. ❌ Don't bypass InvalidStateTransitionError; it's intentional
4. ❌ Don't allow state regression (RUNNING back to BETTING)
5. ❌ Don't manually liquidate bets; Round.crash() handles it
6. ❌ Don't create repository implementations in domain layer
7. ❌ Don't mix NestJS decorators into domain entities
8. ❌ Don't add timestamps to every property; only created/updated dates

## Debugging State Machine Issues

If a Round is stuck or has unexpected behavior:

1. **Check state**: `round.state` should be one of BETTING, RUNNING, CRASHED
2. **Check bets**: `round.bets` should contain all placed bets with correct states
3. **Check multiplier**: `round.currentMultiplier` should be monotonic (never decrease)
4. **Check crash point**: `round.crashPoint` should be set before startRound()
5. **Review recent operations**: Check git log for domain layer changes
6. **Run domain tests**: `bun test tests/unit` to catch state violations

## File Locations for Common Tasks

| Task | Files to Modify |
|------|-----------------|
| Add new Round state | `services/games/src/domain/round.entity.ts` (enum) |
| Add new Bet calculation | `services/games/src/domain/bet.entity.ts` |
| Add wallet operation | `services/wallets/src/domain/wallet.entity.ts` |
| Implement repository | `services/*/src/infrastructure/*.repository.ts` |
| Add HTTP endpoint | `services/*/src/presentation/controllers/` |
| Add use case | `services/*/src/application/use-cases/` |
| Modify Money precision | `services/wallets/src/domain/money.value-object.ts` |

## Git Workflow

- **Branch naming**: `feat/feature-name`, `fix/bug-name`, `docs/documentation`
- **Commit messages**: Follow conventional commits (feat:, fix:, docs:, test:, refactor:)
- **Current HEAD**: `d5f3b3f` (domain layer complete)
- **Protected branches**: main, master (future setup)

## Performance Considerations

- **Money arithmetic**: BigInt operations are fast; no external dependencies
- **State transitions**: O(1); no database lookups needed during updateMultiplier()
- **Bet aggregation**: O(n) over bets in round; pre-calculate if round has many bets
- **Database queries**: Use indexes on userId, roundId for wallet/bet lookups
- **WebSocket broadcasts**: Filter multiplier updates to only RUNNING rounds

## Next Steps for Implementer

1. **Implement Infrastructure Layer** (600+ lines estimated)
   - Create TypeORM entities for Round, Bet, Wallet, mapping domain models to database
   - Implement repository interfaces (IRoundRepository, IWalletRepository)
   - Set up database migrations (Typeorm migrations or raw SQL)
   - Connect RabbitMQ publisher/subscriber for event-driven communication
   - Database connection pooling and query optimization
   - Cache layer (Redis) for current round fast reads

2. **Implement Presentation Layer** (400+ lines estimated)
   - Add NestJS controllers for CRUD endpoints (games, wallets)
   - Implement WebSocket gateway for real-time multiplier broadcasts
   - Add error handling pipes and validation decorators
   - Integrate Keycloak authentication (extract JWT claims)
   - Swagger documentation for all endpoints
   - Request/response interceptors for logging

3. **Test & Document**
   - Write unit tests for domain + application layers (>90% coverage)
   - Write E2E tests for HTTP endpoints and WebSocket events
   - Integration tests with RabbitMQ message flows
   - Load testing for multiplier loop (100ms intervals)
   - Update this CLAUDE.md with infrastructure details

4. **Production Readiness**
   - Implement Provably Fair cryptography (replace mock hashes)
   - Add request rate limiting
   - Implement audit logging
   - Add monitoring/alerting (Prometheus, ELK)
   - Performance tuning for high-concurrency rounds

---

**Last Updated**: 2026-04-29  
**Domain Layer Status**: ✅ Complete (1,247 lines, 7 files)  
**Application Layer Status**: ✅ Wallets Complete (376 lines, 9 files) | ✅ Games Complete (824 lines, 13 files)  
**Infrastructure Layer Status**: ❌ To Implement  
**Presentation Layer Status**: ⚠️ Minimal (health check only)  
**Repository**: https://github.com/yourusername/igaming-crash-system
