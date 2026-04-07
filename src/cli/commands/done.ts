import chalk from "chalk";
import { readPlan, writePlan, nowISO } from "../../core/plan.js";
import { validateDod } from "../../core/dod.js";

export async function doneCommand(taskId: string): Promise<void> {
  const plan = await readPlan();
  const task = plan.tasks.find((t) => t.id === taskId);

  if (!task) {
    console.error(chalk.red(`Error: task ${taskId} not found`));
    process.exit(1);
  }

  if (task.status === "done") {
    console.log(chalk.yellow(`Task ${taskId} is already done.`));
    return;
  }

  // Validate DoD
  const result = await validateDod(taskId);

  if (!result.passed) {
    console.log(chalk.red(`\n  ✗ DoD validation failed for ${taskId}\n`));
    for (const item of result.items) {
      const icon = item.passed ? chalk.green("✓") : chalk.red("✗");
      const label = item.type === "required" ? "" : chalk.gray(" (optional)");
      console.log(`  ${icon} ${item.text}${label}`);
      if (!item.passed && item.output) {
        console.log(chalk.gray(`    ${item.output.split("\n")[0]}`));
      }
    }
    console.log();
    process.exit(1);
  }

  // Mark done
  task.status = "done";
  task.progress = 100;
  task.updated_at = nowISO();
  task.log.push({
    ts: nowISO(),
    actor: "human",
    event: "completed",
    payload: { via: "cli" },
  });

  await writePlan(plan);
  console.log(chalk.green(`✓ Task ${taskId} marked as done.`));
}
