# Event Contracts

## Overview

This document describes the event contracts for inter-service communication in the iGaming Crash System.

## Versioning

All events include:
- `type`: Event type identifier (e.g., `'bet.placed'`)
- `version`: Numeric version (e.g., `1`)
- `eventId`: Unique event identifier (UUID)
- `timestamp`: ISO 8601 timestamp

---

## BetPlacedEvent V1

**Type:** `bet.placed`  
**Version:** `1`  
**Queue:** `games.bet.placed`

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | `'bet.placed'` | Yes | Event type identifier |
| version | `1` | Yes | Event version |
| eventId | string | Yes | Unique event identifier (UUID) |
| timestamp | ISO8601 | Yes | Event creation time |
| betId | string | Yes | Bet identifier |
| userId | string | Yes | User identifier |
| amountInCentavos | string | Yes | Bet amount in centavos |
| roundId | string | Yes | Round identifier |

### Consumer
- **Service:** Wallets
- **Action:** Debits user balance
- **Idempotency Key:** `eventId` (atomic DB insert with ON CONFLICT DO NOTHING)

### Example

```json
{
  "type": "bet.placed",
  "version": 1,
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-05-15T10:30:00.000Z",
  "betId": "bet-123",
  "userId": "user-456",
  "amountInCentavos": "1000",
  "roundId": "round-789"
}
```

---

## BetCashedOutEvent V1

**Type:** `bet.cashed-out`  
**Version:** `1`  
**Queue:** `games.bet.cashed-out`

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | `'bet.cashed-out'` | Yes | Event type identifier |
| version | `1` | Yes | Event version |
| eventId | string | Yes | Unique event identifier (UUID) |
| timestamp | ISO8601 | Yes | Event creation time |
| betId | string | Yes | Bet identifier |
| userId | string | Yes | User identifier |
| amountInCentavos | string | Yes | Original bet amount in centavos |
| winningsInCentavos | string | Yes | Winnings amount in centavos |
| multiplier | number | Yes | Multiplier at cash-out |
| roundId | string | Yes | Round identifier |

### Consumer
- **Service:** Wallets
- **Action:** Credits user balance with winnings
- **Idempotency Key:** `eventId` (atomic DB insert with ON CONFLICT DO NOTHING)

### Example

```json
{
  "type": "bet.cashed-out",
  "version": 1,
  "eventId": "550e8400-e29b-41d4-a716-446655440001",
  "timestamp": "2026-05-15T10:35:00.000Z",
  "betId": "bet-123",
  "userId": "user-456",
  "amountInCentavos": "1000",
  "winningsInCentavos": "2500",
  "multiplier": 2.5,
  "roundId": "round-789"
}
```

---

## BetLostEvent V1

**Type:** `bet.lost`  
**Version:** `1`  
**Queue:** `games.bet.lost`

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | `'bet.lost'` | Yes | Event type identifier |
| version | `1` | Yes | Event version |
| eventId | string | Yes | Unique event identifier (UUID) |
| timestamp | ISO8601 | Yes | Event creation time |
| betId | string | Yes | Bet identifier |
| userId | string | Yes | User identifier |
| amountInCentavos | string | Yes | Bet amount in centavos |
| roundId | string | Yes | Round identifier |
| crashPoint | number | Yes | Crash point multiplier |

### Consumer
- **Service:** Wallets
- **Action:** Acknowledgment only (balance already debited at bet placement)
- **Idempotency Key:** `eventId` (atomic DB insert with ON CONFLICT DO NOTHING)

### Example

```json
{
  "type": "bet.lost",
  "version": 1,
  "eventId": "550e8400-e29b-41d4-a716-446655440002",
  "timestamp": "2026-05-15T10:36:00.000Z",
  "betId": "bet-124",
  "userId": "user-789",
  "amountInCentavos": "500",
  "roundId": "round-789",
  "crashPoint": 1.5
}
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1 | 2026-05-15 | Initial version with type, version, eventId metadata fields |