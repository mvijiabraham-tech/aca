import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  ChevronLeft, ArrowRight, Edit3,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useEngagement, useAppStore, useActingObserverId } from "@/lib/store";
import {
  computedCompetencyScore, effectiveCompetencyScore, disagreementSpread,
} from "@/lib/calibrate";
import { findCompetency } from "@/mocks/dictionary";
import type { ModeratedScore, CompetencySelection } from "@/types";

export function CalibrateModerate() {
  const { engagementId } = useParams<{ engagementId: string }>();
  const navigate = useNavigate();
  const engagement = useEngagement(engagementId);
  const upsertModeratedScore = useAppStore((s) => s.upsertModeratedScore);
  const actingId = useActingObserverId(engagementId);

  const [selectedPid, setSelectedPid] = useState<string | null>(null);
  const [editingComp, setEditingComp] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editRationale, setEditRationale] = useState("");

  if (!engagement) return null;

  const isSignedOff = engagement.calibrate.stage === "complete";
  const participants = engagement.participants;
  const competencies = engagement.competencies;

  // Default-select first participant
  const activePid = selectedPid ?? participants[0]?.id ?? null;
  const activeParticipant = participants.find((p) => p.id === activePid);

  function startEdit(competencyId: string) {
    if (!activePid || isSignedOff) return;
    const existing = engagement!.calibrate.moderatedScores.find(
      (m) => m.participantId === activePid && m.competencyId === competencyId,
    );
    const computed = computedCompetencyScore(engagement!, activePid, competencyId);
    setEditingComp(competencyId);
    setEditValue(existing ? existing.moderatedScore.toFixed(1) : computed?.toFixed(1) ?? "");
    setEditRationale(existing?.rationale ?? "");
  }

  function saveEdit() {
    if (!editingComp || !activePid || !actingId) return;
    const computed = computedCompetencyScore(engagement!, activePid, editingComp);
    if (computed === null) return;
    const mod = parseFloat(editValue);
    if (isNaN(mod) || mod < 1 || mod > 5) return;
    const score: ModeratedScore = {
      participantId: activePid,
      competencyId: editingComp,
      computedScore: computed,
      moderatedScore: mod,
      isOverride: Math.abs(mod - computed) > 0.01,
      rationale: editRationale.trim() || undefined,
      moderatedBy: actingId,
      moderatedAt: new Date().toISOString(),
    };
    upsertModeratedScore(engagement!.id, score);
    setEditingComp(null);
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate(`/engagement/${engagement.id}/calibrate`)}
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-navy-700 transition-colors"
      >
        <ChevronLeft size={14} /> Back to Calibrate
      </button>

      <div className="max-w-2xl">
        <div className="text-2xs font-mono font-semibold text-ocean-700 tracking-wider mb-1">
          STAGE 2 OF 3
        </div>
        <h1 className="display-serif text-[2rem] leading-[1.1] font-semibold text-navy-700 tracking-tight">
          Moderate per participant.
        </h1>
        <p className="text-base text-ink-500 mt-3 leading-relaxed">
          Per-participant view of the competency profile. Override any score with rationale.
          Where you've moderated in Reconcile, those overrides carry forward — you can adjust them here.
        </p>
      </div>

      {/* Two-column layout — participant list + profile */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
        {/* Participant list */}
        <Card>
          <div className="px-4 py-3 border-b border-ink-200 bg-ink-100/40">
            <h2 className="text-2xs uppercase tracking-wider font-semibold text-navy-700">
              Participants ({participants.length})
            </h2>
          </div>
          <div className="divide-y divide-ink-100 max-h-[600px] overflow-y-auto">
            {participants.map((p) => {
              const overrideCount = engagement.calibrate.moderatedScores.filter(
                (m) => m.participantId === p.id && m.isOverride,
              ).length;
              const isActive = p.id === activePid;
              return (
                <button
                  key={p.id}
                  onClick={() => { setSelectedPid(p.id); setEditingComp(null); }}
                  className={cn(
                    "w-full text-left p-3 transition-colors",
                    isActive ? "bg-ocean-50/50" : "hover:bg-ink-100/40",
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className={cn(
                      "w-7 h-7 rounded-md flex items-center justify-center text-2xs font-semibold flex-shrink-0",
                      isActive ? "bg-ocean-600 text-white" : "bg-ink-100 text-navy-700",
                    )}>
                      {initials(p.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-navy-700 truncate">{p.name}</div>
                      <div className="text-2xs text-ink-500 truncate">{p.currentRole}</div>
                      {overrideCount > 0 && (
                        <Badge tone="ocean" className="mt-1">
                          {overrideCount} override{overrideCount === 1 ? "" : "s"}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Profile */}
        <div>
          {activeParticipant ? (
            <Card>
              <div className="px-5 py-4 border-b border-ink-200">
                <h2 className="display-serif text-xl font-semibold text-navy-700">
                  {activeParticipant.name}
                </h2>
                <div className="text-2xs text-ink-500 mt-0.5">
                  {activeParticipant.currentRole}
                  {activeParticipant.businessUnit && ` · ${activeParticipant.businessUnit}`}
                  {activeParticipant.employeeId && ` · ${activeParticipant.employeeId}`}
                </div>
              </div>
              <CardBody className="space-y-3">
                {competencies.map((sel: CompetencySelection) => {
                  const c = findCompetency(sel.competencyId, engagement?.customCompetencies);
                  if (!c) return null;
                  const computed = computedCompetencyScore(engagement, activeParticipant.id, sel.competencyId);
                  const effective = effectiveCompetencyScore(engagement, activeParticipant.id, sel.competencyId);
                  const moderation = engagement.calibrate.moderatedScores.find(
                    (m) => m.participantId === activeParticipant.id && m.competencyId === sel.competencyId,
                  );
                  const spread = disagreementSpread(engagement, activeParticipant.id, sel.competencyId);
                  const target = engagement.proficiencyTargets.find((t) => t.competencyId === sel.competencyId);
                  const isEditing = editingComp === sel.competencyId;

                  return (
                    <div
                      key={sel.competencyId}
                      className={cn(
                        "border rounded-lg p-3 transition-colors",
                        isEditing ? "border-ocean-400 bg-ocean-50/30" : "border-ink-200",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="text-sm font-semibold text-navy-700">{c.name}</h3>
                            {sel.critical && <Badge tone="red">Critical</Badge>}
                            {target && <Badge tone="ocean">Target L{target.targetLevel}</Badge>}
                            <Badge tone="neutral">Weight {sel.weight}</Badge>
                          </div>
                          <div className="text-2xs text-ink-500">
                            Computed: <span className="font-mono font-semibold">{computed?.toFixed(2) ?? "—"}</span>
                            {spread !== null && (
                              <> · Spread: <span className="font-mono">{spread.toFixed(1)}</span></>
                            )}
                            {moderation?.rationale && (
                              <> · <span className="italic">"{moderation.rationale}"</span></>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <div className={cn(
                            "font-mono text-2xl font-bold",
                            moderation?.isOverride ? "text-ocean-700" : "text-navy-700",
                          )}>
                            {effective?.toFixed(2) ?? "—"}
                          </div>
                          {moderation?.isOverride && (
                            <div className="text-2xs text-ocean-700 font-medium">moderated</div>
                          )}
                        </div>
                        {!isSignedOff && (
                          <button
                            onClick={() => startEdit(sel.competencyId)}
                            disabled={computed === null}
                            className="p-1.5 rounded hover:bg-ink-100 text-ink-500 hover:text-navy-700 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                            title="Edit moderation"
                          >
                            <Edit3 size={14} />
                          </button>
                        )}
                      </div>

                      {isEditing && (
                        <div className="mt-3 pt-3 border-t border-ocean-200/50 flex items-start gap-3">
                          <input
                            type="number"
                            step="0.1"
                            min="1"
                            max="5"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-20 px-2 py-1.5 text-base font-mono font-bold text-center border border-ink-200 rounded focus:outline-none focus:ring-2 focus:ring-ocean-600/20"
                          />
                          <textarea
                            value={editRationale}
                            onChange={(e) => setEditRationale(e.target.value)}
                            placeholder="Rationale (recommended for overrides)"
                            rows={2}
                            className="flex-1 px-2 py-1.5 text-xs border border-ink-200 rounded focus:outline-none focus:ring-2 focus:ring-ocean-600/20 resize-none"
                          />
                          <div className="flex flex-col gap-1">
                            <Button size="sm" variant="primary" onClick={saveEdit}>Save</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingComp(null)}>Cancel</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardBody>
            </Card>
          ) : (
            <div className="text-sm text-ink-500">No participant selected.</div>
          )}
        </div>
      </div>

      {/* Footer nav */}
      <div className="flex items-center justify-between pt-4 border-t border-ink-200">
        <Button variant="secondary" onClick={() => navigate(`/engagement/${engagement.id}/calibrate/reconcile`)}>
          <ChevronLeft size={13} /> Back to Reconcile
        </Button>
        <Button variant="primary" onClick={() => navigate(`/engagement/${engagement.id}/calibrate/oar`)}>
          Continue to OAR <ArrowRight size={13} />
        </Button>
      </div>
    </div>
  );
}

function initials(name: string): string {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}
