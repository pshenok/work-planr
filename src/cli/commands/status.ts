import chalk from "chalk";
import { readPlan } from "../../core/plan.js";

export async function statusCommand(): Promise<void> {
  const plan = await readPlan();

  const counts = { pending: 0, in_progress: 0, blocked: 0, done: 0 };
  for (const task of plan.tasks) {
    counts[task.status]++;
  }

  const total = plan.tasks.length;
  const pendingProposals = plan.proposals.filter(
    (p) => p.status === "pending",
  ).length;

  console.log(`
  ${chalk.bold(plan.project.name)}
  ${chalk.gray(plan.project.goal)}

  ${chalk.bold("Branch:")} ${plan.meta.branch}
  ${chalk.bold("Tasks:")}  ${total} total
    ${chalk.green("✓")} ${counts.done} done
    ${chalk.yellow("●")} ${counts.in_progress} in progress
    ${chalk.red("✗")} ${counts.blocked} blocked
    ${chalk.gray("○")} ${counts.pending} pending
  ${pendingProposals > 0 ? chalk.yellow(`\n  ${pendingProposals} pending proposal(s) awaiting review`) : ""}
  `);
}
