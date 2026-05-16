import { useParams, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import {
  ArrowRight, Clock, Layers, Users,
  CheckCircle2, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useEngagement, useAppStore, useAppMode } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import { subscribeToScores } from "@/lib/sync";
import { observerTools, observerToolProgress } from "@/lib/scoring";
import { findToolType, formatLabel } from "@/mocks/toolLibrary";
import { findCompetency } from "@/mocks/dictionary";

export function ObserverToolList() {
  const { engagementId } = useParams<{ engagementId: string }>();
  const navigate = useNavigate();
  const engagement = useEngagement(engagementId);
  const mergeRealtimeScore = useAppStore((s) => s.mergeRealtimeScore);
  const setActingObserver = useAppStore((s) => s.setActingObserver);
  const appMode = useAppMode();
  const { profile } = useAuth();

  // Resolve observer from auth profile email
  const observerId = (() => {
    if (!engagement || !profile) return undefined;
    const match = engagement.assessors.find(
      (a) => a.email.toLowerCase() === profile.email.toLowerCase(),
    );
    return match?.id;
  })();

  // Set acting observer in store
  useEffect(() => {
    if (!engagement || !observerId) return;
    setActingObserver(engagement.id, observerId);
  }, [engagement, observerId, setActingObserver]);

  // Subscribe to Realtime score updates
  useEffect(() => {
    if (appMode !== "prod" || !isSupabaseConfigured || !engagementId) return;
    const unsub = subscribeToScores(engagementId, (score) => {
      mergeRealtimeScore(engagementId, score);
    });
    return unsub;
  }, [appMode, engagementId, mergeRealtimeScore]);

  if (!engagement) return null;

  // If engagement is still draft, show message
  if (engagement.status === "draft") {
    return (
      <div className="text-center py-16">
        <div className="w-14 h-14 rounded-xl bg-ink-100 text-ink-400 flex items-center justify-center mx-auto mb-5">
          <AlertCircle size={26} />
        </div>
        <h1 className="display-serif text-2xl font-semibold text-navy-700">
          Scoring not yet available
        </h1>
        <p className="text-sm text-ink-500 mt-3 leading-relaxed max-w-md mx-auto">
          This engagement is still being set up. Scoring will open once
          the Lead Assessor locks the configuration.
        </p>
      </div>
    );
  }

  const tools = observerId ? observerTools(engagement, observerId) : [];

  return (
    <div className="space-y-7">
      {/* Header */}
      <div>
        <div className="text-2xs text-ocean-700 uppercase tracking-wider font-semibold mb-2">
          Score · Your assigned tools
        </div>
        <h1 className="display-serif text-[2rem] leading-[1.1] font-semibold text-navy-700 tracking-tight">
          Pick a tool to start scoring.
        </h1>
        <p className="text-base text-ink-500 mt-3 leading-relaxed">
          Select a tool below to see your participants and rate them across the assigned competencies.
        </p>
      </div>

      {/* Tools list */}
      {tools.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center max-w-md mx-auto">
            <div className="w-14 h-14 rounded-xl bg-ink-100 text-ink-400 flex items-center justify-center mx-auto mb-5">
              <Layers size={26} />
            </div>
            <h2 className="display-serif text-xl font-semibold text-navy-700">
              No tools assigned
            </h2>
            <p className="text-sm text-ink-500 mt-3 leading-relaxed">
              You haven't been assigned to any tools in this engagement.
              Contact your Lead Assessor if you believe this is an error.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
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
                  onClick={() => navigate(`/observe/${engagement.id}/${tool.id}`)}
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
                          <span className="text-green-700">{progress.complete} done</span>
                          {progress.inProgress > 0 && (
                            <span className="text-amber-700">{progress.inProgress} in progress</span>
                          )}
                          {progress.notStarted > 0 && (
                            <span className="text-ink-500">{progress.notStarted} not started</span>
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
      )}
    </div>
  );
}
