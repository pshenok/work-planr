import chalk from "chalk";
import { readPlan, writePlan, nowISO } from "../../core/plan.js";
import { generateTaskId } from "../../core/uuid.js";

export async function approveProposalCommand(proposalId: string): Promise<void> {
  const plan = await readPlan();
  const proposal = plan.proposals.find((p) => p.id === proposalId);

  if (!proposal) {
    console.error(chalk.red(`Error: proposal ${proposalId} not found`));
    process.exit(1);
  }

  if (proposal.status !== "pending") {
    console.log(
      chalk.yellow(`Proposal ${proposalId} is already ${proposal.status}.`),
    );
    return;
  }

  const parentTask = plan.tasks.find((t) => t.id === proposal.task_id);
  if (!parentTask) {
    console.error(
      chalk.red(`Error: parent task ${proposal.task_id} not found`),
    );
    process.exit(1);
  }

  // Create subtasks from proposal
  const allTasks = [...plan.tasks, ...plan.tasks.flatMap((t) => t.subtasks)];
  const now = nowISO();

  for (const sub of proposal.subtasks) {
    const id = generateTaskId(allTasks);
    parentTask.subtasks.push({
      id,
      title: sub.title,
      description: sub.description,
      status: "pending",
      priority: parentTask.priority,
      depends_on: [],
      agent_assignee: null,
      progress: 0,
      log: [{ ts: now, actor: "human", event: "created_from_proposal", payload: { proposal_id: proposalId } }],
      created_at: now,
      updated_at: now,
    });
    allTasks.push({ id } as any);
    console.log(chalk.green(`  + ${id}: ${sub.title}`));
  }

  // Update proposal and parent
  proposal.status = "approved";
  parentTask.status = "in_progress";
  parentTask.updated_at = now;
  parentTask.log.push({
    ts: now,
    actor: "human",
    event: "proposal_approved",
    payload: { proposal_id: proposalId },
  });

  await writePlan(plan);
  console.log(chalk.green(`\n✓ Proposal ${proposalId} approved. ${proposal.subtasks.length} subtasks created.`));
}

export async function rejectProposalCommand(proposalId: string): Promise<void> {
  const plan = await readPlan();
  const proposal = plan.proposals.find((p) => p.id === proposalId);

  if (!proposal) {
    console.error(chalk.red(`Error: proposal ${proposalId} not found`));
    process.exit(1);
  }

  if (proposal.status !== "pending") {
    console.log(
      chalk.yellow(`Proposal ${proposalId} is already ${proposal.status}.`),
    );
    return;
  }

  const parentTask = plan.tasks.find((t) => t.id === proposal.task_id);

  proposal.status = "rejected";
  if (parentTask && parentTask.status === "blocked") {
    parentTask.status = "pending";
    parentTask.updated_at = nowISO();
    parentTask.log.push({
      ts: nowISO(),
      actor: "human",
      event: "proposal_rejected",
      payload: { proposal_id: proposalId },
    });
  }

  await writePlan(plan);
  console.log(chalk.green(`✓ Proposal ${proposalId} rejected. Parent task unblocked.`));
}
