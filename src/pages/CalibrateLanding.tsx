import { useParams, useNavigate } from "react-router-dom";
import {
  Scale, ArrowRight, Lock, CheckCircle2, AlertCircle,
  Users, Layers, Award, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useEngagement } from "@/lib/store";
import {
  isCalibrateAvailable, scoringCoveragePct, CALIBRATE_READY_THRESHOLD,
  disagreementSpread,
} from "@/lib/calibrate";

export function CalibrateLanding() {
  const { engagementId } = useParams<{ engagementId: string }>();
  const navigate = useNavigate();
  const engagement = useEngagement(engagementId);

  if (!engagement) return null;

  const isLocked = engagement.status !== "draft";
  if (!isLocked) {
    return <LockGate engagementId={engagement.id} kind="not-locked" />;
  }
  if (!isCalibrateAvailable(engagement)) {
    return <LockGate engagementId={engagement.id} kind="no-scoring" />;
  }

  const coverage = scoringCoveragePct(engagement);
  const isReady = coverage >= CALIBRATE_READY_THRESHOLD;
  const isSignedOff = engagement.calibrate.stage === "complete";

  // Compute disagreement summary
  const participants = engagement.participants;
  const competencies = engagement.competencies;
  let totalCells = 0;
  let amberCells = 0;
  let redCells = 0;
  participants.forEach((p) => {
    competencies.forEach((c) => {
      const spread = disagreementSpread(engagement, p.id, c.competencyId);
      if (spread === null) return;
      totalCells++;
      if (spread > 1.5) redCells++;
      else if (spread > 1.0) amberCells++;
    });
  });

  const moderatedCount = engagement.calibrate.moderatedScores.length;
  const oarCount = engagement.calibrate.oars.length;

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="max-w-2xl">
        <div className="text-2xs text-ocean-700 uppercase tracking-wider font-semibold mb-2">
          Calibrate · Reconcile, moderate, set the verdict
        </div>
        <h1 className="display-serif text-[2.25rem] leading-[1.1] font-semibold text-navy-700 tracking-tight">
          {isSignedOff ? "Calibrate complete." : "Bring observer scores into one view."}
        </h1>
        <p className="text-base text-ink-500 mt-3 leading-relaxed">
          {isSignedOff
            ? "Calibration was signed off. The moderated scores and OARs feed the Report destination."
            : "Three stages in sequence. Reconcile observer disagreement, moderate per participant, then confirm Overall Assessment Ratings. Sign-off unlocks Report."}
        </p>
      </div>

      {/* Coverage band */}
      {!isSignedOff && (
        <Card>
          <CardBody>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="text-2xs uppercase tracking-wider font-semibold text-ink-500 mb-1">
                  Scoring coverage
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-2xl font-semibold text-navy-700">
                    {Math.round(coverage)}<span className="text-base text-ink-500">%</span>
                  </span>
                  <span className="text-xs text-ink-500">
                    of participant × competency cells have at least one observer score
                  </span>
                </div>
                <div className="mt-2 h-1.5 bg-ink-100 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      isReady ? "bg-green-500" : "bg-amber-500",
                    )}
                    style={{ width: `${coverage}%` }}
                  />
                </div>
              </div>
              <Badge tone={isReady ? "green" : "amber"}>
                {isReady ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
                {isReady ? "Ready" : `Below ${CALIBRATE_READY_THRESHOLD}%`}
              </Badge>
            </div>
            {!isReady && (
              <div className="mt-3 text-2xs text-ink-500 leading-relaxed">
                Calibration becomes most effective once scoring is largely complete. You can start working
                with what's available, but expect to revisit cells as more observer scores come in.
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Stage cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StageCard
          stage={1}
          icon={Layers}
          title="Reconcile"
          description="Heatmap of observer disagreement. Drill into flagged cells and moderate with rationale."
          metric={`${redCells + amberCells} of ${totalCells} cells flagged`}
          metricTone={(redCells + amberCells) === 0 ? "green" : "amber"}
          ctaLabel={moderatedCount === 0 ? "Start" : `${moderatedCount} moderated`}
          onClick={() => navigate(`/engagement/${engagement.id}/calibrate/reconcile`)}
          isSignedOff={isSignedOff}
        />
        <StageCard
          stage={2}
          icon={Users}
          title="Moderate"
          description="Per-participant review. Lead Assessor confirms or overrides each competency score with rationale."
          metric={`${moderatedCount} score${moderatedCount === 1 ? "" : "s"} overridden`}
          metricTone="neutral"
          ctaLabel="Open"
          onClick={() => navigate(`/engagement/${engagement.id}/calibrate/moderate`)}
          isSignedOff={isSignedOff}
        />
        <StageCard
          stage={3}
          icon={Award}
          title="Set OARs"
          description="Per participant, confirm the Overall Assessment Rating band. Computed from moderated scores."
          metric={`${oarCount} of ${participants.length} confirmed`}
          metricTone={oarCount === participants.length ? "green" : "amber"}
          ctaLabel="Open"
          onClick={() => navigate(`/engagement/${engagement.id}/calibrate/oar`)}
          isSignedOff={isSignedOff}
        />
      </div>

      {/* Sign-off band */}
      {isSignedOff ? (
        <Card className="border-green-300/60 bg-green-50/30">
          <CardBody className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-green-100 text-green-700 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 size={18} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-navy-700">Calibrate signed off</div>
              <div className="text-2xs text-ink-500 mt-0.5">
                Signed off on {engagement.calibrate.signedOffAt
                  ? new Date(engagement.calibrate.signedOffAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
                  : "—"}. Report is unlocked.
              </div>
            </div>
            <Button variant="primary" onClick={() => navigate(`/engagement/${engagement.id}/report`)}>
              Go to Report <ArrowRight size={13} />
            </Button>
          </CardBody>
        </Card>
      ) : (
        <Card className="border-ocean-300/60 bg-ocean-50/30">
          <CardBody className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-ocean-100 text-ocean-700 flex items-center justify-center flex-shrink-0">
              <Sparkles size={18} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-navy-700">Sign-off when ready</div>
              <div className="text-2xs text-ink-500 mt-0.5">
                Sign-off lives at the end of stage 3. Once you've confirmed all OARs, the Sign off button there
                locks Calibrate and unlocks Report.
              </div>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

// ---------- StageCard ----------
function StageCard({
  stage, icon: Icon, title, description, metric, metricTone, ctaLabel, onClick, isSignedOff,
}: {
  stage: number;
  icon: typeof Scale;
  title: string;
  description: string;
  metric: string;
  metricTone: "green" | "amber" | "neutral";
  ctaLabel: string;
  onClick: () => void;
  isSignedOff: boolean;
}) {
  return (
    <Card interactive className="overflow-hidden">
      <button onClick={onClick} className="w-full text-left p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-ink-100 text-navy-700 flex items-center justify-center flex-shrink-0">
            <Icon size={18} />
          </div>
          <div>
            <div className="text-2xs font-mono font-semibold text-ink-400">STAGE {stage}</div>
            <h3 className="display-serif text-lg font-semibold text-navy-700 leading-snug">{title}</h3>
          </div>
        </div>
        <p className="text-xs text-ink-500 leading-relaxed min-h-[3em]">{description}</p>
        <div className="mt-4 pt-3 border-t border-ink-100 flex items-center justify-between gap-3">
          <Badge tone={metricTone === "green" ? "green" : metricTone === "amber" ? "amber" : "neutral"}>
            {metric}
          </Badge>
          <span className="text-2xs font-semibold text-ocean-700 flex items-center gap-1">
            {isSignedOff ? "Review" : ctaLabel} <ArrowRight size={11} />
          </span>
        </div>
      </button>
    </Card>
  );
}

// ---------- LockGate ----------
function LockGate({ engagementId, kind }: { engagementId: string; kind: "not-locked" | "no-scoring" }) {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <div className="max-w-2xl">
        <div className="text-2xs text-ocean-700 uppercase tracking-wider font-semibold mb-2">
          Calibrate · Reconcile, moderate, set the verdict
        </div>
        <h1 className="display-serif text-[2.5rem] leading-[1.1] font-semibold text-navy-700 tracking-tight">
          {kind === "not-locked" ? "Setup must be locked first." : "Scoring needed first."}
        </h1>
        <p className="text-base text-ink-500 mt-3 leading-relaxed">
          {kind === "not-locked"
            ? "Calibration becomes available once the engagement is locked and observers have started scoring."
            : "Calibration needs at least some observer scoring data to work with. Open Score to begin rating participants."}
        </p>
      </div>

      <Card>
        <CardBody className="py-12">
          <div className="max-w-md mx-auto text-center">
            <div className="w-14 h-14 rounded-xl bg-ink-100 text-ink-400 flex items-center justify-center mx-auto mb-5">
              <Lock size={26} />
            </div>
            <h2 className="display-serif text-2xl font-semibold text-navy-700">
              Calibrate is locked
            </h2>
            <div className="mt-6">
              <Button
                variant="primary"
                onClick={() => navigate(`/engagement/${engagementId}/${kind === "not-locked" ? "setup" : "score"}`)}
              >
                {kind === "not-locked" ? "Go to Setup" : "Go to Score"}
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
