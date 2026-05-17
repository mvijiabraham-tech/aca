/**
 * ACA v0.5 — Type definitions (Pass 3)
 */

export type DestinationKey = "setup" | "score" | "calibrate" | "report";

export type StepKey =
  | "engagement" | "competencies" | "proficiency" | "tools" | "aggregation"
  | "assessors" | "participants" | "schedule" | "report";

export type StepStatus = "not_started" | "in_progress" | "complete";

export type EngagementStatus = "draft" | "live" | "complete";

export type EngagementPurpose = "selection" | "promotion" | "development" | "hi_po";

export type EngagementMode = "in_person" | "virtual" | "hybrid";

// --- Competency dictionary ---
export type ProficiencyLevel = 1 | 2 | 3;

export type ClusterKey = "thinking" | "driving" | "engaging" | "market";

export interface CompetencyLevel {
  level: ProficiencyLevel;
  name: string;
  qualifier: string;
  description: string;
  indicators: string[];
}

export interface Competency {
  id: string;
  name: string;
  definition: string;
  cluster: string;
  retailSpecific: boolean;
  sectorTags: string[];
  levels: CompetencyLevel[];
}

export interface ClusterMeta {
  key: ClusterKey;
  label: string;
  description: string;
}

// --- Tool library ---
export type ToolFormat = "individual_written" | "individual_interactive" | "group_interactive";

export interface ToolType {
  key: string;
  name: string;
  description: string;
  defaultDurationMinutes: number;
  defaultFormat: ToolFormat;
  surfacesClusters: ClusterKey[];
}

// --- Step 1: Engagement basics ---
export interface EngagementDeliverables {
  individualReports: boolean;
  groupReport: boolean;
  feedbackSessions: boolean;
  talentReview: boolean;
}

export interface EngagementBasics {
  name: string;
  code: string;
  client: string;
  clientSponsor?: string;
  synovateEngagementLead: string;
  audience: string;
  purpose: EngagementPurpose;
  objective: string;
  cohortSize?: number;
  startDate: string;
  endDate: string;
  acDateRange: string;
  mode: EngagementMode;
  languages: string[];
  deliverables: EngagementDeliverables;
  confidentialityFlag: boolean;
  confidentialityNotes?: string;
  internalNotes?: string;
}

// --- Step 2: Competencies ---
export interface CompetencySelection {
  competencyId: string;
  weight: number;
  critical: boolean;
}

// --- Step 3: Proficiency targets ---
export interface ProficiencyTarget {
  competencyId: string;
  targetLevel: ProficiencyLevel;
  rationale?: string;
}

// --- Step 4: Tools ---
export interface EngagementTool {
  id: string;
  name: string;
  toolTypeKey: string;
  competencyIds: string[];
  durationMinutes: number;
  format: ToolFormat;
  notes?: string;
}

// --- Step 5: Aggregation rules ---
export type IndicatorMethod = "average" | "minimum" | "median";
export type NotObservedHandling = "exclude" | "zero" | "minimum_count";
export type ToolMethod = "average" | "weighted_average" | "highest_reliable";
export type OarMethod = "weighted_average" | "simple_average" | "critical_floor";

export interface AggregationRules {
  indicatorMethod: IndicatorMethod;
  notObservedHandling: NotObservedHandling;
  minIndicatorsRated: number;
  toolMethod: ToolMethod;
  minToolsRated: number;
  oarMethod: OarMethod;
  oarThresholds: [number, number, number, number];
  confirmed: boolean;
}

export const DEFAULT_AGGREGATION: AggregationRules = {
  indicatorMethod: "average",
  notObservedHandling: "exclude",
  minIndicatorsRated: 2,
  toolMethod: "average",
  minToolsRated: 2,
  oarMethod: "weighted_average",
  oarThresholds: [2.5, 3.25, 3.75, 4.25],
  confirmed: false,
};

// --- Step 6: Assessors ---
export type AssessorRole = "lead" | "assessor" | "observer";

export interface Assessor {
  id: string;
  name: string;
  email: string;
  role: AssessorRole;
  organisation: string;       // Synovate, client, partner firm
  calibrated: boolean;
  assignedToolIds: string[];
  notes?: string;
}

// --- Step 7: Participants ---
export interface Participant {
  id: string;
  name: string;
  employeeId?: string;
  currentRole: string;
  businessUnit?: string;
  location?: string;
  email?: string;
  yearsInRole?: number;
  // Tools this participant will go through. Default: all engagement tools.
  toolIds: string[];
  notes?: string;
}

// --- Step 8: Schedule ---
export interface ScheduleSlot {
  id: string;
  day: number;
  startTime: string;
  endTime: string;
  toolId: string;
  participantIds: string[];
  assessorIds: string[];
  room?: string;
}

// --- Step 9: Report format ---
export interface ReportFormat {
  sections: {
    executiveSummary: boolean;
    competencyProfile: boolean;
    indicatorEvidence: boolean;
    developmentAreas: boolean;
    nextSteps: boolean;
    cohortContext: boolean;
  };
  branding: {
    clientLogoUploaded: boolean;
    clientLogoFilename?: string;
    coBranded: boolean;
  };
  outputFormats: {
    pdf: boolean;
    pptx: boolean;
  };
  customNotes?: string;
}
export const DEFAULT_REPORT_FORMAT: ReportFormat = {
  sections: {
    executiveSummary: true,
    competencyProfile: true,
    indicatorEvidence: true,
    developmentAreas: true,
    nextSteps: true,
    cohortContext: false,
  },
  branding: {
    clientLogoUploaded: false,
    coBranded: true,
  },
  outputFormats: {
    pdf: true,
    pptx: false,
  },
};

// =============================================================================
// CALIBRATE DESTINATION
// =============================================================================

// Per (participant, competency) — the moderated score after Lead Assessor review
export interface ModeratedScore {
  participantId: string;
  competencyId: string;
  // Computed from observer ratings (average of competency scores across observers)
  computedScore: number;            // 1.0 - 5.0
  // Lead Assessor's moderated value (may equal computed if accepted as-is)
  moderatedScore: number;           // 1.0 - 5.0
  isOverride: boolean;              // true if moderated !== computed
  rationale?: string;               // required when isOverride is true
  moderatedBy?: string;             // assessorId of Lead who set it
  moderatedAt?: string;
}

// Per participant — the OAR band assignment
export type OarBand = "below" | "developing" | "proficient" | "strong" | "distinguished";

export const OAR_BAND_META: Record<OarBand, { label: string; tone: "red" | "amber" | "ocean" | "green" | "navy"; description: string }> = {
  below:         { label: "Below",        tone: "red",    description: "Significant gap to target." },
  developing:    { label: "Developing",   tone: "amber",  description: "Below target with potential." },
  proficient:    { label: "Proficient",   tone: "ocean",  description: "Meets target across competencies." },
  strong:        { label: "Strong",       tone: "green",  description: "Exceeds target on most competencies." },
  distinguished: { label: "Distinguished",tone: "navy",   description: "Operates at the next level." },
};

export interface ParticipantOar {
  participantId: string;
  computedOar: number;              // weighted average per aggregation rules
  computedBand: OarBand;
  finalBand: OarBand;
  isOverride: boolean;
  rationale?: string;
  confirmedBy?: string;
  confirmedAt?: string;
}

// Calibrate destination overall state
export type CalibrateStage = "not_started" | "reconcile" | "moderate" | "oar" | "complete";

export interface CalibrateState {
  stage: CalibrateStage;
  moderatedScores: ModeratedScore[];
  oars: ParticipantOar[];
  signedOffBy?: string;
  signedOffAt?: string;
}

export const EMPTY_CALIBRATE_STATE: CalibrateState = {
  stage: "not_started",
  moderatedScores: [],
  oars: [],
};

// =============================================================================
// REPORT DESTINATION
// =============================================================================

export type ReportSectionKey =
  | "executiveSummary"
  | "competencyProfile"
  | "indicatorEvidence"
  | "developmentAreas"
  | "nextSteps"
  | "cohortContext";

export type ReportSectionStatus = "not_started" | "drafting" | "drafted" | "edited" | "signed_off";

// Per (participant, section) — one record
export interface ReportSection {
  participantId: string;
  sectionKey: ReportSectionKey;
  status: ReportSectionStatus;
  content: string;             // markdown
  draftedFromPrompt?: string;  // the prompt that was generated/used
  lastEditedAt?: string;
  signedOffBy?: string;
  signedOffAt?: string;
}

export type FeedbackSessionStatus = "not_started" | "scheduled" | "completed";

// Per participant — feedback session record
export interface FeedbackSession {
  participantId: string;
  status: FeedbackSessionStatus;
  scheduledAt?: string;
  conductedAt?: string;
  conductedBy?: string;
  prepNotes?: string;
  sessionNotes?: string;
  idpCommitments: string[];    // free-text commitments captured during the session
  handoffSentAt?: string;      // when activation handoff was triggered
}

export interface ReportState {
  sections: ReportSection[];
  feedbackSessions: FeedbackSession[];
}

export const EMPTY_REPORT_STATE: ReportState = {
  sections: [],
  feedbackSessions: [],
};

// --- Setup shell ---
export interface SetupStep {
  key: StepKey;
  number: number;
  title: string;
  description: string;
  status: StepStatus;
  summary?: string;
}

// =============================================================================
// SCORE DESTINATION
// =============================================================================

// A single indicator rating from one observer
export type IndicatorRating = 1 | 2 | 3 | 4 | 5;

export interface IndicatorScore {
  rating?: IndicatorRating;      // 1-5; undefined means unrated
  notObserved: boolean;          // true if explicitly marked Not Observed
}

// Anchored descriptors for the 1-5 scale, shown above indicator rows
export const RATING_ANCHORS: Record<1 | 2 | 3 | 4 | 5, { short: string; label: string; description: string }> = {
  1: { short: "1", label: "Well below",   description: "Not demonstrated; significant gap." },
  2: { short: "2", label: "Below",        description: "Partially demonstrated; needs work." },
  3: { short: "3", label: "Meets",        description: "Demonstrated at the target level." },
  4: { short: "4", label: "Above",        description: "Demonstrated strongly; exceeds target." },
  5: { short: "5", label: "Well above",   description: "Demonstrated at the next-higher level." },
};

// All scores for one competency, one participant, one tool, one observer
export interface CompetencyScore {
  competencyId: string;
  indicators: IndicatorScore[];           // 4 indicators, by position 0-3
  whatWasDoneWell?: string;
  whatCouldBeBetter?: string;
}

// All scores from one observer, for one participant, on one tool
export interface ParticipantToolScore {
  id: string;                              // synthetic: `${participantId}|${toolId}|${observerId}`
  participantId: string;
  toolId: string;
  observerId: string;                      // assessorId
  competencies: CompetencyScore[];
  startedAt?: string;
  lastSavedAt?: string;
  completedAt?: string;                    // marked explicitly by observer
}

// Convenience computed status type
export type ScoringStatus = "not_started" | "in_progress" | "complete";

// --- Engagement aggregate ---
export interface Engagement {
  id: string;
  status: EngagementStatus;
  basics: EngagementBasics;
  setupSteps: SetupStep[];
  competencies: CompetencySelection[];
  customCompetencies: Competency[];
  proficiencyTargets: ProficiencyTarget[];
  tools: EngagementTool[];
  aggregation: AggregationRules;
  // Pass 3 additions
  assessors: Assessor[];
  participants: Participant[];
  schedule: ScheduleSlot[];
  reportFormat: ReportFormat;
  // Pass 4 additions — Score destination
  scores: ParticipantToolScore[];
  // Pass 5 additions — Calibrate destination
  calibrate: CalibrateState;
  // Pass 6 additions — Report destination
  report: ReportState;
  // Lifecycle metadata
  createdAt?: string;
  lockedAt?: string;
  completedAt?: string;
}

export interface NewEngagementInput {
  name: string;
  code: string;
  client: string;
}
