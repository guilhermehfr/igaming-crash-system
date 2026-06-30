# Crash Game — Frontend

React + TypeScript + Vite frontend for the iGaming Crash System.

## Dev Setup

```bash
bun install
bun run dev
```

## Connecting to Backend

### Development

All traffic (REST + WebSocket) goes through Kong via Vite proxy:

- `/games/*` → `http://localhost:8000` (Kong) → `http://games:4001`
- `/wallets/*` → `http://localhost:8000` (Kong) → `http://wallets:4002`
- `/socket.io/*` → `http://localhost:8000` (Kong, WebSocket) → `http://games:4001`

Configured in `vite.config.ts`:

```ts
server: {
  proxy: {
    "/games": "http://localhost:8000",
    "/wallets": "http://localhost:8000",
    "/socket.io": {
      target: "http://localhost:8000",
      ws: true,
    },
  },
}
```

WebSocket connects through the same proxy (same-origin):

```ts
import { io } from "socket.io-client";
const socket = io({
  transports: ["websocket"],
});
```

### Production

All traffic goes through Kong. Point the frontend to your gateway domain:

```ts
const socket = io("wss://api.example.com");
```

Services are not publicly exposed — only accessible via Kong through the Docker network.

## Auth Flow

### Development
The `apiFetch` helper sends `X-User-Id` from stored auth and `X-Demo-Session` from `sessionStorage`. Kong forwards both to the service:

```ts
fetch("/games/current", {
  headers: { "X-User-Id": "player-1" },
});
```

On first login, `AuthContext.ensureWalletCreated()` uses a direct `fetch` (not `apiFetch`) with explicit `X-User-Id` and `X-Demo-Session` headers — no localStorage dependency.

### Production
JWT from Keycloak is required. Kong validates the JWT, extracts the `sub` claim, and injects `X-User-Id` + `X-Gateway-Authenticated` headers. Client-provided identity headers are stripped by Kong — spoofing is not possible.

## WebSocket Events

| Event | Payload | When |
|-------|---------|------|
| `round:state-changed` | `{ roundId, state, crashPoint }` | BETTING→RUNNING→CRASHED |
| `round:multiplier-updated` | `{ roundId, multiplier }` | Every 100ms during RUNNING |
| `round:bet-placed` | `{ roundId, bet: { id, userId, demoSessionId, amountInMainUnit } }` | Bet placed |
| `round:bet-cashed-out` | `{ roundId, bet: { id, userId, multiplier, winnings, amountInMainUnit } }` | Cash out |
| `round:crashed` | `{ roundId, crashPointMultiplier, statistics }` | Round ends |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `"http://localhost:8000"` | Kong API gateway (proxies /games, /wallets, /auth, /socket.io) |

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
| POST | `/wallets` | Create wallet `{ initialBalanceInMainUnit }` |
| GET | `/wallets/:userId` | Get wallet |
| POST | `/wallets/:userId/debit` | Debit balance |
| POST | `/wallets/:userId/credit` | Credit balance |
