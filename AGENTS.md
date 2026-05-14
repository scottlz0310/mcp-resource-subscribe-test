# AGENTS.md

## Project Purpose

This repository is a **compatibility lab** for MCP `resources/subscribe`. It contains two things:

1. **A reference MCP Streamable HTTP server** — exposes one resource (`test://review/status`) that updates after a client subscribes, then sends `notifications/resources/updated`.
2. **A reusable subscription probe client** (`src/probeClient.ts`) — exercises the full subscribe→notify→re-read flow against any running server.

The goal is reproducible testing of whether CLI AI agents (Codex, Gemini, Claude Code, Crush, etc.) correctly handle MCP resource subscriptions.

## Essential Commands

```bash
npm ci                         # install dependencies
npm run build                  # tsc compile → dist/
npm test                       # vitest run (tests against in-process server, no Docker needed)
npm run typecheck              # tsc --noEmit (no output files)
npm run dev                    # run server locally via tsx (no build step)
npm run probe:subscribe -- --url http://127.0.0.1:8089/mcp  # run probe client against live server
docker compose up --build      # start reference server on port 8089
```

**Node requirement**: `>=24.15.0` (enforced in `package.json` engines and CI).

## Architecture

```
src/
  index.ts         — entrypoint: reads env config, starts Express HTTP server
  config.ts        — TestConfig type + configFromEnv() (all env vars parsed here)
  httpServer.ts    — createMcpHttpApp(): wires McpServer → Express via StreamableHTTP transport
  mcpServer.ts     — createProbeServer(): registers MCP handlers (list/read/subscribe/unsubscribe + tool)
  resourceState.ts — ReviewStatusStore (in-memory, version 1→2), renderReviewStatus(), constants
  probeClient.ts   — runSubscribeProbe(): SDK client that exercises the full flow, returns typed result
  logger.ts        — createConsoleLogger(config): returns a LogSink filtered by logLevel
  cli.ts           — stub CLI entry (not yet implemented; exits with error unless --help)

scripts/
  subscribe-client.ts  — thin wrapper that calls runSubscribeProbe() with CLI args, prints result

test/
  mcp-resource-subscribe.test.ts  — vitest integration tests (spin up in-process server on port 0)
```

## Key Patterns

**Dual-role repo**: `src/index.ts` (server) and `src/probeClient.ts` (client) are both first-class. The server is for Docker/manual testing; the probe client is what's exported for npm publish.

**`createProbeServer()` triggers the update only on subscribe**: `scheduleUpdate()` is called inside the `SubscribeRequestSchema` handler. The timer fires after `updateDelaySeconds` seconds. In tests, this is set to `0.05` so tests run fast — don't use the production default (5s) in tests.

**Subscription set is in-memory and per-server instance**: `subscriptions` is a `Set<string>` local to each `createProbeServer()` call. Each test creates a new server instance on port 0.

**`McpServer` vs `McpServer.server`**: The SDK's `McpServer` (high-level) wraps a low-level `server` property. `registerTool()` is on the high-level wrapper; `setRequestHandler()` for resources/subscribe/unsubscribe must be called on `.server` directly because the high-level API doesn't expose them. `sendResourceUpdated()` is also on `.server`.

**Imports use `.js` extensions**: TypeScript is compiled with `moduleResolution: NodeNext`. All relative imports must end in `.js` even in `.ts` source files.

**`tsconfig.json` `rootDir` is `.`**: Both `src/`, `test/`, and `scripts/` are compiled to `dist/` preserving the same subdirectory structure. `dist/src/cli.js` is the published bin entry.

## Configuration (Environment Variables)

| Variable | Default | Notes |
|---|---|---|
| `MCP_TEST_PORT` | `8089` | |
| `MCP_TEST_PATH` | `/mcp` | Adds a second path alias; `/mcp` is always registered |
| `MCP_TEST_UPDATE_DELAY_SECONDS` | `5` | Set to `0` or `0.05` for fast local testing |
| `MCP_TEST_INITIAL_STATUS` | `pending` | |
| `MCP_TEST_UPDATED_STATUS` | `reviewed` | |
| `MCP_TEST_SEND_LIST_CHANGED` | `false` | Also sends `notifications/resources/list_changed` after update |
| `MCP_TEST_LOG_LEVEL` | `debug` | `debug`/`info`/`warn`/`error`/`silent` |

## Testing

Tests are integration tests — they spin up a real HTTP server on port `0` (OS-assigned) using `createMcpHttpApp()` and connect a real MCP SDK client. No mocking of transport or protocol. Tests use `afterEach` to close all servers and clients.

The `updateDelaySeconds: 0.05` in test config is critical — the notification timeout in tests is 2000ms so there's headroom, but production delay (5s) would make tests slow.

Three test cases:
1. `get_review_status` tool is listed and callable
2. Full subscribe→notify→re-read flow with log assertion
3. `runSubscribeProbe()` probe client exercised end-to-end

## Results and Docs

- `results/compatibility-matrix.md` — tracks which agents pass/fail the subscription probe
- `results/` — session logs from individual agent testing runs
- `docs/verification-guide.md` — repeatable manual verification procedure
- `docs/skills/pr-review-subscribe/SKILL.md` — Codex skill template for PR review via subscribe

## CLI Status

`src/cli.ts` (the published bin) is a **stub** — it prints an error and exits 1. The actual probe functionality is in `scripts/subscribe-client.ts`, run via `npm run probe:subscribe`. Full CLI implementation is pending (tracked in GitHub Issues).
