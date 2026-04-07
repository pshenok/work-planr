import fs from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";
import { getPlanrDir, getPlanPath, createEmptyPlan, writePlan, planExists } from "../../core/plan.js";
import { generateId } from "../../core/uuid.js";

export async function initCommand(options: {
  name?: string;
  goal?: string;
}): Promise<void> {
  const cwd = process.cwd();

  if (await planExists(cwd)) {
    console.log(chalk.yellow("⚠ .planr/ already exists in this directory."));
    return;
  }

  const planrDir = getPlanrDir(cwd);
  const dodDir = path.join(planrDir, "dod");

  // Create directories
  await fs.mkdir(dodDir, { recursive: true });

  // Create config.json
  const configPath = path.join(planrDir, "config.json");
  const defaultConfig = {
    mcp: { transport: "stdio" },
    dod: {
      require_dod_file: false,
      block_on_missing_manual: true,
      command_timeout_ms: 60000,
    },
    tui: { poll_interval_ms: 1000, theme: "default" },
  };
  await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2) + "\n");

  // Create plan.json
  const projectName = options.name || path.basename(cwd);
  const goal = options.goal || "";
  const plan = createEmptyPlan(projectName, goal, generateId());
  await writePlan(plan, cwd);

  // Append to .gitignore
  const gitignorePath = path.join(cwd, ".gitignore");
  try {
    const existing = await fs.readFile(gitignorePath, "utf8");
    if (!existing.includes(".planr/config.json")) {
      await fs.appendFile(gitignorePath, "\n.planr/config.json\n");
    }
  } catch {
    await fs.writeFile(gitignorePath, ".planr/config.json\n");
  }

  console.log(chalk.green("✓ Initialized .planr/ in " + cwd));
  console.log(`
  Created:
    .planr/plan.json       ${chalk.gray("(work plan — commit to git)")}
    .planr/dod/            ${chalk.gray("(Definition of Done checklists)")}
    .planr/config.json     ${chalk.gray("(local config — gitignored)")}

  ${chalk.bold("Next steps:")}
    1. Add to AGENTS.md or CLAUDE.md the workplanr instructions
    2. Add MCP config: ${chalk.cyan('{ "mcpServers": { "workplanr": { "command": "wp", "args": ["serve"] } } }')}
    3. Run ${chalk.cyan("wp add")} to create your first task
  `);
}
