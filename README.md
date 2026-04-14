# Workplanr

**Planning as code, for humans and agents.**

[![npm version](https://img.shields.io/npm/v/workplanr.svg)](https://www.npmjs.com/package/workplanr)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

Workplanr turns a "work plan" from text in someone's head into an active programmatic interface. The plan lives in `.planr/plan.json` inside your repository — versioned with git, branch-aware, accessible to AI agents through MCP.

Agents **remember** what they did last session, **know why** each task matters, and **never repeat** the same mistakes.

## The Problem

Working with AI coding agents (Claude Code, Aider, Cursor) today is like managing a fast but amnesiac worker:

- **Session amnesia** — the agent loses the plan when the session closes
- **No context carry-over** — next session starts from zero, no memory of decisions made
- **Repeating mistakes** — same pitfalls every time, no persistent learning
- **Context drift** — the agent starts fixing things that were not asked
- **Control gap** — no real-time visibility into progress on complex tasks

## How Workplanr Solves It

```
Human creates plan  -->  .planr/plan.json (in git)
                              |
                         MCP Server
                        /          \
                  AI Agent        TUI Dashboard
              (reads tasks,     (human monitors
               reports progress)  and approves)
```

The plan file changes with branches, resolves conflicts like code, and can be inspected by both human and machine.

## Quick Start

### Install

```bash
npm install -g workplanr
```

Requires Node.js >= 22.

### Initialize in your project

```bash
cd your-project
wp init --name "My Project" --goal "Ship v2.0 by June"
```

This creates:

```
.planr/
  plan.json         # work plan (commit to git)
  dod/              # Definition of Done checklists
  config.json       # local config (gitignored)
```

### Add tasks

```bash
wp add "Implement JWT authentication" --priority high
wp add "Write unit tests" --priority medium --depends-on task-001
wp add "Deploy to staging" --priority critical
```

For richer context, include the **why** and **acceptance criteria**:

```bash
wp add "Implement JWT authentication" \
  --priority high \
  --why "Stateless auth lets us scale horizontally" \
  --accept "Login endpoint works;Token refresh works;Tests cover expired tokens"
```

Agents read `why` and `acceptance_criteria` on every `get_next_task` — no more guessing what "done" means.

### View your plan

```bash
wp list
```

```
  branch: feature/auth                        3 tasks

  [○] task-001   Implement JWT auth         ░░░░░░░░░░░░   0%  high
  [○] task-002   Write unit tests           ░░░░░░░░░░░░   0%  medium
  [○] task-003   Deploy to staging          ░░░░░░░░░░░░   0%  critical

  ● in_progress  ○ pending  ✓ done  ✗ blocked
```

```bash
wp status
```

```
  My Project
  Ship v2.0 by June

  Branch: feature/auth
  Tasks:  3 total
    ✓ 0 done
    ● 0 in progress
    ✗ 0 blocked
    ○ 3 pending
```

### Complete a task

```bash
wp done task-001
```

This runs the Definition of Done checklist first. If any required check fails, completion is blocked:

```
  ✗ DoD validation failed for task-001

  ✓ `npm test` — all tests pass
  ✗ `npm run lint` — no lint errors
    Error: 3 lint violations found
```

### Open the TUI dashboard

```bash
wp tui
```

Live-updating terminal dashboard showing all tasks, progress, and pending proposals.

---

## Connect to AI Agents

This is the core feature. Workplanr exposes an MCP server that any AI agent can use.

### Claude Code

Add to your project's `.claude/mcp.json`:

```json
{
  "mcpServers": {
    "workplanr": {
      "command": "wp",
      "args": ["serve"]
    }
  }
}
```

Then add to `AGENTS.md` or `CLAUDE.md`:

```markdown
## Workplanr

You have access to the workplanr MCP server. Follow these rules:

### Session lifecycle
1. At session start, call `start_session` — save the returned `session_id`, read the `previous_session` summary to understand what was done last time.
2. Read all `lessons` from `get_plan` response before starting work — don't repeat known mistakes.
3. At session end, call `end_session` with a summary of what was accomplished.

### Task execution
4. Always call `get_next_task` before starting work — never pick tasks arbitrarily.
5. Read the task's `why` and `acceptance_criteria` — they define success.
6. After every significant step, call `update_task_progress` with the current progress %.
7. When you make a non-trivial architectural or implementation decision, call `log_decision` so it persists for future sessions.
8. If a task feels too large (>4 hours), call `propose_subtasks` and wait for human approval.

### Completion & learning
9. Before calling `complete_task`, always call `validate_dod` first and fix any failures.
10. Never call `complete_task` with a failing DoD — fix the code instead.
11. If you learn something non-obvious about this project (a convention, a gotcha, a tool preference), call `report_lesson` so future sessions benefit.
```

### Aider

Add to `.aider.conf.yml`:

```yaml
mcp_servers:
  - name: workplanr
    command: wp
    args: [serve]
```

### Start MCP server manually

```bash
wp serve              # stdio (default, for MCP clients)
wp serve --port 3333  # TCP
```

---

## MCP Tools Reference

The MCP server exposes 10 tools across three groups:

**Plan & tasks:** `get_plan`, `get_next_task`, `update_task_progress`, `validate_dod`, `complete_task`, `propose_subtasks`

**Session journal (v0.2+):** `start_session`, `end_session`, `log_decision`

**Lessons learned (v0.2+):** `report_lesson`

### `get_plan`

Returns the full plan with summary statistics. Use at session start for orientation.

**Input:** none

**Returns:** project info, all tasks, proposals, current branch, summary counts

### `get_next_task`

Returns the highest-priority task ready to work on (status = pending, all dependencies satisfied).

**Input:** none

**Returns:** task object or null, project goal as context

**Priority order:** critical > high > medium > low

### `update_task_progress`

Agent reports progress on a task. Appends to immutable log.

**Input:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `task_id` | string | yes | Task ID |
| `progress` | number | yes | 0-100 |
| `status` | string | no | Status override (cannot be "done") |
| `notes` | string | no | Human-readable update |

### `validate_dod`

Reads `.planr/dod/<task-id>.md` and runs shell commands found in Required items.

**Input:** `task_id`

**Returns:** pass/fail result with details for each checklist item

### `complete_task`

Marks a task as done. **Blocked if DoD has unfulfilled Required items.**

**Input:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `task_id` | string | yes | Task ID |
| `summary` | string | yes | One sentence: what was done |

### `propose_subtasks`

Agent suggests breaking a task into subtasks. Sets parent task to blocked. Creates a proposal awaiting human approval.

**Input:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `task_id` | string | yes | Parent task ID |
| `reason` | string | yes | Why decomposition is needed |
| `subtasks` | array | yes | Array of {title, description, estimated_complexity} |

Approve or reject proposals:

```bash
wp propose approve prop-001
wp propose reject prop-001
```

### `start_session` (v0.2+)

Begin a new agent session. Returns the previous session's journal for context continuity.

**Input:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `agent` | string | no | Agent identifier (default: `claude-code`) |

**Returns:** `session_id`, `previous_session` (summary + decisions + blockers), `plan_summary`

### `end_session` (v0.2+)

Close the session with a summary. Writes `ended_at` to the journal.

**Input:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `session_id` | string | yes | From `start_session` |
| `summary` | string | yes | What was done this session |

### `log_decision` (v0.2+)

Record an architectural or implementation decision with rationale. Persists across sessions.

**Input:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `session_id` | string | yes | Current session |
| `decision` | string | yes | Decision + why (e.g. "Chose JWT over sessions because stateless scaling") |
| `files_changed` | string[] | no | Files affected |

### `report_lesson` (v0.2+)

Save a lesson learned. Returned in every `get_plan` response for future sessions.

**Input:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `context` | string | yes | What happened — the situation or mistake |
| `lesson` | string | yes | What to do differently next time |
| `tags` | string[] | no | Categorization tags |

---

## Definition of Done (DoD)

Each task can have a DoD checklist at `.planr/dod/<task-id>.md`:

```markdown
# DoD: task-001 — Implement JWT authentication

## Required
- [ ] `npm test` — all tests pass
- [ ] `npm run lint` — no lint errors
- [ ] `tsc --noEmit` — no type errors
- [ ] Auth module has JSDoc comments

## Optional
- [ ] Test coverage >= 80%
- [ ] CHANGELOG.md updated
```

**How it works:**

- Lines under `## Required` are blocking — task cannot be completed unless all pass
- Lines under `## Optional` are tracked but non-blocking
- Commands in backticks are executed automatically (60s timeout)
- Items without commands are manual — must be marked `[x]` by hand
- `[x]` items are treated as already passed

---

## Branch-Aware Plans

`plan.json` lives in git. When you switch branches, the plan switches too:

```bash
git checkout feature/payments
wp list  # shows the plan for feature/payments
```

Each feature branch has its own plan. The main branch plan tracks integration tasks.

---

## Persistent Memory (v0.2+)

This is what makes Workplanr radically different from session-bound todo lists.

### Session Journal

Every agent session is recorded in `.planr/journal/<session-id>.json`:

- what tasks were worked on
- what decisions were made and why
- what files were changed
- blockers encountered
- session summary

**At session start**, the agent calls `start_session` and receives:
- Its new `session_id`
- The **previous** session's journal (decisions, blockers, summary)
- Plan summary

This means every new session starts with full context from the previous one. No more re-explaining what happened yesterday.

```bash
wp journal   # Show last session journal
```

### Lessons Learned

Project-specific knowledge that shouldn't be lost:

```bash
wp lesson add "Use vitest not jest" \
  --context "Jest fails with ESM in this project" \
  --tags "testing,tooling"

wp lesson list
```

Agents see all lessons in `get_plan` response — they won't make the same mistakes twice.

### Task Context

Each task can carry:

- **`why`** — business rationale (read by agents to understand purpose)
- **`acceptance_criteria`** — explicit definition of success
- **DoD checklist** — executable validation (see below)

Together, an agent knows *what* to build, *why* to build it, and *when* it's done.

---

## CLI Reference

```
wp init                          Initialize .planr/ in current directory
  --name <name>                  Project name (default: directory name)
  --goal <goal>                  Project goal

wp add <title>                   Add a new task
  --priority <p>                 low | medium | high | critical (default: medium)
  --depends-on <ids>             Comma-separated task IDs
  --dod <path>                   Path to custom DoD template
  --why <reason>                 Business context — why this task matters    (v0.2+)
  --accept <criteria>            Acceptance criteria, semicolon-separated    (v0.2+)

wp list                          List all tasks
  --status <status>              Filter: pending, in_progress, blocked, done

wp done <id>                     Mark task as done (runs DoD first)

wp status                        Print plan summary

wp propose approve <id>          Approve a subtask proposal
wp propose reject <id>           Reject a subtask proposal

wp journal                       Show last session journal                   (v0.2+)

wp lesson list                   List all lessons learned                    (v0.2+)
wp lesson add <lesson>           Add a lesson                                (v0.2+)
  --context <ctx>                What happened (required)
  --tags <tags>                  Comma-separated tags

wp serve                         Start MCP server (stdio)
  --port <n>                     Start MCP server (TCP)

wp tui                           Open TUI dashboard
```

---

## Configuration

`.planr/config.json` (gitignored, local settings):

```json
{
  "mcp": {
    "transport": "stdio"
  },
  "dod": {
    "require_dod_file": false,
    "block_on_missing_manual": true,
    "command_timeout_ms": 60000
  },
  "tui": {
    "poll_interval_ms": 1000,
    "theme": "default"
  }
}
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `WORKPLANR_PLAN` | Override path to plan.json |
| `WORKPLANR_LOG` | Log level: error, warn, info, debug |
| `NO_COLOR` | Disable terminal colors |

---

## How It All Fits Together

```
1.  Human runs `wp init` + `wp add --why --accept` to create a plan
2.  Human starts AI agent session (e.g. Claude Code)
3.  Agent calls `start_session` → receives previous journal + lessons
4.  Agent calls `get_plan` → sees all tasks, including the `why` for each
5.  Agent calls `get_next_task` → gets highest priority ready task
6.  Agent works, calls `update_task_progress` periodically
7.  Agent calls `log_decision` when making non-trivial choices
8.  If task is too big, agent calls `propose_subtasks` → human approves in TUI/CLI
9.  Agent calls `validate_dod` → fixes any failures
10. Agent calls `complete_task` → task marked done
11. Agent calls `report_lesson` if it learned something project-specific
12. Agent calls `get_next_task` → picks up next task
13. Agent calls `end_session` with summary when session ends
14. Human monitors everything in `wp tui` or `wp list`
```

The plan file + journal + lessons are the single source of truth. No cloud, no sync, no database — just JSON files in your git repo.

---

## Tech Stack

- **TypeScript** — single language across all modules
- **Node.js >= 22** — native ESM, built-in type stripping
- **@modelcontextprotocol/sdk** — official MCP server SDK
- **zod** — schema validation
- **commander** — CLI argument parsing (zero dependencies)
- **ink + React** — TUI dashboard
- **chalk** — terminal colors

4 production dependencies. Zero cloud dependencies.

---

## License

MIT
