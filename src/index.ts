#!/usr/bin/env node

import { Command } from "commander";
import { initCommand } from "./cli/commands/init.js";
import { addCommand } from "./cli/commands/add.js";
import { listCommand } from "./cli/commands/list.js";
import { doneCommand } from "./cli/commands/done.js";
import { statusCommand } from "./cli/commands/status.js";
import { serveCommand } from "./cli/commands/serve.js";
import { tuiCommand } from "./cli/commands/tui.js";
import {
  approveProposalCommand,
  rejectProposalCommand,
} from "./cli/commands/propose.js";

const program = new Command();

program
  .name("wp")
  .description("Workplanr — planning as code, for humans and agents")
  .version("0.1.0");

program
  .command("init")
  .description("Initialize .planr/ in current directory")
  .option("--name <name>", "Project name")
  .option("--goal <goal>", "Project goal")
  .action(initCommand);

program
  .command("add <title>")
  .description("Add a new task")
  .option("--priority <priority>", "low | medium | high | critical", "medium")
  .option("--depends-on <ids>", "Comma-separated task IDs")
  .option("--dod <path>", "Path to custom DoD template")
  .action(addCommand);

program
  .command("list")
  .description("List tasks")
  .option("--status <status>", "Filter by status (comma-separated)")
  .action(listCommand);

program
  .command("done <id>")
  .description("Mark task as done (runs DoD validation)")
  .action(doneCommand);

program.command("status").description("Print plan summary").action(statusCommand);

const propose = program
  .command("propose")
  .description("Manage subtask proposals");

propose
  .command("approve <id>")
  .description("Approve a subtask proposal")
  .action(approveProposalCommand);

propose
  .command("reject <id>")
  .description("Reject a subtask proposal")
  .action(rejectProposalCommand);

program
  .command("serve")
  .description("Start MCP server")
  .option("--port <port>", "TCP port (default: stdio)")
  .action(serveCommand);

program
  .command("tui")
  .description("Open TUI dashboard")
  .action(tuiCommand);

program.parse();
