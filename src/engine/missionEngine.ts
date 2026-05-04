import type {
  AgentDraft,
  AgentSlot,
  AppliedChoice,
  ChoiceEffect,
  ConceptDelta,
  ConfigEvaluation,
  EventChoice,
  Mission,
  MissionResult,
  Metrics
} from "../types";
import { applyMetricDelta, averageMetric, foldConceptDeltas } from "./scoring";

const guardrailOptions = [
  "Escalate safety or legal risks to a human lead",
  "Ask for missing critical context before acting",
  "Keep private attendee and artist data out of broad memory",
  "Stay within approved budget and vendor policy",
  "Use verified tool data before sending operational updates",
  "Stop delegation loops after one failed handoff"
];

const handoffOptions = [
  "Hand off unresolved incidents to the human duty manager",
  "Route specialist tasks to the agent with the matching tool",
  "Summarize context, decision, and confidence during every handoff",
  "Request approval before irreversible public comms",
  "Create a trace note when another agent takes ownership"
];

const evalOptions = [
  "Check outcome against the mission success criteria",
  "Verify tool evidence is cited in the response",
  "Measure false alarms and missed incidents",
  "Review cost, latency, and escalation rate",
  "Run a red-team prompt before festival day",
  "Compare agent recommendation with human supervisor decision"
];

export function getGuardrailOptions() {
  return guardrailOptions;
}

export function getHandoffOptions() {
  return handoffOptions;
}

export function getEvalOptions() {
  return evalOptions;
}

export function createDefaultAgent(slot: AgentSlot, index: number): AgentDraft {
  return {
    id: slot.id,
    name: `${slot.label} ${index + 1}`,
    role: slot.recommendedRole,
    objective: slot.starterObjective,
    autonomy: "recommend",
    memory: "session",
    instructionStyle: "checklist",
    selectedTools: slot.expertPattern.requiredTools.slice(0, Math.max(1, slot.expertPattern.minTools)),
    guardrails: slot.expertPattern.guardrails.slice(0, 1),
    handoffs: slot.expertPattern.handoffs.slice(0, 1),
    evals: slot.expertPattern.evals.slice(0, 1)
  };
}

export function evaluateAgentConfig(mission: Mission, agents: AgentDraft[]): ConfigEvaluation {
  let rawScore = 0;
  const maxScore = mission.agentSlots.length * 18;
  const strengths: string[] = [];
  const warnings: string[] = [];
  const conceptDeltas: ConceptDelta[] = [];

  mission.agentSlots.forEach((slot) => {
    const agent = agents.find((candidate) => candidate.id === slot.id);
    if (!agent) {
      warnings.push(`${slot.label} has not been configured.`);
      return;
    }

    const pattern = slot.expertPattern;

    if (agent.objective.trim().length >= 45) {
      rawScore += 2;
      strengths.push(`${slot.label} has a concrete objective.`);
      conceptDeltas.push({ concept: "instructions", points: 3 });
    } else {
      warnings.push(`${slot.label} objective is too thin for reliable delegation.`);
    }

    if (pattern.instructionStyle.includes(agent.instructionStyle)) {
      rawScore += 2;
      conceptDeltas.push({ concept: "instructions", points: 3 });
    } else {
      warnings.push(`${slot.label} instructions do not match the operational risk.`);
    }

    if (pattern.autonomy.includes(agent.autonomy)) {
      rawScore += 2;
      conceptDeltas.push({ concept: "agent-fit", points: 2 });
    } else {
      warnings.push(`${slot.label} autonomy is not calibrated for this mission.`);
    }

    if (pattern.memory.includes(agent.memory)) {
      rawScore += 2;
      conceptDeltas.push({ concept: "memory", points: 2 });
    } else {
      warnings.push(`${slot.label} memory policy may retain too little or too much context.`);
    }

    const requiredToolsCovered = pattern.requiredTools.filter((tool) => agent.selectedTools.includes(tool));
    if (requiredToolsCovered.length === pattern.requiredTools.length) {
      rawScore += 3;
      strengths.push(`${slot.label} has the critical tools for this task.`);
      conceptDeltas.push({ concept: "tools", points: 4 });
    } else {
      warnings.push(`${slot.label} is missing a critical tool.`);
    }

    if (agent.selectedTools.length >= pattern.minTools) {
      rawScore += 1;
    }

    const guardrailsCovered = pattern.guardrails.filter((guardrail) => agent.guardrails.includes(guardrail));
    if (guardrailsCovered.length > 0) {
      rawScore += 2;
      conceptDeltas.push({ concept: "guardrails", points: 3 });
    } else {
      warnings.push(`${slot.label} needs at least one relevant guardrail.`);
    }

    const handoffsCovered = pattern.handoffs.filter((handoff) => agent.handoffs.includes(handoff));
    if (handoffsCovered.length > 0) {
      rawScore += 2;
      conceptDeltas.push({ concept: "handoffs", points: 2 });
    } else {
      warnings.push(`${slot.label} needs a handoff rule.`);
    }

    const evalsCovered = pattern.evals.filter((evalItem) => agent.evals.includes(evalItem));
    if (evalsCovered.length > 0) {
      rawScore += 2;
      conceptDeltas.push({ concept: "evals", points: 2 });
    } else {
      warnings.push(`${slot.label} needs an evaluation check.`);
    }
  });

  const score = Math.round((rawScore / Math.max(maxScore, 1)) * 100);
  const metricDelta: Partial<Metrics> = {
    reliability: Math.round((score - 62) / 4),
    trust: Math.round((score - 60) / 5),
    safety: score >= 76 ? 4 : score < 45 ? -8 : 0,
    budget: score >= 82 ? 3 : score < 40 ? -6 : 0
  };

  if (score >= 82) {
    strengths.push("The agent setup is expert-grade for this scenario.");
    mission.concepts.forEach((concept) => conceptDeltas.push({ concept, points: 2 }));
  } else if (score < 50) {
    warnings.push("The launch plan is fragile. Expect the simulation to punish unclear delegation.");
  }

  return {
    score,
    metricDelta,
    conceptDeltas,
    strengths: unique(strengths),
    warnings: unique(warnings)
  };
}

export function applyChoice(
  metrics: Metrics,
  eventId: string,
  choice: EventChoice,
  usedTools: string[]
): { metrics: Metrics; applied: AppliedChoice } {
  const bonus = getToolBonus(choice, usedTools);
  const mergedEffect = mergeEffects(choice.effect, bonus);
  return {
    metrics: applyMetricDelta(metrics, mergedEffect.metrics),
    applied: {
      eventId,
      choiceId: choice.id,
      label: choice.label,
      rationale: choice.rationale,
      metrics: mergedEffect.metrics,
      concepts: mergedEffect.concepts,
      bonusNote: bonus?.note
    }
  };
}

export function completeMission(
  mission: Mission,
  metrics: Metrics,
  configScore: number,
  choices: AppliedChoice[],
  usedTools: string[],
  configConceptDeltas: ConceptDelta[] = []
): MissionResult {
  const score = Math.round(averageMetric(metrics) * 0.72 + configScore * 0.28);
  const conceptGains = foldConceptDeltas(
    choices.flatMap((choice) => choice.concepts).concat(
      configConceptDeltas,
      mission.concepts.map((concept) => ({
        concept,
        points: score >= 76 ? 7 : score >= 60 ? 4 : 2
      }))
    )
  );
  const passed = score >= mission.success.minAverage && metrics.safety >= mission.success.minSafety;

  return {
    missionId: mission.id,
    completedAt: new Date().toISOString(),
    passed,
    score,
    metrics,
    configScore,
    conceptGains,
    choices,
    usedTools,
    debrief: passed ? mission.debrief.win : mission.debrief.lose
  };
}

function getToolBonus(choice: EventChoice, usedTools: string[]) {
  if (!choice.toolBonus || !choice.needsTool?.length) {
    return undefined;
  }

  return choice.needsTool.every((tool) => usedTools.includes(tool)) ? choice.toolBonus : undefined;
}

function mergeEffects(effect: ChoiceEffect, bonus?: ChoiceEffect): ChoiceEffect {
  if (!bonus) {
    return effect;
  }

  return {
    metrics: {
      safety: (effect.metrics.safety ?? 0) + (bonus.metrics.safety ?? 0),
      guest: (effect.metrics.guest ?? 0) + (bonus.metrics.guest ?? 0),
      budget: (effect.metrics.budget ?? 0) + (bonus.metrics.budget ?? 0),
      reliability: (effect.metrics.reliability ?? 0) + (bonus.metrics.reliability ?? 0),
      trust: (effect.metrics.trust ?? 0) + (bonus.metrics.trust ?? 0)
    },
    concepts: effect.concepts.concat(bonus.concepts)
  };
}

function unique(items: string[]) {
  return Array.from(new Set(items));
}
