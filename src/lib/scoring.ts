import type {
  ParticipantToolScore, ScoringStatus, EngagementTool, Participant,
  Engagement, Assessor,
} from "@/types";

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
