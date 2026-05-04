import type { ConceptDelta, ConceptId, Metrics } from "../types";

export const metricKeys = ["safety", "guest", "budget", "reliability", "trust"] as const;

export const initialMetrics: Metrics = {
  safety: 72,
  guest: 70,
  budget: 74,
  reliability: 68,
  trust: 66
};

export const conceptLabels: Record<ConceptId, string> = {
  "agent-basics": "Agent basics",
  "agent-fit": "When to use agents",
  instructions: "Instructions",
  tools: "Tools",
  "structured-outputs": "Structured outputs",
  memory: "Memory",
  planning: "Planning",
  handoffs: "Handoffs",
  "human-loop": "Human-in-the-loop",
  guardrails: "Guardrails",
  observability: "Observability",
  evals: "Evals",
  "multi-agent": "Multi-agent systems",
  reliability: "Reliability",
  capstone: "Capstone"
};

export function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

export function applyMetricDelta(metrics: Metrics, delta: Partial<Metrics>): Metrics {
  return {
    safety: clamp(metrics.safety + (delta.safety ?? 0)),
    guest: clamp(metrics.guest + (delta.guest ?? 0)),
    budget: clamp(metrics.budget + (delta.budget ?? 0)),
    reliability: clamp(metrics.reliability + (delta.reliability ?? 0)),
    trust: clamp(metrics.trust + (delta.trust ?? 0))
  };
}

export function averageMetric(metrics: Metrics) {
  const total = metricKeys.reduce((sum, key) => sum + metrics[key], 0);
  return Math.round(total / metricKeys.length);
}

export function foldConceptDeltas(deltas: ConceptDelta[]) {
  return deltas.reduce<Record<ConceptId, number>>((acc, delta) => {
    acc[delta.concept] = clamp((acc[delta.concept] ?? 0) + delta.points);
    return acc;
  }, {} as Record<ConceptId, number>);
}

export function mergeConceptMastery(
  current: Record<ConceptId, number>,
  gains: Record<ConceptId, number>
) {
  const next = { ...current };
  Object.entries(gains).forEach(([concept, points]) => {
    const key = concept as ConceptId;
    next[key] = clamp((next[key] ?? 0) + points);
  });
  return next;
}

export function emptyConceptMastery() {
  return Object.keys(conceptLabels).reduce<Record<ConceptId, number>>((acc, concept) => {
    acc[concept as ConceptId] = 0;
    return acc;
  }, {} as Record<ConceptId, number>);
}
