import React from "react";
import { Box, Text } from "ink";
import type { Task } from "../../types/plan.js";
import TaskRow from "./TaskRow.js";

interface TaskListProps {
  tasks: Task[];
  selectedIndex: number;
}

export default function TaskList({ tasks, selectedIndex }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <Box paddingLeft={2}>
        <Text color="gray">No tasks. Run `wp add` to create one.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {tasks.map((task, i) => (
        <TaskRow key={task.id} task={task} selected={i === selectedIndex} />
      ))}
    </Box>
  );
}
