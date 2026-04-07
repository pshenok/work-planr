import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readPlan, writePlan, nowISO } from "../../core/plan.js";
import { validateDod } from "../../core/dod.js";

export function registerCompleteTask(server: McpServer): void {
  server.tool(
    "complete_task",
    "Marks a task as done. Blocked if DoD has unfulfilled Required items.",
    {
      task_id: z.string().describe("The task ID to complete"),
      summary: z.string().describe("One sentence: what was done"),
    },
    async ({ task_id, summary }) => {
      try {
        const plan = await readPlan();
        const task = plan.tasks.find((t) => t.id === task_id);

        if (!task) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ ok: false, error: "task_not_found" }),
              },
            ],
            isError: true,
          };
        }

        if (task.status === "done") {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ ok: false, error: "already_done" }),
              },
            ],
            isError: true,
          };
        }

        // Run DoD validation
        const dodResult = await validateDod(task_id);
        if (!dodResult.passed) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  ok: false,
                  error: "dod_not_passed",
                  dod_result: dodResult,
                }),
              },
            ],
            isError: true,
          };
        }

        // Mark as done
        task.status = "done";
        task.progress = 100;
        task.updated_at = nowISO();
        task.log.push({
          ts: nowISO(),
          actor: task.agent_assignee || "agent",
          event: "completed",
          payload: { summary },
        });

        await writePlan(plan);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ ok: true }),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                ok: false,
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
