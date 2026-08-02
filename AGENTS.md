# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**iGaming Crash System** is a microservices-based betting platform with an explicit state machine for crash game rounds. The codebase uses **Domain-Driven Design (DDD)** and **Hexagonal Architecture** with **Bun** as the runtime and **NestJS** as the application framework.

**Status**: Domain layer ✅ complete (787 lines). Application layer ✅ complete (1,062 lines). Infrastructure layer ✅ complete (1,195 lines). Docker environment ✅ operational. Presentation layer: Games ✅ (11 endpoints), Wallets ✅ (5 endpoints). Provably Fair ✅ complete (HMAC seed chain, 4 API endpoints, server seed rotation). Testing ✅ complete (127 tests: 103 unit + 24 E2E). Frontend ✅ complete (game canvas, Zustand stores, auth layer, FSD architecture, place-bet/cash-out API integration, wallet creation on login).

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
| **Kong** | 8000 | API Gateway (routes /games → 4001, /wallets → 4002, /socket.io → 4001 WS) |
| **Keycloak** | 8080 | Identity Provider (OAuth2/OIDC) |
| **PostgreSQL** | 5432 | Multi-database (games, wallets, keycloak) |
| **RabbitMQ** | 5672 | Message broker for async inter-service communication |

### Workspace Layout

```
services/
├── games/
│   └── src/
│       ├── domain/           ✅ Complete: Round, Bet, CrashPoint entities
│       ├── application/      ✅ Complete: RoundLifecycleService + 9 use cases (824 lines)
│       ├── infrastructure/   ✅ Complete: TypeORM entities, repositories, migrations (841 lines total)
│       └── presentation/     ✅ Complete: 11 endpoints (health, rounds, bets, cash-out, current, history, provably-fair ×4)
├── wallets/
│   └── src/
│       ├── domain/           ✅ Complete: Wallet, Money value objects
│       ├── application/      ✅ Complete: 4 use cases, 2 DTOs (376 lines)
│       ├── infrastructure/   ✅ Complete: TypeORM entities, repositories, migrations
│       └── presentation/     ✅ Complete: 5 endpoints (health, create, get, debit, credit)
frontend/
├── src/
│   ├── app/
│   │   ├── App.tsx               Root: ErrorBoundary → QueryProvider → AppContent (LoginPage | GamePage)
│   │   ├── ErrorBoundary.tsx     React error boundary with fallback UI
│   │   ├── entrypoint/main.tsx   ReactDOM.createRoot + StrictMode
│   │   ├── providers/
│   │   │   └── QueryProvider.tsx  TanStack Query client provider
│   │   └── styles/index.css      Tailwind 4 + custom theme (colors, fonts)
│   ├── entities/
│   │   └── wallet/ui/BalanceDisplay.tsx  Balance row
│   ├── features/
│   │   ├── auth-by-password/
│   │   │   └── ui/LoginForm.tsx  Email/password form, async submit, error display
│   │   ├── mock-bets/
│   │   │   └── model/useMockBets.ts  Simulated players with pre-determined cash-out targets
│   │   └── place-bet/
│   │       ├── model/use-bet.ts      Orchestrator hook: bet state + API + effects
│   │       ├── model/useBetActions.ts  API calls for place/cash-out
│   │       ├── model/useBetState.ts    useReducer for bet lifecycle
│   │       └── ui/ (ActionButton, BetInput, BetMessages, PositionStatus)
│   ├── pages/
│   │   ├── game/ui/GamePage.tsx      Layout: LiveBets + GameCanvas + RightPanel, dual-mode routing
│   │   └── login/ui/LoginPage.tsx    Split layout: BrandPanel + LoginForm
│   ├── shared/
│   │   ├── api/ (api.ts, auth.ts)         keycloakLogin() + apiFetch()
│   │   ├── config/ (config.ts, storage-keys.ts)
│   │   ├── lib/
│   │   │   ├── stores/
│   │   │   │   ├── auth-store.ts     Zustand: user state, login/logout, persist to localStorage
│   │   │   │   ├── balance-store.ts  Zustand: balance number
│   │   │   │   ├── game-store.ts     Zustand: round state, multiplier, bets, crash history
│   │   │   │   └── seed-store.ts     Zustand: provably fair seeds, persist to sessionStorage
│   │   │   ├── hooks/
│   │   │   │   ├── useSocketConnection.ts  Core socket hook, dispatches to game-store
│   │   │   │   ├── useBalance.ts           TanStack Query wrapper for wallet balance
│   │   │   │   ├── useSocketReducer.ts     useReducer alternative for socket state
│   │   │   │   └── useSeedState.ts         useState + sessionStorage alternative
│   │   │   ├── canvas/ (computePoints, drawLine, drawRocket, drawExplosion)
│   │   │   ├── format.ts, display.ts, round-state.ts, bet-utils.ts
│   │   │   ├── action-button.ts, styles.ts, socket-types.ts
│   │   │   └── mock-users.ts
│   │   └── ui/ (Button.tsx, Input.tsx)  tailwind-variants primitives
│   └── widgets/
│       ├── brand-panel/ui/BrandPanel.tsx     Rocket logo + CRASH_SYSTEM heading
│       ├── crash-history/ui/CrashHistoryPills.tsx  Draggable scrollable pills
│       ├── game-canvas/ui/GameCanvas.tsx      HTML5 Canvas crash graph
│       ├── game-canvas/model/useCanvasRenderer.ts   rAF render loop
│       ├── live-bets/ui/LiveBets.tsx          Live bet feed from game-store
│       ├── right-panel/ui/RightPanel.tsx      115 lines — delegates to useBet hook + 5 sub-components
│       └── top-bar/ui/TopBar.tsx              Brand + CrashHistoryPills + BalanceDisplay
├── .env                      Local env overrides (gitignored)
├── .env.example              Committed env template
├── vite.config.ts            Vite + path aliases + proxy to Kong
└── package.json              React 19, Vite 8, socket.io-client, zustand, @tanstack/react-query, tailwind-variants
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
round.setCrashPoint(CrashPoint.create(2.5, hash, "client-seed-abc", 1));
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
CrashPoint.create(multiplier: number, hash: string, clientSeed: string, nonce: number)
cp.hasCrashed(currentMultiplier: number): boolean  // true if m ≥ multiplier
cp.isInstantCrash(): boolean                       // true if multiplier === 1.0
cp.verifyProvablyFair(serverSeed: string): boolean // Cryptographic HMAC verification
```

**Invariants**:
- Multiplier ≥ 1.0
- Hash, clientSeed non-empty; nonce ≥ 1
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

8. **Auth via X-User-Id Header**: Two Kong configs — `kong.dev.yml` passes `X-User-Id` through without JWT; `kong.prod.yml` validates JWT globally, strips any client-provided `X-User-Id`, and injects trusted `X-User-Id` + `X-Gateway-Authenticated: true`. `XUserIdGuard` on guarded endpoints checks header presence; in production it also requires `X-Gateway-Authenticated` to prevent spoofing. No manual header parsing in actions.

9. **Centralized Configuration**: `services/*/src/config/configuration.ts` reads all `process.env.*` vars with defaults and exports a typed `config` object imported by services, use cases, and main.ts.

10. **Path Aliases**: `tsconfig.json` defines `@domain/`, `@application/`, `@infrastructure/`, `@presentation/`, `@config/` mapped to `src/*` subdirectories. All imports use these aliases (no relative `../../` paths).

## Recent Fixes & Troubleshooting

### Bun Runtime Fixes

**1. IRoundRepository Import Error**
- **Problem**: `SyntaxError: Export named 'IRoundRepository' not found in module`
- **Cause**: TypeScript interfaces don't exist at runtime; Bun tried to import `IRoundRepository` as a value
- **Solution**: Use `import type` instead of `import` for interface-only imports:
  ```typescript
  // ❌ Wrong
  import { IRoundRepository } from '../../domain/round.repository';
  
  // ✅ Correct
  import type { IRoundRepository } from '../../domain/round.repository';
  ```
- **Files affected**: `round.repository.ts`, `round-lifecycle.service.ts`, `verify-round.use-case.ts`

**2. Circular Dependency in TypeORM Entities**
- **Problem**: `ReferenceError: Cannot access 'RoundTypeormEntity' before initialization`
- **Cause**: `RoundTypeormEntity` and `BetTypeormEntity` imported each other directly at the top of files
- **Solution**: Use lazy require in decorator functions with `Relation<any>` type:
  ```typescript
  @ManyToOne(() => {
    const { RoundTypeormEntity } = require('./round.typeorm-entity');
    return RoundTypeormEntity;
  }, (round) => round.bets, {
    onDelete: 'CASCADE',
  })
  round!: Relation<any>;
  ```
- **Files affected**: `round.typeorm-entity.ts`, `bet.typeorm-entity.ts`

### Docker Setup Fixes

**PostgreSQL Database Initialization**
- **Problem**: `FATAL: database "admin" does not exist` - databases were never created
- **Cause**: Bug in `docker/postgres/init-databases.sh` with nested quotes in SQL
- **Fix**: Corrected SQL syntax:
  ```bash
  # ❌ Broken
  SELECT 'CREATE DATABASE "$db"' WHERE NOT EXISTS ...
  
  # ✅ Fixed
  SELECT 'CREATE DATABASE "' || '$db' || '"' WHERE NOT EXISTS ...
  ```
- **Action**: If databases don't exist, run:
  ```bash
  bun docker:down
  docker volume rm igaming-crash-system_postgres_data
  bun docker:up
  ```

### Kong CORS Env Var Fix

- **Problem**: `$FRONTEND_URL` in `kong.prod.yml` was a literal string — Kong declarative config doesn't resolve shell `$VAR` syntax.
- **Fix**: Changed to `${{FRONTEND_URL}}` (Kong's built-in template syntax) and added `FRONTEND_URL` env to kong service in `docker-compose.yml`.
- **Files**: `docker/kong/kong.prod.yml`, `docker-compose.yml`

### PostgreSQL Init Script Env Var

- **Problem**: `init-databases.sh` hardcoded database list (`games wallets keycloak`), ignoring `$POSTGRES_EXTRA_DATABASES` env var set in compose.
- **Fix**: Script now reads `$POSTGRES_EXTRA_DATABASES` env var with fallback to the same defaults.
- **File**: `docker/postgres/init-databases.sh`

### WebSocket Routing Through Kong

- **Problem**: Frontend connected WS directly to `localhost:4001` (bypassing Kong). Kong had no `/socket.io` route.
- **Fix**: Added `/socket.io` routes to both `kong.dev.yml` and `kong.prod.yml`. Updated Vite proxy with `ws: true` for `/socket.io`. Changed frontend WS connection to same-origin (through Vite proxy → Kong).
- **Files**: `docker/kong/kong.*.yml`, `frontend/vite.config.ts`, `frontend/README.md`

### Production Hardening (2026-06-22)

**1. DATABASE_URL Parsing**
- **Problem**: Render/Railway provide a single `DATABASE_URL` env var, not individual DB_* vars.
- **Solution**: Added `parseDatabaseUrl()` to both services' `configuration.ts` — if `DATABASE_URL` is set, it extracts host, port, user, password, db name from the connection string and overrides individual DB_* defaults.
- **Files**: `services/games/src/config/configuration.ts`, `services/wallets/src/config/configuration.ts`

**2. PostgreSQL SSL**
- **Problem**: Render/Railway require SSL connections to PostgreSQL; TypeORM was configured without SSL.
- **Solution**: Added `database.ssl` config flag (reads `DB_SSL` env var). When `true`, TypeORM receives `ssl: { rejectUnauthorized: false }`.
- **Files**: `services/games/src/app.module.ts`, `services/wallets/src/app.module.ts`

**3. CORS for Production**
- **Problem**: In production, the frontend origin differs from the API origin; requests were blocked by CORS.
- **Solution**: Added `cors.origin` to configuration. When `NODE_ENV=production`, `main.ts` enables CORS with the configured origin. Dev mode remains unrestricted.
- **Files**: `services/games/src/main.ts`, `services/wallets/src/main.ts`

**4. Production Docker Compose**
- **Problem**: `docker-compose.yml` exposed service ports and used dev Kong config (no JWT) — unsafe for production.
- **Solution**: Created `docker-compose.prod.yml` that overrides Kong config to `kong.prod.yml` (JWT enforced) and clears direct ports from games/wallets. Run with `bun docker:up:prod`.
- **Files**: `docker-compose.prod.yml`, `package.json`

### Frontend Fixes (2026-06-26)

**1. Demo Session Wallet Bug**
- **Problem**: After closing an incognito tab and opening a new one, the balance wouldn't load. Wallets were keyed by `(userId, demoSessionId)` pair — each browser tab got its own wallet. On second login the `refreshBalance` call used a new session ID that didn't match the new wallet's session ID, causing a lookup miss.
- **Solution**: Removed demo session dependency from wallet operations. `ensureWalletCreated` no longer sends `X-Demo-Session` header. `apiFetch` no longer injects `X-Demo-Session`. All wallet lookups use `userId` only via `findByUserId()`. Demo session remains for display names in socket events.
- **Files**: `frontend/src/shared/lib/stores/auth-store.ts`, `frontend/src/shared/api/api.ts`

**2. Quick Button Behavior**
- **Problem**: 1x set to 1% of balance (absolute), 2x set to 2% of balance (absolute). Clicking 2x again did nothing (same absolute value), confusing users.
- **Solution**: 1x now sets a fixed default of $10 (`Math.min(10, balance)`). 2x doubles the current `betAmount` input value (capped at balance). MAX stays all-in.
- **Files**: `frontend/src/widgets/right-panel/ui/RightPanel.tsx`

**3. Mock Bet Cash-Out Interval**
- **Problem**: The mock bet cash-out interval (800ms) was destroyed and recreated every 100ms because `currentMultiplier` was in the effect's dependency array. The interval callback never fired — all mock bets stayed pending, then all became lost on crash.
- **Solution**: Added `currentMultiplierRef` holding the latest multiplier. Interval callback reads the ref, not state. Removed `currentMultiplier` from effect deps — interval lives for the full RUNNING phase.
- **Files**: `frontend/src/shared/lib/hooks/useSocketConnection.ts` (moved from SocketContext)

**4. Mock Bet Cash-Out Logic**
- **Problem**: Mock bets used a probability formula where all bets shared the same cash-out probability at the same multiplier. Minimum target was 1.1x (10+ seconds) — too high for short rounds.
- **Solution**: Each mock bet gets a pre-determined `cashOutAt` target: 35% conservative (1.01–1.2x), 20% moderate (1.21–2.0x), 15% aggressive (2.01–5.0x), 30% let-it-ride (null). Cash-out triggers when `currentMultiplier >= cashOutAt`.
- **Files**: `frontend/src/lib/mock-users.ts` (moved to `frontend/src/shared/lib/mock-users.ts`)

**5. Mobile Responsive Layout**
- **Problem**: LiveBets sidebar always visible, taking space on mobile. Layout was a single flex row that overflowed on small screens.
- **Solution**: LiveBets `hidden md:flex`. GamePage `flex-col md:flex-row`. RightPanel `w-full md:w-[25rem]` with `border-t md:border-l`.
- **Files**: `frontend/src/widgets/live-bets/ui/LiveBets.tsx`, `frontend/src/pages/game/ui/GamePage.tsx`, `frontend/src/widgets/game-canvas/ui/GameCanvas.tsx`, `frontend/src/widgets/right-panel/ui/RightPanel.tsx`

**6. Keycloak Health Check**
- **Problem**: Kong's `depends_on` didn't wait for Keycloak. Health check used `wget` (not in the image).
- **Solution**: Added `keycloak` to Kong's `depends_on` with `condition: service_healthy`. Changed health check to `exec 3<>/dev/tcp/localhost:9000` (bash TCP).
- **Files**: `docker-compose.yml`

**7. React Context → Zustand Stores Migration (2026-07-26)**
- **Problem**: AuthContext and SocketContext were React Context providers wrapping the app tree. Every state update caused all consumers to re-render (no selector isolation). login()/logout() logic mixed with state. Socket event handling coupled to provider lifecycle.
- **Solution**: Replaced both contexts with 4 Zustand stores (`auth-store`, `balance-store`, `game-store`, `seed-store`). `useSocketConnection()` became a plain hook that dispatches to stores via `getState()`. `useBalance()` uses `@tanstack/react-query` with 15s staleTime. Zustand persist middleware handles localStorage/sessionStorage serialization. Migrated to Feature-Sliced Design directory structure.
- **Files**: `frontend/src/shared/lib/stores/*.ts`, `frontend/src/shared/lib/hooks/useSocketConnection.ts`, `frontend/src/shared/lib/hooks/useBalance.ts`, multiple consumers across all layers

**8. Own-Bet Highlighting (myBetId)**
- **Problem**: Own bets were identified by `userIdRef` matching — fragile across sessions, no visual distinction in the live feed.
- **Solution**: Added `myBetId: string | null` to game-store (`setMyBetId`). `useBetActions` persists it on place-bet. `useSocketConnection` detects own bets via `myBetId` and labels them `demo`. `LiveBets` highlights the own bet `text-neon-green`. `GameCanvas` multiplier overlay made `pointer-events-none`.
- **Files**: `frontend/src/shared/lib/stores/game-store.ts`, `frontend/src/features/place-bet/model/useBetActions.ts`, `frontend/src/shared/lib/hooks/useSocketConnection.ts`, `frontend/src/widgets/live-bets/ui/LiveBets.tsx`, `frontend/src/widgets/game-canvas/ui/GameCanvas.tsx`

**9. Docker Compose Simplification (2026-08-02)**
- **Problem**: Four root compose files (`docker-compose.yml`, `.override.yml`, `.prod.yml`, `.demo.yml`) with overlapping config, broken root `.env` COMPOSE_FILE prod switch (silently produced dev config, no JWT), Kong boot serialized behind Keycloak, demo image missing curl.
- **Solution**: Collapsed to 2 files. Dev defaults inlined into base (`bun run dev` + bind mounts). Demo (`postgres_demo` + `demo`) folded into base under `profiles: ["demo"]` — started via `docker compose up -d demo`, isolated to its own containers/volume. `docker-compose.prod.yml` reverts commands and uses `volumes: !reset []` / `ports: !reset []`. Full boot parallelism: Kong (DB-less) has zero `depends_on`; games/wallets no longer depend on Kong; frontend still waits on Kong. Demo image switched to `oven/bun:1-alpine` + curl. Root `.env`, `.override.yml`, `.demo.yml` deleted.
- **Files**: `docker-compose.yml`, `docker-compose.prod.yml`, `services/demo/Dockerfile`, `package.json`, deleted `docker-compose.override.yml`, `docker-compose.demo.yml`, root `.env`

## Technology Stack

- **Runtime**: Bun 1.x (Alpine Docker image)
- **Language**: TypeScript 5.8.3 (ES2021 target, strict mode)
- **Framework**: NestJS 11.1.17+
- **ORM**: TypeORM 0.3.28 (partially integrated)
- **Database**: PostgreSQL 18.3 (3 databases: games, wallets, keycloak)
- **Message Queue**: RabbitMQ 4.2.4
- **API Gateway**: Kong 3.9.1 (DB-less, declarative config)
- **Auth**: Keycloak 26.5.5 (OIDC/OAuth2)
- **Real-Time**: Socket.io 4.8.3 (games service) / socket.io-client 4.8.3 (frontend) - ✅ implemented
- **State Management**: Zustand 5.x (frontend stores) + @tanstack/react-query 5.x (server cache)
- **Testing**: Bun native test framework

## Environment Variables

Both services have a `src/config/configuration.ts` that reads all `process.env.*` vars with defaults. These can be overridden via `.env` file or Docker environment.

| Variable | Services | Default | Purpose |
|----------|----------|---------|---------|
| `PORT` | games, wallets | `4001` / `4002` | HTTP listen port |
| `NODE_ENV` | games, wallets | `development` | `"production"` enables gateway auth check in `XUserIdGuard` |
| `DB_HOST` | games, wallets | `localhost` | PostgreSQL host (Docker Compose: `postgres`) |
| `DB_PORT` | games, wallets | `5432` | PostgreSQL port |
| `DB_USER` | games, wallets | `admin` | PostgreSQL user |
| `DB_PASS` | games, wallets | `admin` | PostgreSQL password |
| `DB_NAME` | games, wallets | `games` / `wallets` | PostgreSQL database name |
| `DB_SSL` | games, wallets | `false` | Enable SSL for PostgreSQL connection (required on Render/Railway) |
| `RABBITMQ_URL` | games, wallets | `amqp://admin:admin@localhost:5672` | RabbitMQ connection string |
| `CRASH_POINT_OVERRIDE` | games | (unset) | Forces crash point to this value (testing only) |
| `VITE_API_URL` | frontend | `""` | API base URL (empty = same-origin via Vite proxy) |
| `VITE_WS_URL` | frontend | `""` | WebSocket server URL (empty = same-origin via proxy → Kong) |
| `VITE_KEYCLOAK_URL` | frontend | `http://localhost:8080` | Keycloak base URL for OIDC password grant |
| `FRONTEND_URL` | kong (Docker) | `"http://localhost:5173"` | CORS origin for Kong production config |
| `CORS_ORIGIN` | games, wallets | — | Allowed CORS origin when `NODE_ENV=production` |
| `DATABASE_URL` | games, wallets | — | Connection string (overrides DB_HOST/DB_PORT/DB_USER/DB_PASS/DB_NAME; parsed by configuration.ts) |

## Reliability

### Idempotent Consumers
* Idempotency keys (eventId) stored in `consumed_events` table with unique constraint
* Duplicate events → skipped safely without processing
* Implementation: `services/wallets/src/domain/consumed-event.repository.ts`

### ACK Only After Success
* Messages acknowledged only after DB write completes
* Implementation: `services/wallets/src/infrastructure/rabbitmq/rabbitmq-consumer.service.ts`

### at-least-once Delivery
* Retry mechanism: max 3 retries with exponential backoff (1s → 2s → 4s)
* After 3 failures → message sent to DLQ

### DLQ Strategy
* Exchange: `dlx` (direct)
* Queues: `games.bet.placed.dlq`, `games.bet.cashed-out.dlq`, `games.bet.lost.dlq`
* Retention: 7 days (604800000ms TTL)
* Purpose: Manual inspection of permanently failed messages

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
# Games unit tests
cd services/games && bun test tests/unit

# Games E2E tests
cd services/games && bun test tests/e2e

# All Games tests
cd services/games && bun test

# Wallets unit tests
cd services/wallets && bun test tests/unit

# All Wallets tests
cd services/wallets && bun test

# Wallets E2E tests
cd services/wallets && bun test tests/e2e

# All tests with coverage
cd services/games && bun test --coverage

# Watch mode
cd services/games && bun test --watch
```

### Docker (full stack)

```bash
# Start full stack (Postgres, RabbitMQ, Keycloak, Kong, services)
bun docker:up

# Start in production mode (Kong JWT auth, no direct service ports)
bun docker:up:prod

# Stop all containers
bun docker:down

# Clean up volumes & images
bun docker:reset

# View logs
docker compose logs -f games       # Games service logs
docker compose logs -f wallets     # Wallets service logs
docker compose logs -f postgres    # Database logs
```

### Docker (demo single-service)

```bash
# Start Postgres (5433) + demo backend (4003) — no Kong/Keycloak/RabbitMQ
bun demo:up

# Stop
bun demo:down

# Clean up
bun demo:reset
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
curl http://localhost:8000/games/health   # Games service
curl http://localhost:8000/wallets/health   # Wallets service

# Gateway auth check (401 without token)
curl -i http://localhost:8000/games/current

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
   - HTTP: `POST /wallets/:userId/debit`
   - RabbitMQ Event: `BetPlaced`
   - Validates sufficient funds BEFORE withdrawal, throws descriptive error if insufficient

4. **CreditWalletUseCase** (79 lines)
   - Input: userId, amountInMainUnit
   - Output: `WalletResponseDto`
   - HTTP: `POST /wallets/:userId/credit`
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
- **BETTING Phase** (5s timer):
  - Accepts player bets via `placeBet(bet)`
  - Auto-transitions to RUNNING after timer expires
  - Timer: `bettingTimerId` managed by NestJS lifecycle
  
- **RUNNING Phase** (multiplier loop every 100ms):
  - Multiplier increments by 0.001 per interval
  - Players can cash out via `cashOutBet(betId, multiplier)`
  - Auto-crash triggered when multiplier ≥ crashPoint
  - Emit WebSocket event `round:multiplier-updated`
  
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
  - `getServerSeedHash()`: SHA256 of server seed (public, non-revealing)
  - `getServerSeed()`: Current server seed (private, used by verify use case)
  - `getClientSeed()` / `setClientSeed(seed)`: Client seed management
  - `getNonce()`: Current nonce (auto-increments per round)
  - `revealServerSeed()`: Rotate server seed, return old seed + new hash

- **Error Handling**: Try/catch on each phase transition, descriptive logging

**Use Cases** (`services/games/src/application/use-cases/`):

1. **PlaceBetUseCase** (65 lines)
   - Input: `PlaceBetDto` with userId, amountInMainUnit
   - Output: `BetResponseDto`
   - HTTP: `POST /games/bets`
   - Validates input → Create Bet entity → Delegate to RoundLifecycleService.placeBet()
   - Only works in BETTING state (enforced by service)
   - Uses `X-User-Id` header via `XUserIdGuard` (no manual header parsing)

2. **CashOutUseCase** (75 lines)
   - Input: `CashOutDto` with betId, multiplier, userId
   - Output: `BetResponseDto`
   - HTTP: `POST /games/bets/:betId/cash-out`
   - Validates round in RUNNING → Delegate to RoundLifecycleService.cashOutBet()
   - Enforces bet ownership: throws if `bet.playerId !== userId`
   - Emits RabbitMQ `BetCashedOut` event (✅ integrated)

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

5. **CreateRoundUseCase** (internal use)
   - Input: none
   - Output: `RoundResponseDto`
   - HTTP: `POST /games/rounds`
   - Creates new round in BETTING state (manual trigger for testing)

6. **GetProvablyFairStatusUseCase**
   - Input: none
   - Output: `ProvablyFairStatusDto` (serverSeedHash, clientSeed, nonce)
   - HTTP: `GET /games/provably-fair`
   - Public status of seed chain (hash only, seed not revealed)

7. **RevealServerSeedUseCase**
   - Input: none
   - Output: `ProvablyFairRevealDto` (oldServerSeed, newServerSeedHash, currentClientSeed, currentNonce)
   - HTTP: `POST /games/provably-fair/reveal`
   - Rotates server seed, returns old seed for client-side verification

8. **SetClientSeedUseCase**
   - Input: `SetClientSeedDto` with clientSeed
   - Output: `ProvablyFairStatusDto`
   - HTTP: `POST /games/provably-fair/client-seed`
   - Sets client seed for next round's crash point derivation

9. **VerifyRoundUseCase**
   - Input: roundId
   - Output: Verified result (valid, hash, multiplier, formula, houseEdge)
   - HTTP: `GET /games/rounds/:roundId/verify`
   - Verifies crash point HMAC using revealed server seed from previous round

**WebSocket Gateway** (`services/games/src/presentation/gateway/games.gateway.ts`):
   - Events broadcast via Socket.io on port 4001 (same as HTTP)
   - Events:
     - `round:state-changed` - Round transitions (BETTING → RUNNING → CRASHED)
     - `round:multiplier-updated` - Every 100ms during RUNNING phase
     - `round:bet-placed` - When a bet is placed
     - `round:bet-cashed-out` - When a bet is cashed out
     - `round:crashed` - When round crashes (includes statistics)

**DTOs** (`services/games/src/application/dtos/`):
- `PlaceBetDto`: userId, amountInMainUnit
- `CashOutDto`: betId, multiplier, userId
- `BetResponseDto`: Full bet data with state, winnings, ROI; factory method `fromDomain(bet)`
- `RoundResponseDto`: Full round + all bets; factory method `fromDomain(round)`
- `ProvablyFairStatusDto`: serverSeedHash, clientSeed, nonce
- `ProvablyFairRevealDto`: oldServerSeed, newServerSeedHash, currentClientSeed, currentNonce
- `SetClientSeedDto`: clientSeed

**Patterns**:
- Constructor injection of `RoundLifecycleService`
- Comprehensive input validation (non-empty userId, amount > 0, multiplier >= 1.0, page >= 1, limit > 0)
- Descriptive error messages with context
- Factory methods for entity-to-DTO conversion
- Logging on all use case executions (debug on entry, log/error on result)
- Bet ID generation: `bet-{timestamp}-{random}` (9-char alphanumeric)
- Amount precision: Convert mainUnit to centavos via `BigInt(Math.round(amount * 100))`
- `XUserIdGuard` on guarded endpoints (`placeBet`, `cashOut`, wallet CRUD): validates `X-User-Id` header, sets `req.userId` for use case consumption. In production (`NODE_ENV === "production"`), also requires `X-Gateway-Authenticated: true` — only Kong can inject this header.

### Infrastructure Layer (✅ Complete - 841 lines)
- **Location**: `services/*/src/infrastructure/typeorm/`
- **Responsibility**: Adapters, external integrations, persistence
- **Key Components**:
  - TypeORM entities for Round, Bet, Wallet with BigInt precision
  - BigInt transformer for PostgreSQL bigint ↔ bigint conversion
  - Repository implementations (RoundRepository, WalletRepository)
  - Domain ↔ TypeORM entity mapping
  - Database migrations (create_rounds_and_bets, create_wallets)

#### BigInt Transformer
```typescript
const BigIntTransformer = {
  to: (value: bigint | null | undefined): string | null => {
    if (value === null || value === undefined) return null;
    return value.toString();
  },
  from: (value: string | null | undefined): bigint | null => {
    if (value === null || value === undefined) return null;
    return BigInt(value);
  },
};

@Column({ type: 'bigint', transformer: BigIntTransformer })
balanceInCentavos: bigint
```

**Critical**: PostgreSQL returns bigint as string by default. The transformer ensures native bigint for financial calculations.

#### TypeORM Entities

| Entity | File | Purpose |
|--------|------|---------|
| RoundTypeormEntity | `games/src/infrastructure/typeorm/round.typeorm-entity.ts` | Stores round state, multiplier, CrashPoint (multiplier/hash/clientSeed/nonce) |
| BetTypeormEntity | `games/src/infrastructure/typeorm/bet.typeorm-entity.ts` | Stores bet with BigInt precision, inherits CrashPoint from Round |
| WalletTypeormEntity | `wallets/src/infrastructure/typeorm/wallet.typeorm-entity.ts` | Stores wallet with BigInt balance, unique userId index |

#### Repository Implementations

| Repository | File | Methods |
|-----------|------|---------|
| RoundRepository | `games/src/infrastructure/typeorm/round.repository.ts` | findById, findMostRecent, findAll, save, delete, exists, count |
| WalletRepository | `wallets/src/infrastructure/typeorm/wallet.repository.ts` | findById, findByUserId, save, delete, exists |

**Mapping Pattern**: Repositories handle domain ↔ TypeORM entity conversion with factory methods. CrashPoint reconstructed from components (multiplier, hash, clientSeed, nonce) on read.

#### Database Migrations

| Migration | File | Tables |
|-----------|------|--------|
| CreateRoundsAndBets | `games/src/infrastructure/typeorm/migrations/1704067200000-create-rounds-and-bets.ts` | rounds, bets |
| CreateWallets | `wallets/src/infrastructure/typeorm/migrations/1704067200001-create-wallets.ts` | wallets |

### Presentation Layer (✅ Complete)
- **Location**: `services/*/src/presentation/`
- **Current State**: Full REST controllers implemented
- **Games Endpoints** (11): health, rounds, bets, cash-out, bet-by-id, current, history, provably-fair-status, provably-fair-reveal, provably-fair-client-seed, round-verify
- **Wallets Endpoints** (5): health, create, get, debit, credit

## Frontend Architecture

### Component Hierarchy

```
App
└── ErrorBoundary
    └── QueryProvider
        └── AppContent
            ├── LoginPage (when no user)
            │   ├── BrandPanel
            │   └── LoginForm (calls auth-store)
            └── GamePage (when authenticated)
                └── GamePageContent
                    ├── useSocketConnection()    ← hook, not provider
                    │   └── dispatches to game-store + seed-store
                    ├── TopBar
                    │   ├── BrandPanel
                    │   └── CrashHistoryPills (reads game-store)
                    ├── LiveBets (reads game-store)
                    ├── GameCanvas + SeedRevealPanel
                    └── RightPanel (reads game-store, writes via bet actions)
                        ├── BalanceDisplay (reads balance-store)
                        ├── PositionStatus
                        ├── ActionButton
                        ├── BetMessages
                        └── BetInput
```

### Zustand Stores — The State Backbone

State management moved from React Contexts to 4 Zustand stores. No context providers wrapping the app tree. Components use selector-based subscriptions for granular re-renders.

**auth-store** (`frontend/src/shared/lib/stores/auth-store.ts`):
- State: `user: { id, username, token } | null`, `isLoading: boolean`
- Actions: `login()` (Keycloak OIDC), `logout()`, `setUser()`, `setLoading()`
- Persistence: localStorage via `zustand/middleware/persist` (key: `igaming-auth`)
- On network error in dev mode: falls back to static `DEV_USER_ID` UUID — no JWT, no server dependency
- On 401: throws to form for error display
- Wallet creation via `ensureWalletCreated()`: direct `fetch` with explicit `X-User-Id` header only — wallet keyed by userId alone. Called before `setUser()` to avoid race between socket connect and wallet existence.

**game-store** (`frontend/src/shared/lib/stores/game-store.ts`):
- State: `connected`, `roundState`, `currentMultiplier`, `syncError`, `roundNumber`, `crashHistory`, `hasBet`, `myBetId: string | null`, `bets: LiveBet[]`, `playingCount`
- Actions: `setConnected`, `setDisconnected`, `setError`, `initRound`, `startBetting`, `setRoundState`, `updateMultiplier`, `setHasBet`, `setMyBetId`, `setCrashed`, `incrementRound`, `setBets`, `addBet`, `updateBet`, `reset`
- No persistence (ephemeral game state)

**balance-store** (`frontend/src/shared/lib/stores/balance-store.ts`):
- State: `balance: number | null`
- Action: `setBalance()`
- No persistence (refetched on each login / round transition)

**seed-store** (`frontend/src/shared/lib/stores/seed-store.ts`):
- State: `seedHash: string`, `seedHistory: RevealedSeed[]`
- Actions: `setSeedHash()`, `revealSeed()` (calls provably-fair API)
- Persistence: sessionStorage via `zustand/middleware/persist` (key: `igaming-seed-history`)

### Auth Layer

**Login Flow** (`frontend/src/features/auth-by-password/ui/LoginForm.tsx`):
- Calls `useAuthStore().login(email, password)`
- `login()` calls `keycloakLogin()` → on success stores `{ id (UUID sub), email, token }` in localStorage via Zustand persist middleware
- No manual localStorage marshaling — Zustand persist handles serialize/deserialize

**keycloakLogin** (`frontend/src/shared/api/auth.ts`): POSTs to `${config.apiUrl}/auth/realms/crash-game/protocol/openid-connect/token` (via Kong) with `grant_type=password`, decodes JWT body (base64), returns `{ userId (sub), email, token }`.

**apiFetch** (`frontend/src/shared/api/api.ts`): Wraps `fetch()` with env-aware headers:
- Reads `X-User-Id` and `Authorization: Bearer <token>` from auth-store's persisted localStorage
- Dev Kong (`kong.dev.yml`): passes through `X-User-Id` without JWT validation
- Prod Kong (`kong.prod.yml`): validates JWT, strips client-provided identity headers, injects trusted `X-User-Id` from `sub` claim

### Canvas Crash Graph

**GameCanvas** (`frontend/src/widgets/game-canvas/ui/GameCanvas.tsx`, 367 lines): HTML5 Canvas with `requestAnimationFrame` loop.

**Rendering Pipeline:**
- `computePoints(multiplier, crashPoint, w, h)`: Generates up to 150 points with hockey-stick exponential curve. `x` is linear in progress (`p * w * 0.85`). Multiplier grows with a `p ** 2.2` bias (flat→steep). `y = h - normalized(curveM) * h * 0.85` where `normalized(curveM) = (curveM - 1) / (crashPoint - 1)`.
- `drawLine(ctx, points, color)`: Draws the multiplier curve with `shadowBlur: 10` and `shadowColor` matching stroke color for the neon glow effect.
- **Smooth animation**: `useCanvasRenderer` (`frontend/src/widgets/game-canvas/model/useCanvasRenderer.ts`) receives `runningStartTime` prop. In the rAF loop, when `roundState === 'running'` and `runningStartTime` is set, the multiplier is computed from elapsed time (`1.005 ** (elapsed / 100)`) rather than reading `currentMultiplierRef.current`. This decouples the canvas from React state updates (100ms `setInterval`) and produces smooth 60fps animation.
- `drawRocket(ctx, tip, angle, color)`: 12-vertex vector shape drawn at the curve tip. Rotated via `ctx.rotate(angle + Math.PI/2)` where `angle = Math.atan2(dy, dx)` of the last two path points (tangent). Glow via `shadowBlur: 8`.
- `drawExplosion(ctx, particles, crashTime, now)`: Expanding white circle (800ms, `Math.min(elapsed/800, 1) * 40` px radius) + 8 smoke particles (600ms, radial with random velocity). Uses `globalCompositeOperation = 'screen'` for additive blending.

**Color Transition:** On crash, green (`#00ff88`) transitions to red (`#ff4444`) over 600ms via per-frame `lerpRGB`.

**Dual-Mode Multiplier:**
- Connected to server: reads `currentMultiplier` from game-store — no local timer
- Disconnected: internal `setInterval` at 100ms increments `multiplier * (1 + 0.005)` — allows dev without backend
- `fallbackMultiplier` (React state) updated by timer; actual render uses `currentMultiplier ?? fallbackMultiplier`

**Three Round States:**
- `betting`: Static 1.00x display, no line, canvas cleared
- `running`: Neon-green line sweeps rightward as multiplier grows, rocket follows curve tip
- `crashed`: Frozen at final multiplier, green→red color transition, explosion animation

**DOM Overlays:**
- Top: `ROUND #N` label + seed hash pill with toggle reveal panel
- Center: Massive multiplier text (`clamp(3rem, 14vw, 9rem)`), neon green during betting/running, loss-red on crash; drop-shadow glow matches round state (green glow running, red glow crashed, none on betting)

**Grid Background:** CSS `repeating-linear-gradient` (0°/90°, 60px pitch, 2.5% opacity lines) on a wrapper `div` behind the canvas.

### Socket Connection Hook

**useSocketConnection** (`frontend/src/shared/lib/hooks/useSocketConnection.ts`, 177 lines): Plain hook (no provider) that manages socket.io connection and dispatches events to Zustand stores.

**Connection:** `io(config.isDev ? undefined : config.apiUrl, { transports: ['websocket', 'polling'] })`. In dev, empty URL → same-origin via Vite proxy → Kong. In prod, direct to `config.apiUrl` (Render URL or Kong).

**How it works:**
- Called once inside `GamePage` component in a `useEffect`
- On mount, creates socket connection with event listeners
- Each listener calls the appropriate Zustand store action:
  - `round:state-changed` → `useGameStore.getState().setRoundState()`
  - `round:multiplier-updated` → `useGameStore.getState().updateMultiplier()`
  - `round:bet-placed` → `useGameStore.getState().addBet()` — own bet detected via `myBetId` (not `userIdRef`) and labeled `demo`
  - `round:bet-cashed-out` → `useGameStore.getState().updateBet()`
  - `round:crashed` → `useGameStore.getState().setCrashed()`
- Round init `setBets` dedupes mock bets: `[...prev.filter((b) => !b.id.startsWith('mock-')), ...bets]`
- On unmount, disconnects socket

**Consumed by widgets via store selectors:**
- `LiveBets` reads `useGameStore(s => s.bets)` and `useGameStore(s => s.myBetId)` — own bet highlighted `text-neon-green`
- `CrashHistoryPills` reads `useGameStore(s => s.crashHistory)`
- `GameCanvas` reads `useGameStore(s => s.currentMultiplier)` and `useGameStore(s => s.roundState)`
- `RightPanel` reads game-store state and writes via bet action hooks
- `TopBar` reads `useBalanceStore(s => s.balance)`

**Balance fetching** (`frontend/src/shared/lib/hooks/useBalance.ts`):
- Uses `@tanstack/react-query` with `useQuery` for wallet balance
- Config: staleTime 15s, refetchOnWindowFocus enabled
- Writes result to `balance-store` via `useBalanceStore.getState().setBalance()`
- Refetched automatically on round state change (BETTING phase start)

**Mock Bets** (`frontend/src/features/mock-bets/model/useMockBets.ts`):
- 10 simulated players per round generated at `betting` phase
- Each mock bet has a pre-determined `cashOutAt` multiplier: 35% conservative (1.01–1.2x), 20% moderate (1.21–2.0x), 15% aggressive (2.01–5.0x), 30% let-it-ride (null → loses on crash)
- During `betting` phase: revealed in staggered batches (1-2 every 600ms)
- During `running` phase: 800ms interval checks `currentMultiplier >= cashOutAt`
- On crash: remaining pending mock bets become `lost`

### Dual-Mode GamePage

**GamePage** (`frontend/src/pages/game/ui/GamePage.tsx`, 49 lines): Routes between server-connected and disconnected modes.
- When `connected`: reads state from game-store, passes `currentMultiplier` to canvas, disables DEV button
- When disconnected: uses local React state (`localState`, `localRound`), passes `undefined` currentMultiplier to canvas (triggers fallback timer), shows DEV cycle button in RightPanel
- Layout: `TopBar` (full width) → `flex flex-col md:flex-row` of `LiveBets | GameCanvas | RightPanel`. On mobile, LiveBets hidden (`hidden md:flex`), GameCanvas on top, RightPanel below at full width with `border-t md:border-l`.

### Tailwind 4 Theme

Defined in `frontend/src/app/styles/index.css` using `@theme` directive:

```css
--color-cyber-green: #00ff7f;
--color-neon-green: #22ff7a;
--color-loss-red: #ff4444;
--color-deep-slate: #0b0e11;
--color-navy-blue: #0a0e17;
--font-sans: "Inter Variable", ui-sans-serif, system-ui, sans-serif;
--font-heading: "Space Grotesk Variable", ui-sans-serif, system-ui, sans-serif;
```

### Primitives

- **Button** (`frontend/src/shared/ui/Button.tsx`): Uses `tailwind-variants` with `variant` (primary/ghost), `size` (md/sm), and `rounded` variants
- **Input** (`frontend/src/shared/ui/Input.tsx`): Styled input with `focus:border-cyber-green focus:ring-1` focus state

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

- Kong dev config (`kong.dev.yml`): no JWT required; `X-User-Id` passed through directly for development
- Kong prod config (`kong.prod.yml`): JWT required globally; client-provided identity headers stripped; trusted `X-User-Id` + `X-Gateway-Authenticated` injected
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
| Modify canvas render | `frontend/src/widgets/game-canvas/ui/GameCanvas.tsx` |
| Add socket event handler | `frontend/src/shared/lib/hooks/useSocketConnection.ts` |
| Add auth login flow | `frontend/src/shared/lib/stores/auth-store.ts` |
| Add API call from frontend | `frontend/src/shared/api/api.ts` |
| Add/update Zustand store | `frontend/src/shared/lib/stores/*.ts` |

## Git Workflow

- **Branch naming**: `feat/feature-name`, `fix/bug-name`, `docs/documentation`
- **Commit messages**: Follow conventional commits (feat:, fix:, docs:, test:, refactor:)
- **Current branch**: `dev`
- **Protected branches**: main, master (future setup)

## Performance Considerations

- **Money arithmetic**: BigInt operations are fast; no external dependencies
- **State transitions**: O(1); no database lookups needed during updateMultiplier()
- **Bet aggregation**: O(n) over bets in round; pre-calculate if round has many bets
- **Database queries**: Use indexes on userId, roundId for wallet/bet lookups
- **WebSocket broadcasts**: Filter multiplier updates to only RUNNING rounds

**Status**: All items above are fully implemented ✅:
- ✅ Game canvas with exponential curve, rocket, explosion animation
- ✅ Socket.io WebSocket integration with dual-mode fallback (connected/disconnected)
- ✅ Keycloak auth layer with dev fallback (static UUID when Keycloak unreachable)
- ✅ Place-bet/cash-out API integration (RightPanel, TopBar, balance context)
- ✅ Wallet creation on first login (ensureWalletCreated, direct fetch, userId-only)
- ✅ Responsive layout (LiveBets sidebar mobile-hidden + Canvas center + RightPanel stacked on mobile)
- ✅ Tailwind 4 custom theme (5 colors, 2 fonts)
- ✅ Primitives (Button, Input via tailwind-variants)
- ✅ Refactored RightPanel (115 lines, 5 extracted sub-components, useBet hook, 7 shared lib modules)
- ✅ Zustand stores replacing React Contexts (auth-store, game-store, balance-store, seed-store)
- ✅ Feature-Sliced Design layout (app, pages, widgets, features, entities, shared)
- ✅ TanStack React Query for wallet balance (staleTime 15s, refetchOnWindowFocus)

---

**Last Updated**: 2026-07-26  
**Domain Layer Status**: ✅ Complete (787 lines, 8 files)  
**Application Layer Status**: ✅ Complete (1,062 lines)  
**Infrastructure Layer Status**: ✅ Complete (1,195 lines)  
**Presentation Layer Status**: ✅ Complete (Games: 11 endpoints, Wallets: 5 endpoints)  
**RabbitMQ Integration**: ✅ Complete (Games → Wallets async communication)  
**Docker Environment**: ✅ Operational (PostgreSQL, RabbitMQ, Keycloak, Kong)  
**Testing Status**: ✅ Complete (127 tests: 103 unit + 24 E2E)  
**Frontend**: ✅ Complete (game canvas, Zustand stores, FSD architecture, auth layer, UI components)  
**Repository**: https://github.com/guilhermehfr/igaming-crash-system

---

## TODO — End-to-End Observability (Correlation IDs)

### Goal
Trace a single user action (e.g., place bet) through HTTP → service → RabbitMQ → consumer, linking all log lines and responses.

### Architecture

```
X-Correlation-Id generated at Kong (edge) or NestJS interceptor (fallback)
         │
         ▼
  AsyncLocalStorage (Node.js built-in — no external deps)
         │
         ├── HTTP response headers (via ResponseHeaderInterceptor)
         ├── NestJS logs (via StructuredLogger)
         ├── RabbitMQ events (correlationId field in IBetPlacedEvent etc.)
         ├── WebSocket session (per-connection ID)
         └── Error responses (via GlobalExceptionFilter)
```

### Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Generation source | Kong post-function (preferred) + NestJS interceptor (fallback) | Kong is true edge; interceptor handles demo/no-Kong paths |
| Context propagation | `AsyncLocalStorage` (no external deps) | Spans async boundaries without changing use case signatures |
| RabbitMQ event field | `correlationId: string \| null` (optional, nullable) | Backward compat with events already in-flight |
| Logging format | Structured JSON with `correlationId`, `userId`, `service`, `timestamp` | Machine-parseable, grep-able |
| WebSocket | Session-level ID generated on `handleConnection()` | No HTTP request context for WS events |
| Client-supplied ID | Forwarded if present, generated if absent | Allows end-to-end trace from client tooling |

### Phases

#### Phase 1 — Kong Edge Generation
- **Files**: `docker/kong/kong.dev.yml`, `docker/kong/kong.prod.yml`
- Add `X-Correlation-Id` to CORS allowed headers
- Add post-function (access phase): generate UUID if missing, inject into upstream
- **Risk**: Low | **Effort**: Small
- Kan: Use built-in `correlation-id` plugin (simpler) or custom post-function (supports client forwarding)

#### Phase 2 — NestJS Infrastructure (shared across games, wallets, demo)
- **New files per service**:
  - `CorrelationIdService` — wraps `AsyncLocalStorage<string>`, exposes `run()`, getter `correlationId`
  - `CorrelationIdInterceptor` — reads/generates ID, calls `service.run(id, () => next.handle())`
  - `ResponseHeaderInterceptor` — sets `X-Correlation-Id` header on outgoing responses
  - `StructuredLogger` (optional) — extends Logger, prepends correlationId to all lines
  - `GlobalExceptionFilter` (games only — wallets already has one) — includes correlationId in error body
- **Modified**: `main.ts` (register global interceptors), `app.module.ts` (register providers)
- **Risk**: Low | **Effort**: Medium
- **Key detail**: `AsyncLocalStorage` must wrap the entire handler via `run()` in the interceptor to survive NestJS async pipeline

#### Phase 3 — RabbitMQ Propagation
- **Files**: `packages/events/*.ts` (3 interfaces), `rabbitmq-publisher.service.ts`, `rabbitmq-consumer.service.ts`
- Add `correlationId: string \| null` to `IBetPlacedEvent`, `IBetCashedOutEvent`, `IBetLostEvent`
- Publisher: read from `CorrelationIdService.correlationId`, include in event
- Consumer: extract and log; store in own AsyncLocalStorage for downstream use
- **Demo**: No change (in-process calls inherit context naturally)
- **Risk**: Low | **Effort**: Small

#### Phase 4 — WebSocket Session Correlation
- **File**: `services/games/src/presentation/gateway/games.gateway.ts`
- `handleConnection()`: generate session-level correlation ID, store in `client.data`
- Include in log messages for multiplier updates, state changes
- **Risk**: Low | **Effort**: Small

#### Phase 5 — Full Structured Logging (Optional)
- Replace all `new Logger()` instances (15+ files) with injected `StructuredLogger`
- JSON format: `{ timestamp, level, service, correlationId, userId, message, context }`
- **Risk**: Low-Medium | **Effort**: Medium-Large

### What Stays Unchanged

- Domain entities (Round, Bet, CrashPoint, Wallet, Money) — zero changes
- Use cases (PlaceBetUseCase, CashOutUseCase, DebitWalletUseCase, etc.) — zero changes
- DTOs — zero changes
- Repository interfaces + implementations — zero changes
- Database migrations — zero changes
- RabbitMQ queue/exchange topology — zero changes
- Frontend — zero changes (correlation ID is server-to-server concern)
- All existing tests — no behavioral change

### MVP (Phases 1 + 2)
Correlation IDs flow through HTTP requests, appear in response headers, logged by interceptor. Enough to debug most HTTP request chains.

### Full (Phases 1-3)
Adds RabbitMQ event correlation + correlationId in error responses. Covers: (1) failed HTTP requests, (2) async wallet processing failures, (3) mapping HTTP bet placement → async wallet debit.

### Complete (Phases 1-5)
Full structured JSON logging across all services — every log line has correlationId, userId, service name.
