import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readPlan, writePlan, nowISO } from "../../core/plan.js";
import { generateProposalId } from "../../core/uuid.js";

export function registerProposeSubtasks(server: McpServer): void {
  server.tool(
    "propose_subtasks",
    "Agent suggests breaking a task into subtasks. Sets parent task to blocked and creates a proposal awaiting human approval.",
    {
      task_id: z.string().describe("The parent task ID"),
      reason: z.string().describe("Why decomposition is needed"),
      subtasks: z
        .array(
          z.object({
            title: z.string(),
            description: z.string(),
            estimated_complexity: z.enum(["s", "m", "l"]),
          }),
        )
        .describe("Proposed subtasks"),
    },
    async ({ task_id, reason, subtasks }) => {
      try {
        const plan = await readPlan();
        const task = plan.tasks.find((t) => t.id === task_id);

        if (!task) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: "task_not_found",
                }),
              },
            ],
            isError: true,
          };
        }

        const proposalId = generateProposalId(plan.proposals);

        // Block parent task
        task.status = "blocked";
        task.updated_at = nowISO();
        task.log.push({
          ts: nowISO(),
          actor: task.agent_assignee || "agent",
          event: "proposal_created",
          payload: { proposal_id: proposalId, reason },
        });

        // Create proposal
        plan.proposals.push({
          id: proposalId,
          task_id,
          status: "pending",
          proposed_by: task.agent_assignee || "agent",
          proposed_at: nowISO(),
          subtasks,
        });

        await writePlan(plan);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                proposal_id: proposalId,
                status: "pending_approval",
                message: `Proposal ${proposalId} created with ${subtasks.length} subtasks. Awaiting human approval via 'wp propose approve ${proposalId}' or TUI.`,
              }),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: error instanceof Error ? error.message : String(error),
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );
}
