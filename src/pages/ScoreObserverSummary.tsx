import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft, CheckCircle2, Clock, Send, Undo2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useEngagement, useActingObserverId, useAppStore } from "@/lib/store";
import {
  observerToolParticipants, findScore, computeScoringStatus,
  isObserverSubmitted, isToolFullySubmitted,
} from "@/lib/scoring";
import { competencyScoreFromIndicators } from "@/lib/calibrate";
import { findCompetency } from "@/mocks/dictionary";
import { findToolType } from "@/mocks/toolLibrary";
import type { CompetencyScore } from "@/types";

export function ScoreObserverSummary() {
  const { engagementId, toolId } = useParams<{ engagementId: string; toolId: string }>();
  const navigate = useNavigate();
  const engagement = useEngagement(engagementId);
  const observerId = useActingObserverId(engagementId);
  const submitToolScores = useAppStore((s) => s.submitToolScores);
  const unsubmitToolScores = useAppStore((s) => s.unsubmitToolScores);

  if (!engagement || !toolId || !observerId) return null;

  const tool = engagement.tools.find((t) => t.id === toolId);
  if (!tool) return <div className="text-sm text-ink-500">Tool not found.</div>;

  const toolType = findToolType(tool.toolTypeKey);
  const participants = observerToolParticipants(engagement, observerId, toolId);
  const competencies = tool.competencyIds
    .map((id) => findCompetency(id, engagement?.customCompetencies))
    .filter(Boolean);
  const submitted = isObserverSubmitted(engagement, toolId, observerId);
  const fullyLocked = isToolFullySubmitted(engagement, toolId);

  const completeCount = participants.filter((p) => {
    const s = findScore(engagement, p.id, toolId, observerId);
    return computeScoringStatus(s) === "complete";
  }).length;

  // Build matrix: rows = participants, cols = competencies
  const matrix = participants.map((p) => {
    const score = findScore(engagement, p.id, toolId, observerId);
    const cells = tool.competencyIds.map((cid) => {
      const cs = score?.competencies.find((c: CompetencyScore) => c.competencyId === cid);
      const avg = cs ? competencyScoreFromIndicators(cs.indicators) : null;
      const target = engagement.proficiencyTargets.find((t) => t.competencyId === cid);
      return { competencyId: cid, score: avg, target: target?.targetLevel ?? null };
    });
    return { participant: p, cells, status: computeScoringStatus(score) };
  });

  const isObsPath = location.pathname.startsWith("/observe/");
  const backUrl = isObsPath
    ? `/observe/${engagement.id}/${toolId}`
    : `/engagement/${engagement.id}/score/${toolId}`;

  return (
    <div className="space-y-7">
      <button
        onClick={() => navigate(backUrl)}
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-navy-700 transition-colors"
      >
        <ChevronLeft size={14} /> Back to participants
      </button>

      <div>
        <div className="text-2xs font-medium text-ink-500 uppercase tracking-wider mb-1">
          {toolType?.name ?? tool.toolTypeKey} · My Scores Summary
        </div>
        <h1 className="display-serif text-[2rem] leading-[1.1] font-semibold text-navy-700 tracking-tight">
          {tool.name}
        </h1>
        <p className="text-base text-ink-500 mt-3 leading-relaxed">
          Review your scores before submitting. {completeCount} of {participants.length} participants complete.
        </p>
      </div>

      {fullyLocked && (
        <div className="bg-green-50 border border-green-300 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle2 size={16} className="text-green-700" />
          <div className="text-sm font-semibold text-green-800">
            All observers have submitted — this tool is locked.
          </div>
        </div>
      )}

      {submitted && !fullyLocked && (
        <div className="bg-ocean-50 border border-ocean-300 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle2 size={16} className="text-ocean-700" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-ocean-800">Your scores have been submitted</div>
            <div className="text-xs text-ocean-700 mt-0.5">
              Waiting for other observers to submit before the tool is locked.
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => unsubmitToolScores(engagement.id, toolId, observerId)}>
            <Undo2 size={12} /> Unsubmit
          </Button>
        </div>
      )}

      {/* Score matrix */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-200 bg-ink-100/40">
                <th className="text-left p-3 text-2xs uppercase tracking-wider font-semibold text-ink-500 sticky left-0 bg-ink-100/40">
                  Participant
                </th>
                {competencies.map((c) => (
                  <th key={c!.id} className="text-center p-3 text-2xs uppercase tracking-wider font-semibold text-ink-500 min-w-[100px]">
                    {c!.name}
                  </th>
                ))}
                <th className="text-center p-3 text-2xs uppercase tracking-wider font-semibold text-ink-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {matrix.map(({ participant, cells, status }) => (
                <tr key={participant.id} className="hover:bg-ink-100/20">
                  <td className="p-3 font-medium text-navy-700 sticky left-0 bg-white">
                    <div className="flex items-center gap-2">
                      <span>{participant.name}</span>
                      {participant.userId && (
                        <span className="text-2xs font-mono text-ocean-700">{participant.userId}</span>
                      )}
                    </div>
                  </td>
                  {cells.map((cell) => {
                    const atTarget = cell.score !== null && cell.target !== null && cell.score >= cell.target;
                    return (
                      <td key={cell.competencyId} className="text-center p-3">
                        {cell.score !== null ? (
                          <span className={cn(
                            "font-mono font-semibold",
                            atTarget ? "text-green-700" : "text-amber-700",
                          )}>
                            {cell.score.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-ink-300">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="text-center p-3">
                    {status === "complete" && <Badge tone="green"><CheckCircle2 size={11} /> Done</Badge>}
                    {status === "in_progress" && <Badge tone="amber"><Clock size={11} /> In progress</Badge>}
                    {status === "not_started" && <Badge tone="neutral">Not started</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Submit button */}
      {!submitted && !fullyLocked && (
        <div className="flex justify-end">
          <Button
            variant="primary"
            onClick={() => submitToolScores(engagement.id, toolId, observerId)}
            disabled={completeCount < participants.length}
          >
            <Send size={13} /> Submit My Scores
          </Button>
          {completeCount < participants.length && (
            <span className="ml-3 text-xs text-ink-500 self-center">
              Complete all participants first
            </span>
          )}
        </div>
      )}
    </div>
  );
}
