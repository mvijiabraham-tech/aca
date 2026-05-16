import type {
  Engagement, SetupStep, StepStatus,
  CompetencySelection, ProficiencyTarget, EngagementTool,
  EngagementBasics, Assessor, Participant, ScheduleSlot,
  ParticipantToolScore, IndicatorRating,
} from "@/types";
import { DEFAULT_AGGREGATION, DEFAULT_REPORT_FORMAT, EMPTY_CALIBRATE_STATE, EMPTY_REPORT_STATE } from "@/types";

function makeSteps(states: Partial<Record<SetupStep["key"], { status: StepStatus; summary?: string }>>): SetupStep[] {
  const defs: Omit<SetupStep, "status" | "summary">[] = [
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
  return defs.map((d) => ({
    ...d,
    status: states[d.key]?.status ?? "not_started",
    summary: states[d.key]?.summary,
  }));
}

// ============================================================================
// FirstCry (Live) - fully populated
// ============================================================================
const firstcry_basics: EngagementBasics = {
  name: "FirstCry — Cluster Manager AC",
  code: "FC-CM-2026-11",
  client: "FirstCry",
  clientSponsor: "Head of Retail",
  synovateEngagementLead: "MV",
  audience: "Cluster Managers — Retail Operations",
  purpose: "promotion",
  objective: "Identify Cluster Managers ready for promotion to Senior Cluster Manager. AC results combine with last 2 years' performance data.",
  cohortSize: 8,
  startDate: "2026-11-10",
  endDate: "2026-11-30",
  acDateRange: "Nov 18–20",
  mode: "hybrid",
  languages: ["English"],
  deliverables: {
    individualReports: true,
    groupReport: true,
    feedbackSessions: true,
    talentReview: true,
  },
  confidentialityFlag: false,
  internalNotes: "Repeat client. Same competency framework as the 2025 cohort.",
};

const firstcry_competencies: CompetencySelection[] = [
  { competencyId: "stakeholder-management",       weight: 1.0, critical: false },
  { competencyId: "execution-excellence",         weight: 1.5, critical: true  },
  { competencyId: "people-management",            weight: 1.5, critical: true  },
  { competencyId: "problem-solving-decision-making", weight: 1.0, critical: false },
  { competencyId: "analytical-skills",            weight: 1.0, critical: false },
  { competencyId: "market-and-consumer-awareness",weight: 1.0, critical: false },
  { competencyId: "product-and-process-knowledge",weight: 1.0, critical: false },
];

const firstcry_targets: ProficiencyTarget[] = [
  { competencyId: "stakeholder-management",          targetLevel: 2, rationale: "Cluster Managers operate across area teams and central functions." },
  { competencyId: "execution-excellence",            targetLevel: 2, rationale: "Core to the role — must apply independently." },
  { competencyId: "people-management",               targetLevel: 2 },
  { competencyId: "problem-solving-decision-making", targetLevel: 2 },
  { competencyId: "analytical-skills",               targetLevel: 2 },
  { competencyId: "market-and-consumer-awareness",   targetLevel: 2 },
  { competencyId: "product-and-process-knowledge",   targetLevel: 2 },
];

const firstcry_tools: EngagementTool[] = [
  { id: "t1", name: "Cluster business case",          toolTypeKey: "case_study",   durationMinutes: 90, format: "individual_written",     competencyIds: ["problem-solving-decision-making", "analytical-skills", "market-and-consumer-awareness"] },
  { id: "t2", name: "Performance conversation role-play", toolTypeKey: "role_play", durationMinutes: 30, format: "individual_interactive", competencyIds: ["people-management", "stakeholder-management"] },
  { id: "t3", name: "Behavioural Event Interview",    toolTypeKey: "bei",          durationMinutes: 60, format: "individual_interactive", competencyIds: ["execution-excellence", "people-management", "stakeholder-management"] },
  { id: "t4", name: "In-tray exercise",               toolTypeKey: "in_tray",      durationMinutes: 60, format: "individual_written",     competencyIds: ["execution-excellence", "problem-solving-decision-making"] },
  { id: "t5", name: "Cluster strategy presentation",  toolTypeKey: "presentation", durationMinutes: 30, format: "individual_interactive", competencyIds: ["product-and-process-knowledge", "market-and-consumer-awareness", "analytical-skills"] },
];

// ============================================================================
// Apollo (Complete) - fully populated, L1 dominant
// ============================================================================
const apollo_basics: EngagementBasics = {
  name: "Apollo Hospitals — Service Leader Development",
  code: "AH-SL-2026-09",
  client: "Apollo Hospitals",
  clientSponsor: "Director of Operations",
  synovateEngagementLead: "MV",
  audience: "Service Leaders — Hospital Operations",
  purpose: "development",
  objective: "Build foundational leadership capability across new Service Leaders. Output: individual development plans plus group capability themes for the leadership development programme.",
  cohortSize: 10,
  startDate: "2026-09-05",
  endDate: "2026-09-30",
  acDateRange: "Sep 14–16",
  mode: "hybrid",
  languages: ["English"],
  deliverables: {
    individualReports: true,
    groupReport: true,
    feedbackSessions: true,
    talentReview: false,
  },
  confidentialityFlag: false,
};

const apollo_competencies: CompetencySelection[] = [
  { competencyId: "stakeholder-management",       weight: 1.0, critical: false },
  { competencyId: "execution-excellence",         weight: 1.0, critical: true  },
  { competencyId: "people-management",            weight: 1.0, critical: false },
  { competencyId: "problem-solving-decision-making", weight: 1.0, critical: false },
  { competencyId: "analytical-skills",            weight: 0.5, critical: false },
  { competencyId: "product-and-process-knowledge",weight: 1.0, critical: true  },
];

const apollo_targets: ProficiencyTarget[] = [
  { competencyId: "stakeholder-management",          targetLevel: 1, rationale: "Service leaders are early in their leadership journey — foundational expectations." },
  { competencyId: "execution-excellence",            targetLevel: 2 },
  { competencyId: "people-management",               targetLevel: 1 },
  { competencyId: "problem-solving-decision-making", targetLevel: 1 },
  { competencyId: "analytical-skills",               targetLevel: 1 },
  { competencyId: "product-and-process-knowledge",   targetLevel: 1 },
];

const apollo_tools: EngagementTool[] = [
  { id: "t1", name: "Patient family conversation",      toolTypeKey: "role_play",        durationMinutes: 30, format: "individual_interactive", competencyIds: ["people-management", "stakeholder-management"] },
  { id: "t2", name: "Operations case study",            toolTypeKey: "case_study",       durationMinutes: 60, format: "individual_written",     competencyIds: ["problem-solving-decision-making", "analytical-skills"] },
  { id: "t3", name: "Behavioural Event Interview",      toolTypeKey: "bei",              durationMinutes: 45, format: "individual_interactive", competencyIds: ["execution-excellence", "people-management"] },
  { id: "t4", name: "Service standards written exercise", toolTypeKey: "written_exercise", durationMinutes: 45, format: "individual_written",   competencyIds: ["product-and-process-knowledge", "execution-excellence"] },
];

// ============================================================================
// Levi Strauss (Draft, mid-setup) - partial
// ============================================================================
const levi_basics: EngagementBasics = {
  name: "Levi Strauss — Regional Manager AC",
  code: "LS-RM-2027-01",
  client: "Levi Strauss",
  synovateEngagementLead: "MV",
  audience: "Regional Managers — South India",
  purpose: "promotion",
  objective: "Identify Regional Managers ready to step up to Zonal Manager roles across South India.",
  cohortSize: 12,
  startDate: "2027-01-15",
  endDate: "2027-02-10",
  acDateRange: "Jan 27–29",
  mode: "in_person",
  languages: ["English", "Tamil"],
  deliverables: {
    individualReports: true,
    groupReport: true,
    feedbackSessions: true,
    talentReview: false,
  },
  confidentialityFlag: false,
};

const levi_competencies: CompetencySelection[] = [
  { competencyId: "stakeholder-management",       weight: 1.0, critical: false },
  { competencyId: "execution-excellence",         weight: 1.5, critical: true  },
  { competencyId: "people-management",            weight: 1.5, critical: true  },
  { competencyId: "problem-solving-decision-making", weight: 1.0, critical: false },
  { competencyId: "analytical-skills",            weight: 1.0, critical: false },
  { competencyId: "market-and-consumer-awareness",weight: 1.0, critical: false },
  { competencyId: "product-and-process-knowledge",weight: 1.0, critical: false },
];

const levi_targets: ProficiencyTarget[] = [
  // Only 5 of 7 set — Step 3 in progress
  { competencyId: "stakeholder-management",          targetLevel: 2 },
  { competencyId: "execution-excellence",            targetLevel: 2 },
  { competencyId: "people-management",               targetLevel: 2 },
  { competencyId: "problem-solving-decision-making", targetLevel: 2 },
  { competencyId: "analytical-skills",               targetLevel: 2 },
];

// ============================================================================
// Tata Steel (Draft, just started)
// ============================================================================
const tata_basics: EngagementBasics = {
  name: "Tata Steel — High Potential Identification",
  code: "TS-HP-2027-02",
  client: "Tata Steel",
  synovateEngagementLead: "MV",
  audience: "Mid-senior leaders across SBUs",
  purpose: "hi_po",
  objective: "Identify high-potential mid-senior leaders for the Tata Steel succession pipeline.",
  cohortSize: 16,
  startDate: "2027-02-20",
  endDate: "2027-03-15",
  acDateRange: "Mar 1–3",
  mode: "virtual",
  languages: ["English", "Hindi"],
  deliverables: {
    individualReports: true,
    groupReport: false,
    feedbackSessions: false,
    talentReview: true,
  },
  confidentialityFlag: true,
  confidentialityNotes: "Names not to appear in any external Synovate communications.",
};

const tata_competencies: CompetencySelection[] = [
  { competencyId: "problem-solving-decision-making", weight: 1.5, critical: true  },
  { competencyId: "analytical-skills",               weight: 1.0, critical: false },
  { competencyId: "people-management",               weight: 1.0, critical: false },
];

// ---- FirstCry assessors / participants / schedule ----
const firstcry_assessors: Assessor[] = [
  { id: "a1", name: "Dr. Anita Rao",       email: "anita.rao@synovate.in",    role: "lead",     organisation: "Synovate", calibrated: true, assignedToolIds: ["t1","t2","t3","t4","t5"] },
  { id: "a2", name: "Rajesh Menon",        email: "rajesh.menon@synovate.in", role: "assessor", organisation: "Synovate", calibrated: true, assignedToolIds: ["t1","t3","t4"] },
  { id: "a3", name: "Kavitha Iyer",        email: "kavitha.iyer@synovate.in", role: "assessor", organisation: "Synovate", calibrated: true, assignedToolIds: ["t2","t3","t5"] },
  { id: "a4", name: "Priya Sundaram",      email: "priya.s@firstcry.com",     role: "observer", organisation: "FirstCry", calibrated: true, assignedToolIds: ["t1","t5"] },
  { id: "a5", name: "Vikram Naidu",        email: "vikram.n@firstcry.com",    role: "observer", organisation: "FirstCry", calibrated: true, assignedToolIds: ["t2","t3"] },
  { id: "a6", name: "Sarah D'Souza",       email: "sarah.d@assessorpartner.in", role: "assessor", organisation: "AssessorPartner", calibrated: true, assignedToolIds: ["t1","t4"] },
  { id: "a7", name: "Abraham",             email: "abraham@synovate.co.in",   role: "observer", organisation: "Synovate", calibrated: true, assignedToolIds: ["t1","t2","t3"] },
];

const firstcry_participants: Participant[] = [
  { id: "p1", name: "Ankit Sharma",      employeeId: "FC-1042", currentRole: "Cluster Manager", businessUnit: "South Zone", location: "Bangalore",  yearsInRole: 3, toolIds: ["t1","t2","t3","t4","t5"] },
  { id: "p2", name: "Bhavna Reddy",      employeeId: "FC-1108", currentRole: "Cluster Manager", businessUnit: "South Zone", location: "Hyderabad",  yearsInRole: 2, toolIds: ["t1","t2","t3","t4","t5"] },
  { id: "p3", name: "Chetan Patil",      employeeId: "FC-1167", currentRole: "Cluster Manager", businessUnit: "West Zone",  location: "Mumbai",     yearsInRole: 4, toolIds: ["t1","t2","t3","t4","t5"] },
  { id: "p4", name: "Deepa Krishnan",    employeeId: "FC-1203", currentRole: "Cluster Manager", businessUnit: "South Zone", location: "Chennai",    yearsInRole: 2, toolIds: ["t1","t2","t3","t4","t5"] },
  { id: "p5", name: "Eshan Mehta",       employeeId: "FC-1241", currentRole: "Cluster Manager", businessUnit: "North Zone", location: "Delhi NCR",  yearsInRole: 3, toolIds: ["t1","t2","t3","t4","t5"] },
  { id: "p6", name: "Farah Khan",        employeeId: "FC-1289", currentRole: "Cluster Manager", businessUnit: "West Zone",  location: "Pune",       yearsInRole: 2, toolIds: ["t1","t2","t3","t4","t5"] },
  { id: "p7", name: "Gaurav Nair",       employeeId: "FC-1324", currentRole: "Cluster Manager", businessUnit: "South Zone", location: "Kochi",      yearsInRole: 5, toolIds: ["t1","t2","t3","t4","t5"] },
  { id: "p8", name: "Hema Subramaniam",  employeeId: "FC-1390", currentRole: "Cluster Manager", businessUnit: "South Zone", location: "Bangalore",  yearsInRole: 2, toolIds: ["t1","t2","t3","t4","t5"] },
];

// FirstCry schedule — 3 days × 8 participants, illustrative subset
const firstcry_schedule: ScheduleSlot[] = [
  { id: "s1",  day: 1, startTime: "09:00", endTime: "10:30", toolId: "t1", participantIds: ["p1","p2","p3","p4"], assessorIds: ["a2","a6"], room: "Boardroom A" },
  { id: "s2",  day: 1, startTime: "09:00", endTime: "10:30", toolId: "t4", participantIds: ["p5","p6","p7","p8"], assessorIds: ["a3"],      room: "Boardroom B" },
  { id: "s3",  day: 1, startTime: "11:00", endTime: "11:30", toolId: "t2", participantIds: ["p1"],                assessorIds: ["a3","a5"], room: "Interview 1" },
  { id: "s4",  day: 1, startTime: "11:00", endTime: "11:30", toolId: "t2", participantIds: ["p2"],                assessorIds: ["a1","a4"], room: "Interview 2" },
  { id: "s5",  day: 1, startTime: "14:00", endTime: "15:00", toolId: "t3", participantIds: ["p1"],                assessorIds: ["a1","a2"], room: "Interview 1" },
  { id: "s6",  day: 1, startTime: "14:00", endTime: "15:00", toolId: "t3", participantIds: ["p2"],                assessorIds: ["a3","a5"], room: "Interview 2" },
  { id: "s7",  day: 2, startTime: "09:00", endTime: "10:30", toolId: "t1", participantIds: ["p5","p6","p7","p8"], assessorIds: ["a2","a6"], room: "Boardroom A" },
  { id: "s8",  day: 2, startTime: "09:00", endTime: "10:30", toolId: "t4", participantIds: ["p1","p2","p3","p4"], assessorIds: ["a3"],      room: "Boardroom B" },
  { id: "s9",  day: 2, startTime: "11:00", endTime: "11:30", toolId: "t5", participantIds: ["p1"],                assessorIds: ["a1","a4"], room: "Boardroom A" },
  { id: "s10", day: 2, startTime: "11:00", endTime: "11:30", toolId: "t5", participantIds: ["p2"],                assessorIds: ["a3","a5"], room: "Boardroom B" },
  { id: "s11", day: 3, startTime: "09:00", endTime: "10:30", toolId: "t1", participantIds: ["p3","p4","p5","p6"], assessorIds: ["a2","a6"], room: "Boardroom A" },
  { id: "s12", day: 3, startTime: "14:00", endTime: "15:00", toolId: "t3", participantIds: ["p7"],                assessorIds: ["a1","a4"], room: "Interview 1" },
];

// FirstCry scores — realistic mid-engagement state.
// Observer a2 (Rajesh) has scored 2 of 4 participants on tool t1 (case study) — complete + partial.
// Observer a1 (Anita, Lead) has scored 1 participant on t3 (BEI) — complete with rich evidence.
const firstcry_scores: ParticipantToolScore[] = [
  // Rajesh, p1 on t1 (case study) — COMPLETE
  {
    id: "p1|t1|a2",
    participantId: "p1",
    toolId: "t1",
    observerId: "a2",
    startedAt: "2026-11-18T09:05:00Z",
    lastSavedAt: "2026-11-18T10:32:00Z",
    completedAt: "2026-11-18T10:32:00Z",
    competencies: [
      {
        competencyId: "problem-solving-decision-making",
        indicators: [
          { rating: 4, notObserved: false },
          { rating: 3, notObserved: false },
          { rating: 4, notObserved: false },
          { rating: 3, notObserved: false },
        ],
        whatWasDoneWell: "Strong structured analysis using fishbone for the inventory issue. Surfaced multiple root causes and ranked them by impact.",
        whatCouldBeBetter: "Decision making slowed in part 3 — wanted more data before committing. Could have made the trade-off call sooner given the time pressure.",
      },
      {
        competencyId: "analytical-skills",
        indicators: [
          { rating: 4, notObserved: false },
          { rating: 4, notObserved: false },
          { rating: 3, notObserved: false },
          { rating: 4, notObserved: false },
        ],
        whatWasDoneWell: "Connected the inventory data to the BU performance dashboard cleanly. Spotted the seasonal pattern others missed.",
        whatCouldBeBetter: "Could push insights one level further — what does this mean for next quarter's planning?",
      },
      {
        competencyId: "market-and-consumer-awareness",
        indicators: [
          { rating: 3, notObserved: false },
          { rating: 3, notObserved: false },
          { rating: 0 as IndicatorRating, notObserved: true },
          { rating: 3, notObserved: false },
        ],
        whatWasDoneWell: "Solid grasp of competitor moves in the South region.",
        whatCouldBeBetter: "Indicator 3 not really tested in this case. Watch for it in t5 (strategy presentation).",
      },
    ],
  },
  // Rajesh, p2 on t1 — IN PROGRESS (2 of 3 competencies started, no notes yet on the 3rd)
  {
    id: "p2|t1|a2",
    participantId: "p2",
    toolId: "t1",
    observerId: "a2",
    startedAt: "2026-11-18T10:35:00Z",
    lastSavedAt: "2026-11-18T11:15:00Z",
    competencies: [
      {
        competencyId: "problem-solving-decision-making",
        indicators: [
          { rating: 3, notObserved: false },
          { rating: 3, notObserved: false },
          { rating: 4, notObserved: false },
          { rating: 3, notObserved: false },
        ],
        whatWasDoneWell: "Methodical approach. Used the structured templates well.",
        whatCouldBeBetter: "More confidence in conclusions would help — hedged on the final recommendation.",
      },
      {
        competencyId: "analytical-skills",
        indicators: [
          { rating: 3, notObserved: false },
          { rating: 3, notObserved: false },
          { rating: undefined, notObserved: false },
          { rating: undefined, notObserved: false },
        ],
      },
    ],
  },
  // Anita (Lead), p1 on t3 (BEI) — COMPLETE with rich notes
  {
    id: "p1|t3|a1",
    participantId: "p1",
    toolId: "t3",
    observerId: "a1",
    startedAt: "2026-11-18T14:02:00Z",
    lastSavedAt: "2026-11-18T15:08:00Z",
    completedAt: "2026-11-18T15:08:00Z",
    competencies: [
      {
        competencyId: "execution-excellence",
        indicators: [
          { rating: 4, notObserved: false },
          { rating: 4, notObserved: false },
          { rating: 3, notObserved: false },
          { rating: 4, notObserved: false },
        ],
        whatWasDoneWell: "Excellent example of the Diwali rollout — clear ownership, tracked metrics weekly, addressed the warehouse slippage proactively before it impacted sales.",
        whatCouldBeBetter: "Contingency planning was reactive rather than proactive. The 'plan B' emerged only after problems surfaced.",
      },
      {
        competencyId: "people-management",
        indicators: [
          { rating: 3, notObserved: false },
          { rating: 4, notObserved: false },
          { rating: 3, notObserved: false },
          { rating: 4, notObserved: false },
        ],
        whatWasDoneWell: "Coaching examples were strong — the Bhavna development story showed structured thinking. Recognition practices visible.",
        whatCouldBeBetter: "Underperformance handling — example felt avoided rather than addressed structurally. Worth probing in calibration.",
      },
      {
        competencyId: "stakeholder-management",
        indicators: [
          { rating: 4, notObserved: false },
          { rating: 3, notObserved: false },
          { rating: 4, notObserved: false },
          { rating: 4, notObserved: false },
        ],
        whatWasDoneWell: "Stakeholder map was thoughtfully constructed. Cross-functional examples with the logistics and marketing teams were substantive.",
        whatCouldBeBetter: "Translation between functions was less evident — examples skewed toward one-directional communication.",
      },
    ],
  },
];

// ---- Apollo assessors / participants / schedule ----
const apollo_assessors: Assessor[] = [
  { id: "a1", name: "Dr. Anita Rao",     email: "anita.rao@synovate.in",    role: "lead",     organisation: "Synovate", calibrated: true, assignedToolIds: ["t1","t2","t3","t4"] },
  { id: "a2", name: "Suresh Iyer",       email: "suresh.iyer@synovate.in",  role: "assessor", organisation: "Synovate", calibrated: true, assignedToolIds: ["t1","t3"] },
  { id: "a3", name: "Lakshmi Pillai",    email: "lakshmi.p@apollo.com",     role: "observer", organisation: "Apollo Hospitals", calibrated: true, assignedToolIds: ["t1","t2"] },
  { id: "a4", name: "Mohan Krishna",     email: "mohan.k@apollo.com",       role: "observer", organisation: "Apollo Hospitals", calibrated: true, assignedToolIds: ["t3","t4"] },
];

const apollo_participants: Participant[] = Array.from({ length: 10 }, (_, i) => ({
  id: `p${i+1}`,
  name: `Service Leader ${i+1}`,
  employeeId: `AH-${2001 + i}`,
  currentRole: "Service Leader",
  businessUnit: i < 5 ? "Chennai Hospital" : "Bangalore Hospital",
  yearsInRole: 1 + (i % 3),
  toolIds: ["t1","t2","t3","t4"],
}));

const apollo_schedule: ScheduleSlot[] = [
  { id: "s1", day: 1, startTime: "09:00", endTime: "09:30", toolId: "t1", participantIds: ["p1"], assessorIds: ["a1","a3"], room: "Conference Room 1" },
  { id: "s2", day: 1, startTime: "09:00", endTime: "09:30", toolId: "t1", participantIds: ["p2"], assessorIds: ["a2","a4"], room: "Conference Room 2" },
  { id: "s3", day: 1, startTime: "10:00", endTime: "11:00", toolId: "t2", participantIds: ["p1","p2","p3","p4","p5"], assessorIds: ["a1","a2"], room: "Training Hall" },
  { id: "s4", day: 2, startTime: "09:00", endTime: "09:45", toolId: "t3", participantIds: ["p1"], assessorIds: ["a1","a3"], room: "Conference Room 1" },
  { id: "s5", day: 2, startTime: "11:00", endTime: "11:45", toolId: "t4", participantIds: ["p6","p7","p8","p9","p10"], assessorIds: ["a2","a4"], room: "Training Hall" },
];

// ============================================================================

export const seedEngagements: Engagement[] = [
  {
    id: "eng-firstcry-cm-2026-11",
    status: "live",
    createdAt: "2026-10-22T09:30:00Z",
    lockedAt: "2026-11-08T16:00:00Z",
    basics: firstcry_basics,
    competencies: firstcry_competencies,
    proficiencyTargets: firstcry_targets,
    tools: firstcry_tools,
    aggregation: { ...DEFAULT_AGGREGATION, confirmed: true },
    assessors: firstcry_assessors,
    participants: firstcry_participants,
    schedule: firstcry_schedule,
    reportFormat: DEFAULT_REPORT_FORMAT,
    scores: firstcry_scores,
    calibrate: { ...EMPTY_CALIBRATE_STATE, moderatedScores: [], oars: [] },
    report: { ...EMPTY_REPORT_STATE, sections: [], feedbackSessions: [] },
    setupSteps: makeSteps({
      engagement: { status: "complete", summary: "FirstCry · Cluster Managers · Nov 18–20" },
      competencies: { status: "complete", summary: "7 competencies · 2 critical" },
      proficiency: { status: "complete", summary: "All targets set · L2 dominant" },
      tools: { status: "complete", summary: "5 tools · all competencies covered" },
      aggregation: { status: "complete", summary: "Methodology defaults" },
      assessors: { status: "complete", summary: "6 assessors · 1 Lead" },
      participants: { status: "complete", summary: "8 participants · all mapped" },
      schedule: { status: "complete", summary: "Nov 18–20 · 40/40 scheduled" },
      report: { status: "complete", summary: "Standard · FirstCry co-branded" },
    }),
  },

  {
    id: "eng-levis-rm-2027-01",
    status: "draft",
    createdAt: "2026-12-08T11:00:00Z",
    basics: levi_basics,
    competencies: levi_competencies,
    proficiencyTargets: levi_targets,
    tools: [],
    aggregation: DEFAULT_AGGREGATION,
    assessors: [],
    participants: [],
    schedule: [],
    reportFormat: DEFAULT_REPORT_FORMAT,
    scores: [],
    calibrate: { ...EMPTY_CALIBRATE_STATE, moderatedScores: [], oars: [] },
    report: { ...EMPTY_REPORT_STATE, sections: [], feedbackSessions: [] },
    setupSteps: makeSteps({
      engagement: { status: "complete", summary: "Levi Strauss · Regional Managers · Jan 27–29" },
      competencies: { status: "complete", summary: "7 competencies · 2 critical" },
      proficiency: { status: "in_progress", summary: "5 of 7 competencies set" },
    }),
  },

  {
    id: "eng-tata-hipo-2027-02",
    status: "draft",
    createdAt: "2027-01-04T14:20:00Z",
    basics: tata_basics,
    competencies: tata_competencies,
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
    setupSteps: makeSteps({
      engagement: { status: "complete", summary: "Tata Steel · Hi-Po · Mar 1–3" },
      competencies: { status: "in_progress", summary: "3 of ~8 competencies selected" },
    }),
  },

  {
    id: "eng-apollo-sl-2026-09",
    status: "complete",
    createdAt: "2026-08-12T10:00:00Z",
    lockedAt: "2026-09-04T17:00:00Z",
    completedAt: "2026-09-30T18:00:00Z",
    basics: apollo_basics,
    competencies: apollo_competencies,
    proficiencyTargets: apollo_targets,
    tools: apollo_tools,
    aggregation: { ...DEFAULT_AGGREGATION, confirmed: true },
    assessors: apollo_assessors,
    participants: apollo_participants,
    schedule: apollo_schedule,
    reportFormat: DEFAULT_REPORT_FORMAT,
    scores: [],
    calibrate: {
      stage: "complete",
      moderatedScores: [],
      oars: [],
      signedOffBy: "a1",
      signedOffAt: "2026-09-28T17:30:00Z",
    },
    report: { ...EMPTY_REPORT_STATE, sections: [], feedbackSessions: [] },
    setupSteps: makeSteps({
      engagement: { status: "complete", summary: "Apollo · Service Leaders · Sep 14–16" },
      competencies: { status: "complete", summary: "6 competencies · 2 critical" },
      proficiency: { status: "complete", summary: "L1 dominant · development focus" },
      tools: { status: "complete", summary: "4 tools · all competencies covered" },
      aggregation: { status: "complete", summary: "Methodology defaults" },
      assessors: { status: "complete", summary: "4 assessors · 1 Lead" },
      participants: { status: "complete", summary: "10 participants" },
      schedule: { status: "complete", summary: "Sep 14–16 · 40/40 scheduled" },
      report: { status: "complete", summary: "Standard · Apollo co-branded" },
    }),
  },
];

export const findEngagement = (id: string) =>
  seedEngagements.find((e) => e.id === id);
