/**
 * Sync layer — bridges Zustand (local cache) and Supabase (persistence).
 * Only active in prod mode with Supabase configured.
 *
 * - hydrateFromSupabase: loads engagements from DB on mount
 * - debouncedPushEngagement: pushes engagement changes after a delay
 * - debouncedPushScore: pushes score changes after a delay
 * - subscribeToScores: Realtime subscription for live score updates
 */
import { supabase, isSupabaseConfigured } from "./supabase";
import {
  fetchEngagements,
  pushEngagement,
  pushScore,
  pushEngagementMeta,
} from "./queries";
import type { Engagement, ParticipantToolScore } from "@/types";

// ============================================================================
// HYDRATE — load from Supabase into Zustand
// ============================================================================

/** Fetch all engagements from Supabase and return them */
export async function hydrateFromSupabase(): Promise<Engagement[]> {
  if (!isSupabaseConfigured) return [];
  return fetchEngagements();
}

// ============================================================================
// DEBOUNCED PUSH — write from Zustand to Supabase
// ============================================================================

const engagementTimers: Record<string, ReturnType<typeof setTimeout>> = {};
const PUSH_DELAY = 1000; // ms

/** Debounced push of a full engagement (used after setup changes) */
export function debouncedPushEngagement(eng: Engagement) {
  if (!isSupabaseConfigured) return;

  if (engagementTimers[eng.id]) clearTimeout(engagementTimers[eng.id]);
  engagementTimers[eng.id] = setTimeout(() => {
    pushEngagement(eng).catch((err) =>
      console.error("[sync] pushEngagement failed:", err),
    );
  }, PUSH_DELAY);
}

/** Debounced push of engagement metadata only (status, calibrate, report state) */
export function debouncedPushEngagementMeta(eng: Engagement) {
  if (!isSupabaseConfigured) return;

  const key = `meta:${eng.id}`;
  if (engagementTimers[key]) clearTimeout(engagementTimers[key]);
  engagementTimers[key] = setTimeout(() => {
    pushEngagementMeta(eng).catch((err) =>
      console.error("[sync] pushEngagementMeta failed:", err),
    );
  }, PUSH_DELAY);
}

const scoreTimers: Record<string, ReturnType<typeof setTimeout>> = {};
const SCORE_PUSH_DELAY = 800; // slightly longer than the 600ms UI debounce

/** Debounced push of a single score */
export function debouncedPushScore(engagementId: string, score: ParticipantToolScore) {
  if (!isSupabaseConfigured) return;

  if (scoreTimers[score.id]) clearTimeout(scoreTimers[score.id]);
  scoreTimers[score.id] = setTimeout(() => {
    pushScore(engagementId, score).catch((err) =>
      console.error("[sync] pushScore failed:", err),
    );
  }, SCORE_PUSH_DELAY);
}

// ============================================================================
// REALTIME — subscribe to score changes from other observers
// ============================================================================

type ScoreCallback = (score: ParticipantToolScore) => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let activeSubscription: any = null;

/** Subscribe to Realtime score changes for an engagement */
export function subscribeToScores(engagementId: string, onScore: ScoreCallback) {
  if (!supabase || !isSupabaseConfigured) return () => {};

  // Clean up previous subscription
  unsubscribeFromScores();

  activeSubscription = supabase
    .channel(`scores:${engagementId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "scores",
        filter: `engagement_id=eq.${engagementId}`,
      },
      (payload) => {
        if (payload.new && typeof payload.new === "object" && "id" in payload.new) {
          const row = payload.new as Record<string, unknown>;
          const score: ParticipantToolScore = {
            id: row.id as string,
            participantId: row.participant_id as string,
            toolId: row.tool_id as string,
            observerId: row.observer_id as string,
            competencies: row.competencies as ParticipantToolScore["competencies"],
            startedAt: (row.started_at as string) ?? undefined,
            lastSavedAt: (row.last_saved_at as string) ?? undefined,
            completedAt: (row.completed_at as string) ?? undefined,
          };
          onScore(score);
        }
      },
    )
    .subscribe();

  return () => unsubscribeFromScores();
}

export function unsubscribeFromScores() {
  if (activeSubscription && supabase) {
    supabase.removeChannel(activeSubscription);
    activeSubscription = null;
  }
}
