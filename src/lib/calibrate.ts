import type {
  Engagement, ParticipantToolScore, IndicatorScore, OarBand,
  CompetencySelection,
} from "@/types";

// Average a competency's indicators within one ParticipantToolScore.
// Honours notObserved (excluded) and ignores undefined ratings.
export function competencyScoreFromIndicators(indicators: IndicatorScore[]): number | null {
  const valid = indicators.filter((i) => !i.notObserved && i.rating !== undefined);
  if (valid.length === 0) return null;
  const sum = valid.reduce((acc, i) => acc + (i.rating ?? 0), 0);
  return sum / valid.length;
}

// All observer scores for a (participant, competency) across all tools.
// Returns array of { observerId, toolId, score } where score is the
// average of valid indicators for that competency in that tool.
export function observerScoresFor(
  engagement: Engagement,
  participantId: string,
  competencyId: string,
): { observerId: string; toolId: string; score: number; evidence?: { whatWasDoneWell?: string; whatCouldBeBetter?: string } }[] {
  const out: { observerId: string; toolId: string; score: number; evidence?: { whatWasDoneWell?: string; whatCouldBeBetter?: string } }[] = [];
  engagement.scores.forEach((s: ParticipantToolScore) => {
    if (s.participantId !== participantId) return;
    const compScore = s.competencies.find((c) => c.competencyId === competencyId);
    if (!compScore) return;
    const avg = competencyScoreFromIndicators(compScore.indicators);
    if (avg === null) return;
    out.push({
      observerId: s.observerId,
      toolId: s.toolId,
      score: avg,
      evidence: {
        whatWasDoneWell: compScore.whatWasDoneWell,
        whatCouldBeBetter: compScore.whatCouldBeBetter,
      },
    });
  });
  return out;
}

// The computed score for a (participant, competency) — average across observers.
// Returns null if no observer has scored this competency for this participant.
export function computedCompetencyScore(
  engagement: Engagement,
  participantId: string,
  competencyId: string,
): number | null {
  const obs = observerScoresFor(engagement, participantId, competencyId);
  if (obs.length === 0) return null;
  const sum = obs.reduce((acc, o) => acc + o.score, 0);
  return sum / obs.length;
}

// Disagreement spread (max - min) for a (participant, competency)
export function disagreementSpread(
  engagement: Engagement,
  participantId: string,
  competencyId: string,
): number | null {
  const obs = observerScoresFor(engagement, participantId, competencyId);
  if (obs.length < 2) return null;
  const scores = obs.map((o) => o.score);
  return Math.max(...scores) - Math.min(...scores);
}

// Get the moderated score if set, else compute it
export function effectiveCompetencyScore(
  engagement: Engagement,
  participantId: string,
  competencyId: string,
): number | null {
  const mod = engagement.calibrate.moderatedScores.find(
    (m) => m.participantId === participantId && m.competencyId === competencyId,
  );
  if (mod) return mod.moderatedScore;
  return computedCompetencyScore(engagement, participantId, competencyId);
}

// Compute OAR — weighted average using competency weights from Step 2
export function computedOar(
  engagement: Engagement,
  participantId: string,
): number | null {
  const selections = engagement.competencies;
  if (selections.length === 0) return null;
  let weightedSum = 0;
  let totalWeight = 0;
  let countWithScore = 0;
  selections.forEach((sel: CompetencySelection) => {
    const score = effectiveCompetencyScore(engagement, participantId, sel.competencyId);
    if (score === null) return;
    weightedSum += score * sel.weight;
    totalWeight += sel.weight;
    countWithScore++;
  });
  if (countWithScore === 0) return null;
  return weightedSum / totalWeight;
}

// Map an OAR number to a band using engagement's thresholds
export function oarBandFor(engagement: Engagement, oar: number): OarBand {
  const [t1, t2, t3, t4] = engagement.aggregation.oarThresholds;
  if (oar < t1) return "below";
  if (oar < t2) return "developing";
  if (oar < t3) return "proficient";
  if (oar < t4) return "strong";
  return "distinguished";
}

// Coverage — what % of (participant × competency) cells have at least one observer score
export function scoringCoveragePct(engagement: Engagement): number {
  const participants = engagement.participants;
  const competencies = engagement.competencies;
  const total = participants.length * competencies.length;
  if (total === 0) return 0;
  let covered = 0;
  participants.forEach((p) => {
    competencies.forEach((c) => {
      if (computedCompetencyScore(engagement, p.id, c.competencyId) !== null) covered++;
    });
  });
  return (covered / total) * 100;
}

// Calibrate availability — true if enough scoring has been done
export function isCalibrateAvailable(engagement: Engagement): boolean {
  if (engagement.status !== "live" && engagement.status !== "complete") return false;
  // Allow calibrate once at least one competency cell has data
  return scoringCoveragePct(engagement) > 0;
}

// Calibrate-ready threshold — for nudging the user
export const CALIBRATE_READY_THRESHOLD = 80;
