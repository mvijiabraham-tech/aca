import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  ChevronLeft, AlertTriangle,
  ArrowRight, X, Save, RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useEngagement, useAppStore, useActingObserverId } from "@/lib/store";
import {
  observerScoresFor, computedCompetencyScore, disagreementSpread,
  effectiveCompetencyScore,
} from "@/lib/calibrate";
import { findCompetency } from "@/mocks/dictionary";
import type { ModeratedScore } from "@/types";

export function CalibrateReconcile() {
  const { engagementId } = useParams<{ engagementId: string }>();
  const navigate = useNavigate();
  const engagement = useEngagement(engagementId);
  const upsertModeratedScore = useAppStore((s) => s.upsertModeratedScore);
  const actingId = useActingObserverId(engagementId);

  const [selected, setSelected] = useState<{ participantId: string; competencyId: string } | null>(null);
  const [rationale, setRationale] = useState("");
  const [moderatedValue, setModeratedValue] = useState<string>("");

  if (!engagement) return null;

  const participants = engagement.participants;
  const competencies = engagement.competencies;
  const isSignedOff = engagement.calibrate.stage === "complete";

  const selectedData = (() => {
    if (!selected) return null;
    const obs = observerScoresFor(engagement, selected.participantId, selected.competencyId);
    const computed = computedCompetencyScore(engagement, selected.participantId, selected.competencyId);
    const spread = disagreementSpread(engagement, selected.participantId, selected.competencyId);
    const existing = engagement.calibrate.moderatedScores.find(
      (m) => m.participantId === selected.participantId && m.competencyId === selected.competencyId,
    );
    const participant = participants.find((p) => p.id === selected.participantId);
    const competency = findCompetency(selected.competencyId, engagement?.customCompetencies);
    return { obs, computed, spread, existing, participant, competency };
  })();

  function openCell(participantId: string, competencyId: string) {
    if (isSignedOff) return;
    setSelected({ participantId, competencyId });
    const existing = engagement!.calibrate.moderatedScores.find(
      (m) => m.participantId === participantId && m.competencyId === competencyId,
    );
    const computed = computedCompetencyScore(engagement!, participantId, competencyId);
    if (existing) {
      setModeratedValue(existing.moderatedScore.toFixed(1));
      setRationale(existing.rationale ?? "");
    } else if (computed !== null) {
      setModeratedValue(computed.toFixed(1));
      setRationale("");
    }
  }

  function saveModeration() {
    if (!selected || !actingId) return;
    const computed = computedCompetencyScore(engagement!, selected.participantId, selected.competencyId);
    if (computed === null) return;
    const mod = parseFloat(moderatedValue);
    if (isNaN(mod) || mod < 1 || mod > 5) return;
    const score: ModeratedScore = {
      participantId: selected.participantId,
      competencyId: selected.competencyId,
      computedScore: computed,
      moderatedScore: mod,
      isOverride: Math.abs(mod - computed) > 0.01,
      rationale: rationale.trim() || undefined,
      moderatedBy: actingId,
      moderatedAt: new Date().toISOString(),
    };
    upsertModeratedScore(engagement!.id, score);
    setSelected(null);
  }

  function clearModeration() {
    // For simplicity, set moderated = computed and clear rationale
    if (!selected || !actingId) return;
    const computed = computedCompetencyScore(engagement!, selected.participantId, selected.competencyId);
    if (computed === null) return;
    upsertModeratedScore(engagement!.id, {
      participantId: selected.participantId,
      competencyId: selected.competencyId,
      computedScore: computed,
      moderatedScore: computed,
      isOverride: false,
      moderatedBy: actingId,
      moderatedAt: new Date().toISOString(),
    });
    setSelected(null);
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <button
        onClick={() => navigate(`/engagement/${engagement.id}/calibrate`)}
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-navy-700 transition-colors"
      >
        <ChevronLeft size={14} /> Back to Calibrate
      </button>

      {/* Header */}
      <div className="max-w-2xl">
        <div className="text-2xs font-mono font-semibold text-ocean-700 tracking-wider mb-1">
          STAGE 1 OF 3
        </div>
        <h1 className="display-serif text-[2rem] leading-[1.1] font-semibold text-navy-700 tracking-tight">
          Reconcile observer disagreement.
        </h1>
        <p className="text-base text-ink-500 mt-3 leading-relaxed">
          Each cell shows the score for one participant on one competency. Colour intensity reflects
          observer disagreement. Click any cell to see each observer's rating, evidence, and set a
          moderated value with rationale.
        </p>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-2xs text-ink-500">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-100 border border-green-300" />
          <span>Agreement (spread ≤ 1.0)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-amber-100 border border-amber-400" />
          <span>Some disagreement (1.0 – 1.5)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-50 border border-red-300" />
          <span>High disagreement (&gt; 1.5)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-ink-100 border border-ink-200" />
          <span>Insufficient data</span>
        </div>
      </div>

      {/* Heatmap */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-200 bg-ink-100/40">
                <th className="text-left px-4 py-3 font-semibold text-2xs text-ink-500 uppercase tracking-wider sticky left-0 bg-ink-100/40 z-10 min-w-[200px]">
                  Participant
                </th>
                {competencies.map((sel) => {
                  const c = findCompetency(sel.competencyId, engagement?.customCompetencies);
                  return (
                    <th key={sel.competencyId} className="px-2 py-3 font-semibold text-2xs text-ink-500 min-w-[90px]" title={c?.name}>
                      <div className="leading-tight truncate max-w-[120px]">{shortName(c?.name)}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {participants.map((p) => (
                <tr key={p.id} className="border-b border-ink-100">
                  <td className="px-4 py-2 sticky left-0 bg-white z-10">
                    <div className="text-sm font-medium text-navy-700 truncate max-w-[180px]" title={p.name}>
                      {p.name}
                    </div>
                    {p.employeeId && (
                      <div className="text-2xs font-mono text-ink-500">{p.employeeId}</div>
                    )}
                  </td>
                  {competencies.map((sel) => (
                    <HeatmapCell
                      key={sel.competencyId}
                      engagement={engagement}
                      participantId={p.id}
                      competencyId={sel.competencyId}
                      onClick={() => openCell(p.id, sel.competencyId)}
                      disabled={isSignedOff}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Continue */}
      <div className="flex justify-end">
        <Button
          variant="primary"
          onClick={() => navigate(`/engagement/${engagement.id}/calibrate/moderate`)}
        >
          Continue to Moderate <ArrowRight size={13} />
        </Button>
      </div>

      {/* Drill-in modal */}
      {selectedData && selected && (
        <DrillInModal
          data={selectedData}
          moderatedValue={moderatedValue}
          rationale={rationale}
          onModeratedChange={setModeratedValue}
          onRationaleChange={setRationale}
          onClose={() => setSelected(null)}
          onSave={saveModeration}
          onClear={clearModeration}
        />
      )}
    </div>
  );
}

function shortName(name?: string): string {
  if (!name) return "—";
  if (name.length <= 18) return name;
  return name.split(" ").map((w) => w[0]).join("");
}

// ---------- HeatmapCell ----------
function HeatmapCell({
  engagement, participantId, competencyId, onClick, disabled,
}: {
  engagement: any;
  participantId: string;
  competencyId: string;
  onClick: () => void;
  disabled: boolean;
}) {
  const computed = computedCompetencyScore(engagement, participantId, competencyId);
  const spread = disagreementSpread(engagement, participantId, competencyId);
  const effective = effectiveCompetencyScore(engagement, participantId, competencyId);
  const moderated = engagement.calibrate.moderatedScores.find(
    (m: ModeratedScore) => m.participantId === participantId && m.competencyId === competencyId,
  );

  let bg = "bg-ink-100 border-ink-200 text-ink-400";
  let label = "—";

  if (computed !== null) {
    label = (moderated ? effective! : computed).toFixed(1);
    if (spread === null) {
      bg = "bg-green-50 border-green-300 text-navy-700";
    } else if (spread > 1.5) {
      bg = "bg-red-50 border-red-300 text-navy-700";
    } else if (spread > 1.0) {
      bg = "bg-amber-50 border-amber-400 text-navy-700";
    } else {
      bg = "bg-green-50 border-green-300 text-navy-700";
    }
  }

  return (
    <td className="p-1">
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={cn(
          "w-full h-12 rounded border flex flex-col items-center justify-center transition-all",
          bg,
          !disabled && computed !== null && "hover:scale-[1.04] hover:shadow-sm cursor-pointer",
          disabled && "cursor-not-allowed opacity-80",
        )}
        title={computed !== null ? `Score ${label}${spread !== null ? ` · spread ${spread.toFixed(1)}` : ""}` : "No data"}
      >
        <span className="text-sm font-mono font-bold">{label}</span>
        {moderated?.isOverride && (
          <span className="text-2xs text-ocean-700 font-medium leading-none">mod</span>
        )}
      </button>
    </td>
  );
}

// ---------- DrillInModal ----------
function DrillInModal({
  data, moderatedValue, rationale, onModeratedChange, onRationaleChange,
  onClose, onSave, onClear,
}: {
  data: ReturnType<any>; // simplified
  moderatedValue: string;
  rationale: string;
  onModeratedChange: (v: string) => void;
  onRationaleChange: (v: string) => void;
  onClose: () => void;
  onSave: () => void;
  onClear: () => void;
}) {
  if (!data.participant || !data.competency) return null;
  const isOverride = data.computed !== null && Math.abs(parseFloat(moderatedValue) - data.computed) > 0.01;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-ink-200 flex items-start justify-between gap-4">
          <div>
            <div className="text-2xs font-medium text-ink-500 uppercase tracking-wider">
              {data.participant.name} · {data.participant.employeeId ?? ""}
            </div>
            <h2 className="display-serif text-xl font-semibold text-navy-700 mt-0.5">
              {data.competency.name}
            </h2>
            <p className="text-xs text-ink-500 mt-1">{data.competency.definition}</p>
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-navy-700 p-1.5 -mr-1.5 rounded hover:bg-ink-100">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Stats band */}
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Computed" value={data.computed?.toFixed(2) ?? "—"} />
            <Stat label="Observers" value={`${data.obs.length}`} />
            <Stat
              label="Spread"
              value={data.spread !== null ? data.spread.toFixed(1) : "—"}
              tone={data.spread === null ? "neutral" : data.spread > 1.5 ? "red" : data.spread > 1.0 ? "amber" : "green"}
            />
          </div>

          {/* Observer breakdown */}
          <div>
            <div className="text-2xs uppercase tracking-wider font-semibold text-ink-500 mb-2">
              Observer ratings
            </div>
            <div className="space-y-2">
              {data.obs.length === 0 ? (
                <div className="text-sm text-ink-500 italic">No observer scores yet.</div>
              ) : (
                data.obs.map((o: any) => (
                  <div key={`${o.observerId}-${o.toolId}`} className="border border-ink-200 rounded-lg p-3">
                    <div className="flex items-baseline gap-3 mb-1">
                      <span className="text-sm font-semibold text-navy-700">Observer {o.observerId}</span>
                      <Badge tone="neutral">Tool {o.toolId}</Badge>
                      <span className="font-mono text-lg font-bold text-ocean-700 ml-auto">
                        {o.score.toFixed(2)}
                      </span>
                    </div>
                    {o.evidence?.whatWasDoneWell && (
                      <div className="text-2xs text-ink-700 mt-1.5">
                        <span className="font-semibold text-green-700 uppercase tracking-wider">Well: </span>
                        {o.evidence.whatWasDoneWell}
                      </div>
                    )}
                    {o.evidence?.whatCouldBeBetter && (
                      <div className="text-2xs text-ink-700 mt-1">
                        <span className="font-semibold text-amber-700 uppercase tracking-wider">Better: </span>
                        {o.evidence.whatCouldBeBetter}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Moderation */}
          <div className="border-t border-ink-200 pt-4">
            <div className="text-2xs uppercase tracking-wider font-semibold text-ink-500 mb-2">
              Lead Assessor moderated score
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="5"
                  value={moderatedValue}
                  onChange={(e) => onModeratedChange(e.target.value)}
                  className="w-24 px-3 py-2 text-xl font-mono font-bold text-center border border-ink-200 rounded-md focus:outline-none focus:ring-2 focus:ring-ocean-600/20 focus:border-ocean-400"
                />
              </div>
              <div className="flex-1">
                <textarea
                  value={rationale}
                  onChange={(e) => onRationaleChange(e.target.value)}
                  placeholder={isOverride ? "Rationale for the override (recommended)." : "Optional notes."}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-ink-200 rounded-md focus:outline-none focus:ring-2 focus:ring-ocean-600/20 focus:border-ocean-400 resize-none"
                />
              </div>
            </div>
            {isOverride && (
              <div className="mt-2 text-2xs text-ocean-700 flex items-center gap-1.5">
                <AlertTriangle size={11} />
                This is an override from the computed value of {data.computed?.toFixed(2)}.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-ink-200 bg-ink-100/40 flex items-center justify-between">
          {data.existing ? (
            <Button variant="ghost" onClick={onClear}>
              <RotateCcw size={13} /> Reset to computed
            </Button>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={onSave}>
              <Save size={13} /> Save moderation
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone = "neutral" }: {
  label: string;
  value: string;
  tone?: "neutral" | "red" | "amber" | "green";
}) {
  const toneClass = {
    neutral: "bg-ink-100",
    red: "bg-red-50",
    amber: "bg-amber-50",
    green: "bg-green-50",
  }[tone];
  return (
    <div className={cn("rounded-lg p-3 text-center", toneClass)}>
      <div className="text-2xs uppercase tracking-wider font-semibold text-ink-500">{label}</div>
      <div className="font-mono text-xl font-bold text-navy-700 mt-1">{value}</div>
    </div>
  );
}
