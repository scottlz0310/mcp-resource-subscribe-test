# MCP Resource Subscription Compatibility Matrix

Endpoint under test:

```text
http://127.0.0.1:8089/mcp
```

Resource under test:

```text
test://review/status
```

Result levels are defined in [`docs/verification-guide.md`](../docs/verification-guide.md#result-levels).

## Summary

| Client | Version | OS | Transport | `resources/list` | `resources/read` v1 | `resources/subscribe` | update notification path | re-read v2 | agent context v2 | Level | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Codex CLI | 0.129.0 | Windows / PowerShell 7 | Streamable HTTP | No | No | No | No | No | No | 1 | Connects and initializes, but no resource methods reached the server. |
| Gemini CLI | TODO | TODO | Streamable HTTP | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO |
| OpenCode | TODO | TODO | Streamable HTTP | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO |
| GitHub Copilot CLI | TODO | TODO | Streamable HTTP | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO |
| Claude Code | TODO | TODO | Streamable HTTP | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO |
| Goose | TODO | TODO | Streamable HTTP | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO |
| Crush | TODO | TODO | Streamable HTTP | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO |

## Codex CLI

- Date: 2026-05-08 10:20 +09:00
- Version: `codex-cli 0.129.0`
- OS / shell: Windows / PowerShell 7
- MCP configuration: Streamable HTTP server configured as `subscribe_probe` with `mcp_servers.subscribe_probe.url="http://127.0.0.1:8089/mcp"`.
- Prompt used:

```text
The configured MCP server name is subscribe_probe.
Use the subscribe_probe MCP server.
List MCP resources from subscribe_probe.
Read the resource URI test://review/status from subscribe_probe.
If subscribe_probe supports resources/subscribe, subscribe to test://review/status, wait up to 10 seconds for notifications/resources/updated, then read test://review/status again.
Report the final status, version, and message.
Do not edit files or run shell commands.
```

- Result level: `1 - connected`
- Does it call `resources/list`? No. The server log did not show `[resources/list] requested`.
- Does it call `resources/read`? No.
- Does it call `resources/subscribe`? No.
- Does it receive or react to `notifications/resources/updated`? No. The server never received `resources/subscribe`, so no resource update notification was sent.
- Does it re-read after update? No.
- Does the final answer mention `status: reviewed` and `version: 2`? No.
- Server log excerpt:

```text
MCP resource subscribe test server listening on http://127.0.0.1:8089/mcp
[initialize] client connected
[initialize] client connected
[initialize] client connected
```

- Codex CLI command used for the explicit isolated run:

```bash
codex exec --ignore-user-config -s read-only -m gpt-5.4-mini \
  -c 'approval_policy="never"' \
  -c 'model_reasoning_effort="low"' \
  -c 'mcp_servers.subscribe_probe.url="http://127.0.0.1:8089/mcp"'
```

- Observed Codex output from the isolated run:

```text
resources/list failed: failed to get client: MCP startup failed: Mcp error: -32601: Method not found
resources/read failed: failed to get client: MCP startup failed: Mcp error: -32601: Method not found
```

- A follow-up run with the normal user config plus the same `subscribe_probe` override also initialized the server, but Codex reported that the server was not exposed through the available tool surface.

## Gemini CLI

- Date:
- Version:
- OS / shell:
- MCP configuration:
- Prompt used:
- Result level:
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
- Result level:
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
- MCP configuration:
- Prompt used:
- Result level:
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

## Claude Code

- Date:
- Version:
- OS / shell:
- MCP configuration:
- Prompt used:
- Result level:
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

## Goose

- Date:
- Version:
- OS / shell:
- MCP configuration:
- Prompt used:
- Result level:
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
- Result level:
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
