
# Crash Game 🎲

Um jogo de crash multiplayer em tempo real. Jogadores apostam antes de cada rodada, acompanham o multiplicador subir e sacam antes do crash - ou perdem tudo.

> **Stack:** NestJS · Bun · React · TypeScript · PostgreSQL · RabbitMQ · Kong · Keycloak · Docker

---

## Visão Geral

O sistema é dividido em dois bounded contexts independentes que se comunicam de forma assíncrona via RabbitMQ:

- **Game Service** — ciclo de vida da rodada, lógica de apostas, geração do crash point (provably fair), eventos WebSocket
- **Wallet Service** — saldos dos jogadores com precisão inteira (sem floats), crédito/débito via message broker

Todo tráfego passa pelo Kong (API Gateway) na porta `8000`. Autenticação é gerenciada pelo Keycloak (OIDC / PKCE S256).

---

## Setup

**Pré-requisitos:** Bun ≥ 1.x e Docker com Compose.

```bash
git clone https://github.com/guilhermehfr/igaming-crash-system
cd igaming-crash-system
bun install
bun run docker:up
```

Só isso. O `docker:up` sobe toda a stack — bancos de dados, migrations, RabbitMQ, roteamento Kong, importação do realm do Keycloak e todos os serviços. Nenhum passo manual.

| Serviço        | URL                                  |
|----------------|--------------------------------------|
| Frontend       | http://localhost:3000                |
| Game Service   | http://localhost:8000/games/*        |
| Wallet Service | http://localhost:8000/wallets/*      |
| RabbitMQ UI    | http://localhost:15672               |
| Keycloak Admin | http://localhost:8080 (admin/admin)  |

**Usuário de teste:** `player` / `player123` — pré-configurado no realm `crash-game` com saldo na carteira.

```bash
bun run docker:down   # para os containers
bun run docker:prune  # remove containers, volumes e imagens
```

Para rodar os serviços fora do Docker (modo dev):

```bash
cp services/games/.env.example services/games/.env
cp services/wallets/.env.example services/wallets/.env
```

---

## Rodando os Testes

```bash
# Testes unitários
cd services/games && bun test tests/unit
cd services/wallets && bun test tests/unit

# E2E (requer docker:up)
cd services/games && bun test tests/e2e
```

---

## Referência da API

Todos os endpoints via Kong: `http://localhost:8000`

### Wallet — `/wallets`

| Método | Endpoint       | Auth | Descrição                                  |
|--------|----------------|------|--------------------------------------------|
| POST   | /wallets       | ✓    | Cria carteira para o jogador autenticado   |
| GET    | /wallets/me    | ✓    | Retorna carteira e saldo do jogador        |

> Crédito e débito não são expostos via REST — acontecem pelo message broker.

### Game — `/games`

| Método | Endpoint                      | Auth | Descrição                                    |
|--------|-------------------------------|------|----------------------------------------------|
| GET    | /games/rounds/current         | —    | Estado da rodada atual com apostas            |
| GET    | /games/rounds/history         | —    | Histórico paginado de rodadas                 |
| GET    | /games/rounds/:id/verify      | —    | Dados de verificação provably fair            |
| GET    | /games/bets/me                | ✓    | Histórico de apostas do jogador (paginado)    |
| POST   | /games/bet                    | ✓    | Fazer aposta na rodada atual                  |
| POST   | /games/bet/cashout            | ✓    | Sacar no multiplicador atual                  |

### WebSocket

Apenas server-push — todas as ações do jogador vão pelo REST. O servidor emite eventos para manter todos os clientes sincronizados:

| Evento              | Descrição                                          |
|---------------------|----------------------------------------------------|
| `round:betting`     | Nova fase de apostas iniciada (com contagem)       |
| `round:started`     | Multiplicador começou a subir                      |
| `round:tick`        | Valor atual do multiplicador                       |
| `round:crashed`     | Crash atingido + dados de verificação              |
| `bet:placed`        | Outro jogador fez uma aposta                       |
| `bet:cashout`       | Outro jogador sacou                                |

---

## Decisões de Arquitetura e Trade-offs

### Precisão monetária

Todos os valores monetários são armazenados e transmitidos como **centavos inteiros (BIGINT)** — nunca floats. O Wallet Service aplica isso na camada de domínio; qualquer operação que resultaria em fração de centavo é rejeitada. Restrição sem exceções.

### Comunicação assíncrona (RabbitMQ)

Game e Wallet são completamente desacoplados. Quando um jogador aposta, o Game Service emite um evento `bet.placed`; o Wallet Service debita o saldo e confirma via `balance.debited`. Cash out e liquidação do crash seguem o mesmo padrão.

**Trade-off:** Isso introduz consistência eventual. Uma aposta pode ser aceita pelo Game Service milissegundos antes do Wallet Service confirmar o débito. Para lidar com falhas, eventos de compensação (`balance.debit_failed`) revertem o estado da aposta — padrão saga baseado em coreografia, sem orquestrador. É mais simples para dois serviços, mas rastrear falhas ficaria mais difícil em escala.

Com mais tempo, implementaria o padrão **Transactional Outbox** para garantir at-least-once delivery mesmo se um serviço cair entre o processamento e a publicação do evento.

### Provably Fair

O crash point de cada rodada é gerado a partir de uma **hash chain**: um server seed combinado com um nonce específico da rodada via HMAC-SHA256. O algoritmo:

```
crash_point = f(HMAC-SHA256(serverSeed, roundNonce))
```

O comprometimento do server seed (hash do seed) é revelado antes da rodada começar. Após o crash, o seed bruto é exposto — qualquer jogador pode verificar de forma independente que o resultado foi pré-determinado e não manipulado após as apostas. O endpoint `/games/rounds/:id/verify` retorna tudo que é necessário para isso.

O house edge é aplicado de forma determinística como parte da fórmula.

### Estratégia de sincronização do multiplicador

O multiplicador é calculado no **cliente** com base no timestamp de início da rodada — o servidor emite eventos `round:tick` apenas como correção de sincronização, não como fonte da verdade. Isso reduz carga no servidor e mantém a animação fluida mesmo com jitter de rede.

**Trade-off:** Clientes com drift de relógio significativo podem exibir um multiplicador levemente diferente por um momento. Os ticks corrigem isso em ~100ms.

### Roteamento Kong

O Kong fica na frente de ambos os serviços e valida JWTs (Keycloak JWKS) no nível do gateway. Os serviços confiam no gateway e não validam tokens por conta própria — código de serviço mais simples, configuração de autenticação em ponto único.

**Trade-off:** Se o Kong cair, nada funciona. Aceitável para um desafio de desenvolvimento; em produção exigiria Kong em HA.

### Estado no frontend

- **TanStack Query** para server state (histórico de rodadas, saldo, histórico de apostas)
- **Zustand** para client state (rodada atual, multiplicador, atualizações via WebSocket)

Os eventos WebSocket mutam a store do Zustand; o React re-renderiza a partir daí.

### O que eu faria diferente em uma duração maior

- **Transactional Outbox** em ambos os serviços para entrega garantida
- **Retry + dead-letter queues** para eventos de compensação que falham
- **Auto cashout**, jogador define um multiplicador alvo e o servidor saca automaticamente
- **OpenTelemetry** com tracing distribuído entre os serviços para debugar fluxos de saga

---

## Estrutura do Projeto

```
crash-game/
├── services/
│   ├── games/          # Game Service (NestJS, DDD)
│   │   ├── src/
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   ├── infrastructure/
│   │   │   └── presentation/
│   │   └── tests/      # unit/ + e2e/
│   └── wallets/        # Wallet Service (NestJS, DDD)
│       ├── src/
│       └── tests/
├── packages/
├── frontend/           # React + Tailwind v4
├── docker/
│   ├── kong/kong.yml
│   ├── keycloak/realm-export.json
│   └── postgres/init-databases.sh
├── docker-compose.yml
└── README.md
```

Cada serviço segue a separação DDD: `domain → application → infrastructure → presentation`. Dependências entre camadas fluem apenas para dentro.

---

## Autor

**Guilherme** — [github.com/guilhermehfr](https://github.com/guilhermehfr) · [linkedin.com/in/guilhermehe](https://linkedin.com/in/guilhermehe)
