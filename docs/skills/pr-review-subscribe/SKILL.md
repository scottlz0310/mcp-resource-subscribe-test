---
name: pr-review-subscribe
description: Copilot PR review completion through MCP resource subscription, then autonomous review-thread handling. Use immediately after creating a PR, requesting Copilot review, or when the user asks to prove/use resource subscription for the PR review cycle. The main route MUST use resources/subscribe on the review watch resource; status polling is fallback only. Never merge autonomously.
---

# pr-review-subscribe

Run the PR review cycle with MCP resource subscription as the primary completion signal.

This skill is derived from `pr-review-cycle`, but changes Phase 1:

```text
Primary:   start watch -> subscribe to watch resource -> wait for notifications/resources/updated -> read resource
Fallback:  start watch -> poll get_copilot_review_watch_status
```

If server/tool names differ, load `references/tool-template.md` and map placeholders before starting.

## Required Surfaces

| Placeholder | Purpose |
| --- | --- |
| `{CRM}` | Copilot review MCP tools: review status, request, watch start/cancel, threads, replies, cycle status |
| `{GH}` | GitHub issue/PR comment tools |
| `{RSRC}` | MCP resource operations: list/read/subscribe/unsubscribe or an SDK/protocol client wrapper |

Minimum required operations:

- `{CRM}:get_copilot_review_status`
- `{CRM}:request_copilot_review`
- `{CRM}:start_copilot_review_watch`
- `{CRM}:cancel_copilot_review_watch`
- `{CRM}:get_review_threads`
- `{CRM}:reply_and_resolve_review_thread`
- `{CRM}:get_pr_review_cycle_status`
- `{GH}:add_issue_comment`
- `{RSRC}:resources/subscribe` equivalent for the watch resource
- `{RSRC}:resources/read` equivalent for the watch resource
- `{RSRC}:resources/unsubscribe` equivalent for the watch resource

Fallback-only operation:

- `{CRM}:get_copilot_review_watch_status`

## Flow

```text
Phase 0 -> Phase 1S -> Phase 2 -> Phase 3 -> Phase 4 -> Phase 5 -> Phase 6
                 ^                                      | WAIT / REQUEST_REREVIEW
                 |                                      v
                 +--------------------------------------+
                         READY_TO_MERGE -> Phase 6.5 -> Phase 6.6 -> Phase 7 -> Phase 8
```

## Phase 0: Snapshot

1. Determine `owner`, `repo`, and `pr`.
2. Call `{CRM}:get_copilot_review_status`.
3. If `status = COMPLETED` or `BLOCKED`, go to Phase 2.
4. If `status = NOT_REQUESTED`, call `{CRM}:request_copilot_review`, then go to Phase 1S.
5. If `status = PENDING` or `IN_PROGRESS`, go to Phase 1S.

## Phase 1S: Subscribe And Wait

Record the Phase 1S start time. Reset the 15-minute timeout every time Phase 6 loops back here.

### 1S-A: Start Watch

Call `{CRM}:start_copilot_review_watch`.

Record:

- `watch_id`
- `resource_uri`
- `recommended_next_action`
- `next_poll_seconds`

If the response lacks `resource_uri`, construct it from the configured template in `references/tool-template.md`. If no reliable resource URI can be obtained, use fallback polling.

### 1S-B: Subscribe To Watch Resource

Primary route:

1. Use `{RSRC}:resources/subscribe` on `resource_uri`.
2. Wait for `notifications/resources/updated` for that same `resource_uri`.
3. After every update notification, call `{RSRC}:resources/read` for `resource_uri`.
4. Parse the read content and follow `recommended_next_action`.

Expected terminal update:

```text
review_status=COMPLETED or BLOCKED
recommended_next_action=READ_REVIEW_THREADS
```

Action table:

| recommended_next_action | Next step |
| --- | --- |
| `READ_REVIEW_THREADS` | Phase 2 |
| `POLL_AFTER` | Keep the subscription open and wait for the next update |
| `CHECK_FAILURE` | Report the error and stop |
| `REAUTH_AND_START_NEW_WATCH` | Ask the user to re-authenticate and stop |
| `START_NEW_WATCH` | Unsubscribe if needed, then return to Phase 1S-A |

Do not poll while subscription is healthy. A periodic read without a notification is allowed only as a liveness check after a long quiet period, not as the main signal.

### 1S-C: Fallback Polling

Use fallback polling only if one of these is true:

- The client exposes no `resources/subscribe` route.
- Subscribing fails with an unsupported-method or transport error.
- No `resource_uri` is available.
- The subscription times out or stops receiving updates while the watch is still active.

Fallback loop:

1. Wait `next_poll_seconds` from the latest response.
2. Call `{CRM}:get_copilot_review_watch_status`.
3. Follow its `recommended_next_action` using the same action table.

Label the final report clearly as `subscription route` or `fallback polling route`.

### 1S-D: Timeout

If Phase 1S exceeds 15 minutes:

1. Call `{CRM}:cancel_copilot_review_watch`.
2. Add a PR comment through `{GH}:add_issue_comment`:

```text
Copilot review completion wait timed out after 15 minutes. Please resume manually.
```

3. Report the timeout to the user and stop.

### 1S-E: Subscription Cleanup

If `{RSRC}:resources/subscribe` succeeded, call `{RSRC}:resources/unsubscribe`
for `resource_uri` before leaving Phase 1S.

Unsubscribe before:

- entering Phase 2
- switching to fallback polling
- returning to Phase 1S-A with `START_NEW_WATCH`
- stopping due to `CHECK_FAILURE`
- stopping due to timeout
- stopping due to user cancellation

If unsubscribe fails, report it, but continue the review cycle if the watch has
already reached a terminal state.

## Phase 2: Read Threads

Call `{CRM}:get_review_threads`.

If there are 0 unresolved threads, go to Phase 6.5.

## Phase 3: Classify And Decide

Classify each unresolved comment:

| Class | Criteria |
| --- | --- |
| `blocking` | Runtime failure, data corruption, security risk, broken behavior, inconsistent published record |
| `non-blocking` | Useful quality, logging, test, privacy, or consistency improvement |
| `suggestion` | Naming, structure, style, or maintainability suggestion |

Decide `accept` or `reject` autonomously. Reject only with a concrete reason such as out of scope, already handled, invalid premise, or intentionally deferred.

Show this table before editing:

```text
| # | Thread ID | Class | Decision | Summary | Reject reason |
|---|-----------|-------|----------|---------|---------------|
```

Choose `fix_type` for Phase 6:

| fix_type | Use for |
| --- | --- |
| `logic` | Code behavior or tests |
| `spec_change` | Public docs, API, workflow, or compatibility record semantics |
| `trivial` | Typo, formatting, wording-only, or table-shape fix |
| `none` | No accepted changes |

## Phase 4: Fix And Commit

1. Run `git status --short --branch`.
2. Fix only accepted items.
3. Keep changes atomic by review thread unless a shared edit is clearly cleaner.
4. Run relevant build/tests/checks.
5. Commit once after the cycle's fixes using Conventional Commits.
6. Push without force unless the user explicitly asks otherwise.

Do not revert unrelated user changes.

## Phase 5: Reply And Resolve

For every reviewed thread, call `{CRM}:reply_and_resolve_review_thread`.

- Fixed: mention the commit and concrete fix.
- Rejected: explain the reason.
- Always set `resolve=true` unless the tool or platform prevents resolution.

## Phase 6: Cycle Status

Call `{CRM}:get_pr_review_cycle_status`:

```json
{
  "owner": "<owner>",
  "repo": "<repo>",
  "pr": 42,
  "cycles_done": 0,
  "max_cycles": 0,
  "fix_type": "<fix_type>"
}
```

> `max_cycles: 0` means "use the server-side default".
> It must not be interpreted as unlimited retries.
> The default is controlled by `MAX_REVIEW_CYCLES` and is 3 if unset.

Follow `recommended_action`:

| Action | Next step |
| --- | --- |
| `WAIT` | Increment `cycles_done`, return to Phase 1S |
| `REPLY_RESOLVE` | Return to Phase 2 |
| `REQUEST_REREVIEW` | Call `{CRM}:request_copilot_review`, increment `cycles_done`, return to Phase 1S |
| `READY_TO_MERGE` | Phase 6.5 |
| `ESCALATE` | Report state and stop |

## Phase 6.5: CI

1. Run `gh pr checks <pr>`.
2. If all checks pass, continue to Phase 6.6.
3. If checks fail, inspect failed logs with `gh run view <run-id> --log-failed`.
4. If the failure is fixable, add it to the accepted work and return to Phase 4.
5. If it is not fixable, report and stop.

If `gh` is unavailable, unauthenticated, or cannot access the PR checks,
use the available `{GH}` / GitHub MCP server route to inspect check runs or PR status.

If neither route can verify CI, report `CI: unknown` and stop before Phase 7
instead of claiming readiness.

## Phase 6.6: Coverage

Check Codecov or similar PR comments if present.

- If testable coverage gaps are introduced, return to Phase 4 with `fix_type=logic`.
- If no relevant coverage signal exists or there is no issue, continue to Phase 7.

## Phase 7: Summary Comment

Post a PR comment through `{GH}:add_issue_comment`:

```markdown
## Review Cycle Summary

### Route
- Completion wait: subscription route | fallback polling route
- Watch resource: <resource_uri or N/A>
- Watch ID: <watch_id or N/A>
- Notification received: yes | no | N/A
- Post-notification read: terminal | non-terminal | N/A
- Unsubscribed: yes | no | N/A

### Changes
- ...

### Decisions
- accept: N
- reject: M

### Remaining Items
- None | ...

### Verification
- CI: ...
- Unresolved threads: ...
- Cycle status: ...
```

## Phase 8: Merge Gate

Never merge autonomously.

Before any user-requested merge, verify:

- CI all success
- unresolved review threads = 0
- all threads replied
- no unresolved blocking item

If any condition is missing, report it instead of merging.

## Reporting Requirements

In the final response, include:

- PR URL
- whether the subscription route was used or fallback polling was used
- `resource_uri` and `watch_id` when available
- commits pushed
- CI status
- unresolved thread count
- subscription evidence:
  - whether `{RSRC}:resources/subscribe` was actually used
  - whether `notifications/resources/updated` was received
  - whether `{RSRC}:resources/read` after notification reached a terminal watch state
  - whether `{RSRC}:resources/unsubscribe` completed
- merge readiness
