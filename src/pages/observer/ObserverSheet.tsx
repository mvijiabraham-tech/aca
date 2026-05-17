import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo, useRef } from "react";
import {
  ChevronLeft, ChevronRight, ArrowRight, CheckCircle2,
  RotateCcw, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { CompetencyScoreCard, SaveBadge } from "@/components/scoring/ScoringWidgets";
import { useEngagement, useAppStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import {
  findScore, observerToolParticipants,
  expectedIndicators, observerToolProgress,
} from "@/lib/scoring";
import { findToolType } from "@/mocks/toolLibrary";
import { findCompetency } from "@/mocks/dictionary";
import type { CompetencyScore, IndicatorScore } from "@/types";

export function ObserverSheet() {
  const { engagementId, toolId, participantId } = useParams<{
    engagementId: string; toolId: string; participantId: string;
  }>();
  const navigate = useNavigate();
  const engagement = useEngagement(engagementId);
  const updateCompetencyScore = useAppStore((s) => s.updateCompetencyScore);
  const markScoreComplete = useAppStore((s) => s.markScoreComplete);
  const { profile } = useAuth();

  const observerId = (() => {
    if (!engagement || !profile) return undefined;
    const match = engagement.assessors.find(
      (a) => a.email.toLowerCase() === profile.email.toLowerCase(),
    );
    return match?.id;
  })();

  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Local draft state
  const [drafts, setDrafts] = useState<Record<string, CompetencyScore>>({});
  const [initialized, setInitialized] = useState(false);

  // Hydrate drafts from existing score record once
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

  if (!engagement || !toolId || !participantId) return null;

  if (!observerId) {
    return (
      <div className="text-center py-16">
        <div className="w-14 h-14 rounded-xl bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-5">
          <AlertCircle size={26} />
        </div>
        <h1 className="display-serif text-2xl font-semibold text-navy-700">
          Access denied
        </h1>
        <p className="text-sm text-ink-500 mt-3 leading-relaxed max-w-md mx-auto">
          Your email is not registered as an assessor for this engagement.
        </p>
      </div>
    );
  }

  const tool = engagement.tools.find((t) => t.id === toolId);
  const participant = engagement.participants.find((p) => p.id === participantId);
  if (!tool || !participant) {
    return (
      <div>
        <button
          onClick={() => navigate(`/observe/${engagement.id}/${toolId}`)}
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

  const stableEngagementId = engagement.id;
  const stableObserverId = observerId;

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

  function setNotes(cid: string, field: "whatWasDoneWell" | "whatCouldBeBetter", value: string) {
    const current = drafts[cid];
    if (!current) return;
    persistCompetency(cid, { ...current, [field]: value });
  }

  function toggleComplete() {
    markScoreComplete(stableEngagementId, participantId!, toolId!, stableObserverId, !isComplete);

    // Check if this was the last participant — if so, trigger email
    if (!isComplete) {
      const progress = observerToolProgress(engagement!, stableObserverId, toolId!);
      // After marking this one complete, all would be done
      const allOthersComplete = progress.complete === progress.total - 1;
      if (allOthersComplete && profile?.email) {
        triggerEmailOnCompletion(stableEngagementId, toolId!, stableObserverId, profile.email);
      }
    }
  }

  // Indicator progress
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
        onClick={() => navigate(`/observe/${engagement.id}/${toolId}`)}
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-navy-700 transition-colors"
      >
        <ChevronLeft size={14} /> Back to {tool.name}
      </button>

      {/* Header */}
      <div>
        <div className="text-2xs font-medium text-ink-500 uppercase tracking-wider mb-1">
          {toolType?.name ?? tool.toolTypeKey} · {tool.name}
        </div>
        <div className="flex items-center gap-3">
          <h1 className="display-serif text-[1.75rem] leading-[1.1] font-semibold text-navy-700 tracking-tight">
            {participant.name}
          </h1>
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

      {/* Sticky progress bar + mark complete */}
      <div className="sticky top-14 z-20 bg-white rounded-lg border border-ink-200 p-4 flex items-center gap-4 shadow-sm">
        <div className="flex-1">
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-2xs uppercase tracking-wider font-semibold text-ink-500">
              Progress
            </span>
            <span className="text-sm font-semibold text-navy-700">
              {liveProgress.rated} / {liveProgress.total} indicators
            </span>
          </div>
          <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                isComplete ? "bg-green-500" : "bg-amber-500",
              )}
              style={{ width: `${(liveProgress.rated / liveProgress.total) * 100}%` }}
            />
          </div>
        </div>
        <SaveBadge lastSaved={lastSaved} />
        <Button
          variant={isComplete ? "secondary" : "primary"}
          onClick={toggleComplete}
          disabled={liveProgress.rated === 0 && !isComplete}
        >
          {isComplete ? (
            <><RotateCcw size={13} /> Reopen</>
          ) : (
            <><CheckCircle2 size={13} /> Mark complete</>
          )}
        </Button>
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
              isComplete={isComplete}
              size="touch"
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
              onClick={() => navigate(`/observe/${engagement.id}/${toolId}/${prevParticipant.id}`)}
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
              onClick={() => navigate(`/observe/${engagement.id}/${toolId}/${nextParticipant.id}`)}
            >
              {nextParticipant.name} <ChevronRight size={13} />
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={() => navigate(`/observe/${engagement.id}/${toolId}`)}
            >
              Back to all participants <ArrowRight size={13} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Fire-and-forget email trigger when all participants for a tool are complete */
async function triggerEmailOnCompletion(
  engagementId: string,
  toolId: string,
  observerId: string,
  observerEmail: string,
) {
  try {
    await fetch("/.netlify/functions/email-scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ engagementId, toolId, observerId, observerEmail }),
    });
  } catch {
    // Silent failure — email is best-effort
  }
}
