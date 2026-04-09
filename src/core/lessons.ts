import fs from "node:fs/promises";
import path from "node:path";
import { LessonSchema, type Lesson } from "../types/plan.js";
import { getPlanrDir, nowISO } from "./plan.js";
import { generateId } from "./uuid.js";

function getLessonsPath(cwd: string = process.cwd()): string {
  return path.join(getPlanrDir(cwd), "lessons.json");
}

export async function readLessons(cwd?: string): Promise<Lesson[]> {
  try {
    const raw = await fs.readFile(getLessonsPath(cwd), "utf8");
    const data = JSON.parse(raw);
    return data.map((d: unknown) => LessonSchema.parse(d));
  } catch {
    return [];
  }
}

export async function addLesson(
  context: string,
  lesson: string,
  tags: string[] = [],
  cwd?: string,
): Promise<Lesson> {
  const lessons = await readLessons(cwd);

  const entry: Lesson = {
    id: `lesson-${String(lessons.length + 1).padStart(3, "0")}`,
    created_at: nowISO(),
    context,
    lesson,
    tags,
  };

  lessons.push(entry);

  const filePath = getLessonsPath(cwd);
  const tmpPath = filePath + ".tmp";
  await fs.writeFile(tmpPath, JSON.stringify(lessons, null, 2) + "\n", "utf8");
  await fs.rename(tmpPath, filePath);

  return entry;
}

export async function getLessonsForContext(
  tags: string[],
  cwd?: string,
): Promise<Lesson[]> {
  const lessons = await readLessons(cwd);
  if (tags.length === 0) return lessons;
  return lessons.filter((l) => l.tags.some((t) => tags.includes(t)));
}
