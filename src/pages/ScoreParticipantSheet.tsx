import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect, useMemo, useRef } from "react";
import {
  ChevronLeft, ChevronRight, ArrowRight, CheckCircle2, Save,
  EyeOff, RotateCcw, FileText, Star,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useEngagement, useActingObserverId, useAppStore } from "@/lib/store";
import {
  findScore, observerToolParticipants,
  expectedIndicators,
} from "@/lib/scoring";
import { findToolType } from "@/mocks/toolLibrary";
import { findCompetency } from "@/mocks/dictionary";
import type {
  CompetencyScore, IndicatorScore, IndicatorRating,
} from "@/types";

export function ScoreParticipantSheet() {
  const { engagementId, toolId, participantId } = useParams<{
    engagementId: string; toolId: string; participantId: string;
  }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const phase: "rate" | "evidence" = searchParams.get("phase") === "evidence" ? "evidence" : "rate";
  const engagement = useEngagement(engagementId);
  const observerId = useActingObserverId(engagementId);
  const updateCompetencyScore = useAppStore((s) => s.updateCompetencyScore);
  const markScoreComplete = useAppStore((s) => s.markScoreComplete);

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

  function setNotes(cid: string, field: "whatWasDoneWell" | "whatCouldBeBetter", value: string) {
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

  // Cycle through ratings for each indicator with keyboard? — leaving for v0.5.1

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
            {participant.employeeId && (
              <span className="text-sm font-mono text-ink-500">{participant.employeeId}</span>
            )}
          </div>
          <div className="text-sm text-ink-500 mt-1">
            {participant.currentRole}
            {participant.businessUnit && ` · ${participant.businessUnit}`}
            {participant.location && ` · ${participant.location}`}
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

      {/* Phase tabs */}
      <div className="bg-white rounded-lg border border-ink-200 p-1 inline-flex">
        <PhaseTab
          active={phase === "rate"}
          onClick={() => setSearchParams({ phase: "rate" })}
          icon={Star}
          label="Pass 1 · Rate indicators"
          sub="Rate all indicators across competencies"
        />
        <PhaseTab
          active={phase === "evidence"}
          onClick={() => setSearchParams({ phase: "evidence" })}
          icon={FileText}
          label="Pass 2 · Capture evidence"
          sub="Add qualitative notes per competency"
        />
      </div>

      {/* Competency cards */}
      <div className="space-y-5">
        {tool.competencyIds.map((cid) => {
          const competency = findCompetency(cid);
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
              phase={phase}
              onIndicator={(idx, change) => setIndicator(cid, idx, change)}
              onNotes={(field, value) => setNotes(cid, field, value)}
            />
          );
        })}
      </div>

      {/* Navigation footer */}
      <div className="flex items-center justify-between pt-4 border-t border-ink-200">
        <div className="flex items-center gap-2">
          {phase === "evidence" && (
            <Button
              variant="secondary"
              onClick={() => setSearchParams({ phase: "rate" })}
            >
              <ChevronLeft size={13} /> Back to rating
            </Button>
          )}
          {phase === "rate" && prevParticipant && (
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
          {phase === "rate" ? (
            <Button
              variant="primary"
              onClick={() => setSearchParams({ phase: "evidence" })}
              disabled={liveProgress.rated === 0}
            >
              Continue to evidence <ArrowRight size={13} />
            </Button>
          ) : nextParticipant ? (
            <Button
              variant="primary"
              onClick={() => navigate(`/engagement/${engagement.id}/score/${toolId}/${nextParticipant.id}?phase=rate`)}
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

// ---------- PhaseTab ----------
function PhaseTab({
  active, onClick, icon: Icon, label, sub,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Star;
  label: string;
  sub: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-start gap-2.5 px-4 py-2.5 rounded-md transition-colors text-left",
        active
          ? "bg-navy-700 text-white"
          : "text-ink-500 hover:text-navy-700 hover:bg-ink-100",
      )}
    >
      <Icon size={15} className="flex-shrink-0 mt-0.5" />
      <div>
        <div className={cn("text-2xs font-semibold tracking-wider uppercase", active ? "text-white" : "text-ink-700")}>
          {label}
        </div>
        <div className={cn("text-2xs leading-tight mt-0.5", active ? "text-white/70" : "text-ink-500")}>
          {sub}
        </div>
      </div>
    </button>
  );
}

// ---------- CompetencyScoreCard ----------
interface CompetencyScoreCardProps {
  competencyName: string;
  definition: string;
  targetLevelLabel: string;
  indicators: string[];
  draft: CompetencyScore;
  isComplete: boolean;
  phase: "rate" | "evidence";
  onIndicator: (idx: number, change: Partial<IndicatorScore>) => void;
  onNotes: (field: "whatWasDoneWell" | "whatCouldBeBetter", value: string) => void;
}

function CompetencyScoreCard({
  competencyName, definition, targetLevelLabel, indicators, draft, isComplete, phase,
  onIndicator, onNotes,
}: CompetencyScoreCardProps) {
  const ratedCount = draft.indicators.filter((i) => i.rating !== undefined || i.notObserved).length;
  const isCompCompletely = ratedCount === 4;

  return (
    <Card className={cn(
      "overflow-hidden",
      isCompCompletely && "border-green-300/60",
    )}>
      <div className={cn(
        "px-5 py-3 border-b border-ink-200 flex items-center justify-between",
        isCompCompletely ? "bg-green-50/40" : "bg-ink-100/40",
      )}>
        <div className="flex items-center gap-3">
          <h3 className="display-serif text-lg font-semibold text-navy-700">
            {competencyName}
          </h3>
          <Badge tone="ocean">{targetLevelLabel}</Badge>
        </div>
        <div className="text-2xs font-mono text-ink-500">
          {ratedCount}/4 indicators
        </div>
      </div>
      <CardBody className="space-y-4">
        <p className="text-xs text-ink-500 leading-relaxed">{definition}</p>

        {/* Indicators — interactive in rate phase, read-only summary in evidence phase */}
        {phase === "rate" ? (
          <div className="space-y-3">
            {indicators.map((indText, idx) => (
              <IndicatorRow
                key={idx}
                number={idx + 1}
                text={indText}
                indicator={draft.indicators[idx]}
                disabled={isComplete}
                onChange={(change) => onIndicator(idx, change)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-2xs uppercase tracking-wider font-semibold text-ink-500">
              Your ratings
            </div>
            {indicators.map((indText, idx) => (
              <IndicatorReadOnlyRow
                key={idx}
                number={idx + 1}
                text={indText}
                indicator={draft.indicators[idx]}
              />
            ))}
          </div>
        )}

        {/* Notes — only shown in evidence phase */}
        {phase === "evidence" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-ink-100">
            <div>
              <label className="text-2xs uppercase tracking-wider font-semibold text-green-700 block mb-1.5">
                What was done well
              </label>
              <textarea
                value={draft.whatWasDoneWell ?? ""}
                onChange={(e) => onNotes("whatWasDoneWell", e.target.value)}
                disabled={isComplete}
                placeholder="Specific evidence and examples observed."
                rows={4}
                className="w-full px-3 py-2 text-sm border border-ink-200 rounded-md focus:outline-none focus:ring-2 focus:ring-ocean-600/20 focus:border-ocean-400 transition-colors resize-none disabled:bg-ink-100/40"
              />
            </div>
            <div>
              <label className="text-2xs uppercase tracking-wider font-semibold text-amber-700 block mb-1.5">
                What could have been better
              </label>
              <textarea
                value={draft.whatCouldBeBetter ?? ""}
                onChange={(e) => onNotes("whatCouldBeBetter", e.target.value)}
                disabled={isComplete}
                placeholder="Gaps, development areas, or moments to probe further."
                rows={4}
                className="w-full px-3 py-2 text-sm border border-ink-200 rounded-md focus:outline-none focus:ring-2 focus:ring-ocean-600/20 focus:border-ocean-400 transition-colors resize-none disabled:bg-ink-100/40"
              />
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

// Read-only summary row used in the evidence phase
function IndicatorReadOnlyRow({
  number, text, indicator,
}: { number: number; text: string; indicator: IndicatorScore }) {
  const ratingDisplay = indicator.notObserved
    ? "Not observed"
    : indicator.rating !== undefined
    ? `${indicator.rating}`
    : "—";
  const tone = indicator.notObserved ? "neutral" : indicator.rating !== undefined ? "ocean" : "neutral";

  return (
    <div className="flex items-start gap-3 py-2 px-3 rounded-md bg-ink-100/40">
      <span className="text-2xs font-mono font-semibold text-ink-400 flex-shrink-0 mt-0.5">
        {number}
      </span>
      <p className="flex-1 text-xs text-ink-700 leading-snug">{text}</p>
      <Badge tone={tone as "neutral" | "ocean"}>
        {ratingDisplay}
      </Badge>
    </div>
  );
}

// ---------- IndicatorRow ----------
interface IndicatorRowProps {
  number: number;
  text: string;
  indicator: IndicatorScore;
  disabled: boolean;
  onChange: (change: Partial<IndicatorScore>) => void;
}

function IndicatorRow({ number, text, indicator, disabled, onChange }: IndicatorRowProps) {
  const isRated = indicator.rating !== undefined && !indicator.notObserved;
  const isNotObserved = indicator.notObserved;

  return (
    <div className={cn(
      "rounded-md border transition-colors",
      isRated && "border-ocean-300/50 bg-ocean-50/20",
      isNotObserved && "border-ink-300 bg-ink-100/40",
      !isRated && !isNotObserved && "border-ink-200 bg-white",
    )}>
      <div className="flex items-start gap-3 p-3">
        <div className={cn(
          "w-6 h-6 rounded font-mono text-2xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5",
          isRated ? "bg-ocean-100 text-ocean-800" : "bg-ink-100 text-ink-500",
        )}>
          {number}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-ink-700 leading-relaxed">{text}</p>

          {/* Rating row */}
          <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
            {[1, 2, 3, 4, 5].map((rating) => {
              const isSelected = indicator.rating === rating && !indicator.notObserved;
              return (
                <button
                  key={rating}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange({ rating: rating as IndicatorRating, notObserved: false })}
                  className={cn(
                    "w-9 h-9 rounded-md text-sm font-mono font-semibold transition-all border",
                    isSelected
                      ? "bg-ocean-600 text-white border-ocean-600 shadow-sm scale-105"
                      : "bg-white text-ink-700 border-ink-200 hover:border-ocean-400 hover:bg-ocean-50/30",
                    disabled && "opacity-60 cursor-not-allowed",
                  )}
                  title={RATING_LABELS[rating]}
                >
                  {rating}
                </button>
              );
            })}
            <div className="w-px h-8 bg-ink-200 mx-1.5" />
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange({ notObserved: !indicator.notObserved, rating: indicator.notObserved ? indicator.rating : undefined })}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 h-9 rounded-md text-2xs font-medium transition-all border",
                isNotObserved
                  ? "bg-ink-300 text-navy-700 border-ink-400"
                  : "bg-white text-ink-500 border-ink-200 hover:border-ink-300 hover:bg-ink-100/40",
                disabled && "opacity-60 cursor-not-allowed",
              )}
            >
              <EyeOff size={11} />
              Not observed
            </button>
          </div>
          {isRated && (
            <div className="mt-1.5 text-2xs text-ink-500">
              {RATING_LABELS[indicator.rating!]}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const RATING_LABELS: Record<number, string> = {
  1: "1 · Substantially below expectations",
  2: "2 · Below expectations",
  3: "3 · Meets expectations",
  4: "4 · Above expectations",
  5: "5 · Substantially above expectations",
};

// ---------- SaveBadge ----------
function SaveBadge({ lastSaved }: { lastSaved: Date | null }) {
  if (!lastSaved) {
    return (
      <Badge tone="neutral">
        <Save size={11} /> Auto-save on
      </Badge>
    );
  }
  return (
    <Badge tone="green">
      <CheckCircle2 size={11} /> Saved {formatTime(lastSaved)}
    </Badge>
  );
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
