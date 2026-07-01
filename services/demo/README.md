# Demo Service

Single-deployable NestJS app merging games + wallets for zero-cost Render demo. The full microservice architecture (Kong, Keycloak, RabbitMQ, split services) remains untouched in `services/games/`, `services/wallets/`, and `docker/`.

## How It Differs

| Feature | Full Stack (Docker) | Demo (Render) |
|---------|-------------------|---------------|
| Services | games (4001), wallets (4002) | Single merged app (4001) |
| Auth | Keycloak OIDC → Kong JWT | Simple JWT (`POST /auth/token` demo/demo) |
| Wallet sync | RabbitMQ events | Direct `DebitWalletUseCase`/`CreditWalletUseCase` calls |
| Wallet creation | Frontend creates on login | Backend auto-creates with $1000 on login |
| API Gateway | Kong (8000) | None (direct HTTP) |
| Database | PostgreSQL via Docker | Neon free tier |

## Directory Structure

```
services/demo/
├── src/
│   ├── main.ts                          # Bootstrap + CORS
│   ├── app.module.ts                    # Single TypeORM with all entities
│   ├── games.module.ts                  # Games providers + guard override
│   ├── wallets.module.ts                # Wallets providers + guard override
│   ├── wallet-sync.service.ts           # Sync debit/credit calls
│   ├── demo-rabbitmq-publisher.service.ts  # Stub → WalletSyncService
│   ├── config/configuration.ts          # DATABASE_URL, JWT_SECRET, etc.
│   └── auth/
│       ├── auth.controller.ts           # POST /auth/.../token
│       └── demo-x-user-id.guard.ts      # JWT or X-User-Id header
├── Dockerfile
├── .env.example
├── package.json
└── tsconfig.json
```

All domain/application/infrastructure code is imported directly from `services/games/` and `services/wallets/` via TypeScript path aliases — zero duplication.

## Running Locally

### With Docker (recommended)

Postgres + demo backend, no conflicts with the full stack:

```bash
# From repo root — start Postgres (5433) + demo (4003)
bun demo:up

# Serve frontend
cd frontend
VITE_API_URL=http://localhost:4003 bun run build && bun preview
```

### Without Docker (manual)

```bash
# Install workspace deps (from repo root)
bun install

# Start (needs PostgreSQL at localhost:5432 or set DATABASE_URL)
bun run src/main.ts

# Type-check
bun x tsc --noEmit
```

## Deploy to Render

1. Create a Neon project, copy `DATABASE_URL`
2. Create Render Web Service → Dockerfile at `services/demo/Dockerfile`
3. Set env vars: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `NODE_ENV=production`
4. Deploy

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/realms/crash-game/protocol/openid-connect/token` | Login (`player`/`player123`) → JWT |
| GET | `/games/health` | Health check |
| GET | `/games/current` | Current round state |
| POST | `/games/bets` | Place bet (auth required) |
| POST | `/games/bets/:betId/cash-out` | Cash out (auth required) |
| GET | `/games/history` | Round history |
| GET | `/games/provably-fair` | Provably fair status |
| GET | `/wallets/health` | Health check |
| GET | `/wallets/:userId` | Get wallet balance |

WebSocket at `/socket.io` for real-time game state.
