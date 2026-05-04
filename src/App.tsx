import { useEffect, useMemo, useState } from "react";
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
  MemoryPolicy,
  Mission,
  MissionResult
} from "./types";

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

const guardrailOptions = getGuardrailOptions();
const handoffOptions = getHandoffOptions();
const evalOptions = getEvalOptions();

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
          <section className="panel compact">
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
          <MissionHeader mission={mission} activeResult={activeResult} />

          <div className="metrics-grid" aria-label="Operational metrics">
            {metricKeys.map((key) => (
              <MetricCard key={key} label={labelMetric(key)} value={visibleMetrics[key]} />
            ))}
          </div>

          <div className="two-column">
            <section className="panel">
              <div className="panel-title-row">
                <h2>Agent Workbench</h2>
                <span className={`score-badge ${configEvaluation.score >= 76 ? "good" : configEvaluation.score < 52 ? "warn" : ""}`}>
                  Config {configEvaluation.score}
                </span>
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

            <section className="panel">
              <div className="panel-title-row">
                <h2>Tool Simulator</h2>
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

          <section className="panel inbox-panel">
            <div className="panel-title-row">
              <h2>Scenario Inbox</h2>
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
          <section className="panel compact">
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
    </div>
  );
}

function MissionHeader({ mission, activeResult }: { mission: Mission; activeResult?: MissionResult }) {
  return (
    <section className="mission-header">
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
      <label>
        Objective
        <textarea
          value={agent.objective}
          disabled={disabled}
          rows={3}
          onChange={(event) => updateAgent(agent.id, { objective: event.target.value })}
        />
      </label>
      <div className="field-grid">
        <label>
          Autonomy
          <select
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
        </label>
        <label>
          Memory
          <select
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
        </label>
        <label>
          Instructions
          <select
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
        </label>
      </div>
      <CheckboxGroup
        title="Tools"
        values={mission.tools.map((tool) => ({ id: tool.id, label: tool.name }))}
        selected={agent.selectedTools}
        disabled={disabled}
        onToggle={(value) => toggleAgentArray(agent.id, "selectedTools", value)}
      />
      <CheckboxGroup
        title="Guardrails"
        values={guardrailOptions.map((item) => ({ id: item, label: item }))}
        selected={agent.guardrails}
        disabled={disabled}
        onToggle={(value) => toggleAgentArray(agent.id, "guardrails", value)}
      />
      <CheckboxGroup
        title="Handoffs"
        values={handoffOptions.map((item) => ({ id: item, label: item }))}
        selected={agent.handoffs}
        disabled={disabled}
        onToggle={(value) => toggleAgentArray(agent.id, "handoffs", value)}
      />
      <CheckboxGroup
        title="Evals"
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
  values,
  selected,
  disabled,
  onToggle
}: {
  title: string;
  values: Array<{ id: string; label: string }>;
  selected: string[];
  disabled: boolean;
  onToggle: (value: string) => void;
}) {
  return (
    <div className="checkbox-group">
      <h4>{title}</h4>
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

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="metric-card">
      <div>
        <span>{label}</span>
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
    next: <path d="M5 12h14M13 6l6 6-6 6" />
  };

  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {paths[name] ?? paths.tool}
      </g>
    </svg>
  );
}
