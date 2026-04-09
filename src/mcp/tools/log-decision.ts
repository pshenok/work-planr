import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { updateJournal } from "../../core/journal.js";

export function registerLogDecision(server: McpServer): void {
  server.tool(
    "log_decision",
    "Log an architectural or implementation decision made during this session. These persist across sessions via the journal.",
    {
      session_id: z.string().describe("Session ID from start_session"),
      decision: z
        .string()
        .describe("The decision made and why (e.g. 'Chose JWT over sessions because stateless scaling is required')"),
      files_changed: z
        .array(z.string())
        .optional()
        .describe("Files affected by this decision"),
    },
    async ({ session_id, decision, files_changed }) => {
      try {
        const entry = await updateJournal(session_id, {
          decisions: [decision],
          ...(files_changed ? { files_changed } : {}),
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                ok: true,
                total_decisions: entry.decisions.length,
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
