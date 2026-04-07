import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerGetPlan } from "./tools/get-plan.js";
import { registerGetNextTask } from "./tools/get-next-task.js";
import { registerUpdateProgress } from "./tools/update-progress.js";
import { registerValidateDod } from "./tools/validate-dod.js";
import { registerCompleteTask } from "./tools/complete-task.js";
import { registerProposeSubtasks } from "./tools/propose-subtasks.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "workplanr",
    version: "0.1.0",
  });

  registerGetPlan(server);
  registerGetNextTask(server);
  registerUpdateProgress(server);
  registerValidateDod(server);
  registerCompleteTask(server);
  registerProposeSubtasks(server);

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
