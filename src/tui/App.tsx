import React, { useState } from "react";
import { Box, Text, useInput, useApp } from "ink";
import { usePlan } from "./hooks/usePlan.js";
import TaskList from "./components/TaskList.js";
import StatusBar from "./components/StatusBar.js";
import ProposalPanel from "./components/ProposalPanel.js";

export default function App() {
  const plan = usePlan(1000);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { exit } = useApp();

  useInput((input, key) => {
    if (input === "q") {
      exit();
      return;
    }

    if (!plan) return;

    if (key.upArrow) {
      setSelectedIndex((i) => Math.max(0, i - 1));
    }
    if (key.downArrow) {
      setSelectedIndex((i) => Math.min(plan.tasks.length - 1, i + 1));
    }
  });

  if (!plan) {
    return (
      <Box padding={1}>
        <Text color="yellow">Loading plan...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box justifyContent="space-between">
        <Text bold>
          {"─ Workplanr "}
        </Text>
        <Text color="gray">branch: {plan.meta.branch}</Text>
      </Box>

      <Box marginTop={1}>
        <Text bold>Tasks</Text>
        <Text color="gray">{"  "}{plan.tasks.length} total</Text>
      </Box>
      <Text color="gray">
        {"  ──────────────────────────────────────────────────────"}
      </Text>

      <TaskList tasks={plan.tasks} selectedIndex={selectedIndex} />

      <ProposalPanel proposals={plan.proposals} />

      <StatusBar plan={plan} />
    </Box>
  );
}
