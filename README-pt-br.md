# 🎲 Igaming Crash System

Sistema de jogo multiplayer em tempo real no modelo *crash game*. Jogadores realizam apostas antes de cada rodada e precisam sacar antes do multiplicador colapsar.

## ⚙️ Stack

* **Backend:** NestJS · TypeScript · Node.js · Bun
* **Frontend:** React · TypeScript · Vite *(Em desenvolvimento)*
* **Banco de Dados:** PostgreSQL
* **Mensageria:** RabbitMQ
* **Gateway:** Kong
* **Autenticação:** Keycloak (OIDC)
* **Infraestrutura:** Docker · Docker Compose

---

## 🧠 Arquitetura

O sistema é dividido em dois serviços principais:

### Game Service
* Ciclo completo das rodadas.
* Geração do *crash point* via *provably fair*.
* Processamento de apostas.
* Emissão de eventos em tempo real via WebSocket.

### Wallet Service
* Gestão de saldo dos jogadores.
* Débito e crédito via eventos.
* Garantia de consistência financeira.

---

## 🔁 Comunicação

* Comunicação entre serviços via RabbitMQ.
* Integração desacoplada baseada em eventos.
* Sistema totalmente orientado a eventos (*event-driven*).

### Fluxos Principais
* `aposta` ➔ evento ➔ débito na carteira.
* `cashout` ➔ evento ➔ crédito na carteira.
* `crash` ➔ liquidação geral da rodada.

---

## 🔐 Autenticação

* Keycloak com protocolo OIDC.
* Token JWT validado diretamente no gateway (Kong).
* Controle de acesso por usuário autenticado.

---

## 🎮 Tempo Real

* WebSockets para sincronização de rodadas.
* **Eventos de Estado:**
  * Início de aposta.
  * Multiplicador subindo.
  * Cashout.
  * Crash.

---

## Confiabilidade

* **Consumidores Idempotentes**: Eventos duplicados detectados via chaves de idempotência → ignorados com segurança
* **ACK Apenas Após Sucesso**: Mensagens reconhecidas apenas após processamento + commit no banco
* **Entrega at-least-once**: Mensagens falhas retentam até 3 vezes antes do tratamento
* **Estratégia DLQ**: Mensagens que excedem retries máximos → Dead Letter Queue (7 dias de retenção)

### Fluxo de Retry

Evento → Processar → Sucesso → ACK
                        └→ Falha
                            ├→ retry < 3 → republicar com retry + 1
                            └→ retry >= 3 → NACK → DLQ

---

## 💰 Precisão Financeira

* Valores armazenados estritamente como inteiros (centavos).
* Nenhuma operação matemática utiliza ponto flutuante (*float*).
* Validações rígidas aplicadas no Wallet Service.

---

## 📡 API (Gateway)

Todas as rotas são expostas centralizadamente via Kong.

### Wallet
* `POST /wallets`
* `GET /wallets/:userId`
* `POST /wallets/:userId/debit`
* `POST /wallets/:userId/credit`

### Game
* `GET /games/current`
* `GET /games/history`
* `POST /games/bets`
* `POST /games/bets/:betId/cash-out`
* `POST /games/rounds`
* `GET /games/rounds/:id/verify`

---

## 🔌 WebSocket Events

* `round:state-changed`
* `round:multiplier-updated`
* `round:bet-placed`
* `round:bet-cashed-out`
* `round:crashed`

---

## 🧪 Testes

* Unitários
* Integração (rotas)
* *Smoke tests*
* Testes de carga

---

## 🧱 Estrutura do Projeto

```txt
├── services/
│   ├── games/
│   └── wallets/
├── frontend/
└── docker/
```

---

## 🚀 Execução

```bash
bun install
bun run docker:up
```
*Este comando inicializa toda a stack automaticamente (bancos, serviços, gateway, auth e mensageria).*

---

## 📌 Observações de Arquitetura

* Serviços independentes e completamente desacoplados.
* Comunicação assíncrona orientada a eventos.
* Consistência eventual aplicada estritamente no fluxo financeiro.
* Frontend consome a API unificada via gateway + conexão WebSocket estável.
