import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  ChevronLeft, ArrowRight, CheckCircle2, Award, Lock, AlertTriangle,
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
import type { ParticipantOar, OarBand } from "@/types";

const OAR_BANDS: OarBand[] = ["below", "developing", "proficient", "strong", "distinguished"];

export function CalibrateOar() {
  const { engagementId } = useParams<{ engagementId: string }>();
  const navigate = useNavigate();
  const engagement = useEngagement(engagementId);
  const upsertOar = useAppStore((s) => s.upsertOar);
  const signOffCalibrate = useAppStore((s) => s.signOffCalibrate);
  const actingId = useActingObserverId(engagementId);

  const [confirmingSignOff, setConfirmingSignOff] = useState(false);

  if (!engagement) return null;

  const participants = engagement.participants;
  const isSignedOff = engagement.calibrate.stage === "complete";

  const confirmed = engagement.calibrate.oars;
  const totalCount = participants.length;
  const confirmedCount = confirmed.length;
  const allConfirmed = confirmedCount === totalCount && totalCount > 0;

  function setBand(participantId: string, band: OarBand, rationale?: string) {
    if (isSignedOff || !actingId) return;
    const oar = computedOar(engagement!, participantId);
    if (oar === null) return;
    const computedBand = oarBandFor(engagement!, oar);
    const record: ParticipantOar = {
      participantId,
      computedOar: oar,
      computedBand,
      finalBand: band,
      isOverride: band !== computedBand,
      rationale: rationale?.trim() || undefined,
      confirmedBy: actingId,
      confirmedAt: new Date().toISOString(),
    };
    upsertOar(engagement!.id, record);
  }

  function handleSignOff() {
    if (!actingId) return;
    signOffCalibrate(engagement!.id, actingId);
    setConfirmingSignOff(false);
    // Navigate to landing
    setTimeout(() => navigate(`/engagement/${engagement!.id}/calibrate`), 200);
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate(`/engagement/${engagement.id}/calibrate`)}
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-navy-700 transition-colors"
      >
        <ChevronLeft size={14} /> Back to Calibrate
      </button>

      <div className="max-w-2xl">
        <div className="text-2xs font-mono font-semibold text-ocean-700 tracking-wider mb-1">
          STAGE 3 OF 3
        </div>
        <h1 className="display-serif text-[2rem] leading-[1.1] font-semibold text-navy-700 tracking-tight">
          Set Overall Assessment Ratings.
        </h1>
        <p className="text-base text-ink-500 mt-3 leading-relaxed">
          Per participant, confirm the final OAR band. Computed bands come from the moderated scores
          using the methodology configured in Setup. You can override with rationale.
        </p>
      </div>

      {/* Progress band */}
      <Card>
        <CardBody>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="text-2xs uppercase tracking-wider font-semibold text-ink-500 mb-1">
                OAR confirmation
              </div>
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-2xl font-semibold text-navy-700">
                  {confirmedCount}/{totalCount}
                </span>
                <span className="text-xs text-ink-500">participants confirmed</span>
              </div>
              <div className="mt-2 h-1.5 bg-ink-100 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", allConfirmed ? "bg-green-500" : "bg-amber-500")}
                  style={{ width: totalCount === 0 ? "0%" : `${(confirmedCount / totalCount) * 100}%` }}
                />
              </div>
            </div>
            <Badge tone={allConfirmed ? "green" : "amber"}>
              {allConfirmed ? "Ready to sign off" : "In progress"}
            </Badge>
          </div>
        </CardBody>
      </Card>

      {/* Participant OAR rows */}
      <div className="space-y-3">
        {participants.map((p) => {
          const oar = computedOar(engagement, p.id);
          const computedBand = oar !== null ? oarBandFor(engagement, oar) : null;
          const confirmed = engagement.calibrate.oars.find((o) => o.participantId === p.id);
          const finalBand = confirmed?.finalBand ?? computedBand;

          return (
            <OarRow
              key={p.id}
              participantName={p.name}
              employeeId={p.employeeId}
              role={p.currentRole}
              computedOar={oar}
              computedBand={computedBand}
              confirmed={confirmed}
              finalBand={finalBand}
              disabled={isSignedOff || oar === null}
              onSetBand={(band, rationale) => setBand(p.id, band, rationale)}
            />
          );
        })}
      </div>

      {/* Sign-off section */}
      {!isSignedOff && (
        <Card className={cn(
          allConfirmed ? "border-green-300/60 bg-green-50/30" : "border-amber-300/60 bg-amber-50/30",
        )}>
          <CardBody>
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                allConfirmed ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700",
              )}>
                {allConfirmed ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-navy-700">
                  {allConfirmed ? "All OARs confirmed" : `${totalCount - confirmedCount} OAR${(totalCount - confirmedCount) === 1 ? "" : "s"} pending`}
                </div>
                <div className="text-2xs text-ink-500 mt-0.5">
                  {allConfirmed
                    ? "Sign off to lock Calibrate and unlock the Report destination."
                    : "Confirm every OAR before sign-off."}
                </div>
              </div>
              {!confirmingSignOff ? (
                <Button
                  variant="primary"
                  disabled={!allConfirmed}
                  onClick={() => setConfirmingSignOff(true)}
                >
                  <Lock size={13} /> Sign off Calibrate
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={() => setConfirmingSignOff(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={handleSignOff}>
                    Yes, sign off
                  </Button>
                </div>
              )}
            </div>
            {confirmingSignOff && (
              <div className="mt-3 text-2xs text-ink-700 bg-white border border-ink-200 rounded-md p-3 leading-relaxed">
                Are you sure? Signing off locks all moderated scores and OAR bands for this engagement.
                Report becomes available and AI-drafted sections can be generated from this data.
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Footer nav */}
      <div className="flex items-center justify-between pt-4 border-t border-ink-200">
        <Button variant="secondary" onClick={() => navigate(`/engagement/${engagement.id}/calibrate/moderate`)}>
          <ChevronLeft size={13} /> Back to Moderate
        </Button>
        {isSignedOff && (
          <Button variant="primary" onClick={() => navigate(`/engagement/${engagement.id}/report`)}>
            Go to Report <ArrowRight size={13} />
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------- OarRow ----------
function OarRow({
  participantName, employeeId, role,
  computedOar, computedBand, confirmed, finalBand,
  disabled, onSetBand,
}: {
  participantName: string;
  employeeId?: string;
  role: string;
  computedOar: number | null;
  computedBand: OarBand | null;
  confirmed: ParticipantOar | undefined;
  finalBand: OarBand | null;
  disabled: boolean;
  onSetBand: (band: OarBand, rationale?: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [rationale, setRationale] = useState(confirmed?.rationale ?? "");
  const isOverride = confirmed?.isOverride;

  return (
    <Card>
      <div className="flex items-stretch">
        {/* Identity */}
        <div className="flex-1 p-4 min-w-0">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h3 className="text-base font-semibold text-navy-700 truncate">{participantName}</h3>
            {employeeId && <span className="font-mono text-2xs text-ink-500">{employeeId}</span>}
            {confirmed && (
              <Badge tone="green"><CheckCircle2 size={10} /> Confirmed</Badge>
            )}
            {isOverride && <Badge tone="ocean">Override</Badge>}
          </div>
          <div className="text-2xs text-ink-500 mt-0.5">{role}</div>
          <div className="mt-2 flex items-center gap-3 text-2xs">
            <span className="text-ink-500">Computed OAR:</span>
            <span className="font-mono font-semibold text-navy-700">
              {computedOar !== null ? computedOar.toFixed(2) : "—"}
            </span>
            {computedBand && (
              <Badge tone={OAR_BAND_META[computedBand].tone}>
                {OAR_BAND_META[computedBand].label}
              </Badge>
            )}
          </div>
          {confirmed?.rationale && (
            <div className="mt-2 text-2xs text-ink-700 italic">"{confirmed.rationale}"</div>
          )}
        </div>

        {/* Band picker */}
        <div className="border-l border-ink-200 p-4 flex items-center gap-2">
          {OAR_BANDS.map((band) => {
            const isFinal = finalBand === band;
            const meta = OAR_BAND_META[band];
            return (
              <button
                key={band}
                disabled={disabled}
                onClick={() => {
                  if (expanded && band !== finalBand) {
                    onSetBand(band, rationale);
                  } else if (!expanded) {
                    setExpanded(true);
                    if (!confirmed) onSetBand(band, "");
                  } else {
                    onSetBand(band, rationale);
                  }
                }}
                className={cn(
                  "px-2.5 py-1.5 rounded text-2xs font-medium border transition-all min-w-[80px]",
                  isFinal
                    ? bandActiveClass(meta.tone)
                    : "bg-white text-ink-500 border-ink-200 hover:border-ink-300",
                  disabled && "opacity-50 cursor-not-allowed",
                )}
                title={meta.description}
              >
                {meta.label}
              </button>
            );
          })}
          <button
            onClick={() => setExpanded(!expanded)}
            disabled={disabled || !confirmed}
            className="ml-1 text-ink-400 hover:text-navy-700 disabled:opacity-30"
            title="Edit rationale"
          >
            <Award size={14} />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="px-4 py-3 border-t border-ink-200 bg-ink-100/30">
          <label className="text-2xs uppercase tracking-wider font-semibold text-ink-500 block mb-1.5">
            Rationale {isOverride && <span className="text-ocean-700">(override)</span>}
          </label>
          <div className="flex gap-2">
            <textarea
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              placeholder="Why this band? Especially for overrides."
              rows={2}
              className="flex-1 px-3 py-2 text-xs border border-ink-200 rounded-md focus:outline-none focus:ring-2 focus:ring-ocean-600/20 focus:border-ocean-400 resize-none"
            />
            <div className="flex flex-col gap-1">
              <Button size="sm" variant="primary" onClick={() => {
                if (finalBand) onSetBand(finalBand, rationale);
                setExpanded(false);
              }}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setExpanded(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function bandActiveClass(tone: "red" | "amber" | "ocean" | "green" | "navy"): string {
  return {
    red:    "bg-red-50 text-red-700 border-red-300",
    amber:  "bg-amber-50 text-amber-700 border-amber-400",
    ocean:  "bg-ocean-50 text-ocean-800 border-ocean-300",
    green:  "bg-green-50 text-green-700 border-green-300",
    navy:   "bg-navy-100 text-navy-700 border-navy-200",
  }[tone];
}
