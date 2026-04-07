import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";
import { getPlanrDir } from "./plan.js";

export interface DodItem {
  text: string;
  type: "required" | "optional";
  passed: boolean;
  command?: string;
  output?: string;
}

export interface DodResult {
  passed: boolean;
  total: number;
  passed_count: number;
  items: DodItem[];
}

function parseDodFile(content: string): DodItem[] {
  const items: DodItem[] = [];
  let currentSection: "required" | "optional" | null = null;

  for (const line of content.split("\n")) {
    const trimmed = line.trim();

    // Detect section headers
    if (/^##\s+(Required|Required\s+✓)/i.test(trimmed)) {
      currentSection = "required";
      continue;
    }
    if (/^##\s+(Optional|Recommended)/i.test(trimmed)) {
      currentSection = "optional";
      continue;
    }
    // Reset section on other h2
    if (/^##\s+/.test(trimmed) && currentSection !== null) {
      currentSection = null;
      continue;
    }

    if (!currentSection) continue;

    // Parse checkbox items
    const checkedMatch = trimmed.match(/^-\s+\[x\]\s+(.+)$/i);
    if (checkedMatch) {
      const text = checkedMatch[1];
      const cmd = extractCommand(text);
      items.push({
        text,
        type: currentSection,
        passed: true,
        ...(cmd ? { command: cmd } : {}),
      });
      continue;
    }

    const uncheckedMatch = trimmed.match(/^-\s+\[\s?\]\s+(.+)$/);
    if (uncheckedMatch) {
      const text = uncheckedMatch[1];
      const cmd = extractCommand(text);
      items.push({
        text,
        type: currentSection,
        passed: false, // will be evaluated
        ...(cmd ? { command: cmd } : {}),
      });
    }
  }

  return items;
}

function extractCommand(text: string): string | undefined {
  const match = text.match(/`([^`]+)`/);
  return match ? match[1] : undefined;
}

export async function validateDod(
  taskId: string,
  cwd: string = process.cwd(),
  timeoutMs: number = 60_000,
): Promise<DodResult> {
  const dodPath = path.join(getPlanrDir(cwd), "dod", `${taskId}.md`);

  let content: string;
  try {
    content = await fs.readFile(dodPath, "utf8");
  } catch {
    // No DoD file — permissive by default
    return { passed: true, total: 0, passed_count: 0, items: [] };
  }

  const items = parseDodFile(content);

  // Execute commands for unchecked items
  for (const item of items) {
    if (item.passed) continue; // already marked [x]
    if (!item.command) continue; // manual check — stays failed

    try {
      execSync(item.command, {
        cwd,
        timeout: timeoutMs,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      item.passed = true;
    } catch (err: unknown) {
      item.passed = false;
      if (err && typeof err === "object" && "stderr" in err) {
        item.output = String((err as { stderr: unknown }).stderr).slice(0, 2000);
      }
      if (!item.output && err && typeof err === "object" && "stdout" in err) {
        item.output = String((err as { stdout: unknown }).stdout).slice(0, 2000);
      }
    }
  }

  const requiredItems = items.filter((i) => i.type === "required");
  const allRequiredPass = requiredItems.every((i) => i.passed);
  const passedCount = items.filter((i) => i.passed).length;

  return {
    passed: allRequiredPass,
    total: items.length,
    passed_count: passedCount,
    items,
  };
}
