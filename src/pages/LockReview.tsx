import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  Lock, CheckCircle2, AlertTriangle, ChevronLeft, ArrowRight,
  Building2, Layers, Target, Wrench, Calculator, UserCheck,
  Users, CalendarDays, FileText,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useEngagement, useAppStore } from "@/lib/store";
import { findCompetency } from "@/mocks/dictionary";
import type { StepKey } from "@/types";

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

export function LockReview() {
  const { engagementId } = useParams<{ engagementId: string }>();
  const navigate = useNavigate();
  const engagement = useEngagement(engagementId);
  const lockEngagement = useAppStore((s) => s.lockEngagement);

  const [confirming, setConfirming] = useState(false);

  if (!engagement || !engagementId) return null;

  const incompleteSteps = engagement.setupSteps.filter((s) => s.status !== "complete");
  const canLock = incompleteSteps.length === 0 && engagement.status === "draft";

  function handleLock() {
    if (!engagement) return;
    lockEngagement(engagement.id);
    // Navigate to Score destination after lock
    setTimeout(() => navigate(`/engagement/${engagement.id}/score`), 300);
  }

  // Already locked
  if (engagement.status !== "draft") {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate(`/engagement/${engagement.id}/setup`)}
          className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-navy-700 transition-colors"
        >
          <ChevronLeft size={14} /> Back to Setup
        </button>

        <Card>
          <CardBody className="py-12">
            <div className="max-w-lg mx-auto text-center">
              <div className="w-14 h-14 rounded-xl bg-green-50 text-green-700 flex items-center justify-center mx-auto mb-5">
                <Lock size={26} />
              </div>
              <h2 className="display-serif text-2xl font-semibold text-navy-700">
                Engagement already locked
              </h2>
              <p className="text-sm text-ink-500 mt-3 leading-relaxed">
                This engagement was locked on {new Date(engagement.lockedAt ?? "").toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}.
                {engagement.status === "live" ? " Scoring is underway." : " The engagement has been delivered."}
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <button
        onClick={() => navigate(`/engagement/${engagement.id}/setup`)}
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-navy-700 transition-colors"
      >
        <ChevronLeft size={14} /> Back to Setup
      </button>

      {/* Header */}
      <div className="max-w-2xl">
        <div className="text-2xs text-ocean-700 uppercase tracking-wider font-semibold mb-2">
          Lock review
        </div>
        <h1 className="display-serif text-[2.25rem] leading-[1.1] font-semibold text-navy-700 tracking-tight">
          Ready to lock and start scoring?
        </h1>
        <p className="text-base text-ink-500 mt-3 leading-relaxed">
          Once locked, the configuration below is frozen for the engagement. Scoring opens, and most setup edits become restricted.
          Review every section carefully — changes after lock require an amendment.
        </p>
      </div>

      {/* Gate band */}
      <Card className={cn(canLock ? "border-green-300/60 bg-green-50/30" : "border-amber-300/60 bg-amber-50/30")}>
        <CardBody className="py-4">
          <div className="flex items-center gap-4">
            {canLock ? (
              <>
                <div className="w-10 h-10 rounded-lg bg-green-100 text-green-700 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 size={18} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-navy-700">All 9 steps complete</div>
                  <div className="text-2xs text-ink-500 mt-0.5">You can lock this engagement and unlock the Score destination.</div>
                </div>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={18} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-navy-700">
                    {incompleteSteps.length} step{incompleteSteps.length === 1 ? "" : "s"} still needs attention
                  </div>
                  <div className="text-2xs text-ink-500 mt-0.5">
                    Complete all 9 setup steps before locking. Missing:{" "}
                    {incompleteSteps.map((s) => s.title).join(", ")}
                  </div>
                </div>
              </>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Per-step summary */}
      <div className="space-y-3">
        <h2 className="display-serif text-lg font-semibold text-navy-700">Configuration summary</h2>

        {/* Step 1 - Basics */}
        <ReviewSection number={1} title="Engagement basics" stepKey="engagement" engagementId={engagementId}>
          <Row label="Client">{engagement.basics.client}</Row>
          <Row label="Audience">{engagement.basics.audience || "—"}</Row>
          <Row label="Purpose">{purposeLabel(engagement.basics.purpose)}</Row>
          <Row label="Objective">{engagement.basics.objective || "—"}</Row>
          <Row label="Cohort size">{engagement.basics.cohortSize ?? "—"}</Row>
          <Row label="Dates">{engagement.basics.acDateRange || `${engagement.basics.startDate} → ${engagement.basics.endDate}`}</Row>
          <Row label="Mode">{(engagement.basics.mode || "").replace("_", "-")}</Row>
          <Row label="Lead">{engagement.basics.synovateEngagementLead}</Row>
        </ReviewSection>

        {/* Step 2 - Competencies */}
        <ReviewSection number={2} title="Competencies" stepKey="competencies" engagementId={engagementId}>
          <div className="text-2xs text-ink-500 mb-2">{engagement.competencies.length} competencies selected</div>
          <div className="space-y-1.5">
            {engagement.competencies.map((sel) => {
              const c = findCompetency(sel.competencyId);
              if (!c) return null;
              return (
                <div key={sel.competencyId} className="flex items-center gap-2 text-xs">
                  <span className="font-mono text-2xs text-ink-400 w-12">×{sel.weight.toFixed(1)}</span>
                  <span className="text-navy-700 flex-1">{c.name}</span>
                  {sel.critical && <Badge tone="amber">Critical</Badge>}
                </div>
              );
            })}
          </div>
        </ReviewSection>

        {/* Step 3 - Proficiency */}
        <ReviewSection number={3} title="Proficiency targets" stepKey="proficiency" engagementId={engagementId}>
          <div className="space-y-1.5">
            {engagement.proficiencyTargets.map((t) => {
              const c = findCompetency(t.competencyId);
              if (!c) return null;
              return (
                <div key={t.competencyId} className="flex items-center gap-2 text-xs">
                  <Badge tone="ocean">L{t.targetLevel}</Badge>
                  <span className="text-navy-700 flex-1 truncate">{c.name}</span>
                </div>
              );
            })}
          </div>
        </ReviewSection>

        {/* Step 4 - Tools */}
        <ReviewSection number={4} title="Tools" stepKey="tools" engagementId={engagementId}>
          <div className="space-y-1.5">
            {engagement.tools.map((t) => (
              <div key={t.id} className="flex items-center gap-2 text-xs">
                <span className="text-navy-700 flex-1 truncate">{t.name}</span>
                <span className="text-2xs text-ink-500">{t.durationMinutes}m</span>
                <span className="text-2xs text-ink-400">·</span>
                <span className="text-2xs text-ink-500">{t.competencyIds.length} comp</span>
              </div>
            ))}
          </div>
        </ReviewSection>

        {/* Step 5 - Aggregation */}
        <ReviewSection number={5} title="Aggregation rules" stepKey="aggregation" engagementId={engagementId}>
          <Row label="Indicator method">{engagement.aggregation.indicatorMethod}</Row>
          <Row label="Tool method">{engagement.aggregation.toolMethod}</Row>
          <Row label="OAR method">{engagement.aggregation.oarMethod}</Row>
          <Row label="Min indicators">{engagement.aggregation.minIndicatorsRated}</Row>
          <Row label="Min tools">{engagement.aggregation.minToolsRated}</Row>
          <Row label="Bands">{engagement.aggregation.oarThresholds.map((t) => t.toFixed(2)).join(" / ")}</Row>
        </ReviewSection>

        {/* Step 6 - Assessors */}
        <ReviewSection number={6} title="Assessors" stepKey="assessors" engagementId={engagementId}>
          <div className="space-y-1.5">
            {engagement.assessors.map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-xs">
                <Badge tone={a.role === "lead" ? "navy" : a.role === "assessor" ? "ocean" : "neutral"}>
                  {a.role === "lead" ? "Lead" : a.role === "assessor" ? "Assessor" : "Observer"}
                </Badge>
                <span className="text-navy-700 flex-1 truncate">{a.name}</span>
                <span className="text-2xs text-ink-500">{a.assignedToolIds.length} tools</span>
              </div>
            ))}
          </div>
        </ReviewSection>

        {/* Step 7 - Participants */}
        <ReviewSection number={7} title="Participants" stepKey="participants" engagementId={engagementId}>
          <div className="text-2xs text-ink-500 mb-2">
            {engagement.participants.length} participants
            {engagement.basics.cohortSize ? ` (${engagement.basics.cohortSize} expected)` : ""}
          </div>
          <div className="grid grid-cols-2 gap-1">
            {engagement.participants.map((p) => (
              <div key={p.id} className="text-xs text-navy-700 truncate">
                {p.name} <span className="text-2xs text-ink-400">{p.employeeId ?? ""}</span>
              </div>
            ))}
          </div>
        </ReviewSection>

        {/* Step 8 - Schedule */}
        <ReviewSection number={8} title="Schedule" stepKey="schedule" engagementId={engagementId}>
          <Row label="Total slots">{engagement.schedule.length}</Row>
          <Row label="Days">{new Set(engagement.schedule.map((s) => s.day)).size}</Row>
          <Row label="Date range">{engagement.basics.acDateRange || "—"}</Row>
        </ReviewSection>

        {/* Step 9 - Report */}
        <ReviewSection number={9} title="Report format" stepKey="report" engagementId={engagementId}>
          <Row label="Sections">
            {Object.entries(engagement.reportFormat.sections).filter(([, v]) => v).length} enabled
          </Row>
          <Row label="Branding">
            {engagement.reportFormat.branding.coBranded ? `Co-branded with ${engagement.basics.client}` : "Synovate only"}
          </Row>
          <Row label="Output">
            {[
              engagement.reportFormat.outputFormats.pdf && "PDF",
              engagement.reportFormat.outputFormats.pptx && "PPTX",
            ].filter(Boolean).join(" + ") || "None"}
          </Row>
        </ReviewSection>
      </div>

      {/* Lock action */}
      <Card className={cn("mt-6", canLock ? "border-navy-200" : "border-ink-200 opacity-70")}>
        <CardBody className="py-5">
          {!confirming ? (
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-navy-700 text-white flex items-center justify-center flex-shrink-0">
                <Lock size={20} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-navy-700">Lock engagement</div>
                <div className="text-2xs text-ink-500 mt-0.5">
                  Freezes configuration, opens scoring. The engagement status flips to Live.
                </div>
              </div>
              <Button
                variant="primary"
                disabled={!canLock}
                onClick={() => setConfirming(true)}
              >
                <Lock size={13} /> Lock & start scoring
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-navy-700">Confirm lock?</div>
                <div className="text-2xs text-ink-500 mt-0.5">
                  This action is reversible only via an explicit amendment. All scoring will use this configuration.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={() => setConfirming(false)}>Cancel</Button>
                <Button variant="primary" onClick={handleLock}>
                  Yes, lock now <ArrowRight size={13} />
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

// ---------- Helpers ----------
function ReviewSection({
  number, title, stepKey, engagementId, children,
}: {
  number: number; title: string; stepKey: StepKey; engagementId: string; children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const Icon = stepIcons[stepKey];
  return (
    <Card>
      <div className="px-5 py-3 border-b border-ink-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-ink-100 text-ink-500 flex items-center justify-center">
            <Icon size={13} />
          </div>
          <div>
            <div className="text-2xs font-mono font-semibold text-ink-400">STEP {String(number).padStart(2, "0")}</div>
            <h3 className="text-sm font-semibold text-navy-700 leading-tight">{title}</h3>
          </div>
        </div>
        <button
          onClick={() => navigate(`/engagement/${engagementId}/setup/${stepKey}`)}
          className="text-2xs font-medium text-ocean-700 hover:text-ocean-800"
        >
          Edit
        </button>
      </div>
      <CardBody className="py-3 space-y-1">
        {children}
      </CardBody>
    </Card>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3 text-xs">
      <span className="text-2xs text-ink-500 w-32 flex-shrink-0">{label}</span>
      <span className="text-navy-700">{children}</span>
    </div>
  );
}

function purposeLabel(p: string): string {
  return {
    selection: "Selection",
    promotion: "Promotion",
    development: "Development",
    hi_po: "High-potential identification",
  }[p] || p;
}
