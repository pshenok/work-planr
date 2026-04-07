import { useState, useEffect } from "react";
import fs from "node:fs/promises";
import { PlanSchema, type Plan } from "../../types/plan.js";
import { getPlanPath } from "../../core/plan.js";

export function usePlan(intervalMs: number = 1000): Plan | null {
  const [plan, setPlan] = useState<Plan | null>(null);

  useEffect(() => {
    const planPath = getPlanPath();

    async function load() {
      try {
        const raw = await fs.readFile(planPath, "utf8");
        const data = JSON.parse(raw);
        setPlan(PlanSchema.parse(data));
      } catch {
        // File might not exist or be malformed
      }
    }

    load();
    const interval = setInterval(load, intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs]);

  return plan;
}
