# 🎲 Igaming Crash System

Sistema de jogo multiplayer em tempo real no modelo *crash game*. Jogadores realizam apostas antes de cada rodada e precisam sacar antes do multiplicador colapsar.

## Stack

- **Runtime**: Bun
- **Backend**: NestJS · TypeScript
- **Banco de Dados**: PostgreSQL (3 bancos: games, wallets, keycloak)
- **Mensageria**: RabbitMQ
- **Gateway**: Kong (API Gateway)
- **Autenticação**: Keycloak (OIDC)
- **Tempo Real**: Socket.io
- **Infraestrutura**: Docker · Docker Compose

---

## Arquitetura

O sistema segue **Domain-Driven Design (DDD)** e **Arquitetura Hexagonal** com separação estrita de camadas.

### Serviços

| Serviço | Porta | Propósito |
|---------|-------|-----------|
| **Games** | 4001 | Rodadas do jogo crash com máquina de estados (BETTING → RUNNING → CRASHED) |
| **Wallets** | 4002 | Saldo de usuários com precisão monetária (BigInt) |
| **Kong** | 8000 | API Gateway (rotas /games → 4001, /wallets → 4002) |
| **Keycloak** | 8080 | Provedor de Identidade (OAuth2/OIDC) |
| **RabbitMQ** | 5672 | Message broker para comunicação assíncrona entre serviços |

### Estrutura de Camadas

```
Camada de Apresentação (HTTP/WebSocket)
        ↓
Camada de Aplicação (Use Cases)
        ↓
Camada de Domínio (Lógica de Negócio)
        ↓
Camada de Infraestrutura (Adapters, DB, Mensageria)
```

---

## Camada de Domínio

### Round (Aggregate Root)

Máquina de estados explícita sem regressão de estado:

```
BETTING ──startRound()──→ RUNNING ──crash()──→ CRASHED
```

- **BETTING**: Aceita apostas dos jogadores; crash point deve ser definido antes da transição
- **RUNNING**: Multiplicador incrementa; jogadores podem fazer cashout; auto-crash quando multiplicador ≥ crashPoint
- **CRASHED**: Todas as apostas PENDING são marcadas como LOST; rodada é somente leitura

### Bet (Entity)

Ciclo de estado: `PENDING → CASHED_OUT` (jogador ganhou) ou `PENDING → LOST` (rodada crashou)

### Wallet (Aggregate Root)

Sem máquina de estados; agregado CRUD simples com gestão de saldo.

### Money (Value Object)

Precisão via BigInt (centavos = 1/100 da unidade principal, sem erros de ponto flutuante).

---

## Comunicação

- Comunicação entre serviços via RabbitMQ
- Integração desacoplada baseada em eventos
- Sistema orientado a eventos

### Fluxos Principais

- `placeBet` → evento RabbitMQ → débito na wallet
- `cashOut` → evento RabbitMQ → crédito na wallet
- `crash` → auto-liquidação de todas as apostas PENDING

---

## Autenticação

- Keycloak com protocolo OIDC
- Validação de token JWT via gateway Kong
- Controle de acesso por usuário autenticado
- Usuário de teste: `player` / `player123`
- Realm: `crash-game`, Client: `crash-game-client`

---

## Tempo Real

WebSockets para sincronização de rodadas (serviço Games na porta 4001).

### Eventos

- `round:state-changed` - Transições de rodada (BETTING → RUNNING → CRASHED)
- `round:multiplier-updated` - A cada 100ms durante a fase RUNNING
- `round:bet-placed` - Quando uma aposta é feita
- `round:bet-cashed-out` - Quando uma aposta é sacada
- `round:crashed` - Quando a rodada crasha (inclui estatísticas)

---

## Confiabilidade

- **Consumidores Idempotentes**: Eventos duplicados detectados via eventId (armazenado na tabela consumed_events com constraint única) → ignorados com segurança
- **ACK Apenas Após Sucesso**: Mensagens reconhecidas apenas após processamento bem-sucedido + commit no banco
- **Entrega at-least-once**: Mensagens falhas retentam até 3 vezes com backoff exponencial (1s → 2s → 4s)
- **Estratégia DLQ**: Mensagens que excedem retries máximos → Dead Letter Queue (retenção de 7 dias)

---

## Precisão Financeira

- Valores armazenados estritamente como BigInt (centavos)
- Nenhuma operação matemática com ponto flutuante em operações monetárias
- Value object Money impõe imutabilidade e precisão
- Wallet service aplica validações rígidas

---

## API (Gateway)

Todas as rotas expostas via Kong (porta 8000).

### Endpoints de Wallet

- `POST /wallets` - Criar wallet
- `GET /wallets/:userId` - Obter wallet por user ID
- `POST /wallets/:userId/debit` - Debitar wallet
- `POST /wallets/:userId/credit` - Creditar wallet

### Endpoints de Game

- `GET /games/health` - Verificação de saúde do serviço
- `GET /games/current` - Obter rodada atual
- `GET /games/history` - Obter histórico de rodadas (paginado)
- `POST /games/bets` - Fazer uma aposta
- `GET /games/bets/:betId` - Obter aposta por ID
- `POST /games/bets/:betId/cash-out` - Sacar uma aposta
- `POST /games/rounds` - Criar uma nova rodada (disparo manual)
- `GET /games/rounds/:roundId/verify` - Verificação provably fair
- `GET /games/provably-fair` - Status das seeds (hash, clientSeed, nonce)
- `POST /games/provably-fair/reveal` - Revelar e rotacionar server seed
- `POST /games/provably-fair/client-seed` - Definir client seed

---

## Testes

- **188 testes no total**: 172 unitários + 16 E2E
- Framework de testes nativo do Bun
- Camada de domínio extensivamente testada
- Use cases da camada de aplicação testados

---

## Estrutura do Projeto

```
├── services/
│   ├── games/
│   │   └── src/
│   │       ├── domain/           # Entidades Round, Bet, CrashPoint
│   │       ├── application/      # RoundLifecycleService + use cases
│   │       ├── infrastructure/  # Entidades TypeORM, repositories, migrations
│   │       └── presentation/    # Controllers REST, Gateway WebSocket
│   └── wallets/
│       └── src/
│           ├── domain/           # Wallet, Money value objects
│           ├── application/      # Use cases, DTOs
│           ├── infrastructure/  # Entidades TypeORM, repositories
│           └── presentation/    # Controllers REST
├── docker/
└── docker-compose.yml
```

---

## Execução

```bash
bun install
bun run docker:up
```

Este comando inicializa toda a stack automaticamente (bancos, serviços, gateway, auth e mensageria).

---

## Observações de Arquitetura

- Serviços independentes e completamente desacoplados
- Comunicação assíncrona orientada a eventos
- Consistência eventual aplicada estritamente no fluxo financeiro
- Máquina de estados explícita no aggregate Round para lógica do jogo
- Kong injeta o header `X-User-Id` a partir da claim `sub` do JWT; serviços confiam neste header
- Guard `XUserIdGuard` garante presença do header em todos os endpoints

## Documentação da API

Swagger UI disponível em:
- Games: `http://localhost:4001/api`
- Wallets: `http://localhost:4002/api`
- Frontend consome a API unificada via gateway + conexão WebSocket estável
