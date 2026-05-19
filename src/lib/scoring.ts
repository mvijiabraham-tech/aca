import type {
  ParticipantToolScore, ScoringStatus, EngagementTool, Participant,
  Engagement, Assessor, CompetencyScore,
} from "@/types";
import { competencyScoreFromIndicators } from "@/lib/calibrate";

/**
 * Compute scoring status for a single (participant, tool, observer) tuple.
 * "complete" — completedAt is set
 * "in_progress" — at least one indicator rated
 * "not_started" — no record or zero indicators rated
 */
export function computeScoringStatus(score: ParticipantToolScore | undefined): ScoringStatus {
  if (!score) return "not_started";
  if (score.completedAt) return "complete";
  const anyRated = score.competencies.some((c) =>
    c.indicators.some((i) => i.rating !== undefined || i.notObserved),
  );
  return anyRated ? "in_progress" : "not_started";
}

/**
 * Compute progress for a single score record:
 * how many indicators are rated (or marked NO) out of total possible.
 */
export function computeScoreProgress(
  score: ParticipantToolScore | undefined,
  totalIndicators: number,
): { rated: number; total: number } {
  if (!score) return { rated: 0, total: totalIndicators };
  let rated = 0;
  score.competencies.forEach((c) => {
    c.indicators.forEach((i) => {
      if (i.rating !== undefined || i.notObserved) rated++;
    });
  });
  return { rated, total: totalIndicators };
}

/**
 * Total indicators expected for a (participant, tool) — based on tool's competency count × 4 indicators each.
 */
export function expectedIndicators(tool: EngagementTool): number {
  return tool.competencyIds.length * 4;
}

/**
 * For an observer + tool, how many of their assigned participants are
 * complete / in_progress / not_started?
 */
export function observerToolProgress(
  engagement: Engagement,
  observerId: string,
  toolId: string,
): { complete: number; inProgress: number; notStarted: number; total: number } {
  const tool = engagement.tools.find((t) => t.id === toolId);
  if (!tool) return { complete: 0, inProgress: 0, notStarted: 0, total: 0 };

  // Participants who go through this tool
  const participants = engagement.participants.filter((p) => p.toolIds.includes(toolId));

  let complete = 0;
  let inProgress = 0;
  let notStarted = 0;
  participants.forEach((p) => {
    const score = engagement.scores.find(
      (s) => s.participantId === p.id && s.toolId === toolId && s.observerId === observerId,
    );
    const status = computeScoringStatus(score);
    if (status === "complete") complete++;
    else if (status === "in_progress") inProgress++;
    else notStarted++;
  });

  return { complete, inProgress, notStarted, total: participants.length };
}

/**
 * Tools that this observer is assigned to.
 */
export function observerTools(engagement: Engagement, observerId: string): EngagementTool[] {
  const assessor = engagement.assessors.find((a) => a.id === observerId);
  if (!assessor) return [];
  return engagement.tools.filter((t) => assessor.assignedToolIds.includes(t.id));
}

/**
 * Participants this observer should score for this tool.
 */
export function observerToolParticipants(
  engagement: Engagement,
  _observerId: string,
  toolId: string,
): Participant[] {
  // For v0.5 — observer scores every participant assigned to the tool.
  // (In a future version we could restrict to participants the assessor has been scheduled to observe.)
  const tool = engagement.tools.find((t) => t.id === toolId);
  if (!tool) return [];
  return engagement.participants.filter((p) => p.toolIds.includes(toolId));
}

/**
 * Look up an existing score record. Returns undefined if none.
 */
export function findScore(
  engagement: Engagement,
  participantId: string,
  toolId: string,
  observerId: string,
): ParticipantToolScore | undefined {
  return engagement.scores.find(
    (s) => s.participantId === participantId && s.toolId === toolId && s.observerId === observerId,
  );
}

/**
 * Get the lead assessor, or fall back to the first assessor.
 */
export function getDefaultObserver(engagement: Engagement): Assessor | undefined {
  return engagement.assessors.find((a) => a.role === "lead") ?? engagement.assessors[0];
}

// =============================================================================
// PARTICIPANT USER ID GENERATION
// =============================================================================

/**
 * Generate a sequential userId from the engagement code.
 * Prefix = first 2 alpha chars of engagement code (e.g., "FC" from "FC-2026").
 * Suffix = 3-digit zero-padded number, sequential from existing participants.
 */
export function generateUserId(engagementCode: string, existingParticipants: Participant[]): string {
  const prefix = engagementCode.replace(/[^a-zA-Z]/g, "").substring(0, 2).toUpperCase() || "XX";
  let maxNum = 0;
  for (const p of existingParticipants) {
    if (p.userId?.startsWith(prefix)) {
      const num = parseInt(p.userId.slice(prefix.length), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  }
  return `${prefix}${String(maxNum + 1).padStart(3, "0")}`;
}

/**
 * Assign userIds to participants that are missing them.
 * Processes sequentially to avoid duplicates within a batch.
 */
export function assignMissingUserIds(engagementCode: string, participants: Participant[]): Participant[] {
  const result = [...participants];
  for (let i = 0; i < result.length; i++) {
    if (!result[i].userId) {
      result[i] = { ...result[i], userId: generateUserId(engagementCode, result.slice(0, i)) };
    }
  }
  return result;
}

// =============================================================================
// OBSERVER SUBMISSION & LOCKING (R2)
// =============================================================================

/**
 * Check if a single score has been submitted.
 */
export function isScoreSubmitted(score: ParticipantToolScore | undefined): boolean {
  return !!score?.submittedAt;
}

/**
 * Check if an observer has submitted all scores for a tool.
 */
export function isObserverSubmitted(engagement: Engagement, toolId: string, observerId: string): boolean {
  const participants = observerToolParticipants(engagement, observerId, toolId);
  if (participants.length === 0) return false;
  return participants.every((p) => {
    const score = findScore(engagement, p.id, toolId, observerId);
    return !!score?.submittedAt;
  });
}

/**
 * Check if ALL assigned observers have submitted for a tool (tool fully locked).
 */
export function isToolFullySubmitted(engagement: Engagement, toolId: string): boolean {
  const tool = engagement.tools.find((t) => t.id === toolId);
  if (!tool) return false;
  const assignedObservers = engagement.assessors.filter((a) => a.assignedToolIds.includes(toolId));
  if (assignedObservers.length === 0) return false;
  return assignedObservers.every((a) => isObserverSubmitted(engagement, toolId, a.id));
}

/**
 * Per-observer submission status for a tool.
 */
export function toolObserverSubmissionStatus(
  engagement: Engagement,
  toolId: string,
): { observerId: string; observerName: string; submitted: boolean }[] {
  const tool = engagement.tools.find((t) => t.id === toolId);
  if (!tool) return [];
  return engagement.assessors
    .filter((a) => a.assignedToolIds.includes(toolId))
    .map((a) => ({
      observerId: a.id,
      observerName: a.name,
      submitted: isObserverSubmitted(engagement, toolId, a.id),
    }));
}

/**
 * Build a calibration matrix: participants × competencies × observers.
 * Each cell = the observer's average score for that competency on that participant.
 */
export interface CalibrationCell {
  observerId: string;
  observerName: string;
  score: number | null;
}

export interface CalibrationRow {
  participantId: string;
  participantName: string;
  competencies: {
    competencyId: string;
    competencyName: string;
    cells: CalibrationCell[];
    average: number | null;
  }[];
}

export function calibrationMatrix(
  engagement: Engagement,
  toolId: string,
): CalibrationRow[] {
  const tool = engagement.tools.find((t) => t.id === toolId);
  if (!tool) return [];

  const assignedObservers = engagement.assessors.filter((a) => a.assignedToolIds.includes(toolId));
  const participants = engagement.participants.filter((p) => p.toolIds.includes(toolId));

  return participants.map((p) => ({
    participantId: p.id,
    participantName: p.name,
    competencies: tool.competencyIds.map((cid) => {
      const cells: CalibrationCell[] = assignedObservers.map((obs) => {
        const score = findScore(engagement, p.id, toolId, obs.id);
        const compScore = score?.competencies.find((cs: CompetencyScore) => cs.competencyId === cid);
        const avg = compScore ? competencyScoreFromIndicators(compScore.indicators) : null;
        return { observerId: obs.id, observerName: obs.name, score: avg };
      });
      const validScores = cells.map((c) => c.score).filter((s): s is number => s !== null);
      const average = validScores.length > 0 ? validScores.reduce((a, b) => a + b, 0) / validScores.length : null;

      return {
        competencyId: cid,
        competencyName: cid, // will be resolved in UI via findCompetency
        cells,
        average,
      };
    }),
  }));
}
