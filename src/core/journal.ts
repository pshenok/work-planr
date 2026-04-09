import fs from "node:fs/promises";
import path from "node:path";
import { JournalEntrySchema, type JournalEntry } from "../types/plan.js";
import { getPlanrDir, nowISO } from "./plan.js";
import { currentBranch } from "./git.js";
import { generateId } from "./uuid.js";

function getJournalDir(cwd: string = process.cwd()): string {
  return path.join(getPlanrDir(cwd), "journal");
}

function journalPath(sessionId: string, cwd?: string): string {
  return path.join(getJournalDir(cwd), `${sessionId}.json`);
}

export async function startSession(
  agent: string,
  cwd?: string,
): Promise<JournalEntry> {
  const dir = getJournalDir(cwd);
  await fs.mkdir(dir, { recursive: true });

  const entry: JournalEntry = {
    session_id: generateId(),
    started_at: nowISO(),
    agent,
    branch: currentBranch(),
    tasks_worked: [],
    tasks_completed: [],
    decisions: [],
    files_changed: [],
    blockers: [],
  };

  await writeJournal(entry, cwd);
  return entry;
}

export async function readJournal(
  sessionId: string,
  cwd?: string,
): Promise<JournalEntry> {
  const raw = await fs.readFile(journalPath(sessionId, cwd), "utf8");
  return JournalEntrySchema.parse(JSON.parse(raw));
}

export async function writeJournal(
  entry: JournalEntry,
  cwd?: string,
): Promise<void> {
  const filePath = journalPath(entry.session_id, cwd);
  const tmpPath = filePath + ".tmp";
  await fs.writeFile(tmpPath, JSON.stringify(entry, null, 2) + "\n", "utf8");
  await fs.rename(tmpPath, filePath);
}

export async function updateJournal(
  sessionId: string,
  update: Partial<
    Pick<
      JournalEntry,
      | "tasks_worked"
      | "tasks_completed"
      | "decisions"
      | "files_changed"
      | "blockers"
      | "summary"
      | "ended_at"
    >
  >,
  cwd?: string,
): Promise<JournalEntry> {
  const entry = await readJournal(sessionId, cwd);

  if (update.tasks_worked) {
    entry.tasks_worked = [
      ...new Set([...entry.tasks_worked, ...update.tasks_worked]),
    ];
  }
  if (update.tasks_completed) {
    entry.tasks_completed = [
      ...new Set([...entry.tasks_completed, ...update.tasks_completed]),
    ];
  }
  if (update.decisions) {
    entry.decisions = [...entry.decisions, ...update.decisions];
  }
  if (update.files_changed) {
    entry.files_changed = [
      ...new Set([...entry.files_changed, ...update.files_changed]),
    ];
  }
  if (update.blockers) {
    entry.blockers = [...entry.blockers, ...update.blockers];
  }
  if (update.summary !== undefined) entry.summary = update.summary;
  if (update.ended_at !== undefined) entry.ended_at = update.ended_at;

  await writeJournal(entry, cwd);
  return entry;
}

export async function endSession(
  sessionId: string,
  summary: string,
  cwd?: string,
): Promise<JournalEntry> {
  return updateJournal(sessionId, { ended_at: nowISO(), summary }, cwd);
}

export async function getLastJournal(
  cwd?: string,
): Promise<JournalEntry | null> {
  const dir = getJournalDir(cwd);
  let files: string[];
  try {
    files = await fs.readdir(dir);
  } catch {
    return null;
  }

  const jsonFiles = files.filter((f) => f.endsWith(".json")).sort();
  if (jsonFiles.length === 0) return null;

  // Read all and find the most recent by started_at
  let latest: JournalEntry | null = null;
  for (const file of jsonFiles) {
    try {
      const raw = await fs.readFile(path.join(dir, file), "utf8");
      const entry = JournalEntrySchema.parse(JSON.parse(raw));
      if (!latest || entry.started_at > latest.started_at) {
        latest = entry;
      }
    } catch {
      continue;
    }
  }

  return latest;
}
