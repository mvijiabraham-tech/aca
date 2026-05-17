import { useParams, useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import {
  ChevronLeft, EyeOff, Eye, Sparkles, Award, TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useEngagement } from "@/lib/store";
import {
  effectiveCompetencyScore, computedOar, oarBandFor,
} from "@/lib/calibrate";
import { findCompetency } from "@/mocks/dictionary";
import { OAR_BAND_META } from "@/types";
import type { OarBand } from "@/types";

const BAND_ORDER: OarBand[] = ["below", "developing", "proficient", "strong", "distinguished"];

export function ReportGroup() {
  const { engagementId } = useParams<{ engagementId: string }>();
  const navigate = useNavigate();
  const engagement = useEngagement(engagementId);
  const [masked, setMasked] = useState(false);

  if (!engagement) return null;

  const participants = engagement.participants;
  const competencies = engagement.competencies;

  // Per-competency cohort summary
  const competencyStats = useMemo(() => {
    return competencies.map((sel) => {
      const c = findCompetency(sel.competencyId, engagement?.customCompetencies);
      const scores = participants
        .map((p) => effectiveCompetencyScore(engagement, p.id, sel.competencyId))
        .filter((s): s is number => s !== null);
      const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
      const min = scores.length > 0 ? Math.min(...scores) : null;
      const max = scores.length > 0 ? Math.max(...scores) : null;
      const target = engagement.proficiencyTargets.find((t) => t.competencyId === sel.competencyId);
      const aboveTarget = target ? scores.filter((s) => s >= target.targetLevel).length : 0;
      return { selection: sel, competency: c, avg, min, max, target, aboveTarget, totalScored: scores.length };
    });
  }, [engagement, competencies, participants]);

  // Band distribution
  const bandDist = useMemo(() => {
    const counts: Record<OarBand, number> = {
      below: 0, developing: 0, proficient: 0, strong: 0, distinguished: 0,
    };
    participants.forEach((p) => {
      const oar = computedOar(engagement, p.id);
      if (oar === null) return;
      const confirmed = engagement.calibrate.oars.find((o) => o.participantId === p.id);
      const band = confirmed?.finalBand ?? oarBandFor(engagement, oar);
      counts[band]++;
    });
    return counts;
  }, [engagement, participants]);

  // Themes — surface 2-3 patterns
  const themes = useMemo(() => {
    const list: { kind: "strength" | "gap"; title: string; detail: string }[] = [];
    const strong = competencyStats.filter((cs) => cs.avg !== null && cs.target && cs.avg >= cs.target.targetLevel);
    const weak = competencyStats.filter((cs) => cs.avg !== null && cs.target && cs.avg < cs.target.targetLevel - 0.5);
    if (strong.length > 0) {
      const s = strong.sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0))[0];
      list.push({
        kind: "strength",
        title: `Cohort strength: ${s.competency?.name}`,
        detail: `Average ${s.avg?.toFixed(2)} against target L${s.target?.targetLevel} — ${s.aboveTarget} of ${s.totalScored} participants at or above target.`,
      });
    }
    if (weak.length > 0) {
      const w = weak.sort((a, b) => (a.avg ?? 0) - (b.avg ?? 0))[0];
      list.push({
        kind: "gap",
        title: `Cohort gap: ${w.competency?.name}`,
        detail: `Average ${w.avg?.toFixed(2)} sits below target L${w.target?.targetLevel}. Consider a structured development intervention.`,
      });
    }
    return list;
  }, [competencyStats]);

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate(`/engagement/${engagement.id}/report`)}
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-navy-700 transition-colors"
      >
        <ChevronLeft size={14} /> Back to Report
      </button>

      <div className="flex items-start justify-between gap-4">
        <div className="max-w-2xl">
          <div className="text-2xs text-ocean-700 uppercase tracking-wider font-semibold mb-2">
            Report · Group view
          </div>
          <h1 className="display-serif text-[2rem] leading-[1.1] font-semibold text-navy-700 tracking-tight">
            Cohort patterns and bench strength.
          </h1>
          <p className="text-base text-ink-500 mt-3 leading-relaxed">
            View the cohort as a whole. Useful for talent discussions with client leadership.
            Toggle mask-names for unbiased calibration before decisions.
          </p>
        </div>

        <Button variant={masked ? "primary" : "secondary"} onClick={() => setMasked(!masked)}>
          {masked ? <><EyeOff size={13} /> Names masked</> : <><Eye size={13} /> Show names</>}
        </Button>
      </div>

      {/* Band distribution */}
      <Card>
        <div className="px-5 py-3 border-b border-ink-200">
          <h2 className="text-sm font-semibold text-navy-700">OAR distribution</h2>
        </div>
        <CardBody>
          <div className="grid grid-cols-5 gap-3">
            {BAND_ORDER.map((band) => {
              const count = bandDist[band];
              const pct = participants.length > 0 ? (count / participants.length) * 100 : 0;
              const meta = OAR_BAND_META[band];
              return (
                <div key={band} className="text-center">
                  <div className={cn("rounded-lg p-3 mb-2", bandBgClass(meta.tone))}>
                    <div className="font-mono text-3xl font-bold text-navy-700">{count}</div>
                    <div className="text-2xs text-ink-500 mt-0.5">{Math.round(pct)}%</div>
                  </div>
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      {/* Themes */}
      <Card>
        <div className="px-5 py-3 border-b border-ink-200 flex items-center gap-2">
          <Sparkles size={14} className="text-ocean-600" />
          <h2 className="text-sm font-semibold text-navy-700">Themes</h2>
        </div>
        <CardBody className="space-y-3">
          {themes.length === 0 ? (
            <div className="text-sm text-ink-500 italic">No clear themes surfaced yet.</div>
          ) : (
            themes.map((t, i) => (
              <div
                key={i}
                className={cn(
                  "p-3 rounded-lg border flex items-start gap-3",
                  t.kind === "strength" ? "border-green-300/60 bg-green-50/30" : "border-amber-300/60 bg-amber-50/30",
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0",
                  t.kind === "strength" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700",
                )}>
                  {t.kind === "strength" ? <Award size={16} /> : <TrendingUp size={16} />}
                </div>
                <div>
                  <div className="text-sm font-semibold text-navy-700">{t.title}</div>
                  <div className="text-xs text-ink-700 mt-0.5 leading-relaxed">{t.detail}</div>
                </div>
              </div>
            ))
          )}
        </CardBody>
      </Card>

      {/* Competency strength */}
      <Card>
        <div className="px-5 py-3 border-b border-ink-200">
          <h2 className="text-sm font-semibold text-navy-700">Competency bench strength</h2>
        </div>
        <CardBody>
          <div className="space-y-3">
            {competencyStats.map((cs) => {
              if (!cs.competency || cs.avg === null || !cs.target) {
                return (
                  <div key={cs.selection.competencyId} className="text-sm text-ink-500 italic">
                    {cs.competency?.name ?? "—"}: no data
                  </div>
                );
              }
              const ratio = cs.avg / 5;
              const targetPos = cs.target.targetLevel / 5;
              return (
                <div key={cs.selection.competencyId}>
                  <div className="flex items-baseline justify-between mb-1">
                    <div className="text-sm font-medium text-navy-700">{cs.competency.name}</div>
                    <div className="text-2xs text-ink-500">
                      <span className="font-mono font-semibold">{cs.avg.toFixed(2)}</span>
                      {" / target L"}{cs.target.targetLevel}
                      {" · "}{cs.aboveTarget}/{cs.totalScored} at target
                    </div>
                  </div>
                  <div className="relative h-2 bg-ink-100 rounded-full overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-ocean-500 rounded-full transition-all"
                      style={{ width: `${ratio * 100}%` }}
                    />
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-navy-700"
                      style={{ left: `${targetPos * 100}%` }}
                      title={`Target L${cs.target.targetLevel}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      {/* Participant grid */}
      <Card>
        <div className="px-5 py-3 border-b border-ink-200">
          <h2 className="text-sm font-semibold text-navy-700">Participants ({participants.length})</h2>
        </div>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {participants.map((p, idx) => {
              const oar = computedOar(engagement, p.id);
              const band = oar !== null ? oarBandFor(engagement, oar) : null;
              const confirmed = engagement.calibrate.oars.find((o) => o.participantId === p.id);
              const finalBand = confirmed?.finalBand ?? band;
              return (
                <div key={p.id} className="border border-ink-200 rounded-lg p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-md bg-ink-100 text-navy-700 flex items-center justify-center text-2xs font-semibold flex-shrink-0">
                    {masked ? `P${idx + 1}` : initials(p.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-navy-700 truncate">
                      {masked ? `Participant ${idx + 1}` : p.name}
                    </div>
                    <div className="text-2xs text-ink-500 truncate">
                      {masked ? "—" : p.currentRole}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-mono text-sm font-bold text-navy-700">
                      {oar?.toFixed(2) ?? "—"}
                    </div>
                    {finalBand && (
                      <Badge tone={OAR_BAND_META[finalBand].tone}>
                        {OAR_BAND_META[finalBand].label}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function bandBgClass(tone: "red" | "amber" | "ocean" | "green" | "navy"): string {
  return {
    red:    "bg-red-50",
    amber:  "bg-amber-50",
    ocean:  "bg-ocean-50",
    green:  "bg-green-50",
    navy:   "bg-navy-100",
  }[tone];
}

function initials(name: string): string {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}
