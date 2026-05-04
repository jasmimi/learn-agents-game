import { useEffect, useId, useMemo, useRef, useState } from "react";
import mapArt from "./assets/festival-map.svg";
import { getMissionById, getNextMissionId, missions } from "./data/missions";
import {
  applyChoice,
  completeMission,
  createDefaultAgent,
  evaluateAgentConfig,
  getEvalOptions,
  getGuardrailOptions,
  getHandoffOptions
} from "./engine/missionEngine";
import { addMissionResult, loadProgress, resetProgress, saveProgress } from "./engine/storage";
import { applyMetricDelta, averageMetric, conceptLabels, initialMetrics, metricKeys } from "./engine/scoring";
import type {
  AgentDraft,
  AppliedChoice,
  AutonomyLevel,
  ConfigEvaluation,
  ConceptId,
  InstructionStyle,
  MetricKey,
  MemoryPolicy,
  Mission,
  MissionResult
} from "./types";

type TourTarget =
  | "campaign"
  | "mission"
  | "metrics"
  | "workbench"
  | "config"
  | "tools"
  | "inbox"
  | "mastery";

interface TutorialStep {
  target: TourTarget;
  title: string;
  body: string;
}

const autonomyLabels: Record<AutonomyLevel, string> = {
  assist: "Assist only",
  recommend: "Recommend",
  "act-with-approval": "Act with approval",
  "act-with-bounds": "Act inside bounds"
};

const memoryLabels: Record<MemoryPolicy, string> = {
  none: "No memory",
  session: "Session memory",
  scoped: "Scoped memory",
  everything: "Remember everything"
};

const instructionLabels: Record<InstructionStyle, string> = {
  vague: "Vague prompt",
  checklist: "Checklist",
  "outcome-bound": "Outcome-bound",
  overloaded: "Overloaded prompt"
};

const tutorialStorageKey = "festival-agents-tutorial-v1";

const tutorialSteps: TutorialStep[] = [
  {
    target: "campaign",
    title: "Pick the current mission",
    body:
      "The campaign unlocks one mission at a time. Start with the selected mission, finish its incidents, then use the debrief to unlock the next scenario."
  },
  {
    target: "mission",
    title: "Read the mission brief",
    body:
      "The brief tells you what kind of agent decision the mission is teaching. The learning goals are clues for the setup choices that will matter most."
  },
  {
    target: "metrics",
    title: "Watch the operating metrics",
    body:
      "Before launch these numbers preview your agent setup risk. During a run, your incident choices move safety, guest experience, budget, reliability, and trust."
  },
  {
    target: "workbench",
    title: "Configure the agent",
    body:
      "Tune the objective, autonomy, memory, instructions, tools, guardrails, handoffs, and evals. Good setups make the simulation more resilient before you make any incident choices."
  },
  {
    target: "config",
    title: "Use the config score as feedback",
    body:
      "The config score estimates how well your agent design fits the mission. Strengths and risks below the workbench explain what is helping or hurting the setup."
  },
  {
    target: "tools",
    title: "Inspect tools before deciding",
    body:
      "There are two tool moments: equip tools in the workbench, then inspect simulated tool output here during the scenario. Some choices get better results only when the right tool has been inspected."
  },
  {
    target: "inbox",
    title: "Launch and choose responses",
    body:
      "Launch the simulation when the setup looks reasonable. Each incident gives you response options, and missing tool insight warnings tell you when evidence is still needed."
  },
  {
    target: "mastery",
    title: "Debrief and improve",
    body:
      "After the last incident, the debrief explains your choices and updates concept mastery. Replay a mission to improve the score, or move to the next unlocked mission."
  }
];

const metricHelp: Record<MetricKey, string> = {
  safety:
    "Safety measures whether the agent keeps risky decisions under control. Human approval, verified information, and escalation rules usually protect it.",
  guest:
    "Guest experience reflects whether attendees get useful, timely help. It improves when the agent handles repeatable work without ignoring context.",
  budget:
    "Budget tracks cost and financial risk. Strong guardrails prevent agents from making expensive promises or creating avoidable manual cleanup.",
  reliability:
    "Reliability measures how consistently the system follows the right process. Clear instructions, tools, evals, and handoffs usually raise it.",
  trust:
    "Trust reflects whether staff and guests can rely on the agent. Transparent limits, approvals, and evidence-backed responses protect it."
};

const helpText = {
  objective:
    "A useful objective names the job, the desired outcome, and when to escalate. If it could apply to any assistant, it is probably too vague for a reliable agent.",
  autonomy:
    "Autonomy controls how much the agent can do without a person. Use lower autonomy for risky or irreversible work, and higher autonomy only when the task has clear bounds and safe stop rules.",
  memory:
    "Memory controls what context carries forward. Session or scoped memory usually gives continuity without storing every private detail forever.",
  instructions:
    "Instruction style shapes how predictable the agent is. Checklist and outcome-bound prompts usually beat vague goals because they define process, evidence, and success.",
  config:
    "This score is a design-fit estimate, not a final grade. It rewards agent settings that match the mission's expert pattern and applies a starting metric adjustment when you launch.",
  workbenchTools:
    "Workbench tools equip the agent with capabilities. The Tool Simulator still needs to be inspected during a run so your choices can use fresh evidence.",
  guardrails:
    "Guardrails are rules that keep the agent inside safe operating limits, such as escalating legal or safety decisions instead of acting alone.",
  handoffs:
    "Handoffs define who owns the next step when the agent cannot safely finish. Good handoffs include context, confidence, and a clear receiving owner.",
  evals:
    "Evals are checks that compare the agent's output with the mission goal. They help you catch failures instead of assuming a plausible answer worked.",
  toolSimulator:
    "Inspecting a tool reveals deterministic scenario evidence. Some expert choices only earn their full effect after the relevant tools have been inspected.",
  scenarioInbox:
    "This is where the run happens. Launch the mission, inspect relevant tools, choose a response for each incident, then read the debrief after the final event."
};

const guardrailOptions = getGuardrailOptions();
const handoffOptions = getHandoffOptions();
const evalOptions = getEvalOptions();

function loadTutorialComplete() {
  if (typeof localStorage === "undefined") {
    return false;
  }

  try {
    return localStorage.getItem(tutorialStorageKey) === "complete";
  } catch {
    return false;
  }
}

function saveTutorialComplete() {
  if (typeof localStorage === "undefined") {
    return;
  }

  try {
    localStorage.setItem(tutorialStorageKey, "complete");
  } catch {
    // Tutorial state is helpful but not required for the game to run.
  }
}

export default function App() {
  const firstMissionId = missions[0].id;
  const [progress, setProgress] = useState(() => loadProgress(firstMissionId));
  const [selectedMissionId, setSelectedMissionId] = useState(progress.currentMissionId);
  const mission = getMissionById(selectedMissionId);
  const [agents, setAgents] = useState<AgentDraft[]>(() =>
    mission.agentSlots.map((slot, index) => createDefaultAgent(slot, index))
  );
  const [usedTools, setUsedTools] = useState<string[]>([]);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [eventIndex, setEventIndex] = useState(0);
  const [launched, setLaunched] = useState(false);
  const [appliedChoices, setAppliedChoices] = useState<AppliedChoice[]>([]);
  const [runResult, setRunResult] = useState<MissionResult | undefined>();
  const [configAtLaunch, setConfigAtLaunch] = useState<ConfigEvaluation | undefined>();
  const [tutorialOpen, setTutorialOpen] = useState(() => !loadTutorialComplete());
  const [tutorialStep, setTutorialStep] = useState(0);

  const configEvaluation = useMemo(() => evaluateAgentConfig(mission, agents), [agents, mission]);
  const previewMetrics = useMemo(
    () => applyMetricDelta(initialMetrics, configEvaluation.metricDelta),
    [configEvaluation]
  );
  const visibleMetrics = launched ? metrics : previewMetrics;
  const activeEvent = mission.events[eventIndex];
  const storedResult = !launched ? progress.results[mission.id] : undefined;
  const activeResult = runResult ?? storedResult;
  const campaignPercent = Math.round((progress.completedMissionIds.length / missions.length) * 100);
  const activeTourTarget = tutorialOpen ? tutorialSteps[tutorialStep]?.target : undefined;
  const masteryAverage = Math.round(
    Object.values(progress.conceptMastery).reduce((sum, score) => sum + score, 0) /
      Object.values(progress.conceptMastery).length
  );

  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  useEffect(() => {
    const nextMission = getMissionById(selectedMissionId);
    setAgents(nextMission.agentSlots.map((slot, index) => createDefaultAgent(slot, index)));
    setUsedTools([]);
    setMetrics(initialMetrics);
    setEventIndex(0);
    setLaunched(false);
    setAppliedChoices([]);
    setRunResult(undefined);
    setConfigAtLaunch(undefined);
  }, [selectedMissionId]);

  function updateAgent(agentId: string, patch: Partial<AgentDraft>) {
    setAgents((current) =>
      current.map((agent) => (agent.id === agentId ? { ...agent, ...patch } : agent))
    );
  }

  function toggleAgentArray(agentId: string, field: keyof Pick<AgentDraft, "selectedTools" | "guardrails" | "handoffs" | "evals">, value: string) {
    setAgents((current) =>
      current.map((agent) => {
        if (agent.id !== agentId) {
          return agent;
        }
        const values = agent[field];
        return {
          ...agent,
          [field]: values.includes(value)
            ? values.filter((item) => item !== value)
            : values.concat(value)
        };
      })
    );
  }

  function selectMission(candidate: Mission, index: number) {
    if (isMissionUnlocked(index)) {
      setSelectedMissionId(candidate.id);
    }
  }

  function isMissionUnlocked(index: number) {
    return index === 0 || progress.completedMissionIds.includes(missions[index - 1].id);
  }

  function useTool(toolId: string) {
    setUsedTools((current) => (current.includes(toolId) ? current : current.concat(toolId)));
  }

  function launchMission() {
    const evaluation = evaluateAgentConfig(mission, agents);
    setConfigAtLaunch(evaluation);
    setMetrics(applyMetricDelta(initialMetrics, evaluation.metricDelta));
    setUsedTools([]);
    setEventIndex(0);
    setAppliedChoices([]);
    setRunResult(undefined);
    setLaunched(true);
  }

  function choose(choiceId: string) {
    if (!activeEvent) {
      return;
    }

    const choice = activeEvent.choices.find((item) => item.id === choiceId);
    if (!choice) {
      return;
    }

    const applied = applyChoice(metrics, activeEvent.id, choice, usedTools);
    const nextChoices = appliedChoices.concat(applied.applied);
    setMetrics(applied.metrics);
    setAppliedChoices(nextChoices);

    if (eventIndex >= mission.events.length - 1) {
      const launchConfig = configAtLaunch ?? configEvaluation;
      const result = completeMission(
        mission,
        applied.metrics,
        launchConfig.score,
        nextChoices,
        usedTools,
        launchConfig.conceptDeltas
      );
      setRunResult(result);
      setLaunched(false);
      setProgress((current) => addMissionResult(current, result, getNextMissionId(mission.id)));
      return;
    }

    setEventIndex((current) => current + 1);
  }

  function resetAllProgress() {
    if (window.confirm("Reset all Festival Agents progress?")) {
      const reset = resetProgress(firstMissionId);
      setProgress(reset);
      setSelectedMissionId(firstMissionId);
    }
  }

  function tourActive(target: TourTarget) {
    return activeTourTarget === target ? "true" : undefined;
  }

  function openTutorial() {
    setTutorialStep(0);
    setTutorialOpen(true);
  }

  function closeTutorial() {
    saveTutorialComplete();
    setTutorialOpen(false);
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow">R&V-style festival ops simulator</p>
          <h1>Festival Agents</h1>
          <p>
            Learn agent design by running a New Year music festival command centre. Start with
            almost no agent knowledge and finish by operating a bounded multi-agent system.
          </p>
          <div className="hero-actions">
            <button className="primary-button" type="button" onClick={launchMission}>
              <Icon name="play" />
              Launch Mission
            </button>
            <button className="ghost-button" type="button" onClick={openTutorial}>
              <Icon name="help" />
              Tutorial
            </button>
            <button className="ghost-button" type="button" onClick={resetAllProgress}>
              <Icon name="reset" />
              Reset Progress
            </button>
          </div>
        </div>
        <div className="hero-visual" aria-label="Festival operations map">
          <img src={mapArt} alt="Illustrated festival map with stages, gates, vendor village, and command signal" />
        </div>
      </header>

      <main className="game-layout">
        <aside className="sidebar">
          <section className="panel compact" data-tour="campaign" data-tour-active={tourActive("campaign")}>
            <div className="panel-title-row">
              <h2>Campaign</h2>
              <span className="pill">{campaignPercent}%</span>
            </div>
            <div className="progress-track" aria-label="Campaign progress">
              <span style={{ width: `${campaignPercent}%` }} />
            </div>
            <p className="small-copy">
              {progress.completedMissionIds.length} of {missions.length} missions complete.
            </p>
          </section>

          <nav className="mission-nav" aria-label="Mission list">
            {missions.map((candidate, index) => {
              const unlocked = isMissionUnlocked(index);
              const completed = progress.completedMissionIds.includes(candidate.id);
              const selected = candidate.id === mission.id;
              return (
                <button
                  key={candidate.id}
                  type="button"
                  className={`mission-button ${selected ? "selected" : ""} ${!unlocked ? "locked" : ""}`}
                  onClick={() => selectMission(candidate, index)}
                  disabled={!unlocked}
                >
                  <span className="mission-index">{completed ? <Icon name="check" /> : index + 1}</span>
                  <span>
                    <strong>{candidate.title}</strong>
                    <small>
                      {candidate.festivalPhase} · {candidate.estimateMinutes} min
                    </small>
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="workspace">
          <MissionHeader mission={mission} activeResult={activeResult} tourActive={tourActive("mission")} />

          <div
            className="metrics-grid"
            aria-label="Operational metrics"
            data-tour="metrics"
            data-tour-active={tourActive("metrics")}
          >
            {metricKeys.map((key) => (
              <MetricCard key={key} metric={key} label={labelMetric(key)} value={visibleMetrics[key]} />
            ))}
          </div>

          <div className="two-column">
            <section className="panel" data-tour="workbench" data-tour-active={tourActive("workbench")}>
              <div className="panel-title-row">
                <h2>Agent Workbench</h2>
                <div className="score-help" data-tour="config" data-tour-active={tourActive("config")}>
                  <span className={`score-badge ${configEvaluation.score >= 76 ? "good" : configEvaluation.score < 52 ? "warn" : ""}`}>
                    Config {configEvaluation.score}
                  </span>
                  <HelpTooltip label="Config score">{helpText.config}</HelpTooltip>
                </div>
              </div>
              <p className="small-copy">
                Configure autonomy, memory, tools, handoffs, guardrails, and evals before the run.
              </p>
              <div className="agent-list">
                {agents.map((agent) => (
                  <AgentEditor
                    key={agent.id}
                    agent={agent}
                    mission={mission}
                    disabled={launched}
                    updateAgent={updateAgent}
                    toggleAgentArray={toggleAgentArray}
                  />
                ))}
              </div>
              <ConfigFeedback evaluation={configEvaluation} />
            </section>

            <section className="panel" data-tour="tools" data-tour-active={tourActive("tools")}>
              <div className="panel-title-row">
                <div className="heading-with-help">
                  <h2>Tool Simulator</h2>
                  <HelpTooltip label="Tool simulator">{helpText.toolSimulator}</HelpTooltip>
                </div>
                <span className="pill">{usedTools.length}/{mission.tools.length} used</span>
              </div>
              <p className="small-copy">
                Tools are deterministic local simulations. Use them before decisions to unlock better outcomes.
              </p>
              <div className="tool-grid">
                {mission.tools.map((tool) => {
                  const used = usedTools.includes(tool.id);
                  return (
                    <article className={`tool-card ${used ? "used" : ""}`} key={tool.id}>
                      <div className="tool-header">
                        <Icon name={tool.type === "monitor" ? "radio" : tool.type === "analysis" ? "trace" : "tool"} />
                        <div>
                          <h3>{tool.name}</h3>
                          <p>{tool.description}</p>
                        </div>
                      </div>
                      <button type="button" className="small-button" onClick={() => useTool(tool.id)}>
                        <Icon name="inspect" />
                        Inspect
                      </button>
                      {used && (
                        <div className="tool-output">
                          <strong>{tool.outputTitle}</strong>
                          <p>{tool.output}</p>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          </div>

          <section className="panel inbox-panel" data-tour="inbox" data-tour-active={tourActive("inbox")}>
            <div className="panel-title-row">
              <div className="heading-with-help">
                <h2>Scenario Inbox</h2>
                <HelpTooltip label="Scenario inbox">{helpText.scenarioInbox}</HelpTooltip>
              </div>
              <span className="pill">
                {launched ? `Event ${eventIndex + 1}/${mission.events.length}` : activeResult ? "Debrief" : "Ready"}
              </span>
            </div>
            {activeResult ? (
              <Debrief result={activeResult} mission={mission} selectNext={() => setSelectedMissionId(getNextMissionId(mission.id))} />
            ) : launched && activeEvent ? (
              <EventPanel event={activeEvent} usedTools={usedTools} mission={mission} choose={choose} />
            ) : (
              <LaunchPanel mission={mission} configEvaluation={configEvaluation} launchMission={launchMission} />
            )}
          </section>
        </section>

        <aside className="sidebar rightbar">
          <section className="panel compact" data-tour="mastery" data-tour-active={tourActive("mastery")}>
            <div className="panel-title-row">
              <h2>Mastery</h2>
              <span className="pill">{masteryAverage}%</span>
            </div>
            <div className="concept-list">
              {Object.entries(conceptLabels).map(([concept, label]) => (
                <div className="concept-row" key={concept}>
                  <span>{label}</span>
                  <div className="mini-track">
                    <span style={{ width: `${progress.conceptMastery[concept as ConceptId] ?? 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel compact">
            <h2>Expert Model</h2>
            <ul className="check-list">
              <li>Use agents when a goal needs decisions, tools, and feedback.</li>
              <li>Limit autonomy by risk, reversibility, and confidence.</li>
              <li>Give tools, structured outputs, memory policy, and guardrails.</li>
              <li>Debug with traces and evaluate against real outcomes.</li>
              <li>Coordinate multi-agent systems with ownership and stop rules.</li>
            </ul>
          </section>
        </aside>
      </main>
      {tutorialOpen && (
        <TutorialOverlay
          steps={tutorialSteps}
          currentIndex={tutorialStep}
          onBack={() => setTutorialStep((current) => Math.max(0, current - 1))}
          onNext={() => setTutorialStep((current) => Math.min(tutorialSteps.length - 1, current + 1))}
          onClose={closeTutorial}
        />
      )}
    </div>
  );
}

function MissionHeader({
  mission,
  activeResult,
  tourActive
}: {
  mission: Mission;
  activeResult?: MissionResult;
  tourActive?: string;
}) {
  return (
    <section className="mission-header" data-tour="mission" data-tour-active={tourActive}>
      <div>
        <p className="eyebrow">{mission.festivalPhase}</p>
        <h2>{mission.title}</h2>
        <p>{mission.brief}</p>
      </div>
      <div className="mission-facts">
        <span>Difficulty {mission.difficulty}/5</span>
        <span>{mission.estimateMinutes} min</span>
        <span>{mission.events.length} incidents</span>
        {activeResult && <span>Best score {activeResult.score}</span>}
      </div>
      <div className="learning-goals">
        {mission.learningGoals.map((goal) => (
          <span key={goal}>{goal}</span>
        ))}
      </div>
    </section>
  );
}

function AgentEditor({
  agent,
  mission,
  disabled,
  updateAgent,
  toggleAgentArray
}: {
  agent: AgentDraft;
  mission: Mission;
  disabled: boolean;
  updateAgent: (agentId: string, patch: Partial<AgentDraft>) => void;
  toggleAgentArray: (
    agentId: string,
    field: keyof Pick<AgentDraft, "selectedTools" | "guardrails" | "handoffs" | "evals">,
    value: string
  ) => void;
}) {
  return (
    <article className="agent-card">
      <div className="agent-card-head">
        <Icon name="agent" />
        <div>
          <h3>{agent.name}</h3>
          <p>{agent.role}</p>
        </div>
      </div>
      <div className="field-control">
        <div className="label-title" id={`${agent.id}-objective-label`}>
          <span>Objective</span>
          <HelpTooltip label="Objective">{helpText.objective}</HelpTooltip>
        </div>
        <textarea
          aria-labelledby={`${agent.id}-objective-label`}
          value={agent.objective}
          disabled={disabled}
          rows={3}
          onChange={(event) => updateAgent(agent.id, { objective: event.target.value })}
        />
      </div>
      <div className="field-grid">
        <div className="field-control">
          <div className="label-title" id={`${agent.id}-autonomy-label`}>
            <span>Autonomy</span>
            <HelpTooltip label="Autonomy">{helpText.autonomy}</HelpTooltip>
          </div>
          <select
            aria-labelledby={`${agent.id}-autonomy-label`}
            value={agent.autonomy}
            disabled={disabled}
            onChange={(event) => updateAgent(agent.id, { autonomy: event.target.value as AutonomyLevel })}
          >
            {Object.entries(autonomyLabels).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="field-control">
          <div className="label-title" id={`${agent.id}-memory-label`}>
            <span>Memory</span>
            <HelpTooltip label="Memory">{helpText.memory}</HelpTooltip>
          </div>
          <select
            aria-labelledby={`${agent.id}-memory-label`}
            value={agent.memory}
            disabled={disabled}
            onChange={(event) => updateAgent(agent.id, { memory: event.target.value as MemoryPolicy })}
          >
            {Object.entries(memoryLabels).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="field-control">
          <div className="label-title" id={`${agent.id}-instructions-label`}>
            <span>Instructions</span>
            <HelpTooltip label="Instructions">{helpText.instructions}</HelpTooltip>
          </div>
          <select
            aria-labelledby={`${agent.id}-instructions-label`}
            value={agent.instructionStyle}
            disabled={disabled}
            onChange={(event) =>
              updateAgent(agent.id, { instructionStyle: event.target.value as InstructionStyle })
            }
          >
            {Object.entries(instructionLabels).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <CheckboxGroup
        title="Tools"
        help={helpText.workbenchTools}
        values={mission.tools.map((tool) => ({ id: tool.id, label: tool.name }))}
        selected={agent.selectedTools}
        disabled={disabled}
        onToggle={(value) => toggleAgentArray(agent.id, "selectedTools", value)}
      />
      <CheckboxGroup
        title="Guardrails"
        help={helpText.guardrails}
        values={guardrailOptions.map((item) => ({ id: item, label: item }))}
        selected={agent.guardrails}
        disabled={disabled}
        onToggle={(value) => toggleAgentArray(agent.id, "guardrails", value)}
      />
      <CheckboxGroup
        title="Handoffs"
        help={helpText.handoffs}
        values={handoffOptions.map((item) => ({ id: item, label: item }))}
        selected={agent.handoffs}
        disabled={disabled}
        onToggle={(value) => toggleAgentArray(agent.id, "handoffs", value)}
      />
      <CheckboxGroup
        title="Evals"
        help={helpText.evals}
        values={evalOptions.map((item) => ({ id: item, label: item }))}
        selected={agent.evals}
        disabled={disabled}
        onToggle={(value) => toggleAgentArray(agent.id, "evals", value)}
      />
    </article>
  );
}

function CheckboxGroup({
  title,
  help,
  values,
  selected,
  disabled,
  onToggle
}: {
  title: string;
  help?: string;
  values: Array<{ id: string; label: string }>;
  selected: string[];
  disabled: boolean;
  onToggle: (value: string) => void;
}) {
  return (
    <div className="checkbox-group">
      <div className="checkbox-title">
        <span>{title}</span>
        {help && <HelpTooltip label={title}>{help}</HelpTooltip>}
      </div>
      <div className="chip-grid">
        {values.map((value) => (
          <label className={`choice-chip ${selected.includes(value.id) ? "active" : ""}`} key={value.id}>
            <input
              type="checkbox"
              disabled={disabled}
              checked={selected.includes(value.id)}
              onChange={() => onToggle(value.id)}
            />
            <span>{value.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function ConfigFeedback({ evaluation }: { evaluation: ConfigEvaluation }) {
  return (
    <div className="feedback-grid">
      <div>
        <h3>Strengths</h3>
        <ul>
          {(evaluation.strengths.length ? evaluation.strengths : ["No strong pattern yet."]).slice(0, 4).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div>
        <h3>Risks</h3>
        <ul>
          {(evaluation.warnings.length ? evaluation.warnings : ["No major configuration risks."]).slice(0, 5).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function EventPanel({
  event,
  usedTools,
  mission,
  choose
}: {
  event: Mission["events"][number];
  usedTools: string[];
  mission: Mission;
  choose: (choiceId: string) => void;
}) {
  return (
    <div className="event-panel">
      <div className={`pressure ${event.pressure}`}>{event.pressure}</div>
      <p className="event-time">{event.time}</p>
      <h3>{event.title}</h3>
      <p>{event.narrative}</p>
      <div className="tool-hint">
        <Icon name="inspect" />
        <span>{event.toolHint}</span>
      </div>
      <div className="choice-list">
        {event.choices.map((choice) => {
          const missingTools = (choice.needsTool ?? []).filter((tool) => !usedTools.includes(tool));
          const neededNames = missingTools
            .map((toolId) => mission.tools.find((tool) => tool.id === toolId)?.name ?? toolId)
            .join(", ");
          return (
            <article className="decision-card" key={choice.id}>
              <div>
                <h4>{choice.label}</h4>
                <p>{choice.description}</p>
                {missingTools.length > 0 && <small>Tool insight missing: {neededNames}</small>}
              </div>
              <button type="button" className={choice.expert ? "primary-button" : "secondary-button"} onClick={() => choose(choice.id)}>
                <Icon name="send" />
                Choose
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function LaunchPanel({
  mission,
  configEvaluation,
  launchMission
}: {
  mission: Mission;
  configEvaluation: ConfigEvaluation;
  launchMission: () => void;
}) {
  return (
    <div className="launch-panel">
      <div>
        <h3>{mission.tagline}</h3>
        <p>
          Inspect tools, tune the agent workbench, then launch the local simulation. Mission choices
          reward tool-grounded decisions and explain the agent concept behind each outcome.
        </p>
      </div>
      <button type="button" className="primary-button" onClick={launchMission}>
        <Icon name="play" />
        Launch Simulation
      </button>
      <p className="small-copy">
        Current setup score: {configEvaluation.score}. You can launch with a weak setup, but the
        simulation will reflect the risk.
      </p>
    </div>
  );
}

function Debrief({
  result,
  mission,
  selectNext
}: {
  result: MissionResult;
  mission: Mission;
  selectNext: () => void;
}) {
  return (
    <div className="debrief">
      <div className={`result-mark ${result.passed ? "passed" : "retry"}`}>
        {result.passed ? "Passed" : "Retry recommended"}
      </div>
      <h3>Score {result.score}</h3>
      <p>{result.debrief}</p>
      <p className="expert-takeaway">{mission.debrief.expertTakeaway}</p>
      <div className="choice-recap">
        {result.choices.map((choice) => (
          <article key={`${choice.eventId}-${choice.choiceId}`}>
            <h4>{choice.label}</h4>
            <p>{choice.rationale}</p>
            {choice.bonusNote && <small>{choice.bonusNote}</small>}
          </article>
        ))}
      </div>
      <button type="button" className="primary-button" onClick={selectNext}>
        <Icon name="next" />
        Next Mission
      </button>
    </div>
  );
}

function TutorialOverlay({
  steps,
  currentIndex,
  onBack,
  onNext,
  onClose
}: {
  steps: TutorialStep[];
  currentIndex: number;
  onBack: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const step = steps[currentIndex];
  const cardRef = useRef<HTMLElement>(null);
  const isLast = currentIndex === steps.length - 1;

  useEffect(() => {
    const target = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    target?.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    cardRef.current?.focus({ preventScroll: true });
  }, [step.target]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }

      if (event.key === "ArrowLeft" && currentIndex > 0) {
        onBack();
      }

      if (event.key === "ArrowRight") {
        if (isLast) {
          onClose();
        } else {
          onNext();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, isLast, onBack, onClose, onNext]);

  return (
    <div className="tutorial-layer">
      <div className="tutorial-scrim" onClick={onClose} />
      <section
        className="tutorial-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-title"
        tabIndex={-1}
        ref={cardRef}
      >
        <div className="tutorial-card-head">
          <span className="pill">
            Step {currentIndex + 1}/{steps.length}
          </span>
          <button className="icon-button" type="button" aria-label="Skip tutorial" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
        <h2 id="tutorial-title">{step.title}</h2>
        <p>{step.body}</p>
        <div className="tutorial-actions">
          <button className="ghost-button tutorial-ghost" type="button" onClick={onClose}>
            <Icon name="close" />
            Skip
          </button>
          <div className="tutorial-step-actions">
            <button
              className="secondary-button"
              type="button"
              disabled={currentIndex === 0}
              onClick={onBack}
            >
              <Icon name="back" />
              Back
            </button>
            <button className="primary-button" type="button" onClick={isLast ? onClose : onNext}>
              <Icon name={isLast ? "check" : "next"} />
              {isLast ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function HelpTooltip({ label, children }: { label: string; children: string }) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  const wrapperRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handlePointerDown(event: PointerEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <span
      className="help-tooltip"
      ref={wrapperRef}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onBlur={(event) => {
        const nextTarget = event.relatedTarget as Node | null;
        if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
          setOpen(false);
        }
      }}
    >
      <button
        className="help-trigger"
        type="button"
        aria-label={`Help: ${label}`}
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        onFocus={() => setOpen(true)}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
      >
        <Icon name="help" />
      </button>
      {open && (
        <span className="help-popover" id={tooltipId} role="tooltip">
          {children}
        </span>
      )}
    </span>
  );
}

function MetricCard({ metric, label, value }: { metric: MetricKey; label: string; value: number }) {
  return (
    <article className="metric-card">
      <div>
        <span className="metric-label-with-help">
          <span>{label}</span>
          <HelpTooltip label={`${label} metric`}>{metricHelp[metric]}</HelpTooltip>
        </span>
        <strong>{value}</strong>
      </div>
      <div className="metric-track">
        <span style={{ width: `${value}%` }} />
      </div>
    </article>
  );
}

function labelMetric(metric: string) {
  return metric.charAt(0).toUpperCase() + metric.slice(1);
}

function Icon({ name }: { name: string }) {
  const paths: Record<string, JSX.Element> = {
    play: <path d="M8 5v14l11-7-11-7Z" />,
    reset: <path d="M4 12a8 8 0 1 0 2.3-5.7M4 5v5h5" />,
    check: <path d="m5 12 4 4L19 6" />,
    tool: <path d="M14.7 6.3a4 4 0 0 0-5 5L4 17v3h3l5.7-5.7a4 4 0 0 0 5-5l-2.4 2.4-3-3 2.4-2.4Z" />,
    radio: <path d="M5 16V8h14v8H5Zm3 3h8M8 5l4-3 4 3M8 12h3m3 0h2" />,
    trace: <path d="M4 7h6v6H4V7Zm10-3h6v6h-6V4Zm0 10h6v6h-6v-6ZM10 10h4m3 0v4" />,
    inspect: <path d="M10 18a8 8 0 1 1 5.3-2l3.7 3.7M10 7v3l2 2" />,
    agent: <path d="M12 3v3M7 7h10a3 3 0 0 1 3 3v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-5a3 3 0 0 1 3-3Zm1 5h.01M16 12h.01M9 16h6" />,
    send: <path d="M4 12 20 4l-4 16-4-6-8-2Zm8 2 8-10" />,
    next: <path d="M5 12h14M13 6l6 6-6 6" />,
    back: <path d="M19 12H5m6-6-6 6 6 6" />,
    help: <path d="M9.1 9a3 3 0 1 1 5.8 1.2c-.8 1.2-2.4 1.4-2.8 2.8M12 17h.01M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20Z" />,
    close: <path d="M18 6 6 18M6 6l12 12" />
  };

  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {paths[name] ?? paths.tool}
      </g>
    </svg>
  );
}
