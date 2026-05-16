import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { useEngagement } from "@/lib/store";
import type { StepStatus, StepKey } from "@/types";

interface StepPageHeaderProps {
  engagementId: string;
  stepKey: StepKey;
  actions?: ReactNode;
}

const statusLabel: Record<StepStatus, { label: string; tone: "neutral" | "amber" | "green" }> = {
  not_started: { label: "Not started", tone: "neutral" },
  in_progress: { label: "In progress", tone: "amber" },
  complete: { label: "Complete", tone: "green" },
};

export function StepPageHeader({ engagementId, stepKey, actions }: StepPageHeaderProps) {
  const navigate = useNavigate();
  const engagement = useEngagement(engagementId);
  if (!engagement) return null;

  const step = engagement.setupSteps.find((s) => s.key === stepKey);
  if (!step) return null;

  const status = statusLabel[step.status];

  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate(`/engagement/${engagementId}/setup`)}
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-navy-700 transition-colors"
      >
        <ChevronLeft size={14} /> Back to Setup
      </button>

      <div className="flex items-start justify-between gap-6">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xs font-mono font-semibold text-ocean-700 tracking-wider">
              STEP {String(step.number).padStart(2, "0")} OF 09
            </span>
            <Badge tone={status.tone}>{status.label}</Badge>
          </div>
          <h1 className="display-serif text-4xl font-semibold text-navy-700 tracking-tight leading-tight">
            {step.title}
          </h1>
          <p className="text-base text-ink-500 mt-3 leading-relaxed">
            {step.description}
          </p>
        </div>

        {actions && <div className="flex gap-2 flex-shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
