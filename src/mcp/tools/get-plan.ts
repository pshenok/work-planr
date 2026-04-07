import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readPlan } from "../../core/plan.js";
import type { TaskStatus } from "../../types/plan.js";

export function registerGetPlan(server: McpServer): void {
  server.tool("get_plan", "Returns the full current plan with summary statistics", {}, async () => {
    try {
      const plan = await readPlan();
      const summary = {
        total: plan.tasks.length,
        done: 0,
        in_progress: 0,
        blocked: 0,
        pending: 0,
      };

      for (const task of plan.tasks) {
        const key = task.status as TaskStatus;
        if (key in summary) {
          (summary as Record<string, number>)[key]++;
        }
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                project: plan.project,
                tasks: plan.tasks,
                proposals: plan.proposals,
                branch: plan.meta.branch,
                summary,
              },
              null,
              2,
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              error: "Failed to read plan",
              details: error instanceof Error ? error.message : String(error),
            }),
          },
        ],
        isError: true,
      };
    }
  });
}
