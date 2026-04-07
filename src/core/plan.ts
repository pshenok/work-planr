import fs from "node:fs/promises";
import path from "node:path";
import { PlanSchema, type Plan } from "../types/plan.js";
import { currentBranch } from "./git.js";

const PLANR_DIR = ".planr";
const PLAN_FILE = "plan.json";

export function getPlanrDir(cwd: string = process.cwd()): string {
  return path.join(cwd, PLANR_DIR);
}

export function getPlanPath(cwd: string = process.cwd()): string {
  const envPath = process.env.WORKPLANR_PLAN;
  if (envPath) return path.resolve(envPath);
  return path.join(cwd, PLANR_DIR, PLAN_FILE);
}

export async function planExists(cwd?: string): Promise<boolean> {
  try {
    await fs.access(getPlanPath(cwd));
    return true;
  } catch {
    return false;
  }
}

export async function readPlan(cwd?: string): Promise<Plan> {
  const planPath = getPlanPath(cwd);
  const raw = await fs.readFile(planPath, "utf8");
  const data = JSON.parse(raw);
  return PlanSchema.parse(data);
}

export async function writePlan(plan: Plan, cwd?: string): Promise<void> {
  const planPath = getPlanPath(cwd);

  // Update meta
  plan.meta.branch = currentBranch();
  plan.meta.updated_at = new Date().toISOString();

  // Validate before writing
  PlanSchema.parse(plan);

  // Atomic write: write to temp, then rename
  const tmpPath = planPath + ".tmp";
  await fs.writeFile(tmpPath, JSON.stringify(plan, null, 2) + "\n", "utf8");
  await fs.rename(tmpPath, planPath);
}

export function createEmptyPlan(
  projectName: string,
  goal: string,
  projectId: string,
): Plan {
  const now = new Date().toISOString();
  return {
    schema_version: "1.0.0",
    project: {
      id: projectId,
      name: projectName,
      goal,
    },
    tasks: [],
    proposals: [],
    meta: {
      branch: currentBranch(),
      created_by: "human",
      updated_at: now,
    },
  };
}

export function nowISO(): string {
  return new Date().toISOString();
}
