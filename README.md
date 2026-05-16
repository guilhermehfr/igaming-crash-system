# 🎲 Igaming Crash System

Real-time multiplayer game system based on the "crash game" model. Players place bets before each round and must cash out before the multiplier collapses.

## ⚙️ Stack

* **Backend:** NestJS · TypeScript · Node.js · Bun
* **Frontend:** React · TypeScript · Vite *(Under development)*
* **Database:** PostgreSQL
* **Messaging:** RabbitMQ
* **Gateway:** Kong
* **Authentication:** Keycloak (OIDC)
* **Infrastructure:** Docker · Docker Compose

---

## 🧠 Architecture

The system is split into two main services:

### Game Service
* Full round lifecycle management.
* Crash point generation via *provably fair* algorithm.
* Bet processing.
* Real-time event broadcasting via WebSocket.

### Wallet Service
* Player balance management.
* Event-driven debit and credit operations.
* Financial consistency enforcement.

---

## 🔁 Communication

* Inter-service communication via RabbitMQ.
* Decoupled integration based on events.
* Fully event-driven system architecture.

### Core Workflows
* `bet` ➔ event ➔ wallet debit.
* `cashout` ➔ event ➔ wallet credit.
* `crash` ➔ general round settlement.

---

## 🔐 Authentication

* Keycloak with OIDC protocol.
* JWT Token validation handled directly at the gateway (Kong).
* Access control per authenticated user.

---

## 🎮 Real-time

* WebSockets for round synchronization.
* **State Events:**
  * Betting started.
  * Multiplier rising.
  * Cashout.
  * Crash.

---

## Reliability

* **Idempotent Consumers**: Duplicate events detected via eventId (stored in consumed_events table with unique constraint) → skipped safely
* **ACK Only After Success**: Messages acknowledged only after successful event processing + DB commit
* **at-least-once Delivery**: Failed messages retry up to 3 times before handling
* **DLQ Strategy**: Messages exceeding max retries → Dead Letter Queue (7-day retention)

### Retry Flow

Event → Process → Success → ACK
                    └→ Failure
                        ├→ retry < 3 → republish with retry count + 1
                        └→ retry >= 3 → NACK → DLQ

---

## 💰 Financial Precision

* Values stored strictly as integers (cents).
* Zero floating-point math (*float*) used in operations.
* Rigid validations applied within the Wallet Service.

---

## 📡 API (Gateway)

All routes are exposed centrally through Kong.

### Wallet
* `POST /wallets`
* `GET /wallets/:userId`
* `POST /wallets/:userId/debit`
* `POST /wallets/:userId/credit`

### Game
* `GET /games/current`
* `GET /games/history`
* `POST /games/bets`
* `GET /games/bets/:betId`
* `POST /games/bets/:betId/cash-out`
* `POST /games/rounds`

---

## 🔌 WebSocket Events

* `round:state-changed`
* `round:multiplier-updated`
* `round:bet-placed`
* `round:bet-cashed-out`
* `round:crashed`

---

## 🧪 Testing

* Unit tests
* Integration tests (routes)
* Smoke tests
* Load tests

---

## 🧱 Project Structure

```txt
├── services/
│   ├── games/
│   └── wallets/
├── frontend/
└── docker/
```

---

## 🚀 Getting Started

```bash
bun install
bun run docker:up
```
*This command boots up the entire stack automatically (databases, services, gateway, auth, and messaging).*

---

## 📌 Architecture Notes

* Independent and fully decoupled microservices.
* Event-driven asynchronous communication.
* Eventual consistency strictly applied to the financial workflow.
* Frontend consumes the unified API through the gateway + stable WebSocket connection.
