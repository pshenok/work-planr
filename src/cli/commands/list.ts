import chalk from "chalk";
import { readPlan } from "../../core/plan.js";
import { formatTask, printLegend } from "../utils.js";

export async function listCommand(options: {
  status?: string;
}): Promise<void> {
  const plan = await readPlan();
  let tasks = plan.tasks;

  if (options.status) {
    const statuses = options.status.split(",").map((s) => s.trim());
    tasks = tasks.filter((t) => statuses.includes(t.status));
  }

  console.log(
    `\n  ${chalk.bold("branch:")} ${plan.meta.branch}${" ".repeat(30)}${tasks.length} tasks\n`,
  );

  if (tasks.length === 0) {
    console.log(chalk.gray("  No tasks found."));
  } else {
    for (const task of tasks) {
      console.log(formatTask(task));
    }
  }

  printLegend();
  console.log();
}
