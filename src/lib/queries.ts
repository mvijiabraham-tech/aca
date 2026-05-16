/**
 * Supabase query helpers — maps between DB rows and Zustand Engagement shape.
 * Only called in prod mode when Supabase is configured.
 */
import { supabase } from "./supabase";
import type {
  Engagement, EngagementTool, Assessor, Participant,
  ParticipantToolScore, ReportSection, FeedbackSession,
} from "@/types";

// ============================================================================
// FETCH
// ============================================================================

/** Fetch all engagements the current user has access to (RLS-filtered) */
export async function fetchEngagements(): Promise<Engagement[]> {
  if (!supabase) return [];

  const { data: rows, error } = await supabase
    .from("engagements")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !rows) {
    console.error("[queries] fetchEngagements error:", error);
    return [];
  }

  // For each engagement, fetch related rows
  const engagements = await Promise.all(
    rows.map((row) => hydrateEngagement(row)),
  );

  return engagements.filter(Boolean) as Engagement[];
}

/** Fetch a single engagement with all related data */
export async function fetchEngagement(id: string): Promise<Engagement | null> {
  if (!supabase) return null;

  const { data: row, error } = await supabase
    .from("engagements")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !row) return null;
  return hydrateEngagement(row);
}

/** Fetch scores for an engagement */
export async function fetchScores(engagementId: string): Promise<ParticipantToolScore[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("scores")
    .select("*")
    .eq("engagement_id", engagementId);

  if (error || !data) return [];
  return data.map(rowToScore);
}

// ============================================================================
// PUSH (upsert)
// ============================================================================

/** Push a full engagement to Supabase (upsert engagement + related tables) */
export async function pushEngagement(eng: Engagement): Promise<void> {
  if (!supabase) return;

  // 1. Upsert engagement row
  const { error: engError } = await supabase
    .from("engagements")
    .upsert(engagementToRow(eng));

  if (engError) {
    console.error("[queries] pushEngagement error:", engError);
    return;
  }

  // 2. Sync tools — delete + insert (simplest for JSONB array replacement)
  await supabase.from("engagement_tools").delete().eq("engagement_id", eng.id);
  if (eng.tools.length > 0) {
    await supabase.from("engagement_tools").insert(
      eng.tools.map((t) => toolToRow(eng.id, t)),
    );
  }

  // 3. Sync assessors
  await supabase.from("assessors").delete().eq("engagement_id", eng.id);
  if (eng.assessors.length > 0) {
    await supabase.from("assessors").insert(
      eng.assessors.map((a) => assessorToRow(eng.id, a)),
    );
  }

  // 4. Sync participants
  await supabase.from("participants").delete().eq("engagement_id", eng.id);
  if (eng.participants.length > 0) {
    await supabase.from("participants").insert(
      eng.participants.map((p) => participantToRow(eng.id, p)),
    );
  }

  // 5. Sync scores
  await supabase.from("scores").delete().eq("engagement_id", eng.id);
  if (eng.scores.length > 0) {
    await supabase.from("scores").insert(
      eng.scores.map((s) => scoreToRow(eng.id, s)),
    );
  }

  // 6. Sync report sections
  await supabase.from("report_sections").delete().eq("engagement_id", eng.id);
  if (eng.report.sections.length > 0) {
    await supabase.from("report_sections").insert(
      eng.report.sections.map((s) => reportSectionToRow(eng.id, s)),
    );
  }

  // 7. Sync feedback sessions
  await supabase.from("feedback_sessions").delete().eq("engagement_id", eng.id);
  if (eng.report.feedbackSessions.length > 0) {
    await supabase.from("feedback_sessions").insert(
      eng.report.feedbackSessions.map((fs) => feedbackSessionToRow(eng.id, fs)),
    );
  }
}

/** Push a single score to Supabase (upsert) */
export async function pushScore(engagementId: string, score: ParticipantToolScore): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from("scores")
    .upsert(scoreToRow(engagementId, score));

  if (error) {
    console.error("[queries] pushScore error:", error);
  }
}

/** Push just the engagement-level JSONB fields (calibrate, report state, status changes) */
export async function pushEngagementMeta(eng: Engagement): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from("engagements")
    .update({
      status: eng.status,
      basics: eng.basics,
      setup_steps: eng.setupSteps,
      competencies: eng.competencies,
      proficiency_targets: eng.proficiencyTargets,
      aggregation: eng.aggregation,
      report_format: eng.reportFormat,
      calibrate_state: eng.calibrate,
      report_state: eng.report,
      schedule: eng.schedule,
      locked_at: eng.lockedAt ?? null,
      completed_at: eng.completedAt ?? null,
    })
    .eq("id", eng.id);

  if (error) {
    console.error("[queries] pushEngagementMeta error:", error);
  }
}

// ============================================================================
// ROW <-> MODEL MAPPERS
// ============================================================================

/* eslint-disable @typescript-eslint/no-explicit-any */

function engagementToRow(eng: Engagement) {
  return {
    id: eng.id,
    status: eng.status,
    basics: eng.basics,
    setup_steps: eng.setupSteps,
    competencies: eng.competencies,
    proficiency_targets: eng.proficiencyTargets,
    aggregation: eng.aggregation,
    report_format: eng.reportFormat,
    calibrate_state: eng.calibrate,
    report_state: eng.report,
    schedule: eng.schedule,
    created_at: eng.createdAt ?? new Date().toISOString(),
    locked_at: eng.lockedAt ?? null,
    completed_at: eng.completedAt ?? null,
  };
}

async function hydrateEngagement(row: any): Promise<Engagement> {
  if (!supabase) throw new Error("Supabase not configured");

  // Fetch related rows in parallel
  const [toolsRes, assessorsRes, participantsRes, scoresRes, sectionsRes, sessionsRes] =
    await Promise.all([
      supabase.from("engagement_tools").select("*").eq("engagement_id", row.id),
      supabase.from("assessors").select("*").eq("engagement_id", row.id),
      supabase.from("participants").select("*").eq("engagement_id", row.id),
      supabase.from("scores").select("*").eq("engagement_id", row.id),
      supabase.from("report_sections").select("*").eq("engagement_id", row.id),
      supabase.from("feedback_sessions").select("*").eq("engagement_id", row.id),
    ]);

  return {
    id: row.id,
    status: row.status,
    basics: row.basics,
    setupSteps: row.setup_steps,
    competencies: row.competencies,
    proficiencyTargets: row.proficiency_targets,
    aggregation: row.aggregation,
    reportFormat: row.report_format,
    calibrate: row.calibrate_state,
    report: {
      sections: (sectionsRes.data ?? []).map(rowToReportSection),
      feedbackSessions: (sessionsRes.data ?? []).map(rowToFeedbackSession),
    },
    schedule: row.schedule,
    tools: (toolsRes.data ?? []).map(rowToTool),
    assessors: (assessorsRes.data ?? []).map(rowToAssessor),
    participants: (participantsRes.data ?? []).map(rowToParticipant),
    scores: (scoresRes.data ?? []).map(rowToScore),
    createdAt: row.created_at,
    lockedAt: row.locked_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
  };
}

// --- Tools ---
function toolToRow(engagementId: string, t: EngagementTool) {
  return {
    id: t.id,
    engagement_id: engagementId,
    name: t.name,
    tool_type_key: t.toolTypeKey,
    competency_ids: t.competencyIds,
    duration_minutes: t.durationMinutes,
    format: t.format,
    notes: t.notes ?? null,
  };
}

function rowToTool(row: any): EngagementTool {
  return {
    id: row.id,
    name: row.name,
    toolTypeKey: row.tool_type_key,
    competencyIds: row.competency_ids,
    durationMinutes: row.duration_minutes,
    format: row.format,
    notes: row.notes ?? undefined,
  };
}

// --- Assessors ---
function assessorToRow(engagementId: string, a: Assessor) {
  return {
    id: a.id,
    engagement_id: engagementId,
    profile_id: null, // linked separately on first login by email match
    name: a.name,
    email: a.email,
    role: a.role,
    organisation: a.organisation || null,
    calibrated: a.calibrated,
    assigned_tool_ids: a.assignedToolIds,
    notes: a.notes ?? null,
  };
}

function rowToAssessor(row: any): Assessor {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    organisation: row.organisation ?? "",
    calibrated: row.calibrated,
    assignedToolIds: row.assigned_tool_ids,
    notes: row.notes ?? undefined,
  };
}

// --- Participants ---
function participantToRow(engagementId: string, p: Participant) {
  return {
    id: p.id,
    engagement_id: engagementId,
    name: p.name,
    employee_id: p.employeeId ?? null,
    current_role: p.currentRole,
    business_unit: p.businessUnit ?? null,
    location: p.location ?? null,
    email: p.email ?? null,
    years_in_role: p.yearsInRole ?? null,
    tool_ids: p.toolIds,
    notes: p.notes ?? null,
  };
}

function rowToParticipant(row: any): Participant {
  return {
    id: row.id,
    name: row.name,
    employeeId: row.employee_id ?? undefined,
    currentRole: row.current_role,
    businessUnit: row.business_unit ?? undefined,
    location: row.location ?? undefined,
    email: row.email ?? undefined,
    yearsInRole: row.years_in_role ?? undefined,
    toolIds: row.tool_ids,
    notes: row.notes ?? undefined,
  };
}

// --- Scores ---
function scoreToRow(engagementId: string, s: ParticipantToolScore) {
  return {
    id: s.id,
    engagement_id: engagementId,
    participant_id: s.participantId,
    tool_id: s.toolId,
    observer_id: s.observerId,
    competencies: s.competencies,
    started_at: s.startedAt ?? null,
    last_saved_at: s.lastSavedAt ?? null,
    completed_at: s.completedAt ?? null,
  };
}

function rowToScore(row: any): ParticipantToolScore {
  return {
    id: row.id,
    participantId: row.participant_id,
    toolId: row.tool_id,
    observerId: row.observer_id,
    competencies: row.competencies,
    startedAt: row.started_at ?? undefined,
    lastSavedAt: row.last_saved_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
  };
}

// --- Report Sections ---
function reportSectionToRow(engagementId: string, s: ReportSection) {
  return {
    engagement_id: engagementId,
    participant_id: s.participantId,
    section_key: s.sectionKey,
    status: s.status,
    content: s.content,
    drafted_from_prompt: s.draftedFromPrompt ?? null,
    last_edited_at: s.lastEditedAt ?? null,
    signed_off_by: s.signedOffBy ?? null,
    signed_off_at: s.signedOffAt ?? null,
  };
}

function rowToReportSection(row: any): ReportSection {
  return {
    participantId: row.participant_id,
    sectionKey: row.section_key,
    status: row.status,
    content: row.content,
    draftedFromPrompt: row.drafted_from_prompt ?? undefined,
    lastEditedAt: row.last_edited_at ?? undefined,
    signedOffBy: row.signed_off_by ?? undefined,
    signedOffAt: row.signed_off_at ?? undefined,
  };
}

// --- Feedback Sessions ---
function feedbackSessionToRow(engagementId: string, fs: FeedbackSession) {
  return {
    engagement_id: engagementId,
    participant_id: fs.participantId,
    status: fs.status,
    scheduled_at: fs.scheduledAt ?? null,
    conducted_at: fs.conductedAt ?? null,
    conducted_by: fs.conductedBy ?? null,
    prep_notes: fs.prepNotes ?? null,
    session_notes: fs.sessionNotes ?? null,
    idp_commitments: fs.idpCommitments,
    handoff_sent_at: fs.handoffSentAt ?? null,
  };
}

function rowToFeedbackSession(row: any): FeedbackSession {
  return {
    participantId: row.participant_id,
    status: row.status,
    scheduledAt: row.scheduled_at ?? undefined,
    conductedAt: row.conducted_at ?? undefined,
    conductedBy: row.conducted_by ?? undefined,
    prepNotes: row.prep_notes ?? undefined,
    sessionNotes: row.session_notes ?? undefined,
    idpCommitments: row.idp_commitments ?? [],
    handoffSentAt: row.handoff_sent_at ?? undefined,
  };
}
