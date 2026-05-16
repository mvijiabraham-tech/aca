import { useParams, useNavigate } from "react-router-dom";
import {
  FileText, ArrowRight, Lock, Users, User, MessageSquare,
  CheckCircle2, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useEngagement, useAppStore } from "@/lib/store";

export function ReportLanding() {
  const { engagementId } = useParams<{ engagementId: string }>();
  const navigate = useNavigate();
  const engagement = useEngagement(engagementId);
  const markComplete = useAppStore((s) => s.markEngagementComplete);

  if (!engagement) return null;

  const isLocked = engagement.status !== "draft";
  const isCalibrateSignedOff = engagement.calibrate.stage === "complete";

  if (!isLocked) {
    return <LockGate engagementId={engagement.id} kind="not-locked" />;
  }
  if (!isCalibrateSignedOff) {
    return <LockGate engagementId={engagement.id} kind="not-calibrated" />;
  }

  const participants = engagement.participants;
  const sections = engagement.report.sections;
  const feedbackSessions = engagement.report.feedbackSessions;

  // Per-participant section coverage (signed off / total sections)
  const REQUIRED_SECTIONS = ["executiveSummary", "competencyProfile", "developmentAreas", "nextSteps"];
  const signedOffCount = participants.filter((p) => {
    const psSections = sections.filter((s) => s.participantId === p.id && s.status === "signed_off");
    return REQUIRED_SECTIONS.every((key) => psSections.some((s) => s.sectionKey === key));
  }).length;

  const completedFeedback = feedbackSessions.filter((fs) => fs.status === "completed").length;
  const sentHandoffs = feedbackSessions.filter((fs) => fs.handoffSentAt).length;

  const isEngagementComplete = engagement.status === "complete";
  const allDelivered = signedOffCount === participants.length && completedFeedback === participants.length;

  return (
    <div className="space-y-7">
      <div className="max-w-2xl">
        <div className="text-2xs text-ocean-700 uppercase tracking-wider font-semibold mb-2">
          Report · Generate and deliver
        </div>
        <h1 className="display-serif text-[2.25rem] leading-[1.1] font-semibold text-navy-700 tracking-tight">
          {isEngagementComplete ? "All reports delivered." : "Draft, edit, sign off, deliver."}
        </h1>
        <p className="text-base text-ink-500 mt-3 leading-relaxed">
          {isEngagementComplete
            ? "All participants have received feedback and IDP commitments. The engagement is complete."
            : "Three modes — individual reports, group view for talent discussions, and the feedback session capture. AI-drafted prompts available throughout."}
        </p>
      </div>

      {/* Mode cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ModeCard
          icon={User}
          title="Individual reports"
          description="Per-participant draft, edit, and sign-off. AI-drafted sections with evidence panel."
          metric={`${signedOffCount} of ${participants.length} signed off`}
          metricTone={signedOffCount === participants.length ? "green" : "amber"}
          onClick={() => navigate(`/engagement/${engagement.id}/report/individual`)}
          ctaLabel={signedOffCount === 0 ? "Start" : signedOffCount < participants.length ? "Continue" : "Review"}
        />
        <ModeCard
          icon={Users}
          title="Group view"
          description="Cohort radar, bench strength, AI-spotted themes. Useful for talent discussions."
          metric={`${participants.length} participants`}
          metricTone="neutral"
          onClick={() => navigate(`/engagement/${engagement.id}/report/group`)}
          ctaLabel="Open"
        />
        <ModeCard
          icon={MessageSquare}
          title="Feedback sessions"
          description="Per-participant feedback capture and IDP commitments. Triggers activation handoff."
          metric={`${completedFeedback} of ${participants.length} delivered`}
          metricTone={completedFeedback === participants.length ? "green" : "amber"}
          onClick={() => navigate(`/engagement/${engagement.id}/report/feedback`)}
          ctaLabel={completedFeedback === 0 ? "Start" : completedFeedback < participants.length ? "Continue" : "Review"}
        />
      </div>

      {/* Activation handoff band */}
      <Card className={cn(
        sentHandoffs > 0 ? "border-ocean-300/60 bg-ocean-50/20" : "border-ink-200",
      )}>
        <CardBody className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-ocean-100 text-ocean-700 flex items-center justify-center flex-shrink-0">
            <Sparkles size={18} />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-navy-700">
              Activation handoff to Actifyr
            </div>
            <div className="text-2xs text-ink-500 mt-0.5">
              When feedback sessions complete with IDP commitments, the structured payload is sent to Actifyr for behaviour activation.
              {sentHandoffs > 0 && ` ${sentHandoffs} of ${participants.length} handoffs sent.`}
            </div>
          </div>
          <Badge tone={sentHandoffs === participants.length ? "green" : "neutral"}>
            {sentHandoffs}/{participants.length} sent
          </Badge>
        </CardBody>
      </Card>

      {/* Engagement complete band */}
      {!isEngagementComplete && allDelivered && (
        <Card className="border-green-300/60 bg-green-50/30">
          <CardBody className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-green-100 text-green-700 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 size={18} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-navy-700">All delivery complete</div>
              <div className="text-2xs text-ink-500 mt-0.5">
                All reports signed off and all feedback sessions delivered. Mark the engagement complete.
              </div>
            </div>
            <Button variant="primary" onClick={() => markComplete(engagement.id)}>
              Mark engagement complete
            </Button>
          </CardBody>
        </Card>
      )}

      {isEngagementComplete && (
        <Card className="border-green-300/60 bg-green-50/30">
          <CardBody className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-green-100 text-green-700 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <div className="text-sm font-semibold text-navy-700">Engagement complete</div>
              <div className="text-2xs text-ink-500 mt-0.5">
                Completed on {engagement.completedAt
                  ? new Date(engagement.completedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
                  : "—"}
              </div>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function ModeCard({
  icon: Icon, title, description, metric, metricTone, onClick, ctaLabel,
}: {
  icon: typeof FileText;
  title: string;
  description: string;
  metric: string;
  metricTone: "green" | "amber" | "neutral";
  onClick: () => void;
  ctaLabel: string;
}) {
  return (
    <Card interactive>
      <button onClick={onClick} className="w-full text-left p-5">
        <div className="w-10 h-10 rounded-lg bg-ink-100 text-navy-700 flex items-center justify-center mb-3">
          <Icon size={18} />
        </div>
        <h3 className="display-serif text-lg font-semibold text-navy-700 leading-snug">{title}</h3>
        <p className="text-xs text-ink-500 mt-1.5 leading-relaxed min-h-[3em]">{description}</p>
        <div className="mt-4 pt-3 border-t border-ink-100 flex items-center justify-between gap-3">
          <Badge tone={metricTone === "green" ? "green" : metricTone === "amber" ? "amber" : "neutral"}>
            {metric}
          </Badge>
          <span className="text-2xs font-semibold text-ocean-700 flex items-center gap-1">
            {ctaLabel} <ArrowRight size={11} />
          </span>
        </div>
      </button>
    </Card>
  );
}

function LockGate({ engagementId, kind }: { engagementId: string; kind: "not-locked" | "not-calibrated" }) {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <div className="max-w-2xl">
        <div className="text-2xs text-ocean-700 uppercase tracking-wider font-semibold mb-2">
          Report · Generate and deliver
        </div>
        <h1 className="display-serif text-[2.5rem] leading-[1.1] font-semibold text-navy-700 tracking-tight">
          {kind === "not-locked" ? "Setup must be locked first." : "Calibrate must be signed off first."}
        </h1>
        <p className="text-base text-ink-500 mt-3 leading-relaxed">
          {kind === "not-locked"
            ? "Report becomes available once the engagement is locked and scoring + calibration have produced moderated scores."
            : "Reports are drafted from the moderated scores and OARs produced in Calibrate. Sign off Calibrate to unlock Report."}
        </p>
      </div>

      <Card>
        <CardBody className="py-12">
          <div className="max-w-md mx-auto text-center">
            <div className="w-14 h-14 rounded-xl bg-ink-100 text-ink-400 flex items-center justify-center mx-auto mb-5">
              <Lock size={26} />
            </div>
            <h2 className="display-serif text-2xl font-semibold text-navy-700">Report is locked</h2>
            <div className="mt-6">
              <Button
                variant="primary"
                onClick={() => navigate(`/engagement/${engagementId}/${kind === "not-locked" ? "setup" : "calibrate"}`)}
              >
                {kind === "not-locked" ? "Go to Setup" : "Go to Calibrate"}
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
