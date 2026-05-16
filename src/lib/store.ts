import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Engagement, NewEngagementInput, SetupStep, EngagementBasics,
  CompetencySelection, ProficiencyTarget, EngagementTool, AggregationRules,
  StepKey, StepStatus, Assessor, Participant, ScheduleSlot, ReportFormat,
  ParticipantToolScore, CompetencyScore,
  ModeratedScore, ParticipantOar, CalibrateStage,
  ReportSection, FeedbackSession,
} from "@/types";
import { DEFAULT_AGGREGATION, DEFAULT_REPORT_FORMAT, EMPTY_CALIBRATE_STATE, EMPTY_REPORT_STATE } from "@/types";
import { seedEngagements } from "@/mocks/engagements";

export type AppMode = "demo" | "prod";

export const DEMO_ENGAGEMENT_IDS = new Set([
  "eng-firstcry-cm-2026-11",
  "eng-apollo-sl-2026-09",
  "eng-levis-rm-2027-01",
  "eng-tata-hipo-2027-02",
]);

interface AppState {
  engagements: Engagement[];
  appMode: AppMode;
  // Persona for Score destination (which observer is currently acting)
  actingAsObserverId: Record<string, string | null>; // keyed by engagement id
  setAppMode: (mode: AppMode) => void;
  addEngagement: (input: NewEngagementInput) => Engagement;
  resetAll: () => void;
  updateBasics: (id: string, basics: Partial<EngagementBasics>) => void;
  setCompetencies: (id: string, comps: CompetencySelection[]) => void;
  setProficiencyTargets: (id: string, targets: ProficiencyTarget[]) => void;
  setTools: (id: string, tools: EngagementTool[]) => void;
  setAggregation: (id: string, rules: AggregationRules) => void;
  setStepStatus: (id: string, stepKey: StepKey, status: StepStatus, summary?: string) => void;
  setAssessors: (id: string, assessors: Assessor[]) => void;
  setParticipants: (id: string, participants: Participant[]) => void;
  setSchedule: (id: string, schedule: ScheduleSlot[]) => void;
  setReportFormat: (id: string, format: ReportFormat) => void;
  lockEngagement: (id: string) => void;
  unlockEngagement: (id: string) => void;
  // Pass 4 — scoring
  setActingObserver: (engagementId: string, observerId: string | null) => void;
  upsertScore: (engagementId: string, score: ParticipantToolScore) => void;
  updateCompetencyScore: (
    engagementId: string,
    participantId: string,
    toolId: string,
    observerId: string,
    competencyScore: CompetencyScore,
  ) => void;
  markScoreComplete: (
    engagementId: string,
    participantId: string,
    toolId: string,
    observerId: string,
    complete: boolean,
  ) => void;
  // Pass 5 — Calibrate
  upsertModeratedScore: (engagementId: string, score: ModeratedScore) => void;
  upsertOar: (engagementId: string, oar: ParticipantOar) => void;
  setCalibrateStage: (engagementId: string, stage: CalibrateStage) => void;
  signOffCalibrate: (engagementId: string, byObserverId: string) => void;
  // Pass 6 — Report
  upsertReportSection: (engagementId: string, section: ReportSection) => void;
  upsertFeedbackSession: (engagementId: string, session: FeedbackSession) => void;
  markEngagementComplete: (engagementId: string) => void;
}

const blankSteps: Omit<SetupStep, "status" | "summary">[] = [
  { key: "engagement", number: 1, title: "Engagement basics", description: "Client, audience, purpose, dates, deliverables." },
  { key: "competencies", number: 2, title: "Competencies", description: "Select competencies from the Synovate dictionary or upload a CSV." },
  { key: "proficiency", number: 3, title: "Proficiency targets", description: "Pick the target proficiency level per competency." },
  { key: "tools", number: 4, title: "Tools", description: "Configure assessment tools. Scoring templates auto-generate." },
  { key: "aggregation", number: 5, title: "Aggregation rules", description: "How indicator ratings roll up to competency scores and OAR." },
  { key: "assessors", number: 6, title: "Assessors", description: "Add assessors and assign them to tools." },
  { key: "participants", number: 7, title: "Participants", description: "Add participants and map them to tools." },
  { key: "schedule", number: 8, title: "Schedule", description: "Build the schedule with live conflict detection." },
  { key: "report", number: 9, title: "Report format", description: "Confirm the report shape and branding." },
];

const blankBasics = (input: NewEngagementInput): EngagementBasics => ({
  name: input.name,
  code: input.code,
  client: input.client,
  synovateEngagementLead: "MV",
  audience: "",
  purpose: "selection",
  objective: "",
  cohortSize: 0,
  startDate: "",
  endDate: "",
  acDateRange: "",
  mode: "hybrid",
  languages: [],
  deliverables: {
    individualReports: false,
    groupReport: false,
    feedbackSessions: false,
    talentReview: false,
  },
  confidentialityFlag: false,
});

function patchEngagement(
  engagements: Engagement[],
  id: string,
  patch: (e: Engagement) => Engagement,
): Engagement[] {
  return engagements.map((e) => (e.id === id ? patch(e) : e));
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      engagements: seedEngagements,
      appMode: "demo" as AppMode,
      actingAsObserverId: {},

      setAppMode: (mode) => set({ appMode: mode }),

      addEngagement: (input) => {
        const id = `eng-${input.code.toLowerCase().replace(/[^a-z0-9-]/g, "")}-${Date.now().toString(36)}`;
        const newEngagement: Engagement = {
          id,
          status: "draft",
          createdAt: new Date().toISOString(),
          basics: blankBasics(input),
          competencies: [],
          proficiencyTargets: [],
          tools: [],
          aggregation: DEFAULT_AGGREGATION,
          assessors: [],
          participants: [],
          schedule: [],
          reportFormat: DEFAULT_REPORT_FORMAT,
          scores: [],
          calibrate: { ...EMPTY_CALIBRATE_STATE, moderatedScores: [], oars: [] },
          report: { ...EMPTY_REPORT_STATE, sections: [], feedbackSessions: [] },
          setupSteps: blankSteps.map((s) => ({ ...s, status: "not_started" as const })),
        };
        // Step 1 starts in_progress because they've provided name/code/client
        newEngagement.setupSteps[0].status = "in_progress";
        set((s) => ({ engagements: [newEngagement, ...s.engagements] }));
        return newEngagement;
      },

      resetAll: () => set({ engagements: seedEngagements }),

      updateBasics: (id, basics) =>
        set((s) => ({
          engagements: patchEngagement(s.engagements, id, (e) => ({
            ...e,
            basics: { ...e.basics, ...basics },
          })),
        })),

      setCompetencies: (id, comps) =>
        set((s) => ({
          engagements: patchEngagement(s.engagements, id, (e) => {
            const compIds = new Set(comps.map((c) => c.competencyId));
            const targets = e.proficiencyTargets.filter((t) => compIds.has(t.competencyId));
            return { ...e, competencies: comps, proficiencyTargets: targets };
          }),
        })),

      setProficiencyTargets: (id, targets) =>
        set((s) => ({
          engagements: patchEngagement(s.engagements, id, (e) => ({
            ...e, proficiencyTargets: targets,
          })),
        })),

      setTools: (id, tools) =>
        set((s) => ({
          engagements: patchEngagement(s.engagements, id, (e) => ({ ...e, tools })),
        })),

      setAggregation: (id, rules) =>
        set((s) => ({
          engagements: patchEngagement(s.engagements, id, (e) => ({ ...e, aggregation: rules })),
        })),

      setAssessors: (id, assessors) =>
        set((s) => ({
          engagements: patchEngagement(s.engagements, id, (e) => ({ ...e, assessors })),
        })),

      setParticipants: (id, participants) =>
        set((s) => ({
          engagements: patchEngagement(s.engagements, id, (e) => ({ ...e, participants })),
        })),

      setSchedule: (id, schedule) =>
        set((s) => ({
          engagements: patchEngagement(s.engagements, id, (e) => ({ ...e, schedule })),
        })),

      setReportFormat: (id, reportFormat) =>
        set((s) => ({
          engagements: patchEngagement(s.engagements, id, (e) => ({ ...e, reportFormat })),
        })),

      lockEngagement: (id) =>
        set((s) => ({
          engagements: patchEngagement(s.engagements, id, (e) => ({
            ...e,
            status: "live",
            lockedAt: new Date().toISOString(),
          })),
        })),

      unlockEngagement: (id) =>
        set((s) => ({
          engagements: patchEngagement(s.engagements, id, (e) => ({
            ...e,
            status: "draft",
            lockedAt: undefined,
          })),
        })),

      // Pass 4 — scoring actions
      setActingObserver: (engagementId, observerId) =>
        set((s) => ({
          actingAsObserverId: { ...s.actingAsObserverId, [engagementId]: observerId },
        })),

      upsertScore: (engagementId, score) =>
        set((s) => ({
          engagements: patchEngagement(s.engagements, engagementId, (e) => {
            const existing = e.scores.find((sc) => sc.id === score.id);
            const next = existing
              ? e.scores.map((sc) => (sc.id === score.id ? score : sc))
              : [...e.scores, score];
            return { ...e, scores: next };
          }),
        })),

      updateCompetencyScore: (engagementId, participantId, toolId, observerId, competencyScore) =>
        set((s) => ({
          engagements: patchEngagement(s.engagements, engagementId, (e) => {
            const scoreId = `${participantId}|${toolId}|${observerId}`;
            const existing = e.scores.find((sc) => sc.id === scoreId);
            const now = new Date().toISOString();

            if (!existing) {
              // Create new score record
              const newScore: ParticipantToolScore = {
                id: scoreId,
                participantId,
                toolId,
                observerId,
                competencies: [competencyScore],
                startedAt: now,
                lastSavedAt: now,
              };
              return { ...e, scores: [...e.scores, newScore] };
            }

            // Update existing score record — replace or add the competency score
            const compIdx = existing.competencies.findIndex(
              (c) => c.competencyId === competencyScore.competencyId,
            );
            const nextComps = compIdx === -1
              ? [...existing.competencies, competencyScore]
              : existing.competencies.map((c, i) => (i === compIdx ? competencyScore : c));

            const updated: ParticipantToolScore = {
              ...existing,
              competencies: nextComps,
              lastSavedAt: now,
            };
            return { ...e, scores: e.scores.map((sc) => (sc.id === scoreId ? updated : sc)) };
          }),
        })),

      markScoreComplete: (engagementId, participantId, toolId, observerId, complete) =>
        set((s) => ({
          engagements: patchEngagement(s.engagements, engagementId, (e) => {
            const scoreId = `${participantId}|${toolId}|${observerId}`;
            const now = new Date().toISOString();
            return {
              ...e,
              scores: e.scores.map((sc) =>
                sc.id === scoreId
                  ? { ...sc, completedAt: complete ? now : undefined }
                  : sc,
              ),
            };
          }),
        })),

      // Pass 5 — Calibrate
      upsertModeratedScore: (engagementId, score) =>
        set((s) => ({
          engagements: patchEngagement(s.engagements, engagementId, (e) => {
            const existing = e.calibrate.moderatedScores.findIndex(
              (m) => m.participantId === score.participantId && m.competencyId === score.competencyId,
            );
            const next = existing === -1
              ? [...e.calibrate.moderatedScores, score]
              : e.calibrate.moderatedScores.map((m, i) => i === existing ? score : m);
            return { ...e, calibrate: { ...e.calibrate, moderatedScores: next } };
          }),
        })),

      upsertOar: (engagementId, oar) =>
        set((s) => ({
          engagements: patchEngagement(s.engagements, engagementId, (e) => {
            const existing = e.calibrate.oars.findIndex((o) => o.participantId === oar.participantId);
            const next = existing === -1
              ? [...e.calibrate.oars, oar]
              : e.calibrate.oars.map((o, i) => i === existing ? oar : o);
            return { ...e, calibrate: { ...e.calibrate, oars: next } };
          }),
        })),

      setCalibrateStage: (engagementId, stage) =>
        set((s) => ({
          engagements: patchEngagement(s.engagements, engagementId, (e) => ({
            ...e, calibrate: { ...e.calibrate, stage },
          })),
        })),

      signOffCalibrate: (engagementId, byObserverId) =>
        set((s) => ({
          engagements: patchEngagement(s.engagements, engagementId, (e) => ({
            ...e,
            calibrate: {
              ...e.calibrate,
              stage: "complete",
              signedOffBy: byObserverId,
              signedOffAt: new Date().toISOString(),
            },
          })),
        })),

      // Pass 6 — Report
      upsertReportSection: (engagementId, section) =>
        set((s) => ({
          engagements: patchEngagement(s.engagements, engagementId, (e) => {
            const existing = e.report.sections.findIndex(
              (sec) => sec.participantId === section.participantId && sec.sectionKey === section.sectionKey,
            );
            const next = existing === -1
              ? [...e.report.sections, section]
              : e.report.sections.map((sec, i) => i === existing ? section : sec);
            return { ...e, report: { ...e.report, sections: next } };
          }),
        })),

      upsertFeedbackSession: (engagementId, session) =>
        set((s) => ({
          engagements: patchEngagement(s.engagements, engagementId, (e) => {
            const existing = e.report.feedbackSessions.findIndex((fs) => fs.participantId === session.participantId);
            const next = existing === -1
              ? [...e.report.feedbackSessions, session]
              : e.report.feedbackSessions.map((fs, i) => i === existing ? session : fs);
            return { ...e, report: { ...e.report, feedbackSessions: next } };
          }),
        })),

      markEngagementComplete: (engagementId) =>
        set((s) => ({
          engagements: patchEngagement(s.engagements, engagementId, (e) => ({
            ...e,
            status: "complete",
            completedAt: new Date().toISOString(),
          })),
        })),

      setStepStatus: (id, stepKey, status, summary) =>
        set((s) => ({
          engagements: patchEngagement(s.engagements, id, (e) => ({
            ...e,
            setupSteps: e.setupSteps.map((step) =>
              step.key === stepKey ? { ...step, status, summary: summary ?? step.summary } : step,
            ),
          })),
        })),
    }),
    { name: "aca-v05-store", version: 7 },
  ),
);

export const useEngagement = (id: string | undefined) =>
  useAppStore((s) => (id ? s.engagements.find((e) => e.id === id) : undefined));

export const useAppMode = () => useAppStore((s) => s.appMode);

// Returns the currently-acting observer id for an engagement; defaults to the Lead Assessor
export const useActingObserverId = (engagementId: string | undefined): string | null => {
  return useAppStore((s) => {
    if (!engagementId) return null;
    const set = s.actingAsObserverId[engagementId];
    if (set !== undefined) return set;
    // Default to first Lead Assessor
    const engagement = s.engagements.find((e) => e.id === engagementId);
    if (!engagement) return null;
    const lead = engagement.assessors.find((a) => a.role === "lead");
    return lead?.id ?? engagement.assessors[0]?.id ?? null;
  });
};
