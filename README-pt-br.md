<div align="center">

# 🎲 iGaming Crash System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Um sistema de jogo "crash" multiplayer em tempo real construído com Domain-Driven Design e Arquitetura Hexagonal. Jogadores apostam antes de cada rodada e precisam sacar antes que o multiplicador colapse.

**Backend:** TypeScript · NestJS · Bun · PostgreSQL · RabbitMQ  
**Frontend:** React · Vite · TypeScript

🌐 _[Read in English](README.md)_

</div>

---

## 📑 Índice

- [Funcionalidades](#-funcionalidades)
- [Stack Tecnológica](#-stack-tecnológica)
- [Arquitetura](#-arquitetura)
- [Camada de Domínio](#-camada-de-domínio)
- [Autenticação](#-autenticação)
- [Confiabilidade](#-confiabilidade)
- [Precisão Financeira](#-precisão-financeira)
- [API (Gateway)](#-api-gateway)
- [Testes](#-testes)
- [Como Começar](#-como-começar)

---

## ✨ Funcionalidades

- **Motor de jogo crash em tempo real** – Máquina de estados explícita (BETTING → RUNNING → CRASHED) com progressão automática do multiplicador e detecção de crash.
- **Provably fair** – Cadeia de seeds criptográfica (hash do server seed, client seed, nonce) permite que jogadores verifiquem o resultado de qualquer rodada de forma independente.
- **Microsserviços orientados a eventos** – Games e Wallets se comunicam exclusivamente via RabbitMQ, com consumidores idempotentes e retry com DLQ.
- **Precisão financeira** – Todos os valores monetários armazenados como BigInt em centavos, zero ponto flutuante em qualquer operação financeira.
- **Autenticação enforçada no gateway** – Kong valida os JWTs emitidos pelo Keycloak e injeta um header de identidade confiável; nenhum serviço confia em identidade fornecida diretamente pelo cliente.
- **Gráfico do multiplicador em tempo real** – Curva exponencial renderizada em Canvas, com um foguete que segue a ponta da curva, além de animação de explosão no crash.
- **Sincronização via WebSocket** – Estado da rodada, atualizações do multiplicador e eventos de aposta transmitidos em tempo real via Socket.io através do gateway.

---

## 🛠 Stack Tecnológica

### Backend

| Tecnologia | Propósito |
| --- | --- |
| [NestJS](https://nestjs.com/) | Framework de aplicação para ambos os serviços |
| [Bun](https://bun.sh/) | Runtime e test framework |
| [TypeORM](https://typeorm.io/) | Acesso ao banco de dados type-safe |
| [PostgreSQL](https://www.postgresql.org/) | Persistência (3 databases: games, wallets, keycloak) |
| [RabbitMQ](https://www.rabbitmq.com/) | Mensageria assíncrona entre serviços |
| [Kong](https://konghq.com/) | API Gateway (roteamento, enforcement de JWT) |
| [Keycloak](https://www.keycloak.org/) | Identity Provider (OAuth2/OIDC) |
| [Socket.io](https://socket.io/) | Eventos de rodada e multiplicador em tempo real |

### Frontend

| Tecnologia | Propósito |
| --- | --- |
| [React 19](https://react.dev/) | Framework de UI |
| [Vite](https://vite.dev/) | Build tool e dev server |
| [Tailwind CSS v4](https://tailwindcss.com/) | Estilização |
| [Socket.io Client](https://socket.io/) | Estado do jogo em tempo real |
| HTML5 Canvas | Curva do multiplicador e animação do foguete |

### Ferramentas

| Tecnologia | Propósito |
| --- | --- |
| [TypeScript](https://www.typescriptlang.org/) | Tipagem estática |
| [Docker Compose](https://docs.docker.com/compose/) | Orquestração de containers |
| [Bun](https://bun.sh/) | Gerenciamento de pacotes & test runner nativo |

---

## 🧠 Arquitetura

O sistema segue **Domain-Driven Design (DDD)** e **Arquitetura Hexagonal** com separação estrita de camadas.

### Serviços

| Serviço | Porta | Propósito |
| --- | --- | --- |
| **Games** | 4001 | Rodadas do crash game com máquina de estados (BETTING → RUNNING → CRASHED) |
| **Wallets** | 4002 | Saldos das contas de usuário com precisão monetária (BigInt) |
| **Demo** | 4003 | Deploy single-service (games+wallets mesclados, JWT simples, sem dependências) |
| **Kong** | 8000 | API Gateway (roteia `/games` → 4001, `/wallets` → 4002, `/socket.io` → 4001 WS) |
| **Keycloak** | 8080 | Identity Provider (OAuth2/OIDC) |
| **RabbitMQ** | 5672 | Message broker para comunicação assíncrona entre serviços |

### Estrutura de Camadas
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

## 🎮 Camada de Domínio

### Round (Aggregate Root)

Máquina de estados explícita, sem regressão de estado:
```
BETTING ──startRound()──→ RUNNING ──crash()──→ CRASHED
```

- **BETTING**: Aceita apostas dos jogadores; o crash point precisa estar definido antes da transição
- **RUNNING**: Multiplicador incrementa; jogadores podem sacar; crash automático quando multiplicador ≥ crashPoint
- **CRASHED**: Todas as apostas PENDING são marcadas como LOST; a rodada se torna somente leitura

### Bet (Entity)

Ciclo de vida de estado: `PENDING → CASHED_OUT` (jogador ganhou) ou `PENDING → LOST` (rodada crashou)

### Wallet (Aggregate Root)

Sem máquina de estados; agregado CRUD simples com gerenciamento de saldo.

### Money (Value Object)

Precisão via BigInt (centavos = 1/100 da unidade principal, sem erros de ponto flutuante).

---

## 🔁 Comunicação

- Comunicação entre serviços via RabbitMQ
- Integração desacoplada baseada em eventos
- Arquitetura orientada a eventos

### Fluxos Principais

- `placeBet` → evento RabbitMQ → debita carteira
- `cashOut` → evento RabbitMQ → credita carteira
- `crash` → liquidação automática de todas as apostas PENDING

---

## 🔐 Autenticação

- Keycloak com protocolo OIDC
- Validação de JWT via gateway Kong
- Controle de acesso por usuário autenticado
- Usuário de teste: `player` / `player123`
- Realm: `crash-game`, Client: `crash-game-client`
- Health checks não são expostos via Kong; use as portas dos serviços diretamente
- Kong injeta o header `X-User-Id` a partir do claim `sub` do JWT; os serviços confiam nesse header para identidade do usuário
- `XUserIdGuard` exige a presença de `X-User-Id` nos endpoints protegidos (apostar, cash-out, wallets); endpoints de health e somente leitura são públicos

---

## 🔌 Tempo Real

WebSockets para sincronização das rodadas. O tráfego passa pelo Kong (`/socket.io` → `:8000` → Games `:4001`). Em desenvolvimento, o proxy do Vite encaminha as conexões WS same-origin para o Kong.

### Eventos

- `round:state-changed` - Transições de rodada (BETTING → RUNNING → CRASHED)
- `round:multiplier-updated` - A cada 100ms durante a fase RUNNING
- `round:bet-placed` - Quando uma aposta é feita
- `round:bet-cashed-out` - Quando uma aposta é sacada
- `round:crashed` - Quando a rodada crasha (inclui estatísticas)

---

## 🖥 Frontend

Aplicação React 19 construída com Vite 8 e Tailwind 4. O tráfego de API vai para seu backend via `VITE_API_URL` (padrão: Kong na porta 8000; defina como `http://localhost:4003` para modo demo). Em desenvolvimento, o proxy do Vite encaminha as chamadas same-origin (`/games/*`, `/wallets/*`, `/socket.io`) para o Kong.

### Gráfico do Crash

Canvas HTML5 renderiza a curva exponencial do multiplicador via `requestAnimationFrame`. O caminho de 150 pontos usa escala logarítmica para uma forma de curva natural, enviesada para crescimento inicial (`t ** 2.2`). Um vetor de foguete com 12 vértices segue a ponta da curva por rotação tangencial. No crash, a linha transiciona de verde para vermelho em 600ms, com uma explosão de círculo branco expandindo e 8 partículas de fumaça.

### Auth

Password grant OIDC do Keycloak (`grant_type=password`, realm `crash-game`, client `crash-game-client`). Após login bem-sucedido, o JWT é armazenado no localStorage e enviado como `Authorization: Bearer <token>` (produção) ou `X-User-Id` (desenvolvimento). Se o Keycloak estiver inacessível em desenvolvimento, um fallback de UUID estático é usado. Wallets e bets usam o UUID `sub` do JWT como identidade do sistema; email/username é apenas para exibição.

### Tempo Real

Socket.io conecta através do Kong. O frontend se inscreve nos eventos `round:state-changed`, `round:multiplier-updated`, `round:bet-placed`, `round:bet-cashed-out` e `round:crashed`. Quando conectado, o multiplicador do canvas vem do servidor; quando desconectado, um fallback local via `setInterval` a 100ms permite desenvolvimento sem backend.

---

## 🛡 Confiabilidade

- **Consumidores Idempotentes**: Eventos duplicados detectados via eventId (armazenado na tabela `consumed_events` com constraint de unicidade) → ignorados com segurança
- **ACK Somente Após Sucesso**: Mensagens confirmadas apenas após processamento bem-sucedido do evento + commit no banco
- **Entrega at-least-once**: Mensagens com falha tentam novamente até 3 vezes com backoff exponencial (1s → 2s → 4s)
- **Estratégia de DLQ**: Mensagens que excedem o máximo de tentativas → Dead Letter Queue (retenção de 7 dias)

---

## 💰 Precisão Financeira

- Valores armazenados estritamente como BigInt (centavos)
- Zero ponto flutuante usado em operações monetárias
- O value object Money garante imutabilidade e precisão
- O serviço Wallet aplica validações rígidas

---

## 📡 API (Gateway)

Todas as rotas expostas através do Kong (porta 8000).
Endpoints de health são acessados diretamente pelas portas dos serviços.

### Endpoints de Wallet

- `POST /wallets` - Cria carteira
- `GET /wallets/:userId` - Busca carteira por ID do usuário
- `POST /wallets/:userId/debit` - Debita carteira
- `POST /wallets/:userId/credit` - Credita carteira

### Endpoints de Games

- `GET /games/health` - Health check do serviço
- `GET /games/current` - Busca a rodada atual
- `GET /games/history` - Busca histórico de rodadas (paginado)
- `POST /games/bets` - Realiza uma aposta
- `GET /games/bets/:betId` - Busca aposta por ID
- `POST /games/bets/:betId/cash-out` - Saca uma aposta
- `POST /games/rounds` - Cria uma nova rodada (trigger manual)
- `GET /games/rounds/:roundId/verify` - Verificação provably fair
- `GET /games/provably-fair` - Busca status dos seeds (hash, clientSeed, nonce)
- `POST /games/provably-fair/reveal` - Revela e rotaciona o server seed
- `POST /games/provably-fair/client-seed` - Define o client seed

---

## 🧪 Testes

- **140 testes no total**: 106 unitários + 34 E2E
- Test framework nativo do Bun
- Camada de domínio extensivamente testada
- Casos de uso da camada de aplicação testados

## 📘 Documentação da API

Swagger UI disponível em:
- Games: `http://localhost:4001/api`
- Wallets: `http://localhost:4002/api`

---

## 📁 Estrutura do Projeto
```
├── services/
│   ├── games/
│   │   └── src/
│   │       ├── domain/           # Entidades Round, Bet, CrashPoint
│   │       ├── application/      # RoundLifecycleService + use cases
│   │       ├── infrastructure/  # Entidades TypeORM, repositórios, migrations
│   │       └── presentation/    # Controllers REST, WebSocket gateway
│   └── wallets/
│       └── src/
│           ├── domain/           # Value objects Wallet, Money
│           ├── application/      # Use cases, DTOs
│           ├── infrastructure/  # Entidades TypeORM, repositórios
│           └── presentation/    # Controllers REST
│   └── demo/              # Demo single-service (games+wallets mesclados, JWT simples)
├── frontend/
│   └── src/
│       ├── App.tsx              # Raiz com AuthProvider → LoginPage | GamePage
│       ├── main.tsx             # Ponto de entrada
│       ├── config.ts            # Config de variáveis de ambiente (apiUrl, wsUrl, keycloakUrl)
│       ├── index.css            # Tailwind 4 + tema customizado (cores, fontes)
│       ├── lib/
│       │   ├── auth.ts          # keycloakLogin() — OIDC password grant
│       │   └── api.ts           # apiFetch() — injeção de headers consciente do ambiente
│       ├── contexts/
│       │   ├── AuthContext.tsx   # Login Keycloak, fallback dev, localStorage
│       │   └── SocketContext.tsx # Conexão Socket.io, estado da rodada, apostas
│       └── components/
│           ├── auth/            # LoginForm, LoginPage
│           ├── brand/           # BrandPanel (logo do foguete)
│           ├── game/            # GameCanvas, GamePage, RightPanel, TopBar,
│           │                    # CrashHistoryPills, LiveBets
│           └── primitives/      # Button, Input (tailwind-variants)
├── docker/
└── docker-compose.yml
```

---

## 🚀 Como Começar

### Pré-requisitos

- [Bun](https://bun.sh/) v1.x
- [Docker](https://docker.com/) & Docker Compose

### Instalação
```bash
git clone https://github.com/guilhermehfr/igaming-crash-system.git
cd igaming-crash-system
bun install
```

### Rodando a stack completa
```bash
bun run docker:up
```

Esse comando sobe toda a stack automaticamente (databases, serviços, gateway, autenticação e mensageria).

### Desenvolvimento do frontend isoladamente
```bash
cd frontend && bun dev
```

### Modo demo (serviço único)
Postgres + backend mesclado, sem dependências (Kong/Keycloak/RabbitMQ):
```bash
bun demo:up
cd frontend && VITE_API_URL=http://localhost:4003 bun run build && bun preview
```
Login com `player` / `player123`. Carteira criada automaticamente com $1.000.

### Modo produção
Sem portas diretas dos serviços — tráfego apenas através do Kong:
```bash
bun docker:up:prod
```

---

## 📌 Notas de Arquitetura

- Microsserviços independentes e completamente desacoplados
- Comunicação assíncrona orientada a eventos
- Consistência eventual aplicada estritamente ao fluxo financeiro
- Máquina de estados explícita no aggregate Round para a lógica do jogo
- Frontend consome a API unificada através do gateway + conexão WebSocket estável
- Renderizador do gráfico de crash baseado em Canvas com loop requestAnimationFrame
- Headers de auth conscientes do ambiente: dev usa `X-User-Id`, prod usa JWT `Authorization`

---

## 👋 Contato

- LinkedIn: [guilhermehe](https://linkedin.com/in/guilhermehe)
- GitHub: [guilhermehfr](https://github.com/guilhermehfr)