import React from "react";
import { Box, Text } from "ink";
import type { Proposal } from "../../types/plan.js";

interface ProposalPanelProps {
  proposals: Proposal[];
}

export default function ProposalPanel({ proposals }: ProposalPanelProps) {
  const pending = proposals.filter((p) => p.status === "pending");

  if (pending.length === 0) return null;

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold color="yellow">
        Proposals ({pending.length} pending)
      </Text>
      <Text color="gray">
        {"  ──────────────────────────────────────────"}
      </Text>
      {pending.map((p) => (
        <Box key={p.id} flexDirection="column" paddingLeft={2}>
          <Text>
            {p.id}: {p.proposed_by} wants to split {p.task_id} into{" "}
            {p.subtasks.length} subtasks
          </Text>
          {p.subtasks.map((s, i) => (
            <Text key={i} color="gray">
              {"    "}
              {i + 1}. {s.title} [{s.estimated_complexity}]
            </Text>
          ))}
          <Text color="gray">
            {"  "}Use: wp propose approve {p.id} | wp propose reject {p.id}
          </Text>
        </Box>
      ))}
    </Box>
  );
}
