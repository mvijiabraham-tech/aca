import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft, ArrowRight, CheckCircle2, Clock, Circle,
  Building,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useEngagement, useActingObserverId } from "@/lib/store";
import {
  observerToolParticipants, findScore, computeScoringStatus,
  computeScoreProgress, expectedIndicators,
} from "@/lib/scoring";
import { findToolType, formatLabel } from "@/mocks/toolLibrary";
import { findCompetency } from "@/mocks/dictionary";
import type { ScoringStatus } from "@/types";

export function ScoreCockpit() {
  const { engagementId, toolId } = useParams<{ engagementId: string; toolId: string }>();
  const navigate = useNavigate();
  const engagement = useEngagement(engagementId);
  const observerId = useActingObserverId(engagementId);

  if (!engagement || !toolId || !observerId) return null;

  const tool = engagement.tools.find((t) => t.id === toolId);
  if (!tool) {
    return (
      <div>
        <BackToScore engagementId={engagement.id} />
        <div className="text-sm text-ink-500 mt-4">Tool not found.</div>
      </div>
    );
  }

  const toolType = findToolType(tool.toolTypeKey);
  const participants = observerToolParticipants(engagement, observerId, toolId);
  const competencies = tool.competencyIds.map((id) => findCompetency(id)).filter(Boolean);
  const totalIndicators = expectedIndicators(tool);

  // Progress summary
  const completeCount = participants.filter((p) => {
    const s = findScore(engagement, p.id, toolId, observerId);
    return computeScoringStatus(s) === "complete";
  }).length;

  return (
    <div className="space-y-7">
      {/* Breadcrumb */}
      <BackToScore engagementId={engagement.id} />

      {/* Header */}
      <div className="flex items-start justify-between gap-6">
        <div className="max-w-2xl">
          <div className="text-2xs font-medium text-ink-500 uppercase tracking-wider mb-1">
            {toolType?.name ?? tool.toolTypeKey} · {tool.durationMinutes}m · {formatLabel(tool.format)}
          </div>
          <h1 className="display-serif text-[2.25rem] leading-[1.1] font-semibold text-navy-700 tracking-tight">
            {tool.name}
          </h1>
          <p className="text-base text-ink-500 mt-3 leading-relaxed">
            Pick a participant to start scoring. {competencies.length} competenc{competencies.length === 1 ? "y is" : "ies are"} assessed in this tool.
          </p>
        </div>

      </div>

      {/* Competencies surfaced */}
      <div className="bg-white border border-ink-200 rounded-lg p-4">
        <div className="text-2xs uppercase tracking-wider font-semibold text-ink-500 mb-2">
          Competencies surfaced by this tool
        </div>
        <div className="flex flex-wrap gap-2">
          {competencies.map((c) => {
            if (!c) return null;
            const target = engagement.proficiencyTargets.find((t) => t.competencyId === c.id);
            return (
              <div key={c.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-ink-100 text-2xs">
                <span className="font-medium text-navy-700">{c.name}</span>
                {target && (
                  <span className="text-ocean-700 font-mono font-semibold">
                    L{target.targetLevel}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress band */}
      <div className="bg-white rounded-lg border border-ink-200 p-4 flex items-center gap-6">
        <div className="flex-1">
          <div className="text-2xs uppercase tracking-wider font-semibold text-ink-500">
            Scoring progress
          </div>
          <div className="text-sm font-semibold text-navy-700 mt-0.5">
            {completeCount} of {participants.length} participants complete
          </div>
        </div>
        <div className="w-64">
          <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: participants.length === 0 ? "0%" : `${(completeCount / participants.length) * 100}%` }}
            />
          </div>
        </div>
        <div className="font-mono text-2xl font-semibold text-navy-700">
          {participants.length === 0 ? 0 : Math.round((completeCount / participants.length) * 100)}
          <span className="text-base text-ink-500">%</span>
        </div>
      </div>

      {/* Participant list */}
      <div>
        <h2 className="display-serif text-xl font-semibold text-navy-700 mb-3">
          Participants
        </h2>
        <div className="space-y-2">
          {participants.map((p) => {
            const score = findScore(engagement, p.id, toolId, observerId);
            const status = computeScoringStatus(score);
            const progress = computeScoreProgress(score, totalIndicators);

            return (
              <Card key={p.id} interactive className="overflow-hidden">
                <button
                  onClick={() => navigate(`/engagement/${engagement.id}/score/${toolId}/${p.id}`)}
                  className="w-full text-left"
                >
                  <div className="flex items-stretch divide-x divide-ink-100">
                    {/* Status accent */}
                    <div
                      className={cn(
                        "w-1",
                        status === "complete" && "bg-green-500",
                        status === "in_progress" && "bg-amber-500",
                        status === "not_started" && "bg-ink-200",
                      )}
                    />

                    {/* Identity */}
                    <div className="flex-1 p-4 min-w-0">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-md bg-ink-100 text-navy-700 flex items-center justify-center text-2xs font-semibold flex-shrink-0">
                          {initials(p.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-semibold text-navy-700 truncate">
                              {p.name}
                            </span>
                            {p.employeeId && (
                              <span className="text-2xs font-mono text-ink-500">
                                {p.employeeId}
                              </span>
                            )}
                          </div>
                          <div className="text-2xs text-ink-500 flex items-center gap-2 mt-0.5">
                            <span>{p.currentRole}</span>
                            {p.businessUnit && (
                              <>
                                <span className="text-ink-300">·</span>
                                <span className="inline-flex items-center gap-0.5">
                                  <Building size={9} /> {p.businessUnit}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="w-[220px] p-4 flex flex-col justify-center bg-ink-100/30">
                      <div className="text-2xs uppercase tracking-wider font-semibold text-ink-500">
                        Indicators rated
                      </div>
                      <div className="flex items-baseline justify-between mt-0.5">
                        <span className="text-sm font-semibold text-navy-700">
                          {progress.rated} of {progress.total}
                        </span>
                        <span className="font-mono text-2xs text-ink-500">
                          {progress.total === 0 ? 0 : Math.round((progress.rated / progress.total) * 100)}%
                        </span>
                      </div>
                      <div className="h-1 bg-ink-200 rounded-full overflow-hidden mt-1.5">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            status === "complete" && "bg-green-500",
                            status === "in_progress" && "bg-amber-500",
                            status === "not_started" && "bg-ink-300",
                          )}
                          style={{ width: progress.total === 0 ? "0%" : `${(progress.rated / progress.total) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Status + arrow */}
                    <div className="w-[180px] p-4 flex items-center justify-between gap-3">
                      <StatusBadgeLg status={status} />
                      <ArrowRight size={14} className="text-ink-400 flex-shrink-0" />
                    </div>
                  </div>
                </button>
              </Card>
            );
          })}
        </div>
        {participants.length === 0 && (
          <Card>
            <CardBody className="py-12 text-center text-sm text-ink-500">
              No participants assigned to this tool.
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}

function BackToScore({ engagementId }: { engagementId: string }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`/engagement/${engagementId}/score`)}
      className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-navy-700 transition-colors"
    >
      <ChevronLeft size={14} /> Back to all tools
    </button>
  );
}

function StatusBadgeLg({ status }: { status: ScoringStatus }) {
  if (status === "complete") {
    return <Badge tone="green"><CheckCircle2 size={11} /> Complete</Badge>;
  }
  if (status === "in_progress") {
    return <Badge tone="amber"><Clock size={11} /> In progress</Badge>;
  }
  return <Badge tone="neutral"><Circle size={11} /> Not started</Badge>;
}

function initials(name: string): string {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}
