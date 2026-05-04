import type { GameProgress, MissionResult } from "../types";
import { emptyConceptMastery, mergeConceptMastery } from "./scoring";

const storageKey = "festival-agents-progress-v1";

export function createInitialProgress(firstMissionId: string): GameProgress {
  return {
    completedMissionIds: [],
    currentMissionId: firstMissionId,
    results: {},
    conceptMastery: emptyConceptMastery()
  };
}

export function loadProgress(firstMissionId: string): GameProgress {
  if (typeof localStorage === "undefined") {
    return createInitialProgress(firstMissionId);
  }

  const raw = localStorage.getItem(storageKey);
  if (!raw) {
    return createInitialProgress(firstMissionId);
  }

  try {
    const parsed = JSON.parse(raw) as GameProgress;
    return {
      ...createInitialProgress(firstMissionId),
      ...parsed,
      conceptMastery: {
        ...emptyConceptMastery(),
        ...parsed.conceptMastery
      }
    };
  } catch {
    return createInitialProgress(firstMissionId);
  }
}

export function saveProgress(progress: GameProgress) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(storageKey, JSON.stringify(progress));
  }
}

export function addMissionResult(
  progress: GameProgress,
  result: MissionResult,
  nextMissionId: string
): GameProgress {
  const results = {
    ...progress.results,
    [result.missionId]: result
  };
  const completedMissionIds = progress.completedMissionIds.includes(result.missionId)
    ? progress.completedMissionIds
    : progress.completedMissionIds.concat(result.missionId);
  const conceptMastery = Object.values(results).reduce(
    (mastery, missionResult) => mergeConceptMastery(mastery, missionResult.conceptGains),
    emptyConceptMastery()
  );

  return {
    ...progress,
    completedMissionIds,
    currentMissionId: nextMissionId,
    results,
    conceptMastery
  };
}

export function resetProgress(firstMissionId: string) {
  const progress = createInitialProgress(firstMissionId);
  saveProgress(progress);
  return progress;
}
