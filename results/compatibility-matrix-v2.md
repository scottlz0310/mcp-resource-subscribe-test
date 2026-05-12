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
Level scoring is resource-method based: tool discovery and `[tools/call]` entries can confirm the tool surface, but do not raise a client above Level 1 unless `resources/*` methods appear.

## Summary

Clients re-verified in Round 2 are those that reached only Level 1 in Round 1 due to the resource-only server issue.  
Clients that already reached Level 3 in Round 1 (Gemini CLI, Claude Code, Goose) are not expected to change and are omitted unless regression is suspected.

| Client | Round 1 Level | Round 2 Level | `tools/list` OK | `resources/list` | `resources/subscribe` | Change |
| --- | --- | --- | --- | --- | --- | --- |
| Codex CLI | 1 | 3 native / 7 SDK workaround | YES | YES | NO native / YES SDK workaround | tools/list and resources/list/read now work natively; shell-driven SDK client can subscribe |
| OpenCode | 1 | 1 | YES | NO | NO | Tool path now works; resource subscription not accessed by agent |
| Crush | 1 | 3 | YES | YES | NO | tools/list and resources/list/read now work; subscribe not reached |
| GitHub Copilot CLI | 1 | 1 | YES | NO | NO | Tool path now works; resource subscription not accessed by agent |

## Codex CLI

- Date: 2026-05-08
- Version: codex-cli 0.129.0
- OS / shell: Microsoft Windows NT 10.0.26200.0 / PowerShell 7.6.1
- MCP configuration: Streamable HTTP direct endpoint (`subscribe-probe` -> `http://127.0.0.1:8089/mcp`)
- Prompt used:

```text
Check the available MCP resources.
Read test://review/status.
If the server supports resource subscription, subscribe to test://review/status and wait for the resource update notification.
After the notification, read test://review/status again.
Report the final status, version, and message.

Fallback tool check:
Use the get_review_status tool to read the current review status.
```

- Round 1 Level: `1 - connected`
- Round 2 Result level: `3 - read initial resource`
- Does `tools/list` succeed now? YES -- `get_review_status` is available and callable
- Does it call `resources/list`? YES
- Does it call `resources/read`? YES -- `version=1`
- Does it call `resources/subscribe`? NO
- Does it receive or react to `notifications/resources/updated`? NO
- Does it re-read after update? NO
- Does the final answer mention `status: reviewed` and `version: 2`? NO (resource/tool result remains `status: pending`, `version: 1` from fresh server)
- Server log excerpt:

```text
[initialize] client connected
[resources/list] requested
[resources/read] uri=test://review/status version=1
[tools/call] get_review_status
```

- Notes: Codex CLI exposes the Round 2 MCP tool to the agent and can access MCP resource discovery/read through `list_mcp_resources` and `read_mcp_resource`. It does not expose a `resources/subscribe` primitive to the agent, so the subscription notification path cannot be triggered from the agent interface. This improves the observed level from Round 1 (Level 1 -> Level 3), but full subscription behavior remains unverified.

### Codex CLI SDK workaround follow-up

- Date: 2026-05-12
- Version: codex-cli 0.130.0
- OS / shell: Microsoft Windows NT 10.0.26200.0 / PowerShell 7.6.1
- MCP server: Docker Compose (`mcp-resource-subscribe-test`), published as `0.0.0.0:8089->8089/tcp`
- MCP endpoint: `http://127.0.0.1:8089/mcp`
- Related session log: [`results/codex-desktop-session-2026-05-12.md`](codex-desktop-session-2026-05-12.md)
- Result level through Codex native MCP surface: `3 - read initial resource`
- Result level through agent-driven SDK client workaround: `7 - agent context updated`
- Does native Codex expose a first-class `resources/subscribe` operation to the agent? NO
- Can the Codex agent reach `resources/subscribe` by running a separate Node.js MCP SDK client through shell? YES
- Does the SDK client receive `notifications/resources/updated`? YES
- Does the SDK client re-read after the notification? YES -- `version=2`
- Does the final SDK output mention `status: reviewed` and `version: 2`? YES
- SDK output excerpt:

```text
capabilities {"subscribe":true,"listChanged":true}
resource-found true
initial
status: pending
version: 1
message: Waiting for simulated review result.
notification test://review/status
final
status: reviewed
version: 2
message: Simulated review result is now available.
```

- Notes: This follow-up does not change the native Codex MCP surface result. Codex CLI still exposes `list_mcp_resources` and `read_mcp_resource`, but not an agent-visible generic `resources/subscribe` primitive. The Level 7 result is an effective capability of a Codex agent with shell, Node.js, local package, and localhost network access: the agent can start an independent MCP protocol client and call `resources/subscribe` directly. Therefore the compatibility result should be reported as `Codex CLI native MCP surface: Level 3` and `Codex CLI agent-driven SDK workaround: Level 7`, not as a single unconditional `Codex CLI: Level 7`.

## OpenCode

- Date: 2026-05-08
- Version: 1.14.41
- OS / shell: Microsoft Windows NT 10.0.26200.0 / PowerShell 7.6.1
- MCP configuration: Streamable HTTP direct endpoint (`subscribe-probe` -> `http://127.0.0.1:8089/mcp`)
- Prompt used:

```text
Use the get_review_status tool to read the current review status. Report the final status, version, and message only. Do not use shell commands and do not edit files.
```

- Round 1 Level: `1 - connected` (root cause: `tools/list` -> "Failed to get tools")
- Round 2 Result level: `1 - connected`
- Does `tools/list` succeed now? YES -- `get_review_status` is available and callable
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

- Notes: OpenCode v1.14.41 exposes the Round 2 MCP server to the agent through the tool surface, and the added `get_review_status` tool resolves the Round 1 `tools/list` blocker. The agent did not access raw MCP resource methods (`resources/list`, `resources/read`, or `resources/subscribe`), so resource subscription behavior remains unverified through the agent interface. Because result levels track resource-method progress, this tool-only activity remains Level 1. Verification used a fresh server run followed by `opencode run` against the direct endpoint.

## Crush

- Date: 2026-05-08
- Version: v0.66.0
- OS / shell: Windows 11 / mvdan/sh (Crush built-in shell)
- MCP configuration: Streamable HTTP direct endpoint (`subscribe-probe` -> `http://127.0.0.1:8089/mcp`)
- Prompt used:

```text
Use the get_review_status tool to read the current review status.
Then check the available MCP resources, read test://review/status, and report the final status, version, and message.
```

- Round 1 Level: `1 - connected` (root cause: `tools/list` -> "Method not found")
- Round 2 Result level: `3 - read initial resource`
- Does `tools/list` succeed now? YES -- `get_review_status` is available and callable
- Does it call `resources/list`? YES -- via `list_mcp_resources` tool
- Does it call `resources/read`? YES -- via `read_mcp_resource` tool (`version=1`)
- Does it call `resources/subscribe`? NO
- Does it receive or react to `notifications/resources/updated`? NO
- Does it re-read after update? NO
- Does the final answer mention `status: reviewed` and `version: 2`? NO (resource returns `status: pending`, `version: 1` from fresh server)
- Server log excerpt:

```text
[initialize] client connected
[tools/call] get_review_status
[resources/list] requested
[resources/read] uri=test://review/status version=1
```

- Notes: Crush v0.66.0 exposes MCP tool and resource methods to the agent as first-class built-in tools (`mcp_<server>_<tool>` for tools, `list_mcp_resources` / `read_mcp_resource` for resources). The Round 1 blocker (`tools/list` -> "Method not found") is fully resolved: both the tool surface and the resource surface are now accessible to the agent. Crush does not expose a `resources/subscribe` primitive to the agent, so subscription behavior cannot be triggered through the agent interface. This is a significant improvement over Round 1 (Level 1 -> Level 3).

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

- Notes: Copilot CLI (v1.0.43) is a tool-centric agent. It calls `tools/list` internally to discover available tools, then uses `tools/call` to execute them. It does NOT natively call `resources/list`, `resources/read`, or `resources/subscribe` -- these are lower-level MCP protocol methods not exposed through the agent interface. The Round 1 blocker (no tool surface) is resolved: `get_review_status` tool is now available and callable. However, the resource subscription feature remains inaccessible to the agent. The Level stays at 1 because tool-only calls do not advance the resource-method rubric. Verification method: Node.js MCP SDK simulation mimicking copilot-cli tool-only behavior, confirmed against server logs.
