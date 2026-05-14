# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-05-14

### Changed

- `pr-review-subscribe` skill: probe commands updated from `npm run probe:subscribe` / local `node dist/` invocations to `pnpm dlx mcp-resource-subscriber` (published package)
- `pnpm dlx` established as primary invocation, `npx` as fallback when pnpm is unavailable — consistently across README, SKILL.md, and `tool-template.md`
- Version-pinning note clarified: "default to latest published version"; added `@<version>` pinning example for reproducible probes

### Fixed

- README Install section: reordered to show `pnpm dlx` first, `npx` as fallback
- `tool-template.md` Local SDK Wrapper Pattern: added `pnpm dlx` primary and `npx` fallback commands alongside the existing `node` local-build option

## [0.1.0] - 2026-05-14

### Added

- CLI probe (`mcp-resource-subscriber`) for MCP `resources/subscribe` — connects to any MCP Streamable HTTP server, subscribes to a resource, receives `notifications/resources/updated`, and re-reads the updated content
- Structured machine-parseable output: `route`, `subscribed`, `notification-received`, `unsubscribed`, `error-code`, `phase-summary`
- `--auth-token` / `MCP_PROBE_AUTH_TOKEN` for Bearer token auth (e.g. `copilot-review-mcp`)
- `--skip-resource-list-check` / `MCP_PROBE_SKIP_LIST_CHECK` for servers with dynamic resources not in `resources/list`
- `--timeout-ms` / `MCP_PROBE_TIMEOUT_MS` configurable notification wait (default: 15 s)
- `--version` / `--help` flags
- Bundled reference MCP test server (`test://review/status`) for reproducible client compatibility testing
- GitHub Actions publish workflow: triggers on `v*` tag push; runs build → typecheck → test → `npm publish`
- `workflow_dispatch` manual trigger for dry-run verification
- E2E test suite (`test/e2e.test.ts`) verifying Level 3 subscribe→notify→re-read flow against a live MCP server
- Compatibility matrix covering Codex CLI, Gemini CLI, OpenCode, GitHub Copilot CLI, Claude Code, Goose, Crush

### Notes

- `src/server/mcpServer.ts` and `src/client/probeClient.ts` contain hardcoded `"0.1.0"` client/server version strings. These must be updated manually on future version bumps until dynamic `package.json` reading is added.

[0.1.1]: https://github.com/scottlz0310/mcp-resource-subscriber/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/scottlz0310/mcp-resource-subscriber/releases/tag/v0.1.0
