import chalk from "chalk";
import { readPlan, writePlan, nowISO } from "../../core/plan.js";
import { generateTaskId } from "../../core/uuid.js";
import type { Priority, Task } from "../../types/plan.js";

export async function addCommand(
  title: string,
  options: {
    priority?: string;
    dependsOn?: string;
    dod?: string;
    why?: string;
    accept?: string;
  },
): Promise<void> {
  const plan = await readPlan();
  const allTasks = [...plan.tasks, ...plan.tasks.flatMap((t) => t.subtasks)];
  const id = generateTaskId(allTasks);
  const now = nowISO();
  const priority = (options.priority || "medium") as Priority;

  const dependsOn = options.dependsOn
    ? options.dependsOn.split(",").map((s) => s.trim())
    : [];

  const acceptance = options.accept
    ? options.accept.split(";").map((s) => s.trim())
    : undefined;

  const task: Task = {
    id,
    title,
    ...(options.why ? { why: options.why } : {}),
    ...(acceptance ? { acceptance_criteria: acceptance } : {}),
    status: "pending",
    priority,
    depends_on: dependsOn,
    agent_assignee: null,
    progress: 0,
    dod_ref: `${id}.md`,
    subtasks: [],
    log: [
      {
        ts: now,
        actor: "human",
        event: "created",
      },
    ],
    created_at: now,
    updated_at: now,
  };

  plan.tasks.push(task);
  await writePlan(plan);

  console.log(chalk.green(`✓ Created task ${chalk.bold(id)}: ${title}`));
}
