<div align="center">

# 🎲 iGaming Crash System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A real-time multiplayer crash game system built with Domain-Driven Design and Hexagonal Architecture. Players place bets before each round and must cash out before the multiplier collapses.

**Backend:** TypeScript · NestJS · Bun · PostgreSQL · RabbitMQ  
**Frontend:** React · Vite · TypeScript

🌐 _[Leia em Português](README-pt-br.md)_

</div>

---

## 📑 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Domain Layer](#-domain-layer)
- [Authentication](#-authentication)
- [Reliability](#-reliability)
- [Financial Precision](#-financial-precision)
- [API (Gateway)](#-api-gateway)
- [Testing](#-testing)
- [Getting Started](#-getting-started)

---

## ✨ Features

- **Real-time crash game engine** – Explicit state machine (BETTING → RUNNING → CRASHED) with automatic multiplier progression and crash detection.
- **Provably fair** – Cryptographic seed chain (server seed hash, client seed, nonce) lets players verify every round's outcome independently.
- **Event-driven microservices** – Games and Wallets services communicate exclusively via RabbitMQ with idempotent consumers and DLQ-backed retry handling.
- **Financial precision** – All monetary values stored as BigInt centavos, zero floating-point math in any money operation.
- **Gateway-enforced auth** – Kong validates JWTs from Keycloak and injects a trusted user identity header; no service trusts client-provided identity directly.
- **Live multiplier graph** – Canvas-rendered exponential curve with a rocket that follows the curve tip, plus a crash explosion animation.
- **WebSocket synchronization** – Round state, multiplier updates, and bet events broadcast in real time via Socket.io through the gateway.

---

## 🛠 Tech Stack

### Backend

| Technology | Purpose |
| --- | --- |
| [NestJS](https://nestjs.com/) | Application framework for both services |
| [Bun](https://bun.sh/) | Runtime and test framework |
| [TypeORM](https://typeorm.io/) | Type-safe database access |
| [PostgreSQL](https://www.postgresql.org/) | Persistence (3 databases: games, wallets, keycloak) |
| [RabbitMQ](https://www.rabbitmq.com/) | Async inter-service messaging |
| [Kong](https://konghq.com/) | API Gateway (routing, JWT enforcement) |
| [Keycloak](https://www.keycloak.org/) | Identity Provider (OAuth2/OIDC) |
| [Socket.io](https://socket.io/) | Real-time round and multiplier events |

### Frontend

| Technology | Purpose |
| --- | --- |
| [React 19](https://react.dev/) | UI framework |
| [Vite](https://vite.dev/) | Build tool and dev server |
| [Tailwind CSS v4](https://tailwindcss.com/) | Styling |
| [Socket.io Client](https://socket.io/) | Real-time game state |
| HTML5 Canvas | Multiplier curve and rocket animation |

### Tooling

| Technology | Purpose |
| --- | --- |
| [TypeScript](https://www.typescriptlang.org/) | Static typing |
| [Docker Compose](https://docs.docker.com/compose/) | Container orchestration |
| [Bun](https://bun.sh/) | Package management & native test runner |

---

## 🧠 Architecture

The system follows **Domain-Driven Design (DDD)** and **Hexagonal Architecture** with strict layer separation.

### Services

| Service | Port | Purpose |
| --- | --- | --- |
| **Games** | 4001 | Crash game rounds with state machine (BETTING → RUNNING → CRASHED) |
| **Wallets** | 4002 | User account balances with monetary precision (BigInt) |
| **Demo** | 4003 | Single-service deployable (merged games+wallets, simple JWT, no dependencies) |
| **Kong** | 8000 | API Gateway (routes `/games` → 4001, `/wallets` → 4002, `/socket.io` → 4001 WS) |
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

## 🎮 Domain Layer

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

## 🔁 Communication

- Inter-service communication via RabbitMQ
- Decoupled integration based on events
- Event-driven system architecture

### Core Workflows

- `placeBet` → RabbitMQ event → wallet debit
- `cashOut` → RabbitMQ event → wallet credit
- `crash` → auto-liquidation of all PENDING bets

---

## 🔐 Authentication

- Keycloak with OIDC protocol
- JWT Token validation via Kong gateway
- Access control per authenticated user
- Test user: `player` / `player123`
- Realm: `crash-game`, Client: `crash-game-client`
- Health checks are not exposed via Kong; use service ports directly
- Kong injects `X-User-Id` header from JWT `sub` claim; services trust this header for user identity
- `XUserIdGuard` enforces `X-User-Id` presence on guarded endpoints (place bet, cash-out, wallets); health and read-only endpoints are public

---

## 🔌 Real-time

WebSockets for round synchronization. Traffic routes through Kong (`/socket.io` → `:8000` → Games `:4001`). In development, Vite proxy handles same-origin WS forwarding to Kong.

### Events

- `round:state-changed` - Round transitions (BETTING → RUNNING → CRASHED)
- `round:multiplier-updated` - Every 100ms during RUNNING phase
- `round:bet-placed` - When a bet is placed
- `round:bet-cashed-out` - When a bet is cashed out
- `round:crashed` - When round crashes (includes statistics)

---

## 🖥 Frontend

React 19 application built with Vite 8 and Tailwind 4. API traffic routes to your backend via `VITE_API_URL` (defaults to Kong on port 8000; set to `http://localhost:4003` for demo mode). In development, Vite proxy handles same-origin forwarding (`/games/*`, `/wallets/*`, `/socket.io`) to Kong.

### Crash Graph

HTML5 Canvas renders the exponential multiplier curve with `requestAnimationFrame`. The 150-point path uses log-scale for natural curve shape, biased toward early growth (`t ** 2.2`). A 12-vertex rocket vector follows the curve tip via tangent rotation. On crash, the line transitions from green to red over 600ms with an expanding white circle explosion and 8 smoke particles.

### Auth

Keycloak OIDC password grant (`grant_type=password`, realm `crash-game`, client `crash-game-client`). On successful login, the JWT is stored in localStorage and sent as `Authorization: Bearer <token>` (production) or `X-User-Id` (development). If Keycloak is unreachable in development, a static UUID fallback is used. Wallets and bets use the `sub` UUID from the JWT as the system identity; email/username is display-only.

### Real-time

Socket.io connects through Kong. The frontend subscribes to `round:state-changed`, `round:multiplier-updated`, `round:bet-placed`, `round:bet-cashed-out`, and `round:crashed` events. When connected, the canvas multiplier comes from the server; when disconnected, a local `setInterval` fallback at 100ms allows dev without backend.

---

## 🛡 Reliability

- **Idempotent Consumers**: Duplicate events detected via eventId (stored in `consumed_events` table with unique constraint) → skipped safely
- **ACK Only After Success**: Messages acknowledged only after successful event processing + DB commit
- **at-least-once Delivery**: Failed messages retry up to 3 times with exponential backoff (1s → 2s → 4s)
- **DLQ Strategy**: Messages exceeding max retries → Dead Letter Queue (7-day retention)

---

## 💰 Financial Precision

- Values stored strictly as BigInt (centavos)
- Zero floating-point math used in monetary operations
- Money value object enforces immutability and precision
- Wallet service enforces rigid validations

---

## 📡 API (Gateway)

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

## 🧪 Testing

- **140 tests total**: 106 unit + 34 E2E
- Bun native test framework
- Domain layer thoroughly tested
- Application layer use cases tested

## 📘 API Documentation

Swagger UI available at:
- Games: `http://localhost:4001/api`
- Wallets: `http://localhost:4002/api`

---

## 📁 Project Structure
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
│   └── demo/              # Single-service demo (merged games+wallets, simple JWT)
├── frontend/
│   └── src/
│       ├── App.tsx              # Root with AuthProvider → LoginPage | GamePage
│       ├── main.tsx             # Entry point
│       ├── config.ts            # Env vars config (apiUrl, wsUrl, keycloakUrl)
│       ├── index.css            # Tailwind 4 + custom theme (colors, fonts)
│       ├── lib/
│       │   ├── auth.ts          # keycloakLogin() — OIDC password grant
│       │   └── api.ts           # apiFetch() — env-aware header injection
│       ├── contexts/
│       │   ├── AuthContext.tsx   # Keycloak login, dev fallback, localStorage
│       │   └── SocketContext.tsx # Socket.io connection, round state, bets
│       └── components/
│           ├── auth/            # LoginForm, LoginPage
│           ├── brand/           # BrandPanel (rocket logo)
│           ├── game/            # GameCanvas, GamePage, RightPanel, TopBar,
│           │                    # CrashHistoryPills, LiveBets
│           └── primitives/      # Button, Input (tailwind-variants)
├── docker/
└── docker-compose.yml
```

---

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) v1.x
- [Docker](https://docker.com/) & Docker Compose

### Installation
```bash
git clone https://github.com/guilhermehfr/igaming-crash-system.git
cd igaming-crash-system
bun install
```

### Run the full stack
```bash
bun run docker:up
```

This command boots up the entire stack automatically (databases, services, gateway, auth, and messaging).

### Frontend development (standalone)
```bash
cd frontend && bun dev
```

### Demo mode (single service)
Postgres + merged backend, no dependencies (Kong/Keycloak/RabbitMQ):
```bash
bun demo:up
cd frontend && VITE_API_URL=http://localhost:4003 bun run build && bun preview
```
Login with `player` / `player123`. Wallet auto-created with $1,000.

### Production mode
No direct service ports — traffic only through Kong:
```bash
bun docker:up:prod
```

---

## 📌 Architecture Notes

- Independent and fully decoupled microservices
- Event-driven asynchronous communication
- Eventual consistency strictly applied to the financial workflow
- Explicit state machine in Round aggregate for game logic
- Frontend consumes the unified API through the gateway + stable WebSocket connection
- Canvas-based crash graph renderer with requestAnimationFrame loop
- Env-aware auth headers: dev uses `X-User-Id`, prod uses JWT `Authorization`

---

## 👋 Contact

- LinkedIn: [guilhermehe](https://linkedin.com/in/guilhermehe)
- GitHub: [guilhermehfr](https://github.com/guilhermehfr)