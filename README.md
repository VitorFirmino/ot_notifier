<h1 align="center">
  ⚔️ OT Notifier
</h1>

<p align="center">
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-22-339933?style=flat-square&logo=node.js&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white" />
  <img alt="Redis" src="https://img.shields.io/badge/Redis-BullMQ-DC382D?style=flat-square&logo=redis&logoColor=white" />
  <img alt="Discord" src="https://img.shields.io/badge/Discord-Webhooks-5865F2?style=flat-square&logo=discord&logoColor=white" />
  <img alt="Playwright" src="https://img.shields.io/badge/Playwright-E2E-2EAD33?style=flat-square&logo=playwright&logoColor=white" />
  <img alt="Docker" src="https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white" />
  <img alt="License" src="https://img.shields.io/badge/License-ISC-blue?style=flat-square" />
</p>

<p align="center">
  Monitor multi-servidor de guilds e personagens para <strong>Open Tibia</strong>, com painel web multiusuário e notificações em tempo real via Discord.
</p>

<p align="center">
  <img alt="OT Notifier preview" src=".github/image.png" width="900" />
</p>

---

## 📚 Sobre o projeto

OT Notifier acompanha membros de guilds em múltiplos servidores de Open Tibia, detecta mudanças de nível (up/down) e mortes de personagens, e envia notificações automáticas via webhook do Discord. Além do monitoramento em background, o projeto inclui um **painel web** (`web/`) onde qualquer pessoa pode se cadastrar, gerenciar seus próprios servidores e acompanhar tudo em tempo real, e uma **landing page** (`landing/`) de apresentação em [otnotifier.com.br](https://otnotifier.com.br).

| Funcionalidade | Detalhe |
|----------------|---------|
| **Monitoramento de guild** | Scraping periódico dos membros da guild, com auto-descoberta de guildas a partir da URL do site |
| **Level up / down** | Detecta subidas e descidas de nível com streak |
| **Mortes** | Notifica mortes com matadores e nível perdido |
| **Anti-bot** | Detecção de Cloudflare e páginas fora do ar, com backoff dedicado |
| **Login em sites protegidos** | Suporta servidores OT que exigem login, com reuso automático de sessão |
| **Painel web multiusuário** | Cadastro/login (email+senha ou Google), cada usuário gerencia seus próprios servidores |
| **Fila com BullMQ + Redis** | Agendamento e reprocessamento de verificações via fila, com painel Bull-Board |
| **Rate limiting** | Controle de requisições por servidor (Bottleneck) |
| **CLI interativa** | Gerenciamento completo de servidores via terminal |
| **Docker** | Stack completa (orchestrator, API, painel, Postgres, Redis) com volumes persistentes |

---

## 🏗️ Arquitetura (visão geral)

O projeto é composto por três partes que rodam de forma independente:

- **Backend** (`src/`) — o orchestrator (`pnpm dev`/`pnpm start`) roda o monitoramento em background; a API Fastify (`pnpm api`) expõe REST para o painel web, cuida da autenticação (Better Auth) e do painel de filas Bull-Board. Há dois mecanismos de agendamento coexistindo durante a migração de um para o outro: processos filhos por servidor (legado) e uma fila BullMQ (Redis) — ambos chamam a mesma lógica de verificação.
- **Painel web** (`web/`) — SPA em React + Vite, consome a API acima, autenticação própria por usuário (cada um só vê e gerencia seus servidores).
- **Landing page** (`landing/`) — site de apresentação, também em React + Vite, servido na raiz do domínio.

Em produção, tudo fica atrás de um único nginx: a landing na raiz, o painel em `/app`, e a API em um subdomínio (`api.*`). Veja `docker-compose.yml` e `web/nginx.conf` para os detalhes de roteamento.

---

## 💻 Pré-requisitos

- [Node.js](https://nodejs.org/) v22+
- [pnpm](https://pnpm.io/) (gerenciador de pacotes usado pelo projeto)
- [Docker](https://www.docker.com/) — recomendado, sobe Postgres e Redis automaticamente
- Sem Docker: PostgreSQL 16+ e Redis 7+ rodando localmente

---

## 🚀 Como executar (desenvolvimento local)

```bash
# Clone o repositório
$ git clone https://github.com/VitorFirmino/ot_notifier.git
$ cd ot_notifier

# Instale as dependências do backend
$ pnpm install

# Configure as variáveis de ambiente (veja a seção Configuração abaixo)
$ cp .env.example .env
```

O painel web multiusuário precisa de Postgres (dados + autenticação) e, opcionalmente, Redis (fila de jobs — se indisponível, o sistema cai automaticamente para o agendamento legado por processo). A forma mais simples de ter os dois é subir só esses serviços via Docker:

```bash
$ docker compose up -d postgres redis
```

Depois, rode as migrations (nessa ordem — a segunda depende de tabelas criadas pela primeira):

```bash
$ pnpm db:auth:migrate     # tabelas do Better Auth (user, session, account, verification)
$ pnpm db:migration:run    # tabelas do TypeORM (ex: user_server_subscription)
```

### Gerenciar servidores via CLI

```bash
$ pnpm manage
```

Menu interativo para adicionar, configurar e testar servidores e webhooks.

### Iniciar o monitoramento

```bash
# Produção
$ pnpm start

# Desenvolvimento (com hot-reload)
$ pnpm dev
```

### Rodar a API (necessária para o painel web)

```bash
$ pnpm api
```

Sobe a API Fastify em `http://localhost:3001`, incluindo o painel de filas Bull-Board em `/admin/queues` (restrito aos emails em `ADMIN_EMAILS`).

---

## 🖥️ Painel web (`web/`)

SPA separada, com seu próprio `package.json` e lockfile — **não** faz parte do workspace pnpm da raiz.

```bash
$ pnpm --dir web install --ignore-workspace
$ pnpm --dir web dev
```

O Vite já sobe com proxy de `/api` para `http://localhost:3001`, então rode `pnpm api` em paralelo. Acesse `http://localhost:5173/app/` e cadastre uma conta — o cadastro é aberto para qualquer pessoa; servidores legados sem dono são reivindicados na primeira edição.

---

## 🌐 Landing page (`landing/`)

Também uma SPA independente, com seu próprio `package.json` e lockfile.

```bash
$ pnpm --dir landing install --ignore-workspace
$ pnpm --dir landing dev
```

---

## 🐳 Docker

Sobe a stack completa (orchestrator, API, painel web, Postgres e Redis):

```bash
# Subir com Docker Compose
$ docker compose up --build -d

# Gerenciar servidores dentro do container
$ docker compose exec ot_notifier npm run manage

# Ver logs
$ docker compose logs -f
```

O painel fica disponível em `http://localhost:8080/app` e a API por trás do mesmo nginx em `/api`. Os dados dos servidores e o estado do Postgres/Redis são persistidos em volumes Docker — ao remover e recriar os containers, tudo é mantido.

Para produção, existe um `docker-compose.prod.yml` complementar (rede externa `proxy_net`, sem publicar portas de Postgres/Redis no host) — veja `.github/workflows/ci.yml` para o fluxo de deploy automático.

---

## ⚙️ Configuração

Veja `.env.example` para a lista completa e comentada de variáveis. Os grupos principais são:

### Banco de dados e autenticação (obrigatório para o painel multiusuário)

```env
DATABASE_URL=postgresql://ot_notifier:ot_notifier@localhost:5434/ot_notifier
BETTER_AUTH_SECRET=       # gere com: openssl rand -base64 32
BETTER_AUTH_URL=          # onde a API está servida
DASHBOARD_URL=            # origem do painel (CORS + trustedOrigins)
RESEND_API_KEY=           # resend.com — obrigatória, envia email de verificação/recuperação de senha
```

`BETTER_AUTH_URL`/`DASHBOARD_URL` precisam ser a origem que o navegador realmente acessa — um valor incorreto quebra os links de verificação de email e redefinição de senha enviados por email. O valor certo depende de como você está rodando:

| Fluxo | `BETTER_AUTH_URL` | `DASHBOARD_URL` |
|-------|--------------------|-------------------|
| `docker compose up` (padrão, nginx único) | `http://localhost:8080` | `http://localhost:8080` |
| `pnpm api` + `pnpm --dir web dev` (Vite isolado) | `http://localhost:3001` | `http://localhost:5173` |

Opcionais: login com Google (`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`), `ADMIN_EMAILS` (acesso ao Bull-Board), `CREDENTIALS_ENCRYPTION_KEY` (só necessária se algum servidor cadastrado exigir login no site de origem).

### servers.json

Adicione servidores manualmente ou via CLI/painel web:

```json
[
  {
    "id": "meu_servidor",
    "name": "Meu Servidor",
    "url": "https://meuservidor.com/guilds/MinhaGuild",
    "enabled": true,
    "webhookUrl": "https://discord.com/api/webhooks/..."
  }
]
```

### Webhooks via variável de ambiente

Em vez de salvar o webhook no JSON, você pode defini-lo no `.env`.
O padrão é `WEBHOOK_URL_` + o `id` do servidor em **MAIÚSCULAS**:

```env
# servers.json → "id": "meu_servidor"
WEBHOOK_URL_MEU_SERVIDOR=https://discord.com/api/webhooks/ID/TOKEN

# servers.json → "id": "global_retro_pvp"
WEBHOOK_URL_GLOBAL_RETRO_PVP=https://discord.com/api/webhooks/ID/TOKEN

# Prefixo agrupado: aplica para todos os servidores cujo id começa com "global"
# Ex: global_retro_pvp, global_hardcore, global_optional — todos usam o mesmo webhook
WEBHOOK_URL_GLOBAL=https://discord.com/api/webhooks/ID/TOKEN
```

> O sistema tenta primeiro o match exato, depois o prefixo mais longo, depois o webhook salvo no JSON, e por último o `WEBHOOK_URL`/`DISCORD_WEBHOOK_URL` global.

### Configurações por servidor (`data/{id}.json`)

Cada servidor tem um arquivo de configuração individual com opções avançadas:

| Opção | Descrição | Padrão |
|-------|-----------|--------|
| `concurrency` | Requisições simultâneas | `3` |
| `requestDelay` | Delay entre requisições (ms) | `1000` |
| `checkInterval` | Intervalo de verificação (ms) | `120000` |
| `batchSize` | Tamanho do lote de personagens | `10` |

---

## 📁 Estrutura do Projeto

```
src/
├── api/
│   ├── server.ts             # API Fastify (REST para o painel + Bull-Board)
│   └── routes/                # Endpoints (servidores, descoberta, auth de site)
├── application/
│   ├── orchestrator.ts        # Spawna processos por servidor + sincroniza fila BullMQ
│   ├── processManager.ts      # Gerencia processos filhos (legado)
│   └── workers/
│       ├── serverWorker.ts    # Loop de verificação por processo (legado)
│       ├── queueWorker.ts     # Worker que consome jobs da fila BullMQ
│       └── handlers/          # Lógica principal de verificação (compartilhada pelos dois caminhos)
├── cli/
│   └── index.ts               # CLI interativa (gerenciamento de servidores)
├── infrastructure/
│   ├── auth/                  # Better Auth (config, criptografia de credenciais de site)
│   ├── email/                 # Envio de email transacional (Resend)
│   ├── queue/                 # Configuração da fila BullMQ
│   ├── scraping/
│   │   ├── http/               # Axios client, rate limiter, Bottleneck, cookie jar
│   │   ├── scrapers/            # Uma estratégia por layout de HTML conhecido
│   │   ├── parsers/             # Cheerio parsers (personagens, guild, mortes)
│   │   └── utils/                # Detecção de Cloudflare/página fora do ar, Playwright fallback
│   └── storage/
│       ├── servers.json        # Lista de servidores monitorados
│       ├── data/                # Configuração individual por servidor
│       └── serverConfigManager.ts
└── shared/
    ├── errors/                # Hierarquia de erros tipados
    ├── types/                 # Tipos globais (character, server, webhook)
    └── utils/                 # Logger, cache, retry, timeout, blockRenderer

web/        # Painel React (SPA independente, própria autenticação por usuário)
landing/    # Landing page React (SPA independente)
```

---

## 🔧 Scripts

### Raiz (`/`)

| Comando | Descrição |
|---------|-----------|
| `pnpm dev` | Orchestrator com hot-reload |
| `pnpm start` | Orchestrator em produção |
| `pnpm api` | API Fastify (necessária para o painel web) |
| `pnpm manage` | Abre a CLI interativa |
| `pnpm db:auth:migrate` | Migrations do Better Auth (rodar primeiro) |
| `pnpm db:migration:run` | Migrations do TypeORM (rodar depois) |
| `pnpm type-check` | Verificação de tipos TypeScript |
| `pnpm lint` | Lint com ESLint |
| `pnpm format` | Formata o código com Prettier |
| `pnpm test` | Testes com Vitest |

### `web/` e `landing/`

| Comando | Descrição |
|---------|-----------|
| `pnpm --dir web dev` / `pnpm --dir landing dev` | Servidor de desenvolvimento (Vite) |
| `pnpm --dir web build` / `pnpm --dir landing build` | Build de produção |
| `pnpm --dir web lint` / `pnpm --dir landing lint` | Lint com oxlint |
| `pnpm --dir web test:e2e` | Testes end-to-end com Playwright |

> Ao instalar dependências em `web/` ou `landing/`, use sempre `--ignore-workspace` (`pnpm --dir web install --ignore-workspace`) — sem essa flag, o pnpm resolve contra o workspace da raiz e não instala nada.

---

## 🧪 Testes

- **Unitários/integração** — Vitest, mocka filesystem/axios/webhooks, sem dependência de rede real: `pnpm test`
- **End-to-end** — Playwright, sobe API + painel isolados e valida fluxos completos (login, cadastro de servidor, auto-descoberta, reset de senha, etc.): `pnpm --dir web test:e2e`

---

## ⚙️ CI/CD

O pipeline (`.github/workflows/ci.yml`) roda a cada push/PR: type-check + lint + testes do backend, lint + build do painel e da landing, suite E2E completa, build de imagem Docker e auditoria de segurança das dependências de produção. Em push para `main`, com todos os checks verdes, a API/orchestrator e o painel são reimplantados automaticamente via SSH na VPS.

---

## 🛠️ Tecnologias

**Backend**
- [Node.js 22](https://nodejs.org/) + [TypeScript 5](https://www.typescriptlang.org/) — executado direto via [tsx](https://github.com/privatenumber/tsx), sem etapa de build
- [Fastify](https://fastify.io/) — API REST consumida pelo painel
- [Better Auth](https://www.better-auth.com/) — autenticação multiusuário (email/senha + Google)
- [BullMQ](https://docs.bullmq.io/) + [Redis](https://redis.io/) — fila de verificações, com [Bull-Board](https://github.com/felixmosh/bull-board) como painel de administração
- [TypeORM](https://typeorm.io/) + [PostgreSQL](https://www.postgresql.org/) — persistência de usuários/servidores
- [Axios](https://axios-http.com/) + [Cheerio](https://cheerio.js.org/) — HTTP e scraping HTML
- [Playwright](https://playwright.dev/) — scraping de páginas com Cloudflare, e testes E2E
- [Bottleneck](https://github.com/SGrondin/bottleneck) — rate limiting robusto
- [Resend](https://resend.com/) — envio de email transacional
- [Vitest](https://vitest.dev/) — testes unitários

**Painel web e landing**
- [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/)
- [TanStack Query](https://tanstack.com/query) — data fetching do painel
- [GSAP](https://gsap.com/) — animações da landing page

**Infra**
- [Docker](https://www.docker.com/) — containerização de toda a stack
- [GitHub Actions](https://github.com/features/actions) — CI/CD com deploy automático

---

## 📝 Licença

Este projeto está sob a licença ISC.

---

Feito por [Vitor Firmino](https://github.com/VitorFirmino)
