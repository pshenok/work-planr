import chalk from "chalk";
import { getLastJournal } from "../../core/journal.js";

export async function journalCommand(): Promise<void> {
  const entry = await getLastJournal();

  if (!entry) {
    console.log(chalk.gray("No sessions recorded yet."));
    return;
  }

  const status = entry.ended_at ? chalk.green("ended") : chalk.yellow("active");

  console.log(`
  ${chalk.bold("Last Session")} ${status}
  ${"─".repeat(50)}
  ${chalk.bold("ID:")}        ${entry.session_id.slice(0, 8)}...
  ${chalk.bold("Agent:")}     ${entry.agent}
  ${chalk.bold("Branch:")}    ${entry.branch}
  ${chalk.bold("Started:")}   ${entry.started_at}
  ${entry.ended_at ? chalk.bold("Ended:") + "     " + entry.ended_at : ""}

  ${chalk.bold("Tasks worked:")}    ${entry.tasks_worked.length > 0 ? entry.tasks_worked.join(", ") : chalk.gray("none")}
  ${chalk.bold("Tasks completed:")} ${entry.tasks_completed.length > 0 ? entry.tasks_completed.join(", ") : chalk.gray("none")}

  ${entry.decisions.length > 0 ? chalk.bold("Decisions:") : ""}
${entry.decisions.map((d) => `    ${chalk.cyan(">")} ${d}`).join("\n")}

  ${entry.blockers.length > 0 ? chalk.bold("Blockers:") : ""}
${entry.blockers.map((b) => `    ${chalk.red("!")} ${b}`).join("\n")}

  ${entry.summary ? chalk.bold("Summary:") + " " + entry.summary : ""}
  `);
}
