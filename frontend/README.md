# Crash Game — Frontend

React + TypeScript + Vite frontend for the iGaming Crash System.

## Dev Setup

```bash
bun install
bun run dev
```

## Connecting to Backend

During development, Vite proxies API requests to the backend:

- `/api/games/*` → `http://localhost:4001`
- `/api/wallets/*` → `http://localhost:4002`

Configure proxy in `vite.config.ts`:

```ts
server: {
  proxy: {
    "/api/games": "http://localhost:4001",
    "/api/wallets": "http://localhost:4002",
  },
}
```

### WebSocket (Socket.io)

Connect directly (not through Vite proxy):

```ts
import { io } from "socket.io-client";
const socket = io("http://localhost:4001", {
  transports: ["websocket"],
});
```

## Auth Flow

1. Production: JWT from Keycloak → Kong validates → injects `X-User-Id` header
2. Development: Pass `X-User-Id` header directly (skip Kong)

```ts
fetch("/api/games/games/current", {
  headers: { "X-User-Id": "player-1" },
});
```

## WebSocket Events

| Event | Payload | When |
|-------|---------|------|
| `round:state-changed` | `{ roundId, previousState, newState }` | BETTING→RUNNING→CRASHED |
| `round:multiplier-updated` | `{ multiplier, roundId }` | Every 100ms during RUNNING |
| `round:bet-placed` | `{ betId, userId, amount }` | Bet placed |
| `round:bet-cashed-out` | `{ betId, userId, multiplier, winnings }` | Cash out |
| `round:crashed` | `{ roundId, crashPoint, statistics }` | Round ends |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `""` | API base URL (empty = same origin via proxy) |
| `VITE_WS_URL` | `"http://localhost:4001"` | WebSocket server URL |

## API Endpoints (via proxy)

### Games

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/games/games/current` | Current round + bets |
| GET | `/api/games/games/history?page=1&limit=10` | Past rounds |
| POST | `/api/games/games/bets` | Place bet `{ amountInMainUnit }` |
| POST | `/api/games/games/bets/:id/cash-out` | Cash out |
| GET | `/api/games/games/provably-fair` | Seed status |
| POST | `/api/games/games/provably-fair/reveal` | Reveal server seed |
| POST | `/api/games/games/provably-fair/client-seed` | Set client seed |

### Wallets

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/wallets/wallets/:userId` | Get wallet |
| POST | `/api/wallets/wallets/:userId/debit` | Debit balance |
| POST | `/api/wallets/wallets/:userId/credit` | Credit balance |
