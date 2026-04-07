import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readPlan, writePlan, nowISO } from "../../core/plan.js";

export function registerUpdateProgress(server: McpServer): void {
  server.tool(
    "update_task_progress",
    "Agent reports progress on a task. Appends a log entry. Does not auto-complete.",
    {
      task_id: z.string().describe("The task ID to update"),
      progress: z
        .number()
        .int()
        .min(0)
        .max(100)
        .describe("Progress percentage 0-100"),
      status: z
        .enum(["pending", "in_progress", "blocked", "done"])
        .optional()
        .describe("Optional status override"),
      notes: z.string().optional().describe("Optional human-readable update"),
    },
    async ({ task_id, progress, status, notes }) => {
      try {
        if (status === "done") {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  ok: false,
                  error: "use complete_task to finish",
                }),
              },
            ],
            isError: true,
          };
        }

        const plan = await readPlan();
        const task = plan.tasks.find((t) => t.id === task_id);

        if (!task) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  ok: false,
                  error: "task_not_found",
                }),
              },
            ],
            isError: true,
          };
        }

        task.progress = progress;
        if (status) {
          task.status = status;
        } else if (task.status === "pending" && progress > 0) {
          task.status = "in_progress";
        }
        task.updated_at = nowISO();

        task.log.push({
          ts: nowISO(),
          actor: task.agent_assignee || "agent",
          event: "progress_update",
          payload: {
            progress,
            ...(status ? { status } : {}),
            ...(notes ? { notes } : {}),
          },
        });

        await writePlan(plan);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ ok: true, task }),
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
