# mcp-resource-subscribe-test

Minimal MCP Streamable HTTP server for testing whether MCP clients correctly handle `resources/subscribe` and `notifications/resources/updated`.

This repository is meant to be a reproducible issue / compatibility lab for CLI AI agents such as Codex CLI, Gemini CLI, OpenCode, GitHub Copilot CLI, Claude Code, Goose, and Crush.

## Purpose

The server exposes one fixed MCP resource:

```text
test://review/status
```

Initial content:

```text
status: pending
version: 1
message: Waiting for simulated review result.
```

After a client subscribes to the resource, the server waits for `MCP_TEST_UPDATE_DELAY_SECONDS`, changes the resource, and sends:

```json
{
  "method": "notifications/resources/updated",
  "params": {
    "uri": "test://review/status"
  }
}
```

Updated content:

```text
status: reviewed
version: 2
message: Simulated review result is now available.
```

## Why Resources/Subscribe Instead Of Tools/Call

`tools/call` is useful for explicit actions, but many agent workflows depend on context that changes after the original request. Polling every source is noisy and client-specific. MCP resource subscriptions give clients a protocol-level way to learn that a known context object changed and should be re-read.

Examples where subscription behavior matters:

- Copilot review result
- PR review thread
- CI status
- Codecov comment
- GitHub issue discussion
- local build/test result

This test server focuses on whether the client notices a resource update, re-runs `resources/read`, and reflects the new content in the agent loop / model context.

## Start

```bash
docker compose up --build
```

MCP URL:

```text
http://127.0.0.1:8089/mcp
```

For local development:

```bash
npm install
npm run dev
```

## Configuration

| Environment variable | Default |
| --- | --- |
| `MCP_TEST_PORT` | `8089` |
| `MCP_TEST_UPDATE_DELAY_SECONDS` | `5` |
| `MCP_TEST_INITIAL_STATUS` | `pending` |
| `MCP_TEST_UPDATED_STATUS` | `reviewed` |
| `MCP_TEST_SEND_LIST_CHANGED` | `false` |
| `MCP_TEST_LOG_LEVEL` | `debug` |

If `MCP_TEST_SEND_LIST_CHANGED=true`, the server also sends `notifications/resources/list_changed` after the simulated update.

## Expected Client Behavior

An ideal MCP client should follow this flow:

```text
initialize
  ↓
resources/list
  ↓
resources/read test://review/status
  ↓
resources/subscribe test://review/status
  ↓
receive notifications/resources/updated
  ↓
resources/read test://review/status again
  ↓
reflect updated status: reviewed in agent context
```

## Server Capabilities

The initialize response advertises:

```json
{
  "resources": {
    "subscribe": true,
    "listChanged": true
  }
}
```

## Implemented MCP Messages

- `initialize`
- `resources/list`
- `resources/read`
- `resources/subscribe`
- `resources/unsubscribe`
- `notifications/resources/updated`
- `notifications/resources/list_changed` when `MCP_TEST_SEND_LIST_CHANGED=true`

No tools are implemented.

## Logs

The server logs each important message so client behavior can be checked objectively:

```text
[initialize] client connected
[resources/list] requested
[resources/read] uri=test://review/status version=1
[resources/subscribe] uri=test://review/status
[resource/update] uri=test://review/status version=2
[notification/send] notifications/resources/updated uri=test://review/status
[resources/read] uri=test://review/status version=2
[resources/unsubscribe] uri=test://review/status
```

The key evidence for resource subscription support is:

```text
resources/subscribe was received
notification was sent
resources/read was received again after the notification
```

## Tests

```bash
npm test
```

The test suite verifies:

- `resources/list` returns `test://review/status`
- initial `resources/read` returns version 1
- `resources/subscribe` triggers an internal update to version 2
- `notifications/resources/updated` is received
- updated `resources/read` returns version 2

## Client Compatibility Notes

### Codex CLI

- MCP connection:
- Does it call `resources/list`?
- Does it call `resources/read`?
- Does it call `resources/subscribe`?
- Does it receive `notifications/resources/updated`?
- Does it re-read the resource after update?
- Notes:

### Gemini CLI

- MCP connection:
- Does it call `resources/list`?
- Does it call `resources/read`?
- Does it call `resources/subscribe`?
- Does it receive `notifications/resources/updated`?
- Does it re-read the resource after update?
- Notes:

### OpenCode

- MCP connection:
- Does it call `resources/list`?
- Does it call `resources/read`?
- Does it call `resources/subscribe`?
- Does it receive `notifications/resources/updated`?
- Does it re-read the resource after update?
- Notes:

### GitHub Copilot CLI

- MCP connection:
- Does it call `resources/list`?
- Does it call `resources/read`?
- Does it call `resources/subscribe`?
- Does it receive `notifications/resources/updated`?
- Does it re-read the resource after update?
- Notes:

### Claude Code

- MCP connection:
- Does it call `resources/list`?
- Does it call `resources/read`?
- Does it call `resources/subscribe`?
- Does it receive `notifications/resources/updated`?
- Does it re-read the resource after update?
- Notes:

### Goose

- MCP connection:
- Does it call `resources/list`?
- Does it call `resources/read`?
- Does it call `resources/subscribe`?
- Does it receive `notifications/resources/updated`?
- Does it re-read the resource after update?
- Notes:

### Crush

- MCP connection:
- Does it call `resources/list`?
- Does it call `resources/read`?
- Does it call `resources/subscribe`?
- Does it receive `notifications/resources/updated`?
- Does it re-read the resource after update?
- Notes:
