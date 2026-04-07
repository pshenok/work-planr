import React from "react";
import { Box, Text } from "ink";
import type { Plan } from "../../types/plan.js";

interface StatusBarProps {
  plan: Plan;
}

export default function StatusBar({ plan }: StatusBarProps) {
  const counts = { pending: 0, in_progress: 0, blocked: 0, done: 0 };
  for (const task of plan.tasks) {
    counts[task.status]++;
  }

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box>
        <Text color="gray">  </Text>
        <Text color="green">✓ {counts.done}</Text>
        <Text>  </Text>
        <Text color="yellow">● {counts.in_progress}</Text>
        <Text>  </Text>
        <Text color="red">✗ {counts.blocked}</Text>
        <Text>  </Text>
        <Text color="gray">○ {counts.pending}</Text>
        <Text>    </Text>
        <Text color="gray">↑↓ navigate  q quit  r refresh</Text>
      </Box>
    </Box>
  );
}
