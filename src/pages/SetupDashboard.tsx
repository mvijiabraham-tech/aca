import { useNavigate, useParams } from "react-router-dom";
import {
  CheckCircle2, Circle, Clock3, Sparkles, Lock, ArrowRight,
  Layers, Target, Wrench, Calculator, Users, UserCheck,
  CalendarDays, FileText, Building2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useEngagement } from "@/lib/store";
import type { SetupStep, StepStatus, StepKey } from "@/types";

const stepIcons: Record<StepKey, typeof Building2> = {
  engagement: Building2,
  competencies: Layers,
  proficiency: Target,
  tools: Wrench,
  aggregation: Calculator,
  assessors: UserCheck,
  participants: Users,
  schedule: CalendarDays,
  report: FileText,
};

export function SetupDashboard() {
  const { engagementId } = useParams<{ engagementId: string }>();
  const engagement = useEngagement(engagementId);
  const navigate = useNavigate();

  if (!engagement) return null;

  const completedSteps = engagement.setupSteps.filter((s) => s.status === "complete").length;
  const totalSteps = engagement.setupSteps.length;
  const progressPct = (completedSteps / totalSteps) * 100;
  const isLockReady = completedSteps === totalSteps;
  const isLocked = engagement.status !== "draft";
  const missingSteps = engagement.setupSteps.filter((s) => s.status !== "complete");

  return (
    <div className="space-y-8">
      {/* Header band */}
      <div className="flex items-start justify-between gap-6">
        <div className="max-w-2xl">
          <div className="text-2xs text-ocean-700 uppercase tracking-wider font-semibold mb-2">
            Set Up · Configure the engagement
          </div>
          <h1 className="display-serif text-[2.25rem] leading-[1.1] font-semibold text-navy-700 tracking-tight">
            {isLocked
              ? "Setup locked. View configuration."
              : "Get this engagement ready to score."}
          </h1>
          <p className="text-base text-ink-500 mt-3 leading-relaxed">
            {isLocked
              ? "This engagement has been locked and scoring is underway. You can review setup but most edits are restricted."
              : "Nine steps, in dependency order. Each step saves automatically. Complete all nine to lock the engagement and unlock scoring."}
          </p>
        </div>

        {!isLocked && (
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <Button variant="secondary" onClick={() => navigate(`/engagement/${engagement.id}/setup/wizard`)}>
              <Sparkles size={14} /> Use guided setup
            </Button>
            <div className="text-2xs text-ink-500 max-w-[180px] text-right leading-snug">
              Step-by-step wizard with progress bar and Next / Previous navigation
            </div>
          </div>
        )}
      </div>

      {/* Progress + Lock band */}
      <div className="bg-white rounded-xl border border-ink-200 shadow-card">
        <div className="flex items-stretch divide-x divide-ink-200">
          <div className="flex-1 p-5">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-2xs text-ink-500 uppercase tracking-wider font-medium">
                  Setup progress
                </div>
                <div className="text-sm font-semibold text-navy-700 mt-0.5">
                  {completedSteps} of {totalSteps} steps complete
                </div>
              </div>
              <div className="font-mono text-2xl font-semibold text-navy-700">
                {Math.round(progressPct)}<span className="text-base text-ink-500">%</span>
              </div>
            </div>
            <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-ocean-600 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <div className="w-[360px] p-5 bg-ink-100/40 flex items-center gap-4">
            <div className="flex-1">
              <div className="text-2xs text-ink-500 uppercase tracking-wider font-medium">
                {isLocked ? "Status" : "Ready to score?"}
              </div>
              <div className="text-xs text-ink-700 mt-0.5 leading-snug">
                {isLocked
                  ? "Locked. Scoring is underway."
                  : isLockReady
                  ? "All steps complete. Lock to start scoring."
                  : `${missingSteps.length} step${missingSteps.length === 1 ? "" : "s"} still need attention.`}
              </div>
            </div>
            {!isLocked && (
              <Button
                variant="primary"
                disabled={!isLockReady}
                size="md"
                onClick={() => navigate(`/engagement/${engagement.id}/setup/lock`)}
              >
                <Lock size={13} />
                Lock & start
              </Button>
            )}
            {isLocked && (
              <Badge tone="green">
                <Lock size={11} /> Locked
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-baseline justify-between">
        <h2 className="display-serif text-xl font-semibold text-navy-700">
          Setup steps
        </h2>
        <span className="text-2xs text-ink-500 font-medium uppercase tracking-wider">
          Click any card to open
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {engagement.setupSteps.map((step) => (
          <StepCard
            key={step.key}
            step={step}
            onOpen={() => navigate(`/engagement/${engagement.id}/setup/${step.key}`)}
          />
        ))}
      </div>
    </div>
  );
}

function StepCard({ step, onOpen }: { step: SetupStep; onOpen: () => void }) {
  const Icon = stepIcons[step.key];

  return (
    <Card
      interactive
      className={cn(
        "group cursor-pointer relative overflow-hidden",
        step.status === "complete" && "border-green-300/60",
      )}
    >
      <button onClick={onOpen} className="w-full text-left">
        <div
          className={cn(
            "absolute left-0 top-0 bottom-0 w-1",
            step.status === "complete" && "bg-green-500",
            step.status === "in_progress" && "bg-amber-500",
            step.status === "not_started" && "bg-ink-200",
          )}
        />

        <div className="p-5 pl-6">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-ink-100 text-ink-500 flex items-center justify-center">
                <Icon size={14} />
              </div>
              <div className="text-2xs font-mono font-semibold text-ink-400">
                STEP {String(step.number).padStart(2, "0")}
              </div>
            </div>
            <StatusBadge status={step.status} />
          </div>

          <h3 className="display-serif text-lg font-semibold text-navy-700 leading-snug">
            {step.title}
          </h3>

          <p className="text-xs text-ink-500 mt-1.5 leading-relaxed min-h-[2.5em]">
            {step.description}
          </p>

          <div className="mt-4 pt-3 border-t border-ink-100 flex items-center justify-between gap-3">
            <div className="text-2xs text-ink-700 truncate">
              {step.summary ?? (
                <span className="text-ink-400">Not started yet</span>
              )}
            </div>
            <span className="text-2xs font-semibold text-ocean-700 flex items-center gap-1 flex-shrink-0 group-hover:gap-1.5 transition-all">
              {step.status === "complete" && "Review"}
              {step.status === "in_progress" && "Continue"}
              {step.status === "not_started" && "Start"}
              <ArrowRight size={11} />
            </span>
          </div>
        </div>
      </button>
    </Card>
  );
}

function StatusBadge({ status }: { status: StepStatus }) {
  if (status === "complete") {
    return <Badge tone="green"><CheckCircle2 size={10} /> Complete</Badge>;
  }
  if (status === "in_progress") {
    return <Badge tone="amber"><Clock3 size={10} /> In progress</Badge>;
  }
  return <Badge tone="neutral"><Circle size={10} /> Not started</Badge>;
}
