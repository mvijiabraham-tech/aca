import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo, useRef } from "react";
import {
  ChevronLeft, ChevronRight, ArrowRight, CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CompetencyScoreCard, SaveBadge } from "@/components/scoring/ScoringWidgets";
import { useEngagement, useActingObserverId, useAppStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  findScore, observerToolParticipants,
  expectedIndicators,
} from "@/lib/scoring";
import { findToolType } from "@/mocks/toolLibrary";
import { findCompetency } from "@/mocks/dictionary";
import type {
  CompetencyScore, IndicatorScore,
} from "@/types";

export function ScoreParticipantSheet() {
  const { engagementId, toolId, participantId } = useParams<{
    engagementId: string; toolId: string; participantId: string;
  }>();
  const navigate = useNavigate();
  const engagement = useEngagement(engagementId);
  const observerId = useActingObserverId(engagementId);
  const updateCompetencyScore = useAppStore((s) => s.updateCompetencyScore);
  const markScoreComplete = useAppStore((s) => s.markScoreComplete);
  const setActingObserver = useAppStore((s) => s.setActingObserver);
  const { profile } = useAuth();

  // Auto-resolve observer from auth profile email
  useEffect(() => {
    if (!isSupabaseConfigured || !engagement || !profile) return;
    const match = engagement.assessors.find(
      (a) => a.email.toLowerCase() === profile.email.toLowerCase(),
    );
    if (match && match.id !== observerId) {
      setActingObserver(engagement.id, match.id);
    }
  }, [engagement, profile, observerId, setActingObserver]);

  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Local draft state — one entry per competency
  const [drafts, setDrafts] = useState<Record<string, CompetencyScore>>({});
  const [initialized, setInitialized] = useState(false);

  // Hydrate drafts from the existing score record once
  useEffect(() => {
    if (initialized || !engagement || !observerId || !toolId || !participantId) return;
    const score = findScore(engagement, participantId, toolId, observerId);
    const tool = engagement.tools.find((t) => t.id === toolId);
    if (!tool) return;

    const next: Record<string, CompetencyScore> = {};
    tool.competencyIds.forEach((cid) => {
      const existing = score?.competencies.find((c) => c.competencyId === cid);
      if (existing) {
        next[cid] = existing;
      } else {
        next[cid] = {
          competencyId: cid,
          indicators: Array.from({ length: 4 }, () => ({ rating: undefined, notObserved: false } as IndicatorScore)),
        };
      }
    });
    setDrafts(next);
    setInitialized(true);
  }, [engagement, observerId, toolId, participantId, initialized]);

  if (!engagement || !toolId || !participantId || !observerId) return null;

  const tool = engagement.tools.find((t) => t.id === toolId);
  const participant = engagement.participants.find((p) => p.id === participantId);
  if (!tool || !participant) {
    return (
      <div>
        <button
          onClick={() => navigate(`/engagement/${engagement.id}/score/${toolId}`)}
          className="text-sm text-ink-500 hover:text-navy-700"
        >
          <ChevronLeft size={14} className="inline mr-1" /> Back
        </button>
        <div className="text-sm text-ink-500 mt-4">Tool or participant not found.</div>
      </div>
    );
  }

  const toolType = findToolType(tool.toolTypeKey);
  const score = findScore(engagement, participantId, toolId, observerId);
  const isComplete = !!score?.completedAt;

  // Check if tool is fully locked (all observers submitted)
  const toolFullyLocked = (() => {
    const assignedObservers = engagement.assessors.filter((a) => a.assignedToolIds.includes(toolId!));
    if (assignedObservers.length === 0) return false;
    return assignedObservers.every((a) => {
      const participants = engagement.participants.filter((p) => p.toolIds.includes(toolId!));
      return participants.every((p) => {
        const s = engagement.scores.find(
          (sc) => sc.participantId === p.id && sc.toolId === toolId && sc.observerId === a.id,
        );
        return !!s?.submittedAt;
      });
    });
  })();

  // Capture stable values for closures
  const stableEngagementId = engagement.id;
  const stableObserverId = observerId;

  // Persist a competency score with debounce
  function persistCompetency(cid: string, next: CompetencyScore) {
    setDrafts((d) => ({ ...d, [cid]: next }));
    if (debounceTimers.current[cid]) clearTimeout(debounceTimers.current[cid]);
    debounceTimers.current[cid] = setTimeout(() => {
      updateCompetencyScore(stableEngagementId, participantId!, toolId!, stableObserverId, next);
      setLastSaved(new Date());
    }, 600);
  }

  function setIndicator(cid: string, idx: number, change: Partial<IndicatorScore>) {
    const current = drafts[cid];
    if (!current) return;
    const newIndicators = current.indicators.map((ind, i) =>
      i === idx ? { ...ind, ...change } : ind,
    );
    persistCompetency(cid, { ...current, indicators: newIndicators });
  }

  function setNotes(cid: string, field: "verbatimAndOutliers" | "whatWasDoneWell" | "whatCouldBeBetter", value: string) {
    const current = drafts[cid];
    if (!current) return;
    persistCompetency(cid, { ...current, [field]: value });
  }

  function toggleComplete() {
    markScoreComplete(stableEngagementId, participantId!, toolId!, stableObserverId, !isComplete);
  }

  // Indicator progress for this participant on this tool
  const liveProgress = useMemo(() => {
    const totalIndicators = expectedIndicators(tool);
    let rated = 0;
    Object.values(drafts).forEach((cs) => {
      cs.indicators.forEach((i) => {
        if (i.rating !== undefined || i.notObserved) rated++;
      });
    });
    return { rated, total: totalIndicators };
  }, [drafts, tool]);

  // Navigate to next/prev participant
  const participants = observerToolParticipants(engagement, observerId, toolId);
  const currentIdx = participants.findIndex((p) => p.id === participantId);
  const prevParticipant = currentIdx > 0 ? participants[currentIdx - 1] : null;
  const nextParticipant = currentIdx < participants.length - 1 ? participants[currentIdx + 1] : null;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <button
        onClick={() => navigate(`/engagement/${engagement.id}/score/${toolId}`)}
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-navy-700 transition-colors"
      >
        <ChevronLeft size={14} /> Back to {tool.name}
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-6">
        <div className="max-w-2xl">
          <div className="text-2xs font-medium text-ink-500 uppercase tracking-wider mb-1">
            {toolType?.name ?? tool.toolTypeKey} · {tool.name}
          </div>
          <div className="flex items-center gap-3">
            <h1 className="display-serif text-[2rem] leading-[1.1] font-semibold text-navy-700 tracking-tight">
              {participant.name}
            </h1>
            {participant.userId && (
              <span className="text-xs font-mono font-semibold text-ocean-700 bg-ocean-50 px-2 py-0.5 rounded">{participant.userId}</span>
            )}
            {participant.employeeId && (
              <span className="text-sm font-mono text-ink-500">{participant.employeeId}</span>
            )}
          </div>
          <div className="text-sm text-ink-500 mt-1">
            {participant.currentRole}
            {participant.businessUnit && ` \u00b7 ${participant.businessUnit}`}
            {participant.location && ` \u00b7 ${participant.location}`}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <SaveBadge lastSaved={lastSaved} />
          <Button
            variant={isComplete ? "secondary" : "primary"}
            onClick={toggleComplete}
            disabled={liveProgress.rated === 0 && !isComplete}
          >
            {isComplete ? (
              <><RotateCcw size={13} /> Reopen scoring</>
            ) : (
              <><CheckCircle2 size={13} /> Mark complete</>
            )}
          </Button>
        </div>
      </div>

      {/* Progress band */}
      <div className="bg-white rounded-lg border border-ink-200 p-4 flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-2xs uppercase tracking-wider font-semibold text-ink-500">
              Progress on this participant
            </span>
            <span className="text-sm font-semibold text-navy-700">
              {liveProgress.rated} of {liveProgress.total} indicators
            </span>
          </div>
          <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                isComplete ? "bg-green-500" : "bg-amber-500",
              )}
              style={{ width: `${(liveProgress.rated / liveProgress.total) * 100}%` }}
            />
          </div>
        </div>
        {isComplete && (
          <Badge tone="green">
            <CheckCircle2 size={11} /> Scoring complete
          </Badge>
        )}
      </div>

      {/* Competency cards */}
      <div className="space-y-5">
        {tool.competencyIds.map((cid) => {
          const competency = findCompetency(cid, engagement?.customCompetencies);
          const target = engagement.proficiencyTargets.find((t) => t.competencyId === cid);
          const draft = drafts[cid];
          if (!competency || !target || !draft) return null;

          const targetLevel = competency.levels.find((l) => l.level === target.targetLevel);
          if (!targetLevel) return null;

          return (
            <CompetencyScoreCard
              key={cid}
              competencyName={competency.name}
              definition={competency.definition}
              targetLevelLabel={`L${targetLevel.level} ${targetLevel.name}`}
              indicators={targetLevel.indicators}
              draft={draft}
              isComplete={isComplete || toolFullyLocked}
              onIndicator={(idx, change) => setIndicator(cid, idx, change)}
              onNotes={(field, value) => setNotes(cid, field, value)}
            />
          );
        })}
      </div>

      {/* Navigation footer */}
      <div className="flex items-center justify-between pt-4 border-t border-ink-200">
        <div className="flex items-center gap-2">
          {prevParticipant && (
            <Button
              variant="secondary"
              onClick={() => navigate(`/engagement/${engagement.id}/score/${toolId}/${prevParticipant.id}`)}
            >
              <ChevronLeft size={13} /> {prevParticipant.name}
            </Button>
          )}
        </div>
        <div className="text-2xs text-ink-500">
          Participant {currentIdx + 1} of {participants.length}
        </div>
        <div className="flex items-center gap-2">
          {nextParticipant ? (
            <Button
              variant="primary"
              onClick={() => navigate(`/engagement/${engagement.id}/score/${toolId}/${nextParticipant.id}`)}
            >
              {nextParticipant.name} <ChevronRight size={13} />
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={() => navigate(`/engagement/${engagement.id}/score/${toolId}`)}
            >
              Back to all participants <ArrowRight size={13} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
