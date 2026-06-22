# Crash Game — Frontend

React + TypeScript + Vite frontend for the iGaming Crash System.

## Dev Setup

```bash
bun install
bun run dev
```

## Connecting to Backend

### Development

REST requests go through Kong (port 8000) via Vite proxy:

- `/games/*` → `http://localhost:8000` (Kong) → `http://games:4001`
- `/wallets/*` → `http://localhost:8000` (Kong) → `http://wallets:4002`

Configured in `vite.config.ts`:

```ts
server: {
  proxy: {
    "/games": "http://localhost:8000",
    "/wallets": "http://localhost:8000",
  },
}
```

WebSocket connects directly to the games service (dev only):

```ts
import { io } from "socket.io-client";
const socket = io("http://localhost:4001", {
  transports: ["websocket"],
});
```

### Production

All traffic (REST + WebSocket) goes through Kong:

```ts
const socket = io("wss://api.example.com");
```

Services are not publicly exposed — only accessible via Kong through the Docker network.

## Auth Flow

### Development
Pass `X-User-Id` header directly. Kong forwards it to the service:

```ts
fetch("/games/current", {
  headers: { "X-User-Id": "player-1" },
});
```

### Production
JWT from Keycloak is required. Kong validates the JWT, extracts the `sub` claim, and injects `X-User-Id` + `X-Gateway-Authenticated` headers. Client-provided identity headers are stripped by Kong — spoofing is not possible.

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
| GET | `/games/current` | Current round + bets |
| GET | `/games/history?page=1&limit=10` | Past rounds |
| POST | `/games/bets` | Place bet `{ amountInMainUnit }` |
| POST | `/games/bets/:id/cash-out` | Cash out |
| GET | `/games/provably-fair` | Seed status |
| POST | `/games/provably-fair/reveal` | Reveal server seed |
| POST | `/games/provably-fair/client-seed` | Set client seed |

### Wallets

| Method | Path | Description |
|--------|------|-------------|
| GET | `/wallets/:userId` | Get wallet |
| POST | `/wallets/:userId/debit` | Debit balance |
| POST | `/wallets/:userId/credit` | Credit balance |
