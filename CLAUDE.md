# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

OT Notifier — multi-server Open Tibia guild/character monitor. Scrapes guild pages, detects level up/down and deaths, and sends Discord webhook notifications. Backend is Node/TypeScript (ESM); `web/` is a separate Vite+React dashboard SPA.

## Commands

Package manager is `pnpm` (both `package-lock.json` and `pnpm-lock.yaml` exist in the repo — pnpm is the one actually used day to day; a `pnpm-workspace.yaml` at root also treats `web/` as a workspace member).

Root (`/`):
- `pnpm dev` — run the process-per-server orchestrator with hot reload (`tsx watch`). Primary way to manually exercise monitoring changes.
- `pnpm start` — same orchestrator, no watch (production).
- `pnpm api` — run the Fastify REST API (`src/api/server.ts`) that the `web/` dashboard talks to; also serves the Bull-Board queue UI at `/admin/queues`.
- `pnpm manage` — interactive CLI (`src/cli/index.ts`) for adding/configuring/testing servers and webhooks.
- `pnpm test` — Vitest. Run a single file: `pnpm test src/path/to/file.test.ts`. Run a single test: `pnpm test -t "test name"`.
- `pnpm type-check` — `tsc --noEmit`.
- `pnpm lint` / `pnpm format` — ESLint / Prettier over `src/**/*.ts`.

`web/` (separate app, own `node_modules`):
- `pnpm --dir web dev` — Vite dev server (proxies `/api` to `http://localhost:3001`, i.e. `pnpm api` must be running).
- `pnpm --dir web build` — `tsc -b && vite build`.
- `pnpm --dir web lint` — oxlint.

Docker: `docker compose up --build -d` runs the orchestrator; `docker compose exec ot_notifier npm run manage` for CLI inside the container. Server state/config are Docker volumes (`storage_data`, `states_data`) so they survive recreation — `servers.json` is bind-mounted from the repo instead.

## Architecture

### Two parallel execution paths (important, not obvious from any single file)

The codebase currently has **two independent schedulers that can both run the same check logic**, mid-migration from one to the other:

1. **Legacy: one child process per server.** `src/application/orchestrator.ts` reads `servers.json`, spawns a detached `tsx` child process per enabled server via `processManager.ts` (`startServerProcess`), each running `serverWorker.ts` → `serverLoopHandler.ts` in an infinite loop with its own interval/backoff. Crash recovery restarts the process after 5s (`processManager.ts`).
2. **New: BullMQ queue + worker.** The *same* `orchestrator.ts` also calls `syncAllActiveServersToQueue()` (`src/infrastructure/queue/serverQueueManager.ts`) to register a repeatable BullMQ job per server, and starts an in-process `Worker` (`src/application/workers/queueWorker.ts`) that consumes jobs with configurable concurrency (`CONCURRENCY` env var). The Fastify API (`src/api/server.ts`) also pushes manual "check now" jobs onto this same queue and exposes Bull-Board at `/admin/queues`.

Both paths ultimately call `processServerCheck(serverId)` in `src/application/workers/handlers/serverCheckHandler.ts` — that function is the actual check logic (sync guild members, fetch character pages, detect level/death changes, send webhook, persist state). If Redis is unavailable, queue setup fails and logs a warning but the orchestrator continues — the legacy per-process path is what keeps working in that case. When touching scheduling/interval/retry behavior, check both `serverLoopHandler.ts` (legacy) and `serverQueueManager.ts`/`queueWorker.ts` (queue-based) since they duplicate this concern with different mechanisms.

### Storage layout

- `src/infrastructure/storage/servers.json` — server registry (id, url, name, enabled, webhookUrl). Source of truth for which servers exist.
- `src/infrastructure/storage/data/{serverId}.json` — one file per server: guild config, per-character tracked state (`last_level`, `up_streak`, `last_milestone`, `last_death`), advanced settings (`concurrency`, `requestDelay`, `checkInterval`, `batchSize`, custom headers). Read/written through `serverConfigManager.ts`, which mtime-caches parsed configs in memory and uses `proper-lockfile` for write safety (both `servers.json` sync and per-server JSON writes go through this). Never write these files directly — always go through `loadServerConfig`/`saveServerConfig`/`updateServerCharacters` etc. so the cache and `servers.json` stay consistent.
- `data/.server-states.json` — ephemeral runtime state (current processing/verifying progress, last result, next check time) shared across processes via `serverStateManager.ts` (`atomicUpdate`, also lock-protected). This is what the terminal UI (`blockRenderer.ts` via `renderManager.ts`) and the dashboard poll to show live status; it's not monitoring config, just transient status.

### Webhook resolution order

`webhookUtils.ts` → `getWebhookUrl(serverConfig)` resolves in this order: exact `WEBHOOK_URL_{SERVERID}` env var → grouped-prefix env var (progressively shorter underscore-joined prefixes of the server id, e.g. `global_retro_pvp` also matches `WEBHOOK_URL_GLOBAL`) → `guild.webhookUrl` in the server's JSON → global `WEBHOOK_URL` → global `DISCORD_WEBHOOK_URL`.

### Scraping layer

`src/infrastructure/scraping/` handles fetching and parsing OT server pages, which vary in HTML structure across different OT engines/sites:
- `http/` — axios client with retry/backoff (`axiosClient.ts`, `axios-retry`), Bottleneck-based rate limiting (`bottleneckLimiter.ts`), cookie jar support for session-based servers (`cookieManager.ts`).
- `scrapers/` — one strategy per known HTML layout (`queryParamsScraper.ts`, `pathBasedScraper.ts`, `nestedTableFormScraper.ts`, `charactersPathScraper.ts`); `scraper.ts` orchestrates trying them.
- `parsers/` — Cheerio-based extraction once HTML is fetched (`characterParser.ts`, `guildParser.ts`, `deathParser.ts`).
- `utils/cloudflareDetector.ts` / `pageHealthDetector.ts` — detect anti-bot challenges vs. genuinely-down servers, which `serverCheckHandler.ts` uses to decide whether to mark a server `isWorking: false` (stop scheduling checks) or just warn and retry.
- `playwrightManager.ts` (+ `playwrightLoader.ts`) — Playwright fallback for pages that need a real browser (e.g. to get past Cloudflare); loaded lazily since it's a heavy dependency (`cloakbrowser` on top of `playwright`).

### Error/status classification

`serverCheckHandler.ts` classifies failures into anti-bot (Cloudflare-style — keep `isWorking: true`, just warn) vs. server-down (ECONNREFUSED, timeout, "doesn't exist", etc. — set `isWorking: false` and deregister the BullMQ schedule) vs. transient. This classification drives both the terminal/dashboard warning message shown and whether the server keeps getting scheduled at all — check `isAntiBotError`/`isServerDownError` before changing retry/backoff behavior.

### `web/` dashboard

Separate Vite + React 19 + Tailwind 4 SPA (own `package.json`, not part of the root TS project/paths). Talks to the Fastify API in `src/api/server.ts` via `web/src/services/api.ts`; components under `web/src/components/` are one-per-file (`ServerCard`, `ServerModal`, `GlobalSettingsView`, `LiveFeed`, etc.). `web/src/mock/initialData.ts` provides fixture data, useful when iterating on UI without the API running.

## Code style (enforced by `.cursorrules`, applies to `src/**`)

These are followed throughout the existing codebase and should be matched in new code:
- Arrow functions only, explicit return types on exported functions, no `any` (use `unknown`).
- Return-early / guard clauses over nested `if`; prefer object spread over mutation (see `serverConfigManager.ts`, `handleConfigJson.ts` for the established pattern of `{ ...config, field: newValue }`).
- No traditional `for` loops — use `map`/`filter`/`reduce`/`forEach`/`for...of` (`for...of` is used for sequential `await`).
- Async/await with try/catch, never raw `.then()`.
- Files should stay reasonably small and single-purpose (orchestrators ~150-200 lines, parsers/scrapers split one-per-HTML-strategy) — this is why `scraping/` has a `scrapers/` + `parsers/` split rather than one big scraper file.

## TypeScript path aliases

`@application/*`, `@domain/*`, `@infrastructure/*`, `@shared/*`, `@scripts/*` map to `src/*` (see `tsconfig.json` `baseUrl`/`paths` and matching aliases in `vitest.config.ts`). Use these instead of relative `../../..` imports in `src/`. Note `src/api/server.ts` uses relative `.js`-suffixed imports instead of the aliases — an inconsistency to be aware of, not a pattern to copy for new files elsewhere in `src/`.

## Tests

Vitest, `src/**/__tests__/*.test.ts` colocated with the code they cover, plus `src/__tests__/integration/` for cross-module flows (scraper flow, webhook flow). Tests mock fs/axios/webhooks — no real network or filesystem dependencies expected.
