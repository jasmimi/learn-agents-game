import { describe, expect, it } from "vitest";
import { missions } from "../../data/missions";
import {
  applyChoice,
  completeMission,
  createDefaultAgent,
  evaluateAgentConfig
} from "../missionEngine";
import { initialMetrics } from "../scoring";

describe("mission engine", () => {
  it("scores the default mission configuration and surfaces feedback", () => {
    const mission = missions[0];
    const agents = mission.agentSlots.map((slot, index) => createDefaultAgent(slot, index));
    const evaluation = evaluateAgentConfig(mission, agents);

    expect(evaluation.score).toBeGreaterThan(50);
    expect(evaluation.strengths.length).toBeGreaterThan(0);
    expect(evaluation.conceptDeltas.some((delta) => delta.concept === "tools")).toBe(true);
  });

  it("applies tool bonuses only when required tools were inspected", () => {
    const mission = missions[0];
    const event = mission.events[0];
    const expertChoice = event.choices[0];

    const withoutTools = applyChoice(initialMetrics, event.id, expertChoice, []);
    const withTools = applyChoice(initialMetrics, event.id, expertChoice, ["ops-runbook", "faq-inbox"]);

    expect(withTools.metrics.safety).toBeGreaterThan(withoutTools.metrics.safety);
    expect(withTools.applied.bonusNote).toBeDefined();
    expect(withoutTools.applied.bonusNote).toBeUndefined();
  });

  it("creates a passing result for expert choices and strong configuration", () => {
    const mission = missions[0];
    const agents = mission.agentSlots.map((slot, index) => createDefaultAgent(slot, index));
    const evaluation = evaluateAgentConfig(mission, agents);
    let metrics = initialMetrics;
    const choices = [];
    const usedTools = mission.tools.map((tool) => tool.id);

    for (const event of mission.events) {
      const expertChoice = event.choices.find((choice) => choice.expert) ?? event.choices[0];
      const applied = applyChoice(metrics, event.id, expertChoice, usedTools);
      metrics = applied.metrics;
      choices.push(applied.applied);
    }

    const result = completeMission(
      mission,
      metrics,
      evaluation.score,
      choices,
      usedTools,
      evaluation.conceptDeltas
    );

    expect(result.passed).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(mission.success.minAverage);
    expect(result.conceptGains["agent-basics"]).toBeGreaterThan(0);
  });
});
