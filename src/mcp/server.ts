import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerGetPlan } from "./tools/get-plan.js";
import { registerGetNextTask } from "./tools/get-next-task.js";
import { registerUpdateProgress } from "./tools/update-progress.js";
import { registerValidateDod } from "./tools/validate-dod.js";
import { registerCompleteTask } from "./tools/complete-task.js";
import { registerProposeSubtasks } from "./tools/propose-subtasks.js";
import { registerStartSession } from "./tools/start-session.js";
import { registerEndSession } from "./tools/end-session.js";
import { registerLogDecision } from "./tools/log-decision.js";
import { registerReportLesson } from "./tools/report-lesson.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "workplanr",
    version: "0.2.0",
  });

  // Plan & tasks
  registerGetPlan(server);
  registerGetNextTask(server);
  registerUpdateProgress(server);
  registerValidateDod(server);
  registerCompleteTask(server);
  registerProposeSubtasks(server);

  // Session journal
  registerStartSession(server);
  registerEndSession(server);
  registerLogDecision(server);

  // Lessons learned
  registerReportLesson(server);

  return server;
}

export async function startStdioServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();

  process.stderr.write(
    `workplanr MCP server started\nplan: ${process.cwd()}/.planr/plan.json\ntransport: stdio\n`,
  );

  await server.connect(transport);
}
