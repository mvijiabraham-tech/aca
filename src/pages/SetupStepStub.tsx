import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Wrench } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useEngagement } from "@/lib/store";
import type { StepKey } from "@/types";

export function SetupStepStub() {
  const navigate = useNavigate();
  const { engagementId, stepKey } = useParams<{ engagementId: string; stepKey: StepKey }>();
  const engagement = useEngagement(engagementId);

  if (!engagement) return null;

  const step = engagement.setupSteps.find((s) => s.key === stepKey);

  if (!step) {
    return (
      <div>
        <div className="text-sm text-ink-500">Unknown step.</div>
        <Button
          variant="secondary"
          onClick={() => navigate(`/engagement/${engagement.id}/setup`)}
          className="mt-4"
        >
          <ChevronLeft size={14} /> Back to Setup
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate(`/engagement/${engagement.id}/setup`)}
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
            <Badge tone="neutral">
              {step.status === "complete" ? "Complete" : step.status === "in_progress" ? "In progress" : "Not started"}
            </Badge>
          </div>
          <h1 className="display-serif text-4xl font-semibold text-navy-700 tracking-tight leading-tight">
            {step.title}
          </h1>
          <p className="text-base text-ink-500 mt-3 leading-relaxed">
            {step.description}
          </p>
        </div>
      </div>

      <Card>
        <CardBody className="py-12">
          <div className="max-w-lg mx-auto text-center">
            <div className="w-14 h-14 rounded-xl bg-ink-100 text-ink-400 flex items-center justify-center mx-auto mb-5">
              <Wrench size={26} />
            </div>
            <h2 className="display-serif text-2xl font-semibold text-navy-700">
              Unknown step
            </h2>
            <p className="text-sm text-ink-500 mt-3 leading-relaxed">
              This step key isn't recognised. All nine setup steps should route to a real page.
              If you got here, something has gone wrong with navigation.
            </p>
            <div className="mt-6 inline-flex items-center gap-1.5 text-2xs text-ink-500 px-3 py-1.5 rounded-md bg-ink-100">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Fallback page
            </div>
            <div className="mt-7">
              <Button
                variant="primary"
                onClick={() => navigate(`/engagement/${engagement.id}/setup`)}
              >
                <ChevronLeft size={13} /> Back to Setup dashboard
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
