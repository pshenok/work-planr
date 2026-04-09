import chalk from "chalk";
import { readLessons, addLesson } from "../../core/lessons.js";

export async function lessonsListCommand(): Promise<void> {
  const lessons = await readLessons();

  if (lessons.length === 0) {
    console.log(chalk.gray("No lessons recorded yet."));
    return;
  }

  console.log(`\n  ${chalk.bold("Lessons Learned")} (${lessons.length})\n`);

  for (const l of lessons) {
    const tags = l.tags.length > 0 ? chalk.gray(` [${l.tags.join(", ")}]`) : "";
    console.log(`  ${chalk.yellow(l.id)}${tags}`);
    console.log(`  ${chalk.gray("Context:")} ${l.context}`);
    console.log(`  ${chalk.green("Lesson:")}  ${l.lesson}`);
    console.log();
  }
}

export async function lessonsAddCommand(
  lesson: string,
  options: { context: string; tags?: string },
): Promise<void> {
  const tags = options.tags ? options.tags.split(",").map((t) => t.trim()) : [];
  const entry = await addLesson(options.context, lesson, tags);
  console.log(chalk.green(`Lesson ${entry.id} added.`));
}
