import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { startSession, getLastJournal } from "../../core/journal.js";
import { readPlan } from "../../core/plan.js";

export function registerStartSession(server: McpServer): void {
  server.tool(
    "start_session",
    "Start a new agent session. Returns the last session journal for context continuity, plus the current plan.",
    {
      agent: z
        .string()
        .default("claude-code")
        .describe("Agent identifier"),
    },
    async ({ agent }) => {
      try {
        const [session, lastJournal, plan] = await Promise.all([
          startSession(agent),
          getLastJournal(),
          readPlan().catch(() => null),
        ]);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  session_id: session.session_id,
                  previous_session: lastJournal
                    ? {
                        summary: lastJournal.summary,
                        tasks_completed: lastJournal.tasks_completed,
                        decisions: lastJournal.decisions,
                        blockers: lastJournal.blockers,
                        ended_at: lastJournal.ended_at,
                      }
                    : null,
                  plan_summary: plan
                    ? {
                        total: plan.tasks.length,
                        done: plan.tasks.filter((t) => t.status === "done")
                          .length,
                        in_progress: plan.tasks.filter(
                          (t) => t.status === "in_progress",
                        ).length,
                        pending: plan.tasks.filter(
                          (t) => t.status === "pending",
                        ).length,
                      }
                    : null,
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
