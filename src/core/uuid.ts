import { randomUUID } from "node:crypto";

export function generateId(): string {
  return randomUUID();
}

let taskCounter = 0;

export function generateTaskId(existingTasks: { id: string }[]): string {
  // Find the highest existing task number
  let max = 0;
  for (const task of existingTasks) {
    const match = task.id.match(/^task-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > max) max = num;
    }
  }
  const next = max + 1;
  return `task-${String(next).padStart(3, "0")}`;
}

export function generateProposalId(
  existingProposals: { id: string }[],
): string {
  let max = 0;
  for (const p of existingProposals) {
    const match = p.id.match(/^prop-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > max) max = num;
    }
  }
  const next = max + 1;
  return `prop-${String(next).padStart(3, "0")}`;
}
