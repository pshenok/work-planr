import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { addLesson } from "../../core/lessons.js";

export function registerReportLesson(server: McpServer): void {
  server.tool(
    "report_lesson",
    "Report a lesson learned during this session. These persist across sessions and are returned with get_plan.",
    {
      context: z
        .string()
        .describe("What happened — the situation or mistake"),
      lesson: z
        .string()
        .describe("What to do differently — the takeaway"),
      tags: z
        .array(z.string())
        .default([])
        .describe(
          "Tags for categorization (e.g. 'testing', 'auth', 'tooling')",
        ),
    },
    async ({ context, lesson, tags }) => {
      try {
        const entry = await addLesson(context, lesson, tags);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                ok: true,
                lesson_id: entry.id,
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
