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
| GitHub Copilot CLI | 1 | - | - | - | - | - |

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

- Round 1 Level: `1 - connected` (root cause: `tools/list` → "Failed to get tools")
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

- Round 1 Level: `1 - connected` (root cause: `tools/list` → "Method not found")
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

- Date:
- Version:
- OS / shell:
- MCP configuration: Streamable HTTP via mcp-gateway (`auth=none` route required)
- Prompt used:

```text
TODO
```

- Round 1 Level: `1 - connected` (root cause: resource-only server; no tool surface for agent)
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
