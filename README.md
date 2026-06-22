# Igaming Crash System

Real-time multiplayer game system based on the "crash game" model. Players place bets before each round and must cash out before the multiplier collapses.

## Stack

- **Runtime**: Bun
- **Backend**: NestJS · TypeScript
- **Database**: PostgreSQL (3 databases: games, wallets, keycloak)
- **Messaging**: RabbitMQ
- **Gateway**: Kong (API Gateway)
- **Authentication**: Keycloak (OIDC)
- **Real-time**: Socket.io
- **Infrastructure**: Docker · Docker Compose

---

## Architecture

The system follows **Domain-Driven Design (DDD)** and **Hexagonal Architecture** with strict layer separation.

### Services

| Service | Port | Purpose |
|---------|------|---------|
| **Games** | 4001 | Crash game rounds with state machine (BETTING → RUNNING → CRASHED) |
| **Wallets** | 4002 | User account balances with monetary precision (BigInt) |
| **Kong** | 8000 | API Gateway (routes /games → 4001, /wallets → 4002, /socket.io → 4001 WS) |
| **Keycloak** | 8080 | Identity Provider (OAuth2/OIDC) |
| **RabbitMQ** | 5672 | Message broker for async inter-service communication |

### Layer Structure

```
Presentation Layer (HTTP/WebSocket)
        ↓
Application Layer (Use Cases)
        ↓
Domain Layer (Business Logic)
        ↓
Infrastructure Layer (Adapters, DB, Messaging)
```

---

## Domain Layer

### Round (Aggregate Root)

Explicit state machine with no state regression:

```
BETTING ──startRound()──→ RUNNING ──crash()──→ CRASHED
```

- **BETTING**: Accept player bets; crash point must be set before transition
- **RUNNING**: Multiplier increments; players can cash out; auto-crash when multiplier ≥ crashPoint
- **CRASHED**: All PENDING bets marked LOST; round is read-only

### Bet (Entity)

State lifecycle: `PENDING → CASHED_OUT` (player won) or `PENDING → LOST` (round crashed)

### Wallet (Aggregate Root)

No state machine; simple CRUD aggregate with balance management.

### Money (Value Object)

Precision via BigInt (centavos = 1/100 of main unit, no floating-point errors).

---

## Communication

- Inter-service communication via RabbitMQ
- Decoupled integration based on events
- Event-driven system architecture

### Core Workflows

- `placeBet` → RabbitMQ event → wallet debit
- `cashOut` → RabbitMQ event → wallet credit
- `crash` → auto-liquidation of all PENDING bets

---

## Authentication

- Keycloak with OIDC protocol
- JWT Token validation via Kong gateway
- Access control per authenticated user
- Test user: `player` / `player123`
- Realm: `crash-game`, Client: `crash-game-client`
- Health checks are not exposed via Kong; use service ports directly
- Kong injects `X-User-Id` header from JWT `sub` claim; services trust this header for user identity
- `XUserIdGuard` enforces `X-User-Id` presence on guarded endpoints (place bet, cash-out, wallets); health and read-only endpoints are public

---

## Real-time

WebSockets for round synchronization. Traffic routes through Kong (`/socket.io` → `:8000` → Games `:4001`). In development, Vite proxy handles same-origin WS forwarding to Kong.

### Events

- `round:state-changed` - Round transitions (BETTING → RUNNING → CRASHED)
- `round:multiplier-updated` - Every 100ms during RUNNING phase
- `round:bet-placed` - When a bet is placed
- `round:bet-cashed-out` - When a bet is cashed out
- `round:crashed` - When round crashes (includes statistics)

---

## Reliability

- **Idempotent Consumers**: Duplicate events detected via eventId (stored in consumed_events table with unique constraint) → skipped safely
- **ACK Only After Success**: Messages acknowledged only after successful event processing + DB commit
- **at-least-once Delivery**: Failed messages retry up to 3 times with exponential backoff (1s → 2s → 4s)
- **DLQ Strategy**: Messages exceeding max retries → Dead Letter Queue (7-day retention)

---

## Financial Precision

- Values stored strictly as BigInt (centavos)
- Zero floating-point math used in monetary operations
- Money value object enforces immutability and precision
- Wallet service enforces rigid validations

---

## API (Gateway)

All routes exposed through Kong (port 8000).
Health endpoints are accessed directly from service ports.

### Wallet Endpoints

- `POST /wallets` - Create wallet
- `GET /wallets/:userId` - Get wallet by user ID
- `POST /wallets/:userId/debit` - Debit wallet
- `POST /wallets/:userId/credit` - Credit wallet

### Game Endpoints

- `GET /games/health` - Service health check
- `GET /games/current` - Get current round
- `GET /games/history` - Get round history (paginated)
- `POST /games/bets` - Place a bet
- `GET /games/bets/:betId` - Get bet by ID
- `POST /games/bets/:betId/cash-out` - Cash out a bet
- `POST /games/rounds` - Create a new round (manual trigger)
- `GET /games/rounds/:roundId/verify` - Provably fair verification
- `GET /games/provably-fair` - Get seed status (hash, clientSeed, nonce)
- `POST /games/provably-fair/reveal` - Reveal and rotate server seed
- `POST /games/provably-fair/client-seed` - Set client seed

---

## Testing

- **69 tests total**: 48 unit + 21 E2E
- Bun native test framework
- Domain layer thoroughly tested
- Application layer use cases tested

## API Documentation

Swagger UI available at:
- Games: `http://localhost:4001/api`
- Wallets: `http://localhost:4002/api`

---

## Project Structure

```
├── services/
│   ├── games/
│   │   └── src/
│   │       ├── domain/           # Round, Bet, CrashPoint entities
│   │       ├── application/      # RoundLifecycleService + use cases
│   │       ├── infrastructure/  # TypeORM entities, repositories, migrations
│   │       └── presentation/    # REST controllers, WebSocket gateway
│   └── wallets/
│       └── src/
│           ├── domain/           # Wallet, Money value objects
│           ├── application/      # Use cases, DTOs
│           ├── infrastructure/  # TypeORM entities, repositories
│           └── presentation/    # REST controllers
├── frontend/
│   └── src/
│       ├── App.tsx              # React root component
│       ├── main.tsx             # Entry point
│       ├── config.ts            # Env vars config
│       └── index.css            # Tailwind import
├── docker/
└── docker-compose.yml
```

---

## Getting Started

```bash
bun install
bun run docker:up
```

This command boots up the entire stack automatically (databases, services, gateway, auth, and messaging).

---

## Architecture Notes

- Independent and fully decoupled microservices
- Event-driven asynchronous communication
- Eventual consistency strictly applied to the financial workflow
- Explicit state machine in Round aggregate for game logic
- Frontend consumes the unified API through the gateway + stable WebSocket connection