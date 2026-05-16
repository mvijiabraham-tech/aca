import type { ToolType, ToolFormat } from "@/types";

// 10 standard tool types pre-loaded.
// surfacesClusters indicates which competency clusters a tool naturally surfaces well.

export const toolLibrary: ToolType[] = [
  {
    key: "case_study",
    name: "Case study",
    description: "Written or simulated business case with structured questions or recommendations.",
    defaultDurationMinutes: 90,
    defaultFormat: "individual_written",
    surfacesClusters: ["thinking", "market"],
  },
  {
    key: "in_tray",
    name: "In-tray exercise",
    description: "Inbox of emails, memos, and tasks requiring prioritisation and action.",
    defaultDurationMinutes: 60,
    defaultFormat: "individual_written",
    surfacesClusters: ["thinking", "driving"],
  },
  {
    key: "role_play",
    name: "Role-play",
    description: "Live interaction with a trained assessor playing a defined role (subordinate, peer, customer).",
    defaultDurationMinutes: 30,
    defaultFormat: "individual_interactive",
    surfacesClusters: ["engaging"],
  },
  {
    key: "group_discussion",
    name: "Group discussion",
    description: "Leaderless or assigned-role group activity around a defined problem or decision.",
    defaultDurationMinutes: 45,
    defaultFormat: "group_interactive",
    surfacesClusters: ["engaging", "thinking"],
  },
  {
    key: "bei",
    name: "Behavioural Event Interview",
    description: "Structured competency interview based on past behaviour evidence (STAR/CAR).",
    defaultDurationMinutes: 60,
    defaultFormat: "individual_interactive",
    surfacesClusters: ["thinking", "engaging", "driving"],
  },
  {
    key: "presentation",
    name: "Business presentation",
    description: "Prepared or impromptu presentation followed by Q&A from a panel.",
    defaultDurationMinutes: 30,
    defaultFormat: "individual_interactive",
    surfacesClusters: ["engaging", "thinking"],
  },
  {
    key: "written_exercise",
    name: "Written exercise",
    description: "Structured written response — analysis, recommendation, or stakeholder communication.",
    defaultDurationMinutes: 60,
    defaultFormat: "individual_written",
    surfacesClusters: ["thinking", "engaging"],
  },
  {
    key: "fact_find",
    name: "Fact-find",
    description: "Discovery exercise where the candidate questions a role-player to surface key facts before recommending action.",
    defaultDurationMinutes: 45,
    defaultFormat: "individual_interactive",
    surfacesClusters: ["thinking", "engaging"],
  },
  {
    key: "simulation",
    name: "Business simulation",
    description: "Multi-round simulation where decisions cascade across periods. Often run in teams.",
    defaultDurationMinutes: 180,
    defaultFormat: "group_interactive",
    surfacesClusters: ["thinking", "driving", "market"],
  },
  {
    key: "psychometric",
    name: "Psychometric",
    description: "Standardised aptitude or personality instrument. Used as supplementary input.",
    defaultDurationMinutes: 45,
    defaultFormat: "individual_written",
    surfacesClusters: ["thinking"],
  },
];

export const findToolType = (key: string): ToolType | undefined =>
  toolLibrary.find((t) => t.key === key);

const FORMAT_LABELS: Record<ToolFormat, string> = {
  individual_written: "Individual · written",
  individual_interactive: "Individual · interactive",
  group_interactive: "Group · interactive",
};

export const formatLabel = (format: ToolFormat): string => FORMAT_LABELS[format];
