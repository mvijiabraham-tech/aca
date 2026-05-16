import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft, ArrowRight, X, CheckCircle2, Circle, Clock3 } from "lucide-react";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useEngagement } from "@/lib/store";
import type { StepKey } from "@/types";

// Import all step content components
import { StepEngagementBasics } from "@/pages/steps/StepEngagementBasics";
import { StepCompetencies } from "@/pages/steps/StepCompetencies";
import { StepProficiencyTargets } from "@/pages/steps/StepProficiencyTargets";
import { StepTools } from "@/pages/steps/StepTools";
import { StepAggregationRules } from "@/pages/steps/StepAggregationRules";
import { StepAssessors } from "@/pages/steps/StepAssessors";
import { StepParticipants } from "@/pages/steps/StepParticipants";
import { StepSchedule } from "@/pages/steps/StepSchedule";
import { StepReportFormat } from "@/pages/steps/StepReportFormat";

const WIZARD_STEPS: { key: StepKey; component: React.ComponentType; title: string }[] = [
  { key: "engagement",   component: StepEngagementBasics,    title: "Engagement basics" },
  { key: "competencies", component: StepCompetencies,        title: "Competencies" },
  { key: "proficiency",  component: StepProficiencyTargets,  title: "Proficiency targets" },
  { key: "tools",        component: StepTools,               title: "Tools" },
  { key: "aggregation",  component: StepAggregationRules,    title: "Aggregation rules" },
  { key: "assessors",    component: StepAssessors,           title: "Assessors" },
  { key: "participants", component: StepParticipants,        title: "Participants" },
  { key: "schedule",     component: StepSchedule,            title: "Schedule" },
  { key: "report",       component: StepReportFormat,        title: "Report format" },
];

export function SetupWizard() {
  const { engagementId } = useParams<{ engagementId: string }>();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const engagement = useEngagement(engagementId);

  const currentStepKey = (params.get("step") as StepKey | null) ?? "engagement";
  const currentIdx = WIZARD_STEPS.findIndex((s) => s.key === currentStepKey);
  const safeIdx = currentIdx === -1 ? 0 : currentIdx;
  const current = WIZARD_STEPS[safeIdx];

  // Track keyboard nav — left/right arrow keys
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight" && safeIdx < WIZARD_STEPS.length - 1) goNext();
      if (e.key === "ArrowLeft" && safeIdx > 0) goPrev();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeIdx]);

  if (!engagement || !engagementId) return null;

  function goTo(stepKey: StepKey) {
    setParams({ step: stepKey });
  }
  function goNext() {
    if (safeIdx < WIZARD_STEPS.length - 1) goTo(WIZARD_STEPS[safeIdx + 1].key);
  }
  function goPrev() {
    if (safeIdx > 0) goTo(WIZARD_STEPS[safeIdx - 1].key);
  }
  function exitWizard() {
    navigate(`/engagement/${engagement!.id}/setup`);
  }

  const StepComponent = current.component;
  const completedSteps = engagement.setupSteps.filter((s) => s.status === "complete").length;

  return (
    <div className="space-y-6">
      {/* Wizard chrome - progress + exit */}
      <Card>
        <div className="px-5 py-3 border-b border-ink-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="text-2xs uppercase tracking-wider font-semibold text-ocean-700">
              Guided Setup
            </div>
            <span className="text-2xs text-ink-400">·</span>
            <span className="text-2xs text-ink-500">
              Step {safeIdx + 1} of {WIZARD_STEPS.length} · {completedSteps} complete
            </span>
          </div>
          <button
            onClick={exitWizard}
            className="inline-flex items-center gap-1.5 text-2xs font-medium text-ink-500 hover:text-navy-700 transition-colors"
          >
            Exit wizard <X size={11} />
          </button>
        </div>

        {/* Step pip indicators */}
        <div className="px-5 py-3 bg-ink-100/30">
          <div className="flex items-center gap-1">
            {WIZARD_STEPS.map((s, i) => {
              const status = engagement.setupSteps.find((x) => x.key === s.key)?.status ?? "not_started";
              const isCurrent = i === safeIdx;
              const isReachable = i <= safeIdx + 1; // can always go back, can step forward by one
              return (
                <button
                  key={s.key}
                  onClick={() => isReachable && goTo(s.key)}
                  disabled={!isReachable}
                  className={cn(
                    "flex-1 group flex flex-col items-center gap-1 px-1 py-1 rounded transition-colors",
                    isReachable && "hover:bg-white",
                  )}
                  title={s.title}
                >
                  <div className={cn(
                    "w-full h-1 rounded-full",
                    isCurrent ? "bg-ocean-600" :
                    status === "complete" ? "bg-green-500" :
                    status === "in_progress" ? "bg-amber-500" :
                    "bg-ink-200",
                  )} />
                  <div className="flex items-center gap-1">
                    {status === "complete" ? (
                      <CheckCircle2 size={9} className="text-green-600" />
                    ) : status === "in_progress" ? (
                      <Clock3 size={9} className="text-amber-600" />
                    ) : (
                      <Circle size={9} className="text-ink-300" />
                    )}
                    <span className={cn(
                      "text-2xs font-medium leading-none",
                      isCurrent ? "text-navy-700" : "text-ink-500",
                    )}>
                      {i + 1}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* The actual step page (re-using existing components) */}
      <div key={current.key /* force unmount/remount on step change to reset internal state */}>
        <StepComponent />
      </div>

      {/* Wizard footer nav */}
      <Card>
        <div className="p-4 flex items-center justify-between">
          <Button variant="secondary" onClick={goPrev} disabled={safeIdx === 0}>
            <ArrowLeft size={13} /> Previous
          </Button>
          <div className="text-2xs text-ink-500">
            ← → arrow keys to navigate
          </div>
          {safeIdx < WIZARD_STEPS.length - 1 ? (
            <Button variant="primary" onClick={goNext}>
              Next: {WIZARD_STEPS[safeIdx + 1].title} <ArrowRight size={13} />
            </Button>
          ) : (
            <Button variant="primary" onClick={() => navigate(`/engagement/${engagement.id}/setup/lock`)}>
              Review & lock <ArrowRight size={13} />
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
