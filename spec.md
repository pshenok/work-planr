# Workplanr — Full Technical Specification v0.1

**CLI alias:** `wp` | **npm package:** `workplanr` | **Domain:** `workplanr.dev`

---

## Table of Contents

1. [Vision & Problem](#1-vision--problem)
2. [Architecture Overview](#2-architecture-overview)
3. [Technology Stack](#3-technology-stack)
4. [Repository Structure](#4-repository-structure)
5. [Data Schema](#5-data-schema)
6. [MCP Server — API Reference](#6-mcp-server--api-reference)
7. [CLI Reference](#7-cli-reference)
8. [TUI Dashboard](#8-tui-dashboard)
9. [Definition of Done (DoD)](#9-definition-of-done-dod)
10. [Branch-Aware State](#10-branch-aware-state)
11. [Integration Guide](#11-integration-guide)
12. [Configuration](#12-configuration)
13. [JSON Schema](#13-json-schema)
14. [MVP Roadmap](#14-mvp-roadmap)
15. [Open Questions](#15-open-questions)
16. [Non-Goals (v0.1)](#16-non-goals-v01)

---

## 1. Vision & Problem

### 1.1 The Pain

Working with AI coding agents (Claude Code, Aider, Cursor) today resembles managing a very fast but amnesiac worker:

- **Amnesia.** The agent loses the plan the moment the session closes.
- **Context drift.** The agent starts fixing things that were not asked, or loops indefinitely on the same problem.
- **Control gap.** The developer has no real-time visibility into progress on complex, multi-step tasks.

### 1.2 The Solution

Workplanr turns a "work plan" from a bunch of text in someone's head into an **active programmatic interface**.

The plan lives in `.planr/plan.json` — a file inside the repository, versioned with git, branch-aware, accessible to the agent directly through MCP. It changes alongside branches, resolves conflicts like any other code file, and can be inspected, edited, and validated by both human and machine.

### 1.3 Differentiators vs. Existing Tools

| Feature | Shrimp / planner-mcp | saga-mcp | **Workplanr** |
|---|---|---|---|
| Plan stored in repo (git-native) | ✗ | ✗ | ✅ |
| Branch-aware plan | ✗ | ✗ | ✅ |
| Definition of Done validation | ✗ | ✗ | ✅ |
| Human-in-the-loop subtask approval | ✗ | ✗ | ✅ |
| Zero cloud dependency | ✅ | ✅ | ✅ |
| Vendor-agnostic (any MCP client) | ✅ | ✅ | ✅ |

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  git repository                     │
│  ┌─────────────────┐  ┌────────┐  ┌─────────────┐  │
│  │ .planr/plan.json│  │AGENTS.md│  │.planr/dod/  │  │
│  │  source of truth│  │context  │  │checklists   │  │
│  └────────┬────────┘  └────────┘  └──────┬──────┘  │
└───────────┼──────────────────────────────┼──────────┘
            │                              │
     ┌──────▼──────────────────────────────▼──────┐
     │             MCP Server (stdio)              │
     │  get_next_task · update_progress            │
     │  propose_subtasks · validate_dod            │
     │  complete_task · get_plan                   │
     └──────────┬──────────────────┬──────────────┘
                │                  │
    ┌───────────▼───┐    ┌─────────▼──────────┐
    │  TUI Dashboard │    │    AI Agents        │
    │  (human view)  │    │ Claude Code / Aider │
    └────────────────┘    └────────────────────┘
```

**Data flow:**

1. Human creates/edits `.planr/plan.json` via CLI (`wp add`, `wp init`) or directly.
2. MCP Server reads and writes `plan.json` atomically.
3. AI Agent calls MCP tools to read the next task, report progress, propose subtasks.
4. Human sees real-time updates in TUI; approves or rejects proposals.
5. Agent calls `validate_dod` before attempting `complete_task`. Server blocks completion if DoD fails.

---

## 3. Technology Stack

All decisions are optimized for: minimal dependencies, single language (TypeScript), long-term maintainability, and developer trust (no cloud).

### 3.1 Runtime

| Component | Choice | Rationale |
|---|---|---|
| Runtime | **Node.js ≥ 22 LTS** | Native ESM, built-in `fetch`, type stripping in v22.18+ |
| Language | **TypeScript 5.x** | Type safety across all modules; no extra transpiler needed in dev |
| Package manager | **npm** | Zero extra tooling; ships with Node |

Node.js 22 includes built-in type stripping (no `ts-node` or `tsx` needed in development starting v22.18.0).

### 3.2 MCP Server

| Component | Choice | Rationale |
|---|---|---|
| Protocol library | **`@modelcontextprotocol/sdk`** | Official SDK; stdio transport is zero-config |
| Schema validation | **`zod` v4** | Required peer dep of the MCP SDK; TypeScript-first; no extra deps |
| Transport | **stdio** (default) + TCP (opt-in) | stdio = zero network config; works natively with Claude Code |

`zod` is already a required peer dependency of `@modelcontextprotocol/sdk`, so adding it costs nothing in practice.

### 3.3 CLI

| Component | Choice | Rationale |
|---|---|---|
| Argument parsing | **`commander`** | **Zero dependencies**; 500M weekly downloads; excellent TypeScript support |
| Interactive prompts | **Node.js built-ins** (`readline`) | Avoids `inquirer` (25 deps) for simple confirmations |
| Colors | **`chalk`** | 0 runtime dependencies; works with NO_COLOR env var |

`commander` has literally zero dependencies, which is the deciding factor over `yargs` (16 deps).

### 3.4 TUI

| Component | Choice | Rationale |
|---|---|---|
| TUI framework | **`ink`** + **`react`** | 2.8M weekly downloads; React component model; full TypeScript support |
| UI components | **`@inkjs/ui`** | Official Ink component library; adds Select, TextInput, Spinner |

`blessed` is unmaintained. `ink` is used in production by Gatsby, Yarn 2, and Parcel. Same TypeScript stack as the rest of the project.

### 3.5 Testing

| Component | Choice | Rationale |
|---|---|---|
| Test runner | **`node:test`** (built-in) | Node.js 22 native test runner; zero dependencies |
| Assertions | **`node:assert`** (built-in) | No `jest` / `vitest` needed for unit tests |

For integration tests that spin up a real MCP server, `node:test` is sufficient.

### 3.6 Build & Release

| Component | Choice | Rationale |
|---|---|---|
| Build | **`tsc`** | Standard TypeScript compiler; no bundler needed for CLI tools |
| Dev mode | Node.js type stripping (v22.18+) | No `ts-node`; run TypeScript directly in development |
| Publish | **npm** | Standard; `bin` field in `package.json` for global install |

### 3.7 Dependency Summary

**Production dependencies (4 total):**

```
@modelcontextprotocol/sdk   official MCP server/client SDK
zod                         schema validation (peer dep of MCP SDK)
ink                         TUI framework
react                       peer dep of ink
```

**Optional TUI component:**

```
@inkjs/ui                   Ink UI components (Select, Spinner, etc.)
chalk                       terminal colors for CLI output
```

**Dev dependencies:**

```
typescript                  TypeScript compiler
@types/node                 Node.js types
@types/react                React types
```

**Zero additional runtime dependencies** for core functionality.

---

## 4. Repository Structure

```
workplanr/
├── package.json
├── tsconfig.json
├── README.md
├── CHANGELOG.md
│
├── src/
│   ├── index.ts                  ← CLI entry point (bin: wp)
│   │
│   ├── cli/
│   │   ├── commands/
│   │   │   ├── init.ts           ← wp init
│   │   │   ├── add.ts            ← wp add <title>
│   │   │   ├── list.ts           ← wp list
│   │   │   ├── done.ts           ← wp done <id>
│   │   │   ├── serve.ts          ← wp serve (starts MCP server)
│   │   │   └── tui.ts            ← wp tui (starts TUI dashboard)
│   │   └── utils.ts              ← shared CLI helpers
│   │
│   ├── mcp/
│   │   ├── server.ts             ← McpServer setup & transport
│   │   └── tools/
│   │       ├── get-next-task.ts
│   │       ├── update-progress.ts
│   │       ├── propose-subtasks.ts
│   │       ├── validate-dod.ts
│   │       ├── complete-task.ts
│   │       └── get-plan.ts
│   │
│   ├── core/
│   │   ├── plan.ts               ← read/write .planr/plan.json
│   │   ├── dod.ts                ← parse & run DoD checklists
│   │   ├── git.ts                ← git branch detection
│   │   └── uuid.ts               ← ID generation (crypto.randomUUID)
│   │
│   ├── tui/
│   │   ├── App.tsx               ← root TUI component
│   │   ├── components/
│   │   │   ├── TaskList.tsx
│   │   │   ├── TaskRow.tsx
│   │   │   ├── StatusBar.tsx
│   │   │   └── ProposalPanel.tsx
│   │   └── hooks/
│   │       └── usePlan.ts        ← poll plan.json, surface updates
│   │
│   └── types/
│       └── plan.ts               ← TypeScript types (mirrors JSON Schema)
│
├── schema/
│   └── plan.schema.json          ← JSON Schema v7 for plan.json
│
└── test/
    ├── plan.test.ts
    ├── dod.test.ts
    └── mcp-tools.test.ts
```

### 4.1 Project Files in User Repos

When a user runs `wp init` in their project, these files are created:

```
<user-project>/
├── .planr/
│   ├── plan.json             ← work plan (committed to git)
│   ├── dod/
│   │   └── <task-id>.md      ← Definition of Done per task
│   └── config.json           ← local config (gitignored)
└── AGENTS.md                 ← agent instructions (user-managed)
```

`.planr/config.json` is added to `.gitignore` automatically by `wp init`.

---

## 5. Data Schema

### 5.1 `.planr/plan.json`

```jsonc
{
  // Schema version for forward compatibility
  "schema_version": "1.0.0",

  "project": {
    "id": "550e8400-e29b-41d4-a716-446655440000",   // UUID v4
    "name": "My Project",
    "goal": "One sentence describing the end state"
  },

  "tasks": [
    {
      "id": "task-001",           // user-friendly ID or UUID
      "title": "Short task name",
      "description": "Full description of what needs to be done",

      // Status state machine: pending → in_progress → done
      //                              ↓            ↑
      //                           blocked ────────┘
      "status": "pending",        // pending | in_progress | blocked | done

      "priority": "high",         // low | medium | high | critical
      "depends_on": [],           // list of task IDs that must be done first

      // Agent tracking
      "agent_assignee": null,     // null or agent identifier string
      "progress": 0,              // 0–100 integer

      // Reference to DoD checklist file
      "dod_ref": "task-001.md",   // relative to .planr/dod/

      // Nested subtasks (same structure, no further nesting)
      "subtasks": [],

      // Immutable append-only log
      "log": [
        {
          "ts": "2026-04-07T10:00:00Z",  // ISO 8601 UTC
          "actor": "claude-code",         // human | agent-name
          "event": "status_change",       // event type
          "payload": {
            "from": "pending",
            "to": "in_progress"
          }
        }
      ],

      "created_at": "2026-04-07T09:00:00Z",
      "updated_at": "2026-04-07T10:00:00Z"
    }
  ],

  // Pending subtask proposals awaiting human approval
  "proposals": [
    {
      "id": "prop-001",
      "task_id": "task-001",
      "status": "pending",        // pending | approved | rejected
      "proposed_by": "claude-code",
      "proposed_at": "2026-04-07T11:00:00Z",
      "subtasks": [
        {
          "title": "Proposed subtask title",
          "description": "What this subtask does",
          "estimated_complexity": "m"   // s | m | l
        }
      ]
    }
  ],

  "meta": {
    "branch": "feature/auth",    // populated automatically from git
    "created_by": "human",
    "updated_at": "2026-04-07T10:00:00Z"
  }
}
```

### 5.2 Status State Machine

```
              ┌──────────┐
              │  pending  │◄──────────────┐
              └────┬──────┘               │
                   │ agent picks up       │
                   ▼                      │
           ┌─────────────┐               │
           │ in_progress │               │ unblocked
           └──────┬──────┘               │
                  │                      │
        ┌─────────┴──────────┐           │
        │ DoD passes         │ blocker   │
        ▼                    ▼           │
    ┌──────┐           ┌─────────┐       │
    │ done │           │ blocked │───────┘
    └──────┘           └─────────┘
```

**Rules enforced by MCP Server:**

- `complete_task` is rejected if DoD has unfulfilled items.
- `update_task_progress(progress: 100)` does NOT auto-complete — agent must explicitly call `complete_task`.
- A task with unresolved `depends_on` cannot transition to `in_progress`.

### 5.3 `.planr/dod/<task-id>.md`

```markdown
# DoD: task-001 — Implement JWT authentication

## Required ✓ (all must pass)
- [ ] Tests pass: `npm test`
- [ ] No lint errors: `npm run lint`
- [ ] Function is documented (JSDoc)
- [ ] No new TypeScript errors: `tsc --noEmit`

## Optional (tracked but not blocking)
- [ ] Test coverage ≥ 80%
- [ ] CHANGELOG.md updated
```

Lines starting with `- [ ]` under `## Required` are parsed as blocking checks.
Lines starting with `- [ ]` under `## Optional` are tracked but non-blocking.
Lines starting with `- [x]` are treated as passed.

Commands in backticks within a Required item are executed by `validate_dod` to determine pass/fail.

---

## 6. MCP Server — API Reference

Server name: `workplanr` | Transport: `stdio` (default)

Started with: `wp serve` or `node dist/mcp/server.js`

### 6.1 `get_next_task`

Returns the highest-priority task that is ready to work on (all dependencies satisfied, status is `pending`).

**Input:** _(none)_

**Output:**
```typescript
{
  task: Task | null,    // null if no tasks are available
  context: string       // brief project goal from plan.json
}
```

**Logic:**

1. Filter tasks where `status === "pending"`.
2. Filter tasks where all `depends_on` IDs have `status === "done"`.
3. Sort by `priority`: `critical > high > medium > low`.
4. Return the first result.

---

### 6.2 `update_task_progress`

Agent reports progress. Appends a log entry. Does not auto-complete.

**Input:**
```typescript
{
  task_id: string,
  progress: number,        // 0–100
  status?: TaskStatus,     // optional status override
  notes?: string           // optional human-readable update
}
```

**Output:**
```typescript
{
  ok: boolean,
  task: Task
}
```

**Validation:**

- `task_id` must exist in `plan.json`.
- `progress` must be 0–100 integer.
- If `status === "done"` is passed here, server returns error: `"use complete_task to finish"`.

---

### 6.3 `propose_subtasks`

Agent suggests breaking a task into subtasks. Sets parent task to `blocked` and creates a proposal record awaiting human approval.

**Input:**
```typescript
{
  task_id: string,
  reason: string,          // why decomposition is needed
  subtasks: Array<{
    title: string,
    description: string,
    estimated_complexity: "s" | "m" | "l"
  }>
}
```

**Output:**
```typescript
{
  proposal_id: string,
  status: "pending_approval",
  message: string          // human-readable next step
}
```

**Side effects:**

- Parent task `status` → `blocked`.
- New proposal record written to `plan.json`.
- TUI displays proposal panel for human review.

---

### 6.4 `validate_dod`

Reads `.planr/dod/<task-id>.md` and runs any shell commands found in Required items.

**Input:**
```typescript
{
  task_id: string
}
```

**Output:**
```typescript
{
  passed: boolean,
  total: number,
  passed_count: number,
  items: Array<{
    text: string,
    type: "required" | "optional",
    passed: boolean,
    command?: string,      // command that was run
    output?: string        // stdout/stderr on failure
  }>
}
```

**Execution:**

- Commands are run in the project root (CWD where `wp serve` was started).
- Timeout: 60 seconds per command.
- Non-zero exit code = failed.
- If no DoD file exists for the task, returns `passed: true` with empty items (permissive by default; configurable).

---

### 6.5 `complete_task`

Marks a task as done. **Blocked if DoD has unfulfilled Required items.**

**Input:**
```typescript
{
  task_id: string,
  summary: string          // one sentence: what was done
}
```

**Output:**
```typescript
{
  ok: boolean,
  error?: "dod_not_passed" | "already_done" | "task_not_found",
  dod_result?: DodResult   // populated when error === "dod_not_passed"
}
```

**Logic:**

1. Run `validate_dod` internally.
2. If DoD fails → return error with details.
3. If DoD passes → set `status: "done"`, `progress: 100`, append log entry.

---

### 6.6 `get_plan`

Returns the full current plan. Useful at session start for agent orientation.

**Input:** _(none)_

**Output:**
```typescript
{
  project: Project,
  tasks: Task[],
  proposals: Proposal[],
  branch: string,
  summary: {
    total: number,
    done: number,
    in_progress: number,
    blocked: number,
    pending: number
  }
}
```

---

## 7. CLI Reference

Installed globally: `npm install -g workplanr`

Binary name: `wp`

### 7.1 Command Overview

```
wp init                      Initialize .planr/ in current directory
wp add <title>               Add a new task
wp list [--status <status>]  List tasks
wp done <id>                 Mark task as done (runs DoD validation)
wp propose approve <id>      Approve a subtask proposal
wp propose reject <id>       Reject a subtask proposal
wp serve                     Start MCP server (stdio)
wp serve --port <n>          Start MCP server (TCP)
wp tui                       Open TUI dashboard
wp status                    Print plan summary
```

### 7.2 `wp init`

Creates `.planr/` directory structure in the current repo.

```bash
wp init
wp init --name "My Project" --goal "Ship v2.0 by June"
```

**Creates:**

```
.planr/
  plan.json       (with empty tasks array)
  dod/            (empty directory)
  config.json     (local, added to .gitignore)
```

Also appends to `.gitignore`:
```
.planr/config.json
```

**Does not modify** `AGENTS.md` or `CLAUDE.md` — prints instructions for the user instead.

---

### 7.3 `wp add`

```bash
wp add "Implement JWT authentication"
wp add "Write tests" --priority high --depends-on task-001
wp add "Deploy to staging" --priority critical
```

**Options:**

| Flag | Default | Description |
|---|---|---|
| `--priority` | `medium` | `low`, `medium`, `high`, `critical` |
| `--depends-on` | — | comma-separated task IDs |
| `--dod` | auto | path to custom DoD template |

Prints the created task ID.

---

### 7.4 `wp list`

```bash
wp list
wp list --status pending
wp list --status in_progress,blocked
```

**Output (example):**

```
branch: feature/auth                        3 tasks

  [●] task-001  Implement JWT auth         ██████████░░  70%  high
  [○] task-002  Write tests                ░░░░░░░░░░░░   0%  medium
  [✓] task-000  Repo setup                 ████████████ 100%  low

  ● in_progress  ○ pending  ✓ done  ✗ blocked
```

---

### 7.5 `wp done`

```bash
wp done task-001
```

1. Runs `validate_dod` for `task-001`.
2. If failed: prints checklist with failures, exits with code 1.
3. If passed: marks done, prints confirmation.

---

### 7.6 `wp serve`

```bash
wp serve                     # stdio (for Claude Code / mcp.json)
wp serve --port 3333         # TCP
```

Prints to stderr (not stdout, to avoid polluting MCP stdio stream):

```
workplanr MCP server started
plan: /home/user/my-project/.planr/plan.json
branch: feature/auth
transport: stdio
```

---

## 8. TUI Dashboard

Started with `wp tui`. Uses `ink` + React.

### 8.1 Layout

```
┌─ Workplanr ─────────────────────────── branch: feature/auth ─┐
│                                                               │
│  Tasks                                          3 total       │
│  ──────────────────────────────────────────────────────────  │
│  [●] task-001  Implement JWT auth    ██████░░░░  60%  high   │
│  [○] task-002  Write unit tests      ░░░░░░░░░░   0%  medium │
│  [✓] task-000  Repo setup            ██████████ 100%  low    │
│                                                               │
│  Proposals (1 pending)                                        │
│  ──────────────────────────────────────────────────────────  │
│  prop-001: agent wants to split task-001 into 3 subtasks     │
│  [a] approve   [r] reject   [↑↓] navigate   [q] quit         │
│                                                               │
│  Last event: task-001 progress 60% — 2 min ago               │
└───────────────────────────────────────────────────────────────┘
```

### 8.2 Key Bindings

| Key | Action |
|---|---|
| `↑` / `↓` | Navigate task list |
| `a` | Add task (opens input) |
| `d` | Open DoD for selected task |
| `p` | View pending proposals |
| `r` | Refresh from disk |
| `q` / `Ctrl+C` | Quit |

### 8.3 Real-time Updates

TUI polls `plan.json` every 1 second using `usePlan` hook. No WebSocket or IPC required — the file is the communication channel.

```typescript
// src/tui/hooks/usePlan.ts
function usePlan(planPath: string, intervalMs = 1000) {
  const [plan, setPlan] = useState<Plan | null>(null);
  useEffect(() => {
    const interval = setInterval(async () => {
      const raw = await fs.readFile(planPath, "utf8");
      setPlan(JSON.parse(raw));
    }, intervalMs);
    return () => clearInterval(interval);
  }, [planPath, intervalMs]);
  return plan;
}
```

---

## 9. Definition of Done (DoD)

### 9.1 File Format

Location: `.planr/dod/<task-id>.md`

```markdown
# DoD: task-001 — Implement JWT authentication

## Required
- [ ] `npm test` — all tests pass
- [ ] `npm run lint` — no lint errors
- [ ] `tsc --noEmit` — no type errors
- [ ] Auth module has JSDoc comments

## Optional
- [ ] Test coverage ≥ 80%
- [ ] CHANGELOG.md updated
```

### 9.2 Parsing Rules

```
Line: - [ ] `<command>` — <description>
         ↑ checkbox   ↑ executable    ↑ human label

Line: - [ ] <text without backticks>
            → manual check (cannot be auto-validated)

Line: - [x] <anything>
            → already marked as passed
```

Section headers determine blocking behavior:
- `## Required` or `## Required ✓` → blocking
- `## Optional` or `## Recommended` → non-blocking

### 9.3 Auto-validation

When `validate_dod` runs:

1. Parse the DoD file.
2. For each Required item with a backtick command: execute in project root.
3. Collect results.
4. `passed: true` only if ALL Required items pass (auto + manual).

Manual items (no command) are assumed failed unless already marked `[x]` in the file.

---

## 10. Branch-Aware State

This is the core differentiator.

### 10.1 How It Works

`plan.json` lives in the git repository. When the developer runs:

```bash
git checkout feature/payments
```

The `plan.json` that `wp serve` reads changes automatically — it reflects the work plan for the `feature/payments` branch.

This means:

- Each feature branch has its own plan.
- The main branch plan tracks integration tasks.
- No external state to synchronize.

### 10.2 Git Merge Conflicts

If two branches modify `plan.json` and are merged, a standard git merge conflict appears:

```
<<<<<<< HEAD
  "status": "done"
=======
  "status": "in_progress"
>>>>>>> feature/payments
```

Resolution is manual, like any other code conflict. `wp list` will detect malformed JSON and warn the developer.

### 10.3 Automatic Branch Detection

`core/git.ts` reads the current branch at server startup and on each tool call:

```typescript
import { execSync } from "node:child_process";

export function currentBranch(): string {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}
```

The branch is written to `plan.json#meta.branch` on each write operation.

---

## 11. Integration Guide

### 11.1 Claude Code Integration

Add to your project's `mcp.json` (or `.claude/mcp.json`):

```json
{
  "mcpServers": {
    "workplanr": {
      "command": "wp",
      "args": ["serve"],
      "env": {}
    }
  }
}
```

### 11.2 AGENTS.md Instructions

Add to your project's `AGENTS.md` (or `CLAUDE.md`):

```markdown
## Workplanr

You have access to the workplanr MCP server. Follow these rules:

1. At the start of every session, call `get_plan` to orient yourself.
2. Always call `get_next_task` before starting work — never pick tasks arbitrarily.
3. After every significant step, call `update_task_progress` with current progress %.
4. If a task feels too large (>4 hours of work), call `propose_subtasks` and wait for approval.
5. Before calling `complete_task`, always call `validate_dod` first and fix any failures.
6. Never call `complete_task` with a failing DoD — fix the code instead.
```

### 11.3 Claude Code `mcp.json` with Local Path

If `workplanr` is not installed globally:

```json
{
  "mcpServers": {
    "workplanr": {
      "command": "node",
      "args": ["/absolute/path/to/workplanr/dist/index.js", "serve"]
    }
  }
}
```

### 11.4 Aider Integration

Aider supports MCP via its tool-use mode. Add to `.aider.conf.yml`:

```yaml
mcp_servers:
  - name: workplanr
    command: wp
    args: [serve]
```

---

## 12. Configuration

### 12.1 `.planr/config.json` (gitignored)

```jsonc
{
  "mcp": {
    "transport": "stdio",    // "stdio" | "tcp"
    "port": 3333             // only used when transport === "tcp"
  },
  "dod": {
    "require_dod_file": false,       // if true, complete_task fails without DoD file
    "block_on_missing_manual": true, // treat unchecked manual items as failures
    "command_timeout_ms": 60000      // max time per DoD command
  },
  "tui": {
    "poll_interval_ms": 1000,
    "theme": "default"               // "default" | "minimal"
  }
}
```

### 12.2 Environment Variables

| Variable | Description |
|---|---|
| `WORKPLANR_PLAN` | Override path to `plan.json` |
| `WORKPLANR_LOG` | Log level: `error`, `warn`, `info`, `debug` |
| `NO_COLOR` | Disable colors (standard) |

---

## 13. JSON Schema

Location: `schema/plan.schema.json` (shipped with the package).

Key constraints:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://workplanr.dev/schema/plan.schema.json",
  "title": "Workplanr Plan",
  "type": "object",
  "required": ["schema_version", "project", "tasks"],
  "properties": {
    "schema_version": { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+$" },
    "project": {
      "type": "object",
      "required": ["id", "name", "goal"],
      "properties": {
        "id":   { "type": "string" },
        "name": { "type": "string", "minLength": 1, "maxLength": 200 },
        "goal": { "type": "string", "maxLength": 500 }
      }
    },
    "tasks": {
      "type": "array",
      "items": { "$ref": "#/definitions/Task" }
    }
  },
  "definitions": {
    "Task": {
      "type": "object",
      "required": ["id", "title", "status", "priority"],
      "properties": {
        "id":             { "type": "string" },
        "title":          { "type": "string" },
        "description":    { "type": "string" },
        "status":         { "enum": ["pending", "in_progress", "blocked", "done"] },
        "priority":       { "enum": ["low", "medium", "high", "critical"] },
        "depends_on":     { "type": "array", "items": { "type": "string" } },
        "agent_assignee": { "type": ["string", "null"] },
        "progress":       { "type": "integer", "minimum": 0, "maximum": 100 },
        "dod_ref":        { "type": "string" },
        "subtasks":       { "type": "array", "items": { "$ref": "#/definitions/Task" } },
        "log":            { "type": "array", "items": { "$ref": "#/definitions/LogEntry" } },
        "created_at":     { "type": "string", "format": "date-time" },
        "updated_at":     { "type": "string", "format": "date-time" }
      }
    },
    "LogEntry": {
      "type": "object",
      "required": ["ts", "actor", "event"],
      "properties": {
        "ts":      { "type": "string", "format": "date-time" },
        "actor":   { "type": "string" },
        "event":   { "type": "string" },
        "payload": { "type": "object" }
      }
    }
  }
}
```

Validation is performed by the MCP server on every write using the `zod` schemas (which mirror this JSON Schema).

---

## 14. MVP Roadmap

### M1 — Schema & Core (Week 1)

- [ ] Define `plan.schema.json`
- [ ] Implement `core/plan.ts` (read/write with atomic file operations)
- [ ] Implement `core/git.ts` (branch detection)
- [ ] Write unit tests for core

**Deliverable:** `plan.json` can be created and validated from TypeScript.

---

### M2 — MCP Core (Week 2)

- [ ] Set up MCP server with `@modelcontextprotocol/sdk`
- [ ] Implement `get_next_task`
- [ ] Implement `update_task_progress`
- [ ] Implement `get_plan`
- [ ] Test with Claude Code via `mcp.json`

**Deliverable:** Agent can read and update task progress via MCP.

---

### M3 — DoD Engine (Week 3)

- [ ] Implement `core/dod.ts` (parse markdown, run commands)
- [ ] Implement `validate_dod` MCP tool
- [ ] Implement `complete_task` with DoD guard
- [ ] Integration test: complete task with passing/failing DoD

**Deliverable:** Agent cannot complete tasks with failing DoD.

---

### M4 — Human-in-the-Loop (Week 4)

- [ ] Implement `propose_subtasks` MCP tool
- [ ] Add proposals array to `plan.json` schema
- [ ] CLI commands: `wp propose approve`, `wp propose reject`

**Deliverable:** Agent can propose decomposition; human approves via CLI.

---

### M5 — CLI (Week 5)

- [ ] `wp init`
- [ ] `wp add`
- [ ] `wp list`
- [ ] `wp done`
- [ ] `wp status`
- [ ] `wp serve`
- [ ] Publish to npm as `workplanr`

**Deliverable:** `npm install -g workplanr` + `wp init` works end-to-end.

---

### M6 — TUI (Week 6)

- [ ] Root `App.tsx` with task list
- [ ] `usePlan` polling hook
- [ ] Proposal review panel
- [ ] Keyboard navigation
- [ ] `wp tui` command

**Deliverable:** Real-time terminal dashboard for monitoring agent work.

---

## 15. Open Questions

| # | Question | Impact |
|---|---|---|
| 1 | Should `validate_dod` support YAML frontmatter for metadata (timeout, working dir)? | Medium |
| 2 | Should manual DoD items block completion, or only auto-validated commands? | High |
| 3 | Is a `git merge driver` for `plan.json` needed, or is manual conflict resolution acceptable? | Medium |
| 4 | Should `propose_subtasks` require immediate human approval, or queue async? | High |
| 5 | Multi-agent mode: two agents running simultaneously — concurrent write safety via file lock? | High |

---

## 16. Non-Goals (v0.1)

The following are explicitly out of scope for the initial release:

- **Cloud sync or remote storage** — all data stays local in `.planr/`.
- **Multi-repo / monorepo spanning plans** — one repo, one plan.
- **Concurrent multi-agent writes** — single agent at a time per repo (file locking deferred to v0.2).
- **Authentication on MCP TCP transport** — local use only; stdio transport is inherently process-scoped.
- **AI-powered task generation** — the plan is always human-authored or human-approved.
- **GUI (browser or Electron)** — TUI only; web dashboard is a future option.
- **Windows support** — Linux/macOS primary; Windows via WSL.

---

*Workplanr — planning as code, for humans and agents.*
*workplanr.dev · github.com/workplanr/workplanr · npm: workplanr*
