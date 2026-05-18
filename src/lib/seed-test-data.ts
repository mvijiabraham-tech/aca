/**
 * Test data seeder — populates scoring, calibration, and report sections
 * for the first 2 participants of an engagement. Dev/testing only.
 */
import { findCompetency } from "@/mocks/dictionary";
import { computedCompetencyScore, computedOar, oarBandFor } from "@/lib/calibrate";
import type {
  Engagement, ParticipantToolScore, CompetencyScore, IndicatorScore,
  IndicatorRating, ModeratedScore, ParticipantOar, ReportSection,
} from "@/types";

// ── Rating profiles for two contrasting participants ──────────────────

// Participant A: strong performer (3-5 range)
const PROFILE_A: IndicatorRating[][] = [
  [4, 4, 3, 5], [3, 4, 4, 4], [4, 5, 3, 4], [3, 3, 4, 4],
  [5, 4, 4, 3], [4, 3, 5, 4], [4, 4, 4, 3], [3, 5, 4, 4],
];
// Participant B: developing performer (2-4 range)
const PROFILE_B: IndicatorRating[][] = [
  [3, 2, 3, 2], [2, 3, 3, 2], [3, 3, 2, 3], [2, 2, 3, 3],
  [3, 2, 2, 3], [2, 3, 2, 2], [3, 3, 3, 2], [2, 2, 3, 3],
];

function pickRatings(profile: IndicatorRating[][], idx: number): IndicatorRating[] {
  return profile[idx % profile.length];
}

// ── Evidence text banks ──────────────────────────────────────────────

const WELL_DONE_A = [
  "Demonstrated confident, structured approach. Clearly articulated rationale behind decisions and brought others along through logical framing. Showed strong awareness of stakeholder impact.",
  "Engaged proactively with the group, building on others' contributions constructively. Created space for quieter voices while maintaining momentum. Evidence of advanced facilitation instincts.",
  "Produced a well-organised written output with clear prioritisation. Identified systemic root causes rather than surface symptoms. Recommendations were actionable and commercially grounded.",
  "Showed composure under time pressure. Adapted approach when initial plan hit resistance, pivoting smoothly without losing sight of the objective. Strong self-regulation throughout.",
  "Asked incisive diagnostic questions that reframed the problem productively. Demonstrated genuine curiosity and intellectual flexibility. Connected disparate data points effectively.",
  "Took initiative to structure ambiguity, proposing a clear framework early that the group adopted. Balanced assertiveness with openness to challenge.",
];

const BETTER_A = [
  "Could strengthen impact by being more concise in verbal delivery — some points were diluted by over-explanation. Would benefit from tighter 'headline first' framing.",
  "At times moved to solutions before fully exploring the problem space. Could invest more time in divergent thinking before converging.",
  "While analysis was thorough, the written output could have been more visually structured (headings, bullet points) to aid the reader's navigation.",
  "Occasionally dominated airtime in the group exercise — a more calibrated reading of when to step back would strengthen collaborative leadership.",
];

const WELL_DONE_B = [
  "Showed willingness to contribute ideas and demonstrated solid foundational knowledge of the business context. Engaged earnestly with the task requirements.",
  "Written output covered the key areas and showed awareness of the main stakeholders. Attempted to structure the response logically.",
  "Listened attentively to others' perspectives in the group exercise and showed respect for differing viewpoints. Asked clarifying questions at appropriate moments.",
  "Maintained effort throughout the exercise despite visible time pressure. Did not disengage when complexity increased.",
];

const BETTER_B = [
  "Analysis remained largely descriptive rather than evaluative — needs to push beyond 'what' to 'so what' and 'now what'. Critical reasoning and synthesis need strengthening.",
  "Contributions in the group were reactive rather than proactive. Would benefit from preparing a clear point of view and asserting it earlier in discussions.",
  "Written recommendations lacked specificity — broad statements need to be converted into concrete, time-bound actions with clear ownership and measurement criteria.",
  "Under pressure, reverted to a narrow lens, missing the broader strategic context. Needs to practice zooming out to maintain a systems perspective.",
  "Struggled to prioritise effectively when presented with multiple competing demands. A structured prioritisation framework (impact vs effort, urgency vs importance) would help significantly.",
];

const VERBATIM_A = [
  '"I think we need to start with the customer impact lens — everything else follows from that." Immediately redirected the group toward a stakeholder-centric frame.',
  '"Let me play back what I\'m hearing from the data before we jump to solutions." This reflective pause helped the group avoid premature convergence.',
  '"The real risk here isn\'t the cost — it\'s the capability gap in the middle management layer." Showed ability to identify second-order effects.',
];

const VERBATIM_B = [
  '"I agree with what everyone is saying." Repeated multiple times without adding substantive perspective.',
  '"We could maybe look at the numbers again?" Said tentatively when the analysis clearly needed revisiting — the instinct was correct but lacked conviction.',
  '"I think communication is important." Statement was too generic to move the conversation forward; needed concrete examples of what communication breakdown looked like.',
];

const INSIGHTS_A = [
  "Notably calm demeanour throughout, which had a steadying effect on the group. This is likely an asset in high-stakes client situations. Energy management was impressive across a long assessment day.",
  "Several assessors independently noted strong 'reading the room' ability — adjusting tone and pace based on audience cues. This meta-cognitive awareness is rare at this career stage.",
];

const INSIGHTS_B = [
  "Appeared significantly more comfortable in the written exercise than in interactive formats — may reflect introversion rather than lack of capability. Worth exploring whether a coaching intervention on executive presence could unlock existing but latent strengths.",
  "Showed brief flashes of strategic insight that were not sustained. With structured development of critical thinking frameworks, there is potential for meaningful growth.",
];

function pick<T>(arr: T[], idx: number): T {
  return arr[idx % arr.length];
}

// ── Score builder ────────────────────────────────────────────────────

function buildScores(
  engagement: Engagement,
  participantId: string,
  observerId: string,
  profile: IndicatorRating[][],
  wellDone: string[],
  better: string[],
  verbatim: string[],
  insights: string[],
): ParticipantToolScore[] {
  const scores: ParticipantToolScore[] = [];
  let compIdx = 0;

  for (const tool of engagement.tools) {
    const participant = engagement.participants.find((p) => p.id === participantId);
    if (!participant?.toolIds.includes(tool.id)) continue;

    const competencies: CompetencyScore[] = tool.competencyIds.map((cid) => {
      const ratings = pickRatings(profile, compIdx);
      const indicators: IndicatorScore[] = ratings.map((r) => ({
        rating: r,
        notObserved: false,
      }));
      const cs: CompetencyScore = {
        competencyId: cid,
        indicators,
        whatWasDoneWell: pick(wellDone, compIdx),
        whatCouldBeBetter: pick(better, compIdx),
        verbatimObservations: pick(verbatim, compIdx),
        otherNotableInsights: pick(insights, compIdx),
      };
      compIdx++;
      return cs;
    });

    const now = new Date().toISOString();
    scores.push({
      id: `${participantId}|${tool.id}|${observerId}`,
      participantId,
      toolId: tool.id,
      observerId,
      competencies,
      startedAt: now,
      lastSavedAt: now,
      completedAt: now,
    });
  }

  return scores;
}

// ── Report narrative builder ─────────────────────────────────────────

function buildReportSections(
  engagement: Engagement,
  participantId: string,
  signedOffBy: string,
): ReportSection[] {
  const participant = engagement.participants.find((p) => p.id === participantId);
  if (!participant) return [];

  const name = participant.name;
  const role = participant.currentRole;
  const bu = participant.businessUnit ?? "the organisation";
  const oar = computedOar(engagement, participantId);
  const band = oar !== null ? oarBandFor(engagement, oar) : "proficient";
  const oarStr = oar !== null ? oar.toFixed(2) : "N/A";

  // Build competency profile text
  const compLines: string[] = [];
  const strengths: string[] = [];
  const devAreas: string[] = [];

  engagement.competencies.forEach((sel) => {
    const comp = findCompetency(sel.competencyId, engagement.customCompetencies);
    if (!comp) return;
    const score = computedCompetencyScore(engagement, participantId, sel.competencyId);
    const target = engagement.proficiencyTargets.find((t) => t.competencyId === sel.competencyId);
    if (score === null) return;

    const gap = target ? score - target.targetLevel : 0;
    compLines.push(
      `${comp.name}: Scored ${score.toFixed(2)} against a target of L${target?.targetLevel ?? "?"} (gap: ${gap >= 0 ? "+" : ""}${gap.toFixed(2)}, weight: ${sel.weight}x${sel.critical ? ", critical" : ""}). ` +
      (gap >= 0
        ? `Performance meets or exceeds the expected standard for this competency.`
        : `A development gap exists; targeted intervention is recommended.`)
    );

    if (gap >= 0.25) strengths.push(comp.name);
    else if (gap < -0.25) devAreas.push(comp.name);
  });

  const now = new Date().toISOString();
  const base = {
    participantId,
    status: "signed_off" as const,
    lastEditedAt: now,
    signedOffBy,
    signedOffAt: now,
  };

  const sections: ReportSection[] = [];

  // Executive Summary
  sections.push({
    ...base,
    sectionKey: "executiveSummary",
    content:
      `${name} participated in the Assessment Centre as part of ${engagement.basics.name}, assessed against ${engagement.competencies.length} competencies at the target proficiency levels defined for the ${role} position within ${bu}.\n\n` +
      `${name} achieved an Overall Assessment Rating (OAR) of ${oarStr}, placing ${name.split(" ")[0]} in the "${band}" band. ` +
      (band === "strong" || band === "distinguished"
        ? `This is a strong result indicating readiness for the demands of the role, with consistent demonstration of the required competencies across multiple assessment tools. ${name.split(" ")[0]}'s performance was characterised by structured thinking, stakeholder awareness, and the ability to operate effectively under pressure.`
        : band === "proficient"
        ? `This result indicates that ${name.split(" ")[0]} meets the core requirements of the target role, with a balanced profile across competencies. There are targeted areas where further development would strengthen overall effectiveness and prepare ${name.split(" ")[0]} for more complex challenges.`
        : `This result indicates that ${name.split(" ")[0]} is currently developing toward the requirements of the target role. While foundational capabilities are evident, significant development investment is needed across several competency areas to close the gap to the target profile.`) +
      `\n\n` +
      (strengths.length > 0 ? `Key strengths were observed in ${strengths.join(", ")}. ` : "") +
      (devAreas.length > 0 ? `Priority development areas include ${devAreas.join(", ")}. ` : "") +
      `The following sections provide a detailed competency-by-competency analysis with specific behavioural evidence from the assessment exercises.`,
  });

  // Competency Profile
  sections.push({
    ...base,
    sectionKey: "competencyProfile",
    content:
      `The competency profile below summarises ${name.split(" ")[0]}'s performance across all assessed competencies, weighted according to their relative importance for the ${role} position.\n\n` +
      compLines.join("\n\n"),
  });

  // Indicator Evidence
  const evidenceParas: string[] = [];
  engagement.competencies.forEach((sel) => {
    const comp = findCompetency(sel.competencyId, engagement.customCompetencies);
    if (!comp) return;
    const target = engagement.proficiencyTargets.find((t) => t.competencyId === sel.competencyId);
    const targetLevel = target ? comp.levels.find((l) => l.level === target.targetLevel) : null;
    if (!targetLevel) return;

    evidenceParas.push(
      `${comp.name} (Target: L${targetLevel.level} ${targetLevel.name}):\n` +
      targetLevel.indicators.map((ind, i) =>
        `  Indicator ${i + 1}: "${ind}" — ` +
        (i % 2 === 0
          ? `Demonstrated consistently across exercises. Evidence showed clear application of this behaviour in both structured and unstructured contexts.`
          : `Partially demonstrated. While the intent was visible, execution was inconsistent across different assessment situations.`)
      ).join("\n")
    );
  });

  sections.push({
    ...base,
    sectionKey: "indicatorEvidence",
    content:
      `This section provides indicator-level evidence for each competency, drawn from direct observation across the assessment exercises.\n\n` +
      evidenceParas.join("\n\n"),
  });

  // Development Areas
  sections.push({
    ...base,
    sectionKey: "developmentAreas",
    content:
      (devAreas.length > 0
        ? `Based on the assessment outcomes, the following competencies represent priority development areas for ${name.split(" ")[0]}: ${devAreas.join(", ")}.\n\n`
        : `While ${name.split(" ")[0]}'s overall profile is strong, continuous development remains important. The areas below represent opportunities to move from proficiency to mastery.\n\n`) +
      `Development recommendations:\n\n` +
      `1. Structured reflection practice: After key meetings or decisions, ${name.split(" ")[0]} should dedicate 10 minutes to capturing what worked, what didn't, and what to adjust next time. This metacognitive habit accelerates skill transfer and self-awareness.\n\n` +
      `2. Exposure to higher-complexity contexts: Seek stretch assignments or cross-functional projects that require balancing competing stakeholder interests and operating with greater ambiguity. This will develop strategic reasoning and systems thinking.\n\n` +
      `3. Targeted coaching on executive communication: Work with a coach or mentor on distilling complex analyses into crisp, decision-ready narratives. Focus on the "so what" and "now what" framing that senior leaders expect.\n\n` +
      `4. Peer learning group: Join or form a small cohort of peers at a similar career stage to share challenges, practice new behaviours in a safe environment, and hold each other accountable for development commitments.`,
  });

  // Next Steps
  sections.push({
    ...base,
    sectionKey: "nextSteps",
    content:
      `The following next steps are recommended for ${name.split(" ")[0]}:\n\n` +
      `1. Feedback session: A 60-minute one-on-one feedback session will be scheduled with the Lead Assessor to walk through these results in detail, explore ${name.split(" ")[0]}'s self-assessment, and co-create a development plan.\n\n` +
      `2. Individual Development Plan (IDP): Following the feedback session, ${name.split(" ")[0]} should formalise 2-3 development commitments with specific actions, timelines, and success measures. The IDP will be captured in the Actifyr activation platform.\n\n` +
      `3. Line manager briefing: With ${name.split(" ")[0]}'s consent, a summary of development themes (not scores) will be shared with the line manager to ensure alignment on support, stretch opportunities, and ongoing coaching.\n\n` +
      `4. 90-day check-in: A follow-up touchpoint at 90 days post-assessment to review progress against the IDP, celebrate wins, and recalibrate if needed.\n\n` +
      `5. Cohort debrief: ${name.split(" ")[0]} is encouraged to participate in the optional group debrief session where cohort-level themes (anonymised) are shared, fostering a shared development culture.`,
  });

  return sections;
}

// ── Main seed function ───────────────────────────────────────────────

export interface SeedActions {
  lockEngagement: (id: string) => void;
  upsertScore: (engagementId: string, score: ParticipantToolScore) => void;
  upsertModeratedScore: (engagementId: string, score: ModeratedScore) => void;
  upsertOar: (engagementId: string, oar: ParticipantOar) => void;
  setCalibrateStage: (engagementId: string, stage: "not_started" | "reconcile" | "moderate" | "oar" | "complete") => void;
  signOffCalibrate: (engagementId: string, byObserverId: string) => void;
  upsertReportSection: (engagementId: string, section: ReportSection) => void;
}

export function seedTestData(engagement: Engagement, actions: SeedActions): { seededCount: number } {
  const participants = engagement.participants.slice(0, 2);
  if (participants.length === 0) return { seededCount: 0 };

  const observer = engagement.assessors[0];
  if (!observer) return { seededCount: 0 };

  const engId = engagement.id;

  // Lock engagement if still draft
  if (engagement.status === "draft") {
    actions.lockEngagement(engId);
  }

  // Profiles: A = strong, B = developing
  const profiles = [
    { ratings: PROFILE_A, wellDone: WELL_DONE_A, better: BETTER_A, verbatim: VERBATIM_A, insights: INSIGHTS_A },
    { ratings: PROFILE_B, wellDone: WELL_DONE_B, better: BETTER_B, verbatim: VERBATIM_B, insights: INSIGHTS_B },
  ];

  for (let i = 0; i < participants.length; i++) {
    const p = participants[i];
    const prof = profiles[i % profiles.length];

    // 1. Seed raw scores
    const scores = buildScores(engagement, p.id, observer.id, prof.ratings, prof.wellDone, prof.better, prof.verbatim, prof.insights);
    for (const score of scores) {
      actions.upsertScore(engId, score);
    }
  }

  // We need a fresh copy of the engagement with scores populated.
  // Since store updates are synchronous, we build a local copy for computation.
  const engWithScores: Engagement = {
    ...engagement,
    status: "live",
    scores: participants.flatMap((p, i) => {
      const prof = profiles[i % profiles.length];
      return buildScores(engagement, p.id, observer.id, prof.ratings, prof.wellDone, prof.better, prof.verbatim, prof.insights);
    }),
  };

  for (let i = 0; i < participants.length; i++) {
    const p = participants[i];

    // 2. Seed moderated scores (accept computed for most, override 1-2)
    engagement.competencies.forEach((sel, cIdx) => {
      const computed = computedCompetencyScore(engWithScores, p.id, sel.competencyId);
      if (computed === null) return;

      // Override one competency per participant for realism
      const isOverride = cIdx === 1;
      const moderated = isOverride ? Math.min(5, computed + (i === 0 ? 0.25 : -0.25)) : computed;

      actions.upsertModeratedScore(engId, {
        participantId: p.id,
        competencyId: sel.competencyId,
        computedScore: computed,
        moderatedScore: Math.round(moderated * 100) / 100,
        isOverride,
        rationale: isOverride ? "Adjusted based on panel discussion — weight of evidence from the group exercise was more telling than the written output." : undefined,
        moderatedBy: observer.id,
        moderatedAt: new Date().toISOString(),
      });
    });

    // 3. Seed OAR
    const oar = computedOar(engWithScores, p.id);
    if (oar !== null) {
      const band = oarBandFor(engWithScores, oar);
      actions.upsertOar(engId, {
        participantId: p.id,
        computedOar: oar,
        computedBand: band,
        finalBand: band,
        isOverride: false,
        confirmedBy: observer.id,
        confirmedAt: new Date().toISOString(),
      });
    }

    // 4. Seed report sections
    const sections = buildReportSections(engWithScores, p.id, observer.id);
    for (const section of sections) {
      actions.upsertReportSection(engId, section);
    }
  }

  // 5. Sign off calibrate
  actions.setCalibrateStage(engId, "complete");
  actions.signOffCalibrate(engId, observer.id);

  return { seededCount: participants.length };
}
