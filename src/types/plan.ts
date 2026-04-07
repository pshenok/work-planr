import { z } from "zod";

// --- Zod Schemas ---

export const LogEntrySchema = z.object({
  ts: z.string().datetime(),
  actor: z.string(),
  event: z.string(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export const TaskStatusSchema = z.enum([
  "pending",
  "in_progress",
  "blocked",
  "done",
]);

export const PrioritySchema = z.enum(["low", "medium", "high", "critical"]);

export const ComplexitySchema = z.enum(["s", "m", "l"]);

export const SubtaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  status: TaskStatusSchema,
  priority: PrioritySchema,
  depends_on: z.array(z.string()).default([]),
  agent_assignee: z.string().nullable().default(null),
  progress: z.number().int().min(0).max(100).default(0),
  dod_ref: z.string().optional(),
  log: z.array(LogEntrySchema).default([]),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const TaskSchema = SubtaskSchema.extend({
  subtasks: z.array(SubtaskSchema).default([]),
});

export const ProposedSubtaskSchema = z.object({
  title: z.string(),
  description: z.string(),
  estimated_complexity: ComplexitySchema,
});

export const ProposalStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
]);

export const ProposalSchema = z.object({
  id: z.string(),
  task_id: z.string(),
  status: ProposalStatusSchema,
  proposed_by: z.string(),
  proposed_at: z.string().datetime(),
  subtasks: z.array(ProposedSubtaskSchema),
});

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(200),
  goal: z.string().max(500),
});

export const MetaSchema = z.object({
  branch: z.string(),
  created_by: z.string(),
  updated_at: z.string().datetime(),
});

export const PlanSchema = z.object({
  schema_version: z.string().regex(/^\d+\.\d+\.\d+$/),
  project: ProjectSchema,
  tasks: z.array(TaskSchema),
  proposals: z.array(ProposalSchema).default([]),
  meta: MetaSchema,
});

// --- TypeScript Types ---

export type LogEntry = z.infer<typeof LogEntrySchema>;
export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type Priority = z.infer<typeof PrioritySchema>;
export type Complexity = z.infer<typeof ComplexitySchema>;
export type Subtask = z.infer<typeof SubtaskSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type ProposedSubtask = z.infer<typeof ProposedSubtaskSchema>;
export type ProposalStatus = z.infer<typeof ProposalStatusSchema>;
export type Proposal = z.infer<typeof ProposalSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type Meta = z.infer<typeof MetaSchema>;
export type Plan = z.infer<typeof PlanSchema>;

// --- Priority ordering ---

export const PRIORITY_ORDER: Record<Priority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};
