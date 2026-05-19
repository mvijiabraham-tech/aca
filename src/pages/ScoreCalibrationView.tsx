import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  ChevronLeft, CheckCircle2, Clock, ChevronDown, ChevronRight,
  Send, Undo2, Lock, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useEngagement, useActingObserverId, useAppStore } from "@/lib/store";
import {
  calibrationMatrix, toolObserverSubmissionStatus,
  isObserverSubmitted, isToolFullySubmitted,
} from "@/lib/scoring";
import { findCompetency } from "@/mocks/dictionary";
import { findToolType } from "@/mocks/toolLibrary";

export function ScoreCalibrationView() {
  const { engagementId, toolId } = useParams<{ engagementId: string; toolId: string }>();
  const navigate = useNavigate();
  const engagement = useEngagement(engagementId);
  const observerId = useActingObserverId(engagementId);
  const submitToolScores = useAppStore((s) => s.submitToolScores);
  const unsubmitToolScores = useAppStore((s) => s.unsubmitToolScores);
  const [expandedParticipant, setExpandedParticipant] = useState<string | null>(null);

  if (!engagement || !toolId || !observerId) return null;

  const tool = engagement.tools.find((t) => t.id === toolId);
  if (!tool) return <div className="text-sm text-ink-500">Tool not found.</div>;

  const toolType = findToolType(tool.toolTypeKey);
  const submitted = isObserverSubmitted(engagement, toolId, observerId);
  const fullyLocked = isToolFullySubmitted(engagement, toolId);
  const observerStatus = toolObserverSubmissionStatus(engagement, toolId);
  const matrix = calibrationMatrix(engagement, toolId);

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
          {toolType?.name ?? tool.toolTypeKey} · Calibration View
        </div>
        <h1 className="display-serif text-[2rem] leading-[1.1] font-semibold text-navy-700 tracking-tight">
          {tool.name}
        </h1>
        <p className="text-base text-ink-500 mt-3 leading-relaxed">
          Compare scores across observers and identify disagreements.
        </p>
      </div>

      {fullyLocked && (
        <div className="bg-green-50 border border-green-300 rounded-lg p-4 flex items-center gap-3">
          <Lock size={16} className="text-green-700" />
          <div className="text-sm font-semibold text-green-800">
            All scores submitted — tool locked
          </div>
        </div>
      )}

      {/* Observer submission status */}
      <Card>
        <div className="px-5 py-3 border-b border-ink-200 bg-ink-100/30">
          <div className="text-sm font-semibold text-navy-700">Observer Submission Status</div>
        </div>
        <CardBody>
          <div className="flex flex-wrap gap-3">
            {observerStatus.map((obs) => (
              <div key={obs.observerId} className="flex items-center gap-2 px-3 py-2 rounded-md border border-ink-200 bg-white">
                <span className="text-sm text-navy-700">{obs.observerName}</span>
                {obs.submitted ? (
                  <Badge tone="green"><CheckCircle2 size={11} /> Submitted</Badge>
                ) : (
                  <Badge tone="amber"><Clock size={11} /> Pending</Badge>
                )}
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {submitted && !fullyLocked && (
        <div className="bg-ocean-50 border border-ocean-300 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle2 size={16} className="text-ocean-700" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-ocean-800">Your scores have been submitted</div>
            <div className="text-xs text-ocean-700 mt-0.5">
              You can still edit scores during calibration. Unsubmit to make changes.
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => unsubmitToolScores(engagement.id, toolId, observerId)}>
            <Undo2 size={12} /> Unsubmit
          </Button>
        </div>
      )}

      {/* Per-participant expandable sections */}
      <div className="space-y-3">
        {matrix.map((row) => {
          const expanded = expandedParticipant === row.participantId;
          const participant = engagement.participants.find((p) => p.id === row.participantId);
          return (
            <Card key={row.participantId}>
              <button
                className="w-full text-left p-4 flex items-center gap-4"
                onClick={() => setExpandedParticipant(expanded ? null : row.participantId)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-navy-700">{row.participantName}</h3>
                    {participant?.userId && <Badge tone="ocean">{participant.userId}</Badge>}
                  </div>
                </div>
                {expanded ? <ChevronDown size={16} className="text-ink-400" /> : <ChevronRight size={16} className="text-ink-400" />}
              </button>

              {expanded && (
                <div className="border-t border-ink-200 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-ink-200 bg-ink-100/40">
                        <th className="text-left p-3 text-2xs uppercase tracking-wider font-semibold text-ink-500">
                          Competency
                        </th>
                        {row.competencies[0]?.cells.map((cell) => (
                          <th key={cell.observerId} className="text-center p-3 text-2xs uppercase tracking-wider font-semibold text-ink-500 min-w-[90px]">
                            {cell.observerName.split(" ")[0]}
                          </th>
                        ))}
                        <th className="text-center p-3 text-2xs uppercase tracking-wider font-semibold text-ink-500">
                          Average
                        </th>
                        <th className="text-center p-3 text-2xs uppercase tracking-wider font-semibold text-ink-500 w-[60px]">
                          Spread
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-100">
                      {row.competencies.map((comp) => {
                        const compDef = findCompetency(comp.competencyId, engagement?.customCompetencies);
                        const validScores = comp.cells.map((c) => c.score).filter((s): s is number => s !== null);
                        const spread = validScores.length >= 2
                          ? Math.max(...validScores) - Math.min(...validScores)
                          : null;
                        const hasDisagreement = spread !== null && spread > 1.0;
                        const target = engagement.proficiencyTargets.find((t) => t.competencyId === comp.competencyId);

                        return (
                          <tr key={comp.competencyId} className={cn(hasDisagreement && "bg-amber-50/30")}>
                            <td className="p-3 font-medium text-navy-700">
                              <div className="flex items-center gap-2">
                                <span>{compDef?.name ?? comp.competencyId}</span>
                                {target && (
                                  <span className="text-2xs text-ocean-700 font-mono">L{target.targetLevel}</span>
                                )}
                              </div>
                            </td>
                            {comp.cells.map((cell) => {
                              const atTarget = cell.score !== null && target && cell.score >= target.targetLevel;
                              return (
                                <td key={cell.observerId} className="text-center p-3">
                                  {cell.score !== null ? (
                                    <button
                                      onClick={() => {
                                        const sheetUrl = isObsPath
                                          ? `/observe/${engagement.id}/${toolId}/${row.participantId}`
                                          : `/engagement/${engagement.id}/score/${toolId}/${row.participantId}`;
                                        navigate(sheetUrl);
                                      }}
                                      className={cn(
                                        "font-mono font-semibold hover:underline",
                                        atTarget ? "text-green-700" : "text-amber-700",
                                      )}
                                    >
                                      {cell.score.toFixed(2)}
                                    </button>
                                  ) : (
                                    <span className="text-ink-300">—</span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="text-center p-3 font-mono font-semibold text-navy-700">
                              {comp.average !== null ? comp.average.toFixed(2) : "—"}
                            </td>
                            <td className="text-center p-3">
                              {spread !== null ? (
                                <span className={cn(
                                  "font-mono text-xs font-semibold",
                                  hasDisagreement ? "text-amber-700" : "text-ink-500",
                                )}>
                                  {hasDisagreement && <AlertTriangle size={10} className="inline mr-1" />}
                                  {spread.toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-ink-300">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Submit button */}
      {!submitted && !fullyLocked && (
        <div className="flex justify-end">
          <Button
            variant="primary"
            onClick={() => submitToolScores(engagement.id, toolId, observerId)}
          >
            <Send size={13} /> Submit My Scores
          </Button>
        </div>
      )}
    </div>
  );
}
