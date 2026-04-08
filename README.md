# Workplanr

**Planning as code, for humans and agents.**

Workplanr turns a "work plan" from text in someone's head into an active programmatic interface. The plan lives in `.planr/plan.json` inside your repository — versioned with git, branch-aware, accessible to AI agents through MCP.

## The Problem

Working with AI coding agents (Claude Code, Aider, Cursor) today is like managing a fast but amnesiac worker:

- **Amnesia** — the agent loses the plan when the session closes
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

1. At the start of every session, call `get_plan` to orient yourself.
2. Always call `get_next_task` before starting work — never pick tasks arbitrarily.
3. After every significant step, call `update_task_progress` with current progress %.
4. If a task feels too large, call `propose_subtasks` and wait for approval.
5. Before calling `complete_task`, always call `validate_dod` first and fix any failures.
6. Never call `complete_task` with a failing DoD — fix the code instead.
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

The MCP server exposes 6 tools:

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

## CLI Reference

```
wp init                          Initialize .planr/ in current directory
  --name <name>                  Project name (default: directory name)
  --goal <goal>                  Project goal

wp add <title>                   Add a new task
  --priority <p>                 low | medium | high | critical (default: medium)
  --depends-on <ids>             Comma-separated task IDs
  --dod <path>                   Path to custom DoD template

wp list                          List all tasks
  --status <status>              Filter: pending, in_progress, blocked, done

wp done <id>                     Mark task as done (runs DoD first)

wp status                        Print plan summary

wp propose approve <id>          Approve a subtask proposal
wp propose reject <id>           Reject a subtask proposal

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
1. Human runs `wp init` + `wp add` to create a plan
2. Human starts AI agent session (e.g. Claude Code)
3. Agent calls `get_plan` → sees all tasks
4. Agent calls `get_next_task` → gets highest priority ready task
5. Agent works on the task, calls `update_task_progress` periodically
6. If task is too big, agent calls `propose_subtasks` → human approves in TUI or CLI
7. Agent calls `validate_dod` → fixes any failures
8. Agent calls `complete_task` → task marked done
9. Agent calls `get_next_task` → picks up next task
10. Human monitors everything in `wp tui` or `wp list`
```

The plan file is the single source of truth. No cloud, no sync, no database — just a JSON file in your git repo.

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
