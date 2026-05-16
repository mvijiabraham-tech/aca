import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  ChevronLeft, CheckCircle2, MessageSquare, Sparkles,
  Plus, Trash2, Send,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useEngagement, useAppStore, useActingObserverId } from "@/lib/store";
import {
  computedOar, oarBandFor,
} from "@/lib/calibrate";
import { OAR_BAND_META } from "@/types";
import type { FeedbackSession } from "@/types";

export function ReportFeedback() {
  const { engagementId } = useParams<{ engagementId: string }>();
  const navigate = useNavigate();
  const engagement = useEngagement(engagementId);
  const upsertFeedbackSession = useAppStore((s) => s.upsertFeedbackSession);
  const actingId = useActingObserverId(engagementId);

  const [selectedPid, setSelectedPid] = useState<string | null>(null);
  const [prepNotes, setPrepNotes] = useState("");
  const [sessionNotes, setSessionNotes] = useState("");
  const [commitments, setCommitments] = useState<string[]>([]);
  const [newCommitment, setNewCommitment] = useState("");

  if (!engagement) return null;

  const participants = engagement.participants;
  const activePid = selectedPid ?? participants[0]?.id ?? null;
  const activeParticipant = participants.find((p) => p.id === activePid);
  const sessions = engagement.report.feedbackSessions;
  const activeSession = sessions.find((fs) => fs.participantId === activePid);

  // Sync local state with active session
  function selectParticipant(pid: string) {
    setSelectedPid(pid);
    const s = sessions.find((fs) => fs.participantId === pid);
    setPrepNotes(s?.prepNotes ?? "");
    setSessionNotes(s?.sessionNotes ?? "");
    setCommitments(s?.idpCommitments ?? []);
    setNewCommitment("");
  }

  function saveSession(status: FeedbackSession["status"] = "scheduled") {
    if (!activePid) return;
    const session: FeedbackSession = {
      participantId: activePid,
      status,
      prepNotes: prepNotes.trim() || undefined,
      sessionNotes: sessionNotes.trim() || undefined,
      idpCommitments: commitments.filter((c) => c.trim()),
      conductedBy: status === "completed" ? actingId ?? undefined : activeSession?.conductedBy,
      conductedAt: status === "completed" ? new Date().toISOString() : activeSession?.conductedAt,
      scheduledAt: activeSession?.scheduledAt ?? new Date().toISOString(),
    };
    upsertFeedbackSession(engagement!.id, session);
  }

  function sendHandoff() {
    if (!activePid || !activeSession) return;
    const session: FeedbackSession = {
      ...activeSession,
      handoffSentAt: new Date().toISOString(),
    };
    upsertFeedbackSession(engagement!.id, session);
  }

  function addCommitment() {
    if (!newCommitment.trim()) return;
    setCommitments([...commitments, newCommitment.trim()]);
    setNewCommitment("");
  }

  function removeCommitment(idx: number) {
    setCommitments(commitments.filter((_, i) => i !== idx));
  }

  const oar = activePid ? computedOar(engagement, activePid) : null;
  const band = oar !== null ? oarBandFor(engagement, oar) : null;

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate(`/engagement/${engagement.id}/report`)}
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-navy-700 transition-colors"
      >
        <ChevronLeft size={14} /> Back to Report
      </button>

      <div className="max-w-2xl">
        <div className="text-2xs text-ocean-700 uppercase tracking-wider font-semibold mb-2">
          Report · Feedback sessions
        </div>
        <h1 className="display-serif text-[2rem] leading-[1.1] font-semibold text-navy-700 tracking-tight">
          Capture feedback and IDP commitments.
        </h1>
        <p className="text-base text-ink-500 mt-3 leading-relaxed">
          Per participant: prep, conduct, capture commitments, hand off to Actifyr for behaviour activation.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5">
        {/* Participant list */}
        <Card>
          <div className="px-4 py-3 border-b border-ink-200 bg-ink-100/40">
            <h2 className="text-2xs uppercase tracking-wider font-semibold text-navy-700">
              Sessions
            </h2>
          </div>
          <div className="divide-y divide-ink-100 max-h-[700px] overflow-y-auto">
            {participants.map((p) => {
              const s = sessions.find((fs) => fs.participantId === p.id);
              const isActive = p.id === activePid;
              return (
                <button
                  key={p.id}
                  onClick={() => selectParticipant(p.id)}
                  className={cn(
                    "w-full text-left p-3 transition-colors",
                    isActive ? "bg-ocean-50/50" : "hover:bg-ink-100/40",
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className={cn(
                      "w-7 h-7 rounded-md flex items-center justify-center text-2xs font-semibold flex-shrink-0",
                      isActive ? "bg-ocean-600 text-white" : "bg-ink-100 text-navy-700",
                    )}>
                      {initials(p.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-navy-700 truncate">{p.name}</div>
                      <div className="text-2xs text-ink-500 truncate">{p.currentRole}</div>
                      <div className="mt-1">
                        <SessionStatusBadge status={s?.status ?? "not_started"} handoffSent={!!s?.handoffSentAt} />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Active session detail */}
        <div className="space-y-4">
          {activeParticipant ? (
            <>
              {/* Header */}
              <Card>
                <CardBody className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="display-serif text-xl font-semibold text-navy-700">
                      {activeParticipant.name}
                    </h2>
                    <div className="text-2xs text-ink-500 mt-0.5">
                      {activeParticipant.currentRole}
                      {activeParticipant.businessUnit && ` · ${activeParticipant.businessUnit}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xs uppercase tracking-wider font-semibold text-ink-500">OAR</div>
                    <div className="font-mono text-xl font-bold text-navy-700 leading-tight">
                      {oar !== null ? oar.toFixed(2) : "—"}
                    </div>
                    {band && (
                      <Badge tone={OAR_BAND_META[band].tone}>
                        {OAR_BAND_META[band].label}
                      </Badge>
                    )}
                  </div>
                </CardBody>
              </Card>

              {/* Prep notes */}
              <Card>
                <div className="px-5 py-3 border-b border-ink-200 bg-ink-100/40">
                  <h3 className="text-sm font-semibold text-navy-700">Prep notes</h3>
                  <p className="text-2xs text-ink-500 mt-0.5">
                    Key points to cover. Read before walking into the session.
                  </p>
                </div>
                <CardBody>
                  <textarea
                    value={prepNotes}
                    onChange={(e) => { setPrepNotes(e.target.value); }}
                    onBlur={() => saveSession(activeSession?.status ?? "scheduled")}
                    placeholder="e.g. Strong on execution, lighter on stakeholder management. Be specific on the cross-functional examples. Lead with strengths, then development."
                    rows={4}
                    className="w-full px-3 py-2 text-sm border border-ink-200 rounded-md focus:outline-none focus:ring-2 focus:ring-ocean-600/20 focus:border-ocean-400 resize-none"
                  />
                </CardBody>
              </Card>

              {/* Session notes */}
              <Card>
                <div className="px-5 py-3 border-b border-ink-200 bg-ink-100/40">
                  <h3 className="text-sm font-semibold text-navy-700">Session notes</h3>
                  <p className="text-2xs text-ink-500 mt-0.5">
                    Capture during or after the session. Reactions, questions, areas of agreement / disagreement.
                  </p>
                </div>
                <CardBody>
                  <textarea
                    value={sessionNotes}
                    onChange={(e) => setSessionNotes(e.target.value)}
                    onBlur={() => saveSession(activeSession?.status ?? "scheduled")}
                    placeholder="What was discussed. What landed well. What needed careful handling."
                    rows={5}
                    className="w-full px-3 py-2 text-sm border border-ink-200 rounded-md focus:outline-none focus:ring-2 focus:ring-ocean-600/20 focus:border-ocean-400 resize-none"
                  />
                </CardBody>
              </Card>

              {/* IDP commitments */}
              <Card>
                <div className="px-5 py-3 border-b border-ink-200 bg-ink-100/40">
                  <h3 className="text-sm font-semibold text-navy-700">IDP commitments</h3>
                  <p className="text-2xs text-ink-500 mt-0.5">
                    Specific actions the participant committed to. These flow into Actifyr on handoff.
                  </p>
                </div>
                <CardBody className="space-y-3">
                  {commitments.map((c, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 border border-ink-200 rounded">
                      <div className="w-6 h-6 rounded-md bg-ocean-100 text-ocean-700 text-2xs font-mono font-semibold flex items-center justify-center flex-shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1 text-sm text-ink-700">{c}</div>
                      <button
                        onClick={() => { removeCommitment(i); setTimeout(() => saveSession(activeSession?.status ?? "scheduled"), 0); }}
                        className="text-ink-400 hover:text-red-600 p-1"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newCommitment}
                      onChange={(e) => setNewCommitment(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") addCommitment(); }}
                      placeholder="e.g. Run weekly 1:1s with each direct report by Q1"
                      className="flex-1 px-3 py-2 text-sm border border-ink-200 rounded-md focus:outline-none focus:ring-2 focus:ring-ocean-600/20 focus:border-ocean-400"
                    />
                    <Button size="sm" variant="primary" onClick={() => { addCommitment(); setTimeout(() => saveSession(activeSession?.status ?? "scheduled"), 0); }}>
                      <Plus size={12} /> Add
                    </Button>
                  </div>
                </CardBody>
              </Card>

              {/* Actions */}
              <Card>
                <CardBody className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-navy-700">Session status</div>
                    <div className="text-2xs text-ink-500 mt-0.5">
                      {activeSession?.status === "completed"
                        ? `Conducted ${activeSession.conductedAt ? new Date(activeSession.conductedAt).toLocaleDateString("en-IN") : ""}`
                        : "Mark complete once the session has been delivered."}
                    </div>
                  </div>
                  {activeSession?.status === "completed" ? (
                    activeSession.handoffSentAt ? (
                      <Badge tone="green">
                        <Send size={11} /> Handoff sent
                      </Badge>
                    ) : (
                      <Button variant="primary" onClick={sendHandoff}>
                        <Sparkles size={13} /> Send Actifyr handoff
                      </Button>
                    )
                  ) : (
                    <Button
                      variant="primary"
                      onClick={() => saveSession("completed")}
                      disabled={commitments.length === 0}
                    >
                      <CheckCircle2 size={13} /> Mark session complete
                    </Button>
                  )}
                </CardBody>
              </Card>

              {activeSession?.handoffSentAt && (
                <Card className="border-ocean-300/60 bg-ocean-50/30">
                  <CardBody>
                    <div className="flex items-start gap-3">
                      <Sparkles size={16} className="text-ocean-700 flex-shrink-0 mt-0.5" />
                      <div className="text-2xs text-ink-700 leading-relaxed">
                        <div className="font-semibold text-navy-700 mb-1">Handoff payload sent to Actifyr</div>
                        Structured payload delivered on {new Date(activeSession.handoffSentAt).toLocaleString("en-IN")}: OAR band,
                        {" "}{commitments.length} IDP commitment{commitments.length === 1 ? "" : "s"}, competency profile.
                        Actifyr will use this to design behaviour activation interventions.
                      </div>
                    </div>
                  </CardBody>
                </Card>
              )}
            </>
          ) : (
            <div className="text-sm text-ink-500">No participant selected.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function SessionStatusBadge({ status, handoffSent }: { status: FeedbackSession["status"]; handoffSent: boolean }) {
  if (handoffSent) return <Badge tone="green"><Send size={9} /> Handoff sent</Badge>;
  if (status === "completed") return <Badge tone="ocean"><CheckCircle2 size={9} /> Complete</Badge>;
  if (status === "scheduled") return <Badge tone="amber"><MessageSquare size={9} /> Scheduled</Badge>;
  return <Badge tone="neutral">Not started</Badge>;
}

function initials(name: string): string {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}
