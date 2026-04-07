import React from "react";
import { Text, Box } from "ink";
import type { Task, TaskStatus } from "../../types/plan.js";

const STATUS_ICONS: Record<TaskStatus, { icon: string; color: string }> = {
  in_progress: { icon: "●", color: "yellow" },
  pending: { icon: "○", color: "gray" },
  done: { icon: "✓", color: "green" },
  blocked: { icon: "✗", color: "red" },
};

function ProgressBar({ progress }: { progress: number }) {
  const width = 10;
  const filled = Math.round((progress / 100) * width);
  const empty = width - filled;
  return (
    <Text>
      <Text color="green">{"█".repeat(filled)}</Text>
      <Text color="gray">{"░".repeat(empty)}</Text>
    </Text>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    critical: "red",
    high: "yellow",
    medium: "blue",
    low: "gray",
  };
  return <Text color={colors[priority] || "white"}>{priority}</Text>;
}

interface TaskRowProps {
  task: Task;
  selected: boolean;
}

export default function TaskRow({ task, selected }: TaskRowProps) {
  const { icon, color } = STATUS_ICONS[task.status];
  return (
    <Box>
      <Text color={selected ? "cyan" : undefined} bold={selected}>
        {selected ? "› " : "  "}
      </Text>
      <Text>[</Text>
      <Text color={color}>{icon}</Text>
      <Text>] </Text>
      <Text>{task.id.padEnd(10)}</Text>
      <Text> </Text>
      <Text>{task.title.padEnd(28).slice(0, 28)}</Text>
      <Text> </Text>
      <ProgressBar progress={task.progress} />
      <Text> {String(task.progress).padStart(3)}%  </Text>
      <PriorityBadge priority={task.priority} />
    </Box>
  );
}
