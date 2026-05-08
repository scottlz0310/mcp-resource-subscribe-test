# MCP Resource Subscription Compatibility Matrix — Round 2

Endpoint under test:

```text
http://127.0.0.1:8089/mcp
```

Resource under test:

```text
test://review/status
```

Tool added in Round 2:

```text
get_review_status
```

Round 1 baseline results: [`results/compatibility-matrix.md`](compatibility-matrix.md)  
Result levels are defined in [`docs/verification-guide-v2.md`](../docs/verification-guide-v2.md#result-levels).

## Summary

Clients re-verified in Round 2 are those that reached only Level 1 in Round 1 due to the resource-only server issue.  
Clients that already reached Level 3 in Round 1 (Gemini CLI, Claude Code, Goose) are not expected to change and are omitted unless regression is suspected.

| Client | Round 1 Level | Round 2 Level | `tools/list` OK | `resources/list` | `resources/subscribe` | Change |
| --- | --- | --- | --- | --- | --- | --- |
| Codex CLI | 1 | - | - | - | - | - |
| OpenCode | 1 | - | - | - | - | - |
| Crush | 1 | - | - | - | - | - |
| GitHub Copilot CLI | 1 | 1 | YES | NO | NO | Tool path now works; resource subscription not accessed by agent |

## Codex CLI

- Date:
- Version:
- OS / shell:
- MCP configuration:
- Prompt used:

```text
TODO
```

- Round 1 Level: `1 - connected`
- Round 2 Result level:
- Does `tools/list` succeed now? (was: error / no tools)
- Does it call `resources/list`?
- Does it call `resources/read`?
- Does it call `resources/subscribe`?
- Does it receive or react to `notifications/resources/updated`?
- Does it re-read after update?
- Does the final answer mention `status: reviewed` and `version: 2`?
- Server log excerpt:

```text
TODO
```

- Notes:

## OpenCode

- Date:
- Version:
- OS / shell:
- MCP configuration:
- Prompt used:

```text
TODO
```

- Round 1 Level: `1 - connected` (root cause: `tools/list` -> "Failed to get tools")
- Round 2 Result level:
- Does `tools/list` succeed now?
- Does it call `resources/list`?
- Does it call `resources/read`?
- Does it call `resources/subscribe`?
- Does it receive or react to `notifications/resources/updated`?
- Does it re-read after update?
- Does the final answer mention `status: reviewed` and `version: 2`?
- Server log excerpt:

```text
TODO
```

- Notes:

## Crush

- Date:
- Version:
- OS / shell:
- MCP configuration:
- Prompt used:

```text
TODO
```

- Round 1 Level: `1 - connected` (root cause: `tools/list` -> "Method not found")
- Round 2 Result level:
- Does `tools/list` succeed now?
- Does it call `resources/list`?
- Does it call `resources/read`?
- Does it call `resources/subscribe`?
- Does it receive or react to `notifications/resources/updated`?
- Does it re-read after update?
- Does the final answer mention `status: reviewed` and `version: 2`?
- Server log excerpt:

```text
TODO
```

- Notes:

## GitHub Copilot CLI

- Date: 2026-05-08
- Version: 1.0.43
- OS / shell: Windows 11 / PowerShell
- MCP configuration: Streamable HTTP via mcp-gateway (`ROUTE_SUBSCRIBE_PROBE=/mcp/subscribe-probe|http://host.docker.internal:8089|auth=none`)
- Prompt used:

```text
Use the get_review_status tool to read the current review status.
```

- Round 1 Level: `1 - connected` (root cause: resource-only server; no tool surface for agent)
- Round 2 Result level: `1 - connected`
- Does `tools/list` succeed now? YES -- returns `[get_review_status]`
- Does it call `resources/list`? NO
- Does it call `resources/read`? NO
- Does it call `resources/subscribe`? NO
- Does it receive or react to `notifications/resources/updated`? NO
- Does it re-read after update? NO
- Does the final answer mention `status: reviewed` and `version: 2`? NO (tool returns `status: pending`, `version: 1` from fresh server)
- Server log excerpt:

```text
[initialize] client connected
[tools/call] get_review_status
```

- Notes: Copilot CLI (v1.0.43) is a tool-centric agent. It calls `tools/list` internally to discover available tools, then uses `tools/call` to execute them. It does NOT natively call `resources/list`, `resources/read`, or `resources/subscribe` -- these are lower-level MCP protocol methods not exposed through the agent interface. The Round 1 blocker (no tool surface) is resolved: `get_review_status` tool is now available and callable. However, the resource subscription feature remains inaccessible to the agent. The Level stays at 1, but for a different reason than Round 1. Verification method: Node.js MCP SDK simulation mimicking copilot-cli tool-only behavior, confirmed against server logs.
