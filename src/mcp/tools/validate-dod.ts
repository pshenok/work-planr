import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { validateDod } from "../../core/dod.js";

export function registerValidateDod(server: McpServer): void {
  server.tool(
    "validate_dod",
    "Reads the DoD file for a task and runs any shell commands found in Required items",
    {
      task_id: z.string().describe("The task ID to validate DoD for"),
    },
    async ({ task_id }) => {
      try {
        const result = await validateDod(task_id);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: "Failed to validate DoD",
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
