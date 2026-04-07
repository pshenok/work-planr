import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readPlan } from "../../core/plan.js";
import { PRIORITY_ORDER } from "../../types/plan.js";
import type { Task } from "../../types/plan.js";

export function registerGetNextTask(server: McpServer): void {
  server.tool(
    "get_next_task",
    "Returns the highest-priority task that is ready to work on (all dependencies satisfied, status is pending)",
    {},
    async () => {
      try {
        const plan = await readPlan();
        const doneIds = new Set(
          plan.tasks.filter((t) => t.status === "done").map((t) => t.id),
        );

        const available = plan.tasks
          .filter(
            (t) =>
              t.status === "pending" &&
              t.depends_on.every((dep) => doneIds.has(dep)),
          )
          .sort(
            (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
          );

        const task = available.length > 0 ? available[0] : null;

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  task,
                  context: plan.project.goal,
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
                error: "Failed to get next task",
                details:
                  error instanceof Error ? error.message : String(error),
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );
}
