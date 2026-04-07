import chalk from "chalk";
import type { Task, TaskStatus } from "../types/plan.js";

export const STATUS_ICONS: Record<TaskStatus, string> = {
  in_progress: chalk.yellow("●"),
  pending: chalk.gray("○"),
  done: chalk.green("✓"),
  blocked: chalk.red("✗"),
};

export function progressBar(progress: number, width: number = 12): string {
  const filled = Math.round((progress / 100) * width);
  const empty = width - filled;
  return chalk.green("█".repeat(filled)) + chalk.gray("░".repeat(empty));
}

export function formatTask(task: Task): string {
  const icon = STATUS_ICONS[task.status];
  const bar = progressBar(task.progress);
  const pct = String(task.progress).padStart(3) + "%";
  const priority = colorPriority(task.priority);
  return `  [${icon}] ${task.id.padEnd(10)} ${task.title.padEnd(30).slice(0, 30)} ${bar} ${pct}  ${priority}`;
}

function colorPriority(p: string): string {
  switch (p) {
    case "critical":
      return chalk.red.bold(p);
    case "high":
      return chalk.yellow(p);
    case "medium":
      return chalk.blue(p);
    case "low":
      return chalk.gray(p);
    default:
      return p;
  }
}

export function printLegend(): void {
  console.log(
    `\n  ${chalk.yellow("●")} in_progress  ${chalk.gray("○")} pending  ${chalk.green("✓")} done  ${chalk.red("✗")} blocked`,
  );
}
