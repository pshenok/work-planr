import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { endSession } from "../../core/journal.js";

export function registerEndSession(server: McpServer): void {
  server.tool(
    "end_session",
    "End the current session with a summary of what was accomplished.",
    {
      session_id: z.string().describe("Session ID from start_session"),
      summary: z
        .string()
        .describe("Brief summary of what was done this session"),
    },
    async ({ session_id, summary }) => {
      try {
        const entry = await endSession(session_id, summary);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  ok: true,
                  session_id: entry.session_id,
                  duration_tasks: entry.tasks_worked.length,
                  completed: entry.tasks_completed.length,
                  decisions: entry.decisions.length,
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
