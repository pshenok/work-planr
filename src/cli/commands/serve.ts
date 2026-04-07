import { startStdioServer } from "../../mcp/server.js";

export async function serveCommand(_options: { port?: string }): Promise<void> {
  // TODO: TCP transport support with --port
  await startStdioServer();
}
