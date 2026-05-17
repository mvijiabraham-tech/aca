import { useParams, useNavigate } from "react-router-dom";
import { useMemo, useEffect, useState } from "react";
import {
  ArrowRight, AlertTriangle, Target, Wand2,
  CheckCircle2, Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { TextArea } from "@/components/ui/Form";
import { StepPageHeader } from "@/components/StepPageHeader";
import { useEngagement, useAppStore } from "@/lib/store";
import { findCompetency, clusterMeta } from "@/mocks/dictionary";
import type { ProficiencyTarget, EngagementPurpose } from "@/types";
import type { ProficiencyLevel } from "@/types";

// Default level suggestions by engagement purpose
const PURPOSE_DEFAULT: Record<EngagementPurpose, ProficiencyLevel> = {
  selection: 1,
  promotion: 2,
  development: 2,
  hi_po: 3,
};

export function StepProficiencyTargets() {
  const { engagementId } = useParams<{ engagementId: string }>();
  const navigate = useNavigate();
  const engagement = useEngagement(engagementId);
  const setProficiencyTargets = useAppStore((s) => s.setProficiencyTargets);
  const setStepStatus = useAppStore((s) => s.setStepStatus);

  const [rationaleOpen, setRationaleOpen] = useState<string | null>(null);

  const selections = engagement?.competencies ?? [];
  const targets = engagement?.proficiencyTargets ?? [];

  const targetMap = useMemo(() => {
    const m = new Map<string, ProficiencyTarget>();
    targets.forEach((t) => m.set(t.competencyId, t));
    return m;
  }, [targets]);

  // Update step status whenever targets change
  useEffect(() => {
    if (!engagement) return;
    const set = targetMap.size;
    const total = selections.length;
    if (total === 0) {
      setStepStatus(engagement.id, "proficiency", "not_started", undefined);
    } else if (set === 0) {
      setStepStatus(engagement.id, "proficiency", "not_started", undefined);
    } else if (set < total) {
      setStepStatus(engagement.id, "proficiency", "in_progress", `${set} of ${total} competencies set`);
    } else {
      const levelCounts = countLevels(targets);
      const dominant = pickDominantLevel(levelCounts);
      setStepStatus(engagement.id, "proficiency", "complete", `All targets set · L${dominant} dominant`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetMap.size, selections.length]);

  if (!engagement || !engagementId) return null;

  // No competencies selected — bounce back with prompt
  if (selections.length === 0) {
    return (
      <div className="space-y-6">
        <StepPageHeader engagementId={engagementId} stepKey="proficiency" />
        <Card>
          <CardBody className="py-12 text-center">
            <div className="w-14 h-14 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-5">
              <AlertTriangle size={26} />
            </div>
            <h2 className="display-serif text-2xl font-semibold text-navy-700">
              No competencies selected yet
            </h2>
            <p className="text-sm text-ink-500 mt-3 max-w-md mx-auto leading-relaxed">
              Pick competencies in Step 2 first. Once selected, you'll set a target proficiency level
              for each one here.
            </p>
            <Button
              variant="primary"
              onClick={() => navigate(`/engagement/${engagementId}/setup/competencies`)}
              className="mt-6"
            >
              Go to Competencies
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  function setLevel(competencyId: string, level: ProficiencyLevel) {
    if (!engagement) return;
    const existing = targetMap.get(competencyId);
    let next: ProficiencyTarget[];
    if (existing) {
      next = targets.map((t) => t.competencyId === competencyId ? { ...t, targetLevel: level } : t);
    } else {
      next = [...targets, { competencyId, targetLevel: level }];
    }
    setProficiencyTargets(engagement.id, next);
  }

  function setRationale(competencyId: string, rationale: string) {
    if (!engagement) return;
    const next = targets.map((t) =>
      t.competencyId === competencyId ? { ...t, rationale } : t,
    );
    setProficiencyTargets(engagement.id, next);
  }

  function applySuggested() {
    if (!engagement) return;
    const purpose = engagement.basics.purpose;
    if (!purpose) return;
    const suggested = PURPOSE_DEFAULT[purpose];
    const next: ProficiencyTarget[] = selections.map((s) => ({
      competencyId: s.competencyId,
      targetLevel: suggested,
      rationale: targetMap.get(s.competencyId)?.rationale,
    }));
    setProficiencyTargets(engagement.id, next);
  }

  const allSet = targetMap.size === selections.length;
  const purpose = engagement.basics.purpose;
  const suggestedLevel = purpose ? PURPOSE_DEFAULT[purpose] : undefined;

  return (
    <div className="space-y-6">
      <StepPageHeader
        engagementId={engagementId}
        stepKey="proficiency"
        actions={
          suggestedLevel && (
            <Button variant="secondary" onClick={applySuggested}>
              <Wand2 size={13} /> Suggest from purpose
            </Button>
          )
        }
      />

      {/* Why this step matters — short explainer */}
      <Card>
        <CardBody className="bg-ocean-50/30">
          <div className="flex items-start gap-3">
            <Lightbulb size={18} className="text-ocean-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-xs text-ink-700 leading-relaxed">
              <div className="font-semibold text-navy-700 mb-1">How this works</div>
              For each competency, choose the target proficiency level. Observers during scoring will rate
              against the 4 indicators of <strong>that level only</strong>. This is the most consequential
              choice in Setup — it determines what observers look for and what the report will say.
              {suggestedLevel && purpose && (
                <span className="block mt-1.5 text-ocean-700">
                  Based on engagement purpose ({purpose.replace("_", "-")}), default suggestion is{" "}
                  <strong>Level {suggestedLevel}</strong>. Override per competency as needed.
                </span>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Progress band */}
      <div className="bg-white rounded-lg border border-ink-200 px-5 py-3 flex items-center gap-5">
        <div className="flex-1">
          <div className="flex items-center justify-between text-xs text-ink-500 mb-1.5">
            <span>Targets set</span>
            <span className="font-mono">{targetMap.size} of {selections.length}</span>
          </div>
          <div className="h-1 bg-ink-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-ocean-600 transition-all duration-300 rounded-full"
              style={{ width: `${(targetMap.size / Math.max(1, selections.length)) * 100}%` }}
            />
          </div>
        </div>
        <LevelDistribution targets={targets} />
      </div>

      {/* Per-competency target picker */}
      <div className="space-y-4">
        {selections.map((sel) => {
          const c = findCompetency(sel.competencyId, engagement?.customCompetencies);
          if (!c) return null;
          const target = targetMap.get(c.id);
          const isOpen = rationaleOpen === c.id;

          return (
            <Card key={c.id}>
              <CardBody className="space-y-4">
                {/* Competency header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-base font-semibold text-navy-700 display-serif">
                        {c.name}
                      </h4>
                      <Badge tone="neutral">{clusterMeta(c.cluster)?.label}</Badge>
                      {sel.critical && (
                        <Badge tone="amber">Critical</Badge>
                      )}
                      <span className="text-2xs text-ink-500">Weight {sel.weight}x</span>
                    </div>
                    <p className="text-xs text-ink-500 leading-relaxed">{c.definition}</p>
                  </div>
                  {target && (
                    <Badge tone="green">
                      <CheckCircle2 size={11} /> L{target.targetLevel} set
                    </Badge>
                  )}
                </div>

                {/* Three level cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {c.levels.map((lvl) => {
                    const isSelected = target?.targetLevel === lvl.level;
                    const isSuggested = !target && suggestedLevel === lvl.level;
                    return (
                      <button
                        key={lvl.level}
                        type="button"
                        onClick={() => setLevel(c.id, lvl.level)}
                        className={cn(
                          "text-left p-3 rounded-lg border-2 transition-all relative",
                          isSelected
                            ? "border-ocean-500 bg-ocean-50/40 shadow-sm"
                            : "border-ink-200 bg-white hover:border-ink-300 hover:bg-ink-100/30",
                        )}
                      >
                        {isSuggested && (
                          <span className="absolute top-2 right-2 text-2xs font-medium text-ocean-700">
                            Suggested
                          </span>
                        )}
                        <div className="flex items-baseline gap-2 mb-1.5">
                          <span className={cn(
                            "text-xs font-mono font-bold",
                            isSelected ? "text-ocean-700" : "text-ink-500"
                          )}>
                            L{lvl.level}
                          </span>
                          <span className={cn(
                            "text-sm font-semibold",
                            isSelected ? "text-navy-700" : "text-ink-700"
                          )}>
                            {lvl.name}
                          </span>
                          <span className="text-2xs text-ink-500">{lvl.qualifier}</span>
                        </div>
                        <p className="text-2xs text-ink-500 leading-snug mb-3 line-clamp-3">
                          {lvl.description}
                        </p>
                        {/* Indicators */}
                        <div className="space-y-1.5 pt-2 border-t border-ink-100">
                          <div className="text-2xs font-semibold text-ink-500 uppercase tracking-wider">
                            What observers will rate
                          </div>
                          {lvl.indicators.map((ind, i) => (
                            <div key={i} className="text-2xs text-ink-700 leading-snug flex gap-1.5">
                              <span className={cn(
                                "font-mono flex-shrink-0",
                                isSelected ? "text-ocean-700" : "text-ink-400"
                              )}>
                                {i + 1}.
                              </span>
                              <span>{ind}</span>
                            </div>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Rationale (collapsed by default) */}
                {target && (
                  <div className="pt-2 border-t border-ink-100">
                    <button
                      onClick={() => setRationaleOpen(isOpen ? null : c.id)}
                      className="text-2xs font-medium text-ink-500 hover:text-navy-700 inline-flex items-center gap-1.5"
                    >
                      <Target size={11} />
                      {target.rationale ? "Edit rationale" : "Add rationale (optional)"}
                    </button>
                    {isOpen && (
                      <div className="mt-2">
                        <TextArea
                          value={target.rationale ?? ""}
                          onChange={(e) => setRationale(c.id, e.target.value)}
                          placeholder="Why is L{level} the right target here? Useful for future reference and audit."
                          rows={2}
                          className="text-xs"
                        />
                      </div>
                    )}
                  </div>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Footer nav */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="secondary" onClick={() => navigate(`/engagement/${engagementId}/setup/competencies`)}>
          ← Back: Competencies
        </Button>
        <Button
          variant="primary"
          onClick={() => navigate(`/engagement/${engagementId}/setup/tools`)}
          disabled={!allSet}
        >
          Continue to Tools <ArrowRight size={13} />
        </Button>
      </div>
    </div>
  );
}

// ---------- Helpers ----------
function countLevels(targets: ProficiencyTarget[]): Record<ProficiencyLevel, number> {
  const counts: Record<ProficiencyLevel, number> = { 1: 0, 2: 0, 3: 0 };
  targets.forEach((t) => { counts[t.targetLevel]++; });
  return counts;
}

function pickDominantLevel(counts: Record<ProficiencyLevel, number>): ProficiencyLevel {
  let max = 0;
  let dominant: ProficiencyLevel = 2;
  ([1, 2, 3] as ProficiencyLevel[]).forEach((l) => {
    if (counts[l] > max) { max = counts[l]; dominant = l; }
  });
  return dominant;
}

function LevelDistribution({ targets }: { targets: ProficiencyTarget[] }) {
  if (targets.length === 0) return null;
  const counts = countLevels(targets);
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="text-2xs text-ink-500">Distribution:</div>
      {([1, 2, 3] as ProficiencyLevel[]).map((lvl) => (
        <div
          key={lvl}
          className={cn(
            "px-2 py-0.5 rounded-md font-mono text-2xs",
            counts[lvl] > 0 ? "bg-ocean-50 text-ocean-800" : "bg-ink-100 text-ink-400",
          )}
        >
          L{lvl}: {counts[lvl]}
        </div>
      ))}
    </div>
  );
}
