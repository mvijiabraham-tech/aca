import { useParams, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import {
  ClipboardEdit, ArrowRight, Users, Clock, Layers,
  CheckCircle2, Lock, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ObserverPersonaSwitcher } from "@/components/ObserverPersonaSwitcher";
import { useEngagement, useActingObserverId, useAppStore, useAppMode } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import { subscribeToScores } from "@/lib/sync";
import { observerTools, observerToolProgress } from "@/lib/scoring";
import { findToolType, formatLabel } from "@/mocks/toolLibrary";
import { findCompetency } from "@/mocks/dictionary";

export function ScoreLanding() {
  const { engagementId } = useParams<{ engagementId: string }>();
  const navigate = useNavigate();
  const engagement = useEngagement(engagementId);
  const observerId = useActingObserverId(engagementId);
  const setActingObserver = useAppStore((s) => s.setActingObserver);
  const mergeRealtimeScore = useAppStore((s) => s.mergeRealtimeScore);
  const appMode = useAppMode();
  const { profile } = useAuth();

  // In prod mode, auto-resolve observer from auth profile email
  useEffect(() => {
    if (appMode !== "prod" || !isSupabaseConfigured || !engagement || !profile) return;
    const match = engagement.assessors.find(
      (a) => a.email.toLowerCase() === profile.email.toLowerCase(),
    );
    if (match && match.id !== observerId) {
      setActingObserver(engagement.id, match.id);
    }
  }, [appMode, engagement, profile, observerId, setActingObserver]);

  // Subscribe to Realtime score updates from other observers
  useEffect(() => {
    if (appMode !== "prod" || !isSupabaseConfigured || !engagementId) return;
    const unsub = subscribeToScores(engagementId, (score) => {
      mergeRealtimeScore(engagementId, score);
    });
    return unsub;
  }, [appMode, engagementId, mergeRealtimeScore]);

  if (!engagement) return null;

  // Locked-status gate
  const isLocked = engagement.status !== "draft";
  if (!isLocked) {
    return <LockGate engagementId={engagement.id} />;
  }

  const tools = observerId ? observerTools(engagement, observerId) : [];
  const acting = engagement.assessors.find((a) => a.id === observerId);

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-start justify-between gap-6">
        <div className="max-w-2xl">
          <div className="text-2xs text-ocean-700 uppercase tracking-wider font-semibold mb-2">
            Score · Capture observer ratings
          </div>
          <h1 className="display-serif text-[2.25rem] leading-[1.1] font-semibold text-navy-700 tracking-tight">
            Pick a tool to start scoring.
          </h1>
          <p className="text-base text-ink-500 mt-3 leading-relaxed">
            Each tool below is one you've been assigned to. Click in to see your participants
            and rate them across the assigned competencies. Saves continuously.
          </p>
        </div>

        <ObserverPersonaSwitcher engagement={engagement} observerId={observerId} />
      </div>

      {/* Acting observer status */}
      {acting && !acting.calibrated && (
        <div className="bg-amber-50/60 border border-amber-300/60 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle size={16} className="text-amber-700 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-amber-900">Calibration not yet complete</div>
            <div className="text-xs text-amber-800 mt-0.5 leading-relaxed">
              {acting.name} hasn't completed calibration. Ratings can be entered but should be reviewed by the Lead Assessor before they count.
            </div>
          </div>
        </div>
      )}

      {/* Tools list */}
      {tools.length === 0 ? (
        <EmptyState observerName={acting?.name} />
      ) : (
        <div>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="display-serif text-xl font-semibold text-navy-700">
              Your tools
            </h2>
            <span className="text-2xs text-ink-500 font-medium uppercase tracking-wider">
              {tools.length} tool{tools.length === 1 ? "" : "s"} assigned
            </span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {tools.map((tool) => {
              const progress = observerToolProgress(engagement, observerId!, tool.id);
              const toolType = findToolType(tool.toolTypeKey);
              const competencies = tool.competencyIds.map((id) => findCompetency(id)).filter(Boolean);
              const overallStatus =
                progress.complete === progress.total ? "complete" :
                progress.complete > 0 || progress.inProgress > 0 ? "in_progress" : "not_started";

              return (
                <Card
                  key={tool.id}
                  interactive
                  className={cn(
                    "cursor-pointer relative overflow-hidden",
                    overallStatus === "complete" && "border-green-300/60",
                  )}
                >
                  <button
                    onClick={() => navigate(`/engagement/${engagement.id}/score/${tool.id}`)}
                    className="w-full text-left"
                  >
                    <div
                      className={cn(
                        "absolute left-0 top-0 bottom-0 w-1",
                        overallStatus === "complete" && "bg-green-500",
                        overallStatus === "in_progress" && "bg-amber-500",
                        overallStatus === "not_started" && "bg-ink-200",
                      )}
                    />
                    <CardBody className="pl-6 space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-2xs font-medium text-ink-500 mb-1 uppercase tracking-wider">
                            {toolType?.name ?? tool.toolTypeKey}
                          </div>
                          <h3 className="display-serif text-lg font-semibold text-navy-700 leading-snug">
                            {tool.name}
                          </h3>
                        </div>
                        {overallStatus === "complete" && (
                          <Badge tone="green">
                            <CheckCircle2 size={11} /> Complete
                          </Badge>
                        )}
                        {overallStatus === "in_progress" && (
                          <Badge tone="amber">
                            <Clock size={11} /> In progress
                          </Badge>
                        )}
                        {overallStatus === "not_started" && (
                          <Badge tone="neutral">Not started</Badge>
                        )}
                      </div>

                      {/* Meta */}
                      <div className="flex items-center gap-4 text-2xs text-ink-500">
                        <span className="inline-flex items-center gap-1">
                          <Clock size={11} /> {tool.durationMinutes}m
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Users size={11} /> {formatLabel(tool.format)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Layers size={11} /> {competencies.length} competenc{competencies.length === 1 ? "y" : "ies"}
                        </span>
                      </div>

                      {/* Competencies tags */}
                      <div className="flex flex-wrap gap-1.5">
                        {competencies.map((c) =>
                          c ? (
                            <Badge key={c.id} tone="neutral" className="font-normal">
                              {c.name}
                            </Badge>
                          ) : null,
                        )}
                      </div>

                      {/* Progress */}
                      <div className="pt-3 border-t border-ink-100">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="text-2xs text-ink-500 uppercase tracking-wider font-medium">
                            Your scoring progress
                          </div>
                          <div className="text-2xs font-mono text-ink-700">
                            {progress.complete}/{progress.total} participants
                          </div>
                        </div>
                        <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden bg-ink-100">
                          {progress.total === 0 ? (
                            <div className="flex-1 bg-ink-200" />
                          ) : (
                            <>
                              <div
                                className="bg-green-500"
                                style={{ width: `${(progress.complete / progress.total) * 100}%` }}
                              />
                              <div
                                className="bg-amber-400"
                                style={{ width: `${(progress.inProgress / progress.total) * 100}%` }}
                              />
                            </>
                          )}
                        </div>
                        <div className="mt-2 flex items-center justify-between text-2xs">
                          <div className="flex items-center gap-3">
                            <span className="text-green-700">
                              {progress.complete} done
                            </span>
                            {progress.inProgress > 0 && (
                              <span className="text-amber-700">
                                {progress.inProgress} in progress
                              </span>
                            )}
                            {progress.notStarted > 0 && (
                              <span className="text-ink-500">
                                {progress.notStarted} not started
                              </span>
                            )}
                          </div>
                          <div className="text-2xs font-medium text-ocean-700 inline-flex items-center gap-1">
                            Open <ArrowRight size={11} />
                          </div>
                        </div>
                      </div>
                    </CardBody>
                  </button>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Footnote — for the demo (hidden in prod mode) */}
      {appMode === "demo" && (
        <div className="mt-6 text-2xs text-ink-500 max-w-2xl leading-relaxed">
          <span className="font-semibold">For demo purposes:</span> the persona switcher above lets you act as different observers
          to see how the same Score destination shows different tools and participants depending on who's logged in.
          In production, each observer logs in as themselves and sees only their assigned tools.
        </div>
      )}
    </div>
  );
}

function LockGate({ engagementId }: { engagementId: string }) {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <div className="max-w-2xl">
        <div className="text-2xs text-ocean-700 uppercase tracking-wider font-semibold mb-2">
          Score · Capture observer ratings
        </div>
        <h1 className="display-serif text-[2.5rem] leading-[1.1] font-semibold text-navy-700 tracking-tight">
          Setup must be locked first.
        </h1>
        <p className="text-base text-ink-500 mt-3 leading-relaxed">
          Scoring only opens once the engagement is locked. Complete all nine setup steps and lock the engagement to unlock this destination.
        </p>
      </div>

      <Card>
        <CardBody className="py-12">
          <div className="max-w-md mx-auto text-center">
            <div className="w-14 h-14 rounded-xl bg-ink-100 text-ink-400 flex items-center justify-center mx-auto mb-5">
              <Lock size={26} />
            </div>
            <h2 className="display-serif text-2xl font-semibold text-navy-700">
              Score is locked
            </h2>
            <p className="text-sm text-ink-500 mt-3 leading-relaxed">
              Once Setup is locked, this destination opens and observers can begin scoring participants.
            </p>
            <div className="mt-6">
              <Button
                variant="primary"
                onClick={() => navigate(`/engagement/${engagementId}/setup`)}
              >
                Go to Setup
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function EmptyState({ observerName }: { observerName?: string }) {
  return (
    <Card>
      <CardBody className="py-12 text-center max-w-md mx-auto">
        <div className="w-14 h-14 rounded-xl bg-ink-100 text-ink-400 flex items-center justify-center mx-auto mb-5">
          <ClipboardEdit size={26} />
        </div>
        <h2 className="display-serif text-2xl font-semibold text-navy-700">
          No tools assigned
        </h2>
        <p className="text-sm text-ink-500 mt-3 leading-relaxed">
          {observerName
            ? `${observerName} hasn't been assigned to any tools in this engagement.`
            : "Choose an observer above to see their assigned tools."}
        </p>
      </CardBody>
    </Card>
  );
}
