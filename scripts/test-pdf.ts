/**
 * Generate a test PDF and open it for inspection.
 * Run: npx vite-node scripts/test-pdf.ts
 */
import { writeFileSync } from "fs";
import { execSync } from "child_process";
import { buildIndividualReportDoc } from "@/lib/export-report";
import type {
  Engagement, Participant, CompetencySelection, ProficiencyTarget,
  EngagementTool, Assessor, AggregationRules, ParticipantToolScore,
  CompetencyScore, IndicatorScore, ModeratedScore, ReportSection,
  ReportFormat, SetupStep,
} from "@/types";
import { DEFAULT_AGGREGATION, DEFAULT_REPORT_FORMAT, EMPTY_CALIBRATE_STATE, EMPTY_REPORT_STATE } from "@/types";

// ── Minimal test engagement ──────────────────────────────────────────

const COMP_IDS = ["strategic-thinking", "stakeholder-engagement", "commercial-acumen", "leading-change", "decision-making"];
const COMP_NAMES = ["Strategic Thinking", "Stakeholder Engagement", "Commercial Acumen", "Leading Change", "Decision Making"];
const COMP_CLUSTERS = ["thinking", "engaging", "market", "driving", "thinking"];

const competencies: CompetencySelection[] = COMP_IDS.map((id, i) => ({
  competencyId: id,
  weight: i === 0 ? 2 : 1,
  critical: i === 0,
}));

const proficiencyTargets: ProficiencyTarget[] = COMP_IDS.map((id) => ({
  competencyId: id,
  targetLevel: 2 as const,
}));

const tools: EngagementTool[] = [
  { id: "t1", name: "Strategic Case Study", competencyIds: ["strategic-thinking", "commercial-acumen", "decision-making"], duration: 45, format: "written" as const, sequence: 1, briefingNotes: "" },
  { id: "t2", name: "Group Leadership Exercise", competencyIds: ["stakeholder-engagement", "leading-change", "decision-making"], duration: 30, format: "group" as const, sequence: 2, briefingNotes: "" },
  { id: "t3", name: "Stakeholder Role Play", competencyIds: ["stakeholder-engagement", "commercial-acumen", "leading-change"], duration: 20, format: "roleplay" as const, sequence: 3, briefingNotes: "" },
];

const assessors: Assessor[] = [
  { id: "obs1", name: "Dr Sarah Chen", email: "sarah@synovate.co", role: "lead" },
  { id: "obs2", name: "James Moriarty", email: "james@synovate.co", role: "assessor" },
];

const participants: Participant[] = [
  { id: "p1", name: "Alex Thompson", email: "alex@client.com", currentRole: "Senior Manager", businessUnit: "Commercial Banking", toolIds: ["t1", "t2", "t3"] },
  { id: "p2", name: "Morgan Lee", email: "morgan@client.com", currentRole: "Team Lead", businessUnit: "Retail Operations", toolIds: ["t1", "t2", "t3"] },
];

// Build scores for both participants
function makeIndicators(ratings: number[]): IndicatorScore[] {
  return ratings.map((r) => ({ rating: r as 1|2|3|4|5, notObserved: false }));
}

function makeCompScore(cid: string, ratings: number[], wellDone: string, better: string): CompetencyScore {
  return {
    competencyId: cid,
    indicators: makeIndicators(ratings),
    whatWasDoneWell: wellDone,
    whatCouldBeBetter: better,
    verbatimObservations: `"Key observation for ${cid}" — notable behaviour demonstrated during the exercise.`,
    otherNotableInsights: `Showed consistent pattern in ${cid} across multiple contexts.`,
  };
}

const scores: ParticipantToolScore[] = [];
const now = new Date().toISOString();

// Participant A (strong) — two observers
for (const obs of assessors) {
  for (const tool of tools) {
    const comps: CompetencyScore[] = tool.competencyIds.map((cid, i) => {
      const base = obs.id === "obs1" ? [4, 4, 3, 5] : [4, 3, 4, 4];
      return makeCompScore(cid, base,
        "Demonstrated confident, structured approach with clear stakeholder awareness and strong commercial reasoning.",
        "Could be more concise in verbal delivery. Would benefit from tighter headline-first framing."
      );
    });
    scores.push({ id: `p1|${tool.id}|${obs.id}`, participantId: "p1", toolId: tool.id, observerId: obs.id, competencies: comps, startedAt: now, lastSavedAt: now, completedAt: now });
  }
}

// Participant B (developing) — two observers
for (const obs of assessors) {
  for (const tool of tools) {
    const comps: CompetencyScore[] = tool.competencyIds.map((cid) => {
      const base = obs.id === "obs1" ? [3, 2, 3, 2] : [2, 3, 2, 3];
      return makeCompScore(cid, base,
        "Showed willingness to contribute and demonstrated solid foundational knowledge.",
        "Analysis remained descriptive rather than evaluative. Needs to push beyond 'what' to 'so what'."
      );
    });
    scores.push({ id: `p2|${tool.id}|${obs.id}`, participantId: "p2", toolId: tool.id, observerId: obs.id, competencies: comps, startedAt: now, lastSavedAt: now, completedAt: now });
  }
}

// Moderated scores
const moderatedScores: ModeratedScore[] = [];
for (const p of participants) {
  for (const sel of competencies) {
    const isP1 = p.id === "p1";
    moderatedScores.push({
      participantId: p.id,
      competencyId: sel.competencyId,
      computedScore: isP1 ? 3.88 : 2.50,
      moderatedScore: isP1 ? 3.90 : 2.50,
      isOverride: false,
      moderatedBy: "obs1",
      moderatedAt: now,
    });
  }
}

// Report sections
const reportSections: ReportSection[] = [];
const sectionKeys = ["executiveSummary", "competencyProfile", "indicatorEvidence", "developmentAreas", "nextSteps"] as const;
for (const p of participants) {
  for (const key of sectionKeys) {
    reportSections.push({
      participantId: p.id,
      sectionKey: key,
      content: key === "executiveSummary"
        ? `${p.name} participated in the Assessment Centre as part of the Senior Leadership Programme. Assessed against 5 competencies at the target proficiency levels.\n\n${p.name} achieved an Overall Assessment Rating placing them in the "proficient" band. This result indicates core requirements of the target role are met.\n\nKey findings:\n\n- Strengths observed in Strategic Thinking and Decision Making\n- Priority development areas in Stakeholder Engagement\n- Assessed across 3 tools by 2 assessors`
        : key === "competencyProfile"
        ? `The competency profile below summarises performance across all assessed competencies.\n\nStrategic Thinking: Strong analytical capability with evidence of systems-level reasoning.\n\nStakeholder Engagement: Adequate interpersonal skills with room for growth in influencing senior stakeholders.`
        : key === "developmentAreas"
        ? `Priority development areas:\n\n- Structured reflection practice — 10 minutes daily after key meetings\n- Exposure to higher-complexity contexts — seek stretch assignments\n- Targeted coaching on executive communication`
        : key === "nextSteps"
        ? `Immediate actions:\n\n- Feedback session within 10 working days\n- Individual Development Plan formalised in Actifyr\n\nOngoing support:\n\n- Line manager briefing\n- 90-day check-in`
        : `Indicator-level evidence for each competency.`,
      status: "signed_off",
      lastEditedAt: now,
      signedOffBy: "obs1",
      signedOffAt: now,
    });
  }
}

// Custom competencies with indicators
const customCompetencies = COMP_IDS.map((id, idx) => ({
  id,
  name: COMP_NAMES[idx],
  definition: `Definition of ${COMP_NAMES[idx]} for the target role.`,
  cluster: COMP_CLUSTERS[idx],
  retailSpecific: false,
  sectorTags: [],
  levels: [
    {
      level: 1 as const,
      name: "Foundation",
      qualifier: "Demonstrates basics",
      description: `Foundational ${COMP_NAMES[idx]} capability.`,
      indicators: [
        `Recognises core elements of ${COMP_NAMES[idx].toLowerCase()} in familiar situations`,
        `Applies basic ${COMP_NAMES[idx].toLowerCase()} frameworks with guidance`,
        `Identifies relevant data and information sources`,
        `Communicates basic reasoning to peers`,
      ],
    },
    {
      level: 2 as const,
      name: "Practitioner",
      qualifier: "Applies effectively",
      description: `Working-level ${COMP_NAMES[idx]} proficiency.`,
      indicators: [
        `Independently analyses complex situations using ${COMP_NAMES[idx].toLowerCase()} frameworks`,
        `Synthesises information from multiple sources to form evidence-based conclusions`,
        `Adapts approach based on context and stakeholder needs`,
        `Proactively identifies risks and opportunities across the business`,
      ],
    },
    {
      level: 3 as const,
      name: "Advanced",
      qualifier: "Leads and shapes",
      description: `Expert-level ${COMP_NAMES[idx]} mastery.`,
      indicators: [
        `Sets strategic direction leveraging deep ${COMP_NAMES[idx].toLowerCase()} expertise`,
        `Coaches and develops others in ${COMP_NAMES[idx].toLowerCase()} capability`,
        `Navigates ambiguity and competing priorities with confidence`,
        `Creates innovative solutions that drive measurable business impact`,
      ],
    },
  ],
}));

const setupSteps: SetupStep[] = Array.from({ length: 9 }, (_, i) => ({
  step: i + 1,
  status: "complete" as const,
}));

const engagement: Engagement = {
  id: "test-eng-001",
  status: "complete",
  basics: {
    name: "Senior Leadership Programme 2026",
    code: "SLP-2026-Q2",
    client: "Meridian Financial Group",
    purpose: "promotion",
    audience: "Senior Manager to Director",
    objective: "Assess readiness for promotion to Director level across Commercial and Retail divisions. Identify development priorities for a structured 12-month growth plan aligned with the Group's leadership framework.",
    cohortSize: 8,
    synovateEngagementLead: "Dr Sarah Chen",
    mode: "hybrid",
    acDateRange: "12–14 May 2026",
    languages: ["English"],
    deliverables: { individualReport: true, groupReport: true, feedbackSession: true, developmentPlan: true },
    confidentialityFlag: true,
    confidentialityNotes: "Reports restricted to HR Business Partners and line managers with participant consent.",
  },
  setupSteps,
  competencies,
  customCompetencies,
  proficiencyTargets,
  tools,
  aggregation: { ...DEFAULT_AGGREGATION },
  assessors,
  participants,
  schedule: [],
  scores,
  calibrate: {
    ...EMPTY_CALIBRATE_STATE,
    stage: "complete",
    moderatedScores,
    participantOars: participants.map((p) => ({
      participantId: p.id,
      computedOar: p.id === "p1" ? 3.90 : 2.50,
      computedBand: p.id === "p1" ? "strong" as const : "developing" as const,
      finalBand: p.id === "p1" ? "strong" as const : "developing" as const,
      isOverride: false,
      confirmedBy: "obs1",
      confirmedAt: now,
    })),
    signedOff: true,
    signedOffBy: "obs1",
    signedOffAt: now,
  },
  report: {
    ...EMPTY_REPORT_STATE,
    sections: reportSections,
  },
  reportFormat: {
    ...DEFAULT_REPORT_FORMAT,
    acContext: "This Assessment Centre was commissioned by Meridian Financial Group as part of a promotion readiness process for Senior Managers being considered for Director-level roles. The assessment used Synovate's multi-trait multi-method methodology, combining multiple assessment tools — each measuring overlapping competencies — to produce robust, evidence-based evaluations. Results reflect the integrated judgement of a calibrated assessor panel.",
    sections: {
      executiveSummary: true,
      competencyProfile: true,
      indicatorEvidence: true,
      developmentAreas: true,
      nextSteps: true,
      cohortContext: false,
    },
  },
  createdAt: now,
  updatedAt: now,
};

// ── Generate PDF ─────────────────────────────────────────────────────

console.log("Generating PDF for Alex Thompson...");
const doc = buildIndividualReportDoc(engagement, participants[0]);

const outPath = "/tmp/aca-test-report.pdf";
const pdfBytes = doc.output("arraybuffer");
writeFileSync(outPath, Buffer.from(pdfBytes));
console.log(`PDF written to ${outPath}`);

execSync(`open "${outPath}"`);
console.log("Opened in default PDF viewer.");
