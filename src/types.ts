export type MetricKey = "safety" | "guest" | "budget" | "reliability" | "trust";

export type Metrics = Record<MetricKey, number>;

export type AutonomyLevel = "assist" | "recommend" | "act-with-approval" | "act-with-bounds";

export type MemoryPolicy = "none" | "session" | "scoped" | "everything";

export type InstructionStyle = "vague" | "checklist" | "outcome-bound" | "overloaded";

export type ConceptId =
  | "agent-basics"
  | "agent-fit"
  | "instructions"
  | "tools"
  | "structured-outputs"
  | "memory"
  | "planning"
  | "handoffs"
  | "human-loop"
  | "guardrails"
  | "observability"
  | "evals"
  | "multi-agent"
  | "reliability"
  | "capstone";

export interface ConceptDelta {
  concept: ConceptId;
  points: number;
}

export interface ToolDefinition {
  id: string;
  name: string;
  type: "lookup" | "monitor" | "comms" | "analysis" | "control";
  description: string;
  outputTitle: string;
  output: string;
  teaches: ConceptId[];
}

export interface AgentSlot {
  id: string;
  label: string;
  recommendedRole: string;
  starterObjective: string;
  expertPattern: {
    autonomy: AutonomyLevel[];
    memory: MemoryPolicy[];
    instructionStyle: InstructionStyle[];
    minTools: number;
    requiredTools: string[];
    guardrails: string[];
    handoffs: string[];
    evals: string[];
  };
}

export interface AgentDraft {
  id: string;
  name: string;
  role: string;
  objective: string;
  autonomy: AutonomyLevel;
  memory: MemoryPolicy;
  instructionStyle: InstructionStyle;
  selectedTools: string[];
  guardrails: string[];
  handoffs: string[];
  evals: string[];
}

export interface ChoiceEffect {
  metrics: Partial<Metrics>;
  concepts: ConceptDelta[];
}

export interface EventChoice {
  id: string;
  label: string;
  description: string;
  rationale: string;
  effect: ChoiceEffect;
  expert?: boolean;
  needsTool?: string[];
  toolBonus?: ChoiceEffect & { note: string };
}

export interface ScenarioEvent {
  id: string;
  title: string;
  time: string;
  narrative: string;
  pressure: "low" | "medium" | "high" | "critical";
  toolHint: string;
  choices: EventChoice[];
}

export interface Mission {
  id: string;
  title: string;
  festivalPhase: string;
  estimateMinutes: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  tagline: string;
  brief: string;
  learningGoals: string[];
  concepts: ConceptId[];
  agentSlots: AgentSlot[];
  tools: ToolDefinition[];
  events: ScenarioEvent[];
  success: {
    minAverage: number;
    minSafety: number;
    requiredConcepts: ConceptId[];
  };
  debrief: {
    win: string;
    lose: string;
    expertTakeaway: string;
  };
}

export interface ConfigEvaluation {
  score: number;
  metricDelta: Partial<Metrics>;
  conceptDeltas: ConceptDelta[];
  strengths: string[];
  warnings: string[];
}

export interface AppliedChoice {
  eventId: string;
  choiceId: string;
  label: string;
  rationale: string;
  metrics: Partial<Metrics>;
  concepts: ConceptDelta[];
  bonusNote?: string;
}

export interface MissionResult {
  missionId: string;
  completedAt: string;
  passed: boolean;
  score: number;
  metrics: Metrics;
  configScore: number;
  conceptGains: Record<ConceptId, number>;
  choices: AppliedChoice[];
  usedTools: string[];
  debrief: string;
}

export interface GameProgress {
  completedMissionIds: string[];
  currentMissionId: string;
  results: Record<string, MissionResult>;
  conceptMastery: Record<ConceptId, number>;
}
