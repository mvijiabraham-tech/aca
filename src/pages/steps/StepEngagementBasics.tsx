import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { CheckCircle2, ArrowRight, Save } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Field, TextInput, NumberInput, DateInput, TextArea, Select,
  RadioGroup, Checkbox,
} from "@/components/ui/Form";
import { StepPageHeader } from "@/components/StepPageHeader";
import { useEngagement, useAppStore } from "@/lib/store";
import type { EngagementBasics, EngagementPurpose, EngagementMode } from "@/types";

export function StepEngagementBasics() {
  const { engagementId } = useParams<{ engagementId: string }>();
  const navigate = useNavigate();
  const engagement = useEngagement(engagementId);
  const updateBasics = useAppStore((s) => s.updateBasics);
  const setStepStatus = useAppStore((s) => s.setStepStatus);

  // Local form state — debounced sync to store
  const [draft, setDraft] = useState<EngagementBasics | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    if (engagement && !draft) setDraft(engagement.basics);
  }, [engagement, draft]);

  // Debounced save — runs 600ms after the last change
  useEffect(() => {
    if (!draft || !engagement) return;
    const t = setTimeout(() => {
      updateBasics(engagement.id, draft);
      setLastSaved(new Date());
      // Update step status based on required-field completeness
      const completion = computeCompletion(draft);
      setStepStatus(
        engagement.id,
        "engagement",
        completion.complete ? "complete" : "in_progress",
        completion.summary,
      );
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const requiredFields = useMemo(() => {
    if (!draft) return { complete: 0, total: 0, missing: [] };
    return computeRequired(draft);
  }, [draft]);

  if (!engagement || !draft) return null;
  if (!engagementId) return null;

  function update<K extends keyof EngagementBasics>(key: K, value: EngagementBasics[K]) {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  }

  function updateDeliverable(key: keyof NonNullable<EngagementBasics["deliverables"]>, value: boolean) {
    setDraft((d) => d ? {
      ...d,
      deliverables: { ...(d.deliverables ?? { individualReports: false, groupReport: false, feedbackSessions: false, talentReview: false }), [key]: value }
    } : d);
  }

  return (
    <div className="space-y-6">
      <StepPageHeader
        engagementId={engagementId}
        stepKey="engagement"
        actions={
          <SaveIndicator lastSaved={lastSaved} />
        }
      />

      {/* Completion bar */}
      <div className="bg-white rounded-lg border border-ink-200 px-5 py-3 flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between text-xs text-ink-500 mb-1.5">
            <span>Required fields</span>
            <span className="font-mono">{requiredFields.complete} of {requiredFields.total}</span>
          </div>
          <div className="h-1 bg-ink-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-ocean-600 transition-all duration-300 rounded-full"
              style={{ width: `${(requiredFields.complete / Math.max(1, requiredFields.total)) * 100}%` }}
            />
          </div>
        </div>
        {requiredFields.missing.length > 0 && (
          <div className="text-2xs text-ink-500">
            Missing: <span className="text-amber-700 font-medium">{requiredFields.missing.slice(0, 3).join(", ")}</span>
            {requiredFields.missing.length > 3 && <span> +{requiredFields.missing.length - 3} more</span>}
          </div>
        )}
      </div>

      {/* Identity */}
      <Card>
        <div className="px-5 py-3 border-b border-ink-200 bg-ink-100/30">
          <h3 className="text-sm font-semibold text-navy-700">Identity</h3>
          <p className="text-2xs text-ink-500 mt-0.5">What this engagement is and who it's for.</p>
        </div>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Engagement name" required>
              <TextInput
                value={draft.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="e.g. FirstCry — Cluster Manager AC"
              />
            </Field>
            <Field label="Engagement code" required hint="Used as a short identifier for files and reports.">
              <TextInput
                value={draft.code}
                onChange={(e) => update("code", e.target.value.toUpperCase())}
                placeholder="FC-CM-2026-11"
                className="font-mono"
              />
            </Field>
            <Field label="Client / company" required>
              <TextInput
                value={draft.client}
                onChange={(e) => update("client", e.target.value)}
                placeholder="FirstCry"
              />
            </Field>
            <Field label="Client sponsor" hint="The accountable person on the client side.">
              <TextInput
                value={draft.clientSponsor ?? ""}
                onChange={(e) => update("clientSponsor", e.target.value)}
                placeholder="e.g. Renu Iyer"
              />
            </Field>
            <Field label="Synovate engagement lead" required>
              <TextInput
                value={draft.synovateEngagementLead ?? ""}
                onChange={(e) => update("synovateEngagementLead", e.target.value)}
                placeholder="e.g. MV"
              />
            </Field>
            <Field label="Target audience" required hint="The role or cohort being assessed.">
              <TextInput
                value={draft.audience ?? ""}
                onChange={(e) => update("audience", e.target.value)}
                placeholder="e.g. Cluster Managers — Retail Operations"
              />
            </Field>
          </div>
        </CardBody>
      </Card>

      {/* Purpose */}
      <Card>
        <div className="px-5 py-3 border-b border-ink-200 bg-ink-100/30">
          <h3 className="text-sm font-semibold text-navy-700">Purpose</h3>
          <p className="text-2xs text-ink-500 mt-0.5">Why this AC is being run. Drives default proficiency targets in Step 3.</p>
        </div>
        <CardBody className="space-y-4">
          <Field label="Engagement purpose" required>
            <RadioGroup<EngagementPurpose>
              value={draft.purpose}
              onChange={(v) => update("purpose", v)}
              options={[
                { value: "selection", label: "Selection", description: "Hiring or selection decisions." },
                { value: "promotion", label: "Promotion", description: "Readiness for next role." },
                { value: "development", label: "Development", description: "Growth and learning focus." },
                { value: "hi_po", label: "Hi-Po Identification", description: "Spot high-potential talent." },
              ]}
            />
          </Field>

          <Field label="Objective" required hint="Two to three lines describing what success looks like.">
            <TextArea
              value={draft.objective ?? ""}
              onChange={(e) => update("objective", e.target.value)}
              placeholder="e.g. Identify Cluster Managers ready for Area Cluster Lead within 12 months, and create targeted development plans for the rest."
              rows={3}
            />
          </Field>
        </CardBody>
      </Card>

      {/* Scope & dates */}
      <Card>
        <div className="px-5 py-3 border-b border-ink-200 bg-ink-100/30">
          <h3 className="text-sm font-semibold text-navy-700">Scope & dates</h3>
          <p className="text-2xs text-ink-500 mt-0.5">Size, format, and when this engagement runs.</p>
        </div>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Cohort size" required>
              <NumberInput
                value={draft.cohortSize ?? ""}
                onChange={(e) => update("cohortSize", e.target.value ? parseInt(e.target.value, 10) : undefined)}
                placeholder="8"
                min={1}
              />
            </Field>
            <Field label="Engagement start" required>
              <DateInput
                value={draft.startDate ?? ""}
                onChange={(e) => update("startDate", e.target.value)}
              />
            </Field>
            <Field label="Engagement end" required>
              <DateInput
                value={draft.endDate ?? ""}
                onChange={(e) => update("endDate", e.target.value)}
              />
            </Field>
          </div>

          <Field label="Mode" required>
            <RadioGroup<EngagementMode>
              value={draft.mode}
              onChange={(v) => update("mode", v)}
              options={[
                { value: "in_person", label: "In-person" },
                { value: "virtual", label: "Virtual" },
                { value: "hybrid", label: "Hybrid" },
              ]}
            />
          </Field>

          <Field label="AC date range" hint="The specific days the assessment runs, within the engagement window.">
            <TextInput
              value={draft.acDateRange ?? ""}
              onChange={(e) => update("acDateRange", e.target.value)}
              placeholder="e.g. Nov 18-20"
            />
          </Field>

          <Field label="Languages" hint="Default English. Add a regional language if participant-facing materials need it.">
            <TextInput
              value={(draft.languages ?? []).join(", ")}
              onChange={(e) => update("languages", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
              placeholder="English, Hindi"
            />
          </Field>
        </CardBody>
      </Card>

      {/* Deliverables */}
      <Card>
        <div className="px-5 py-3 border-b border-ink-200 bg-ink-100/30">
          <h3 className="text-sm font-semibold text-navy-700">Agreed deliverables</h3>
          <p className="text-2xs text-ink-500 mt-0.5">What Synovate will produce. Each deliverable enables related downstream work.</p>
        </div>
        <CardBody className="space-y-3">
          <Checkbox
            checked={draft.deliverables?.individualReports ?? false}
            onChange={(v) => updateDeliverable("individualReports", v)}
            label="Individual participant reports"
            description="One report per participant with their competency profile and development areas."
          />
          <Checkbox
            checked={draft.deliverables?.groupReport ?? false}
            onChange={(v) => updateDeliverable("groupReport", v)}
            label="Group / cohort report"
            description="Aggregate view for talent discussions with leadership."
          />
          <Checkbox
            checked={draft.deliverables?.feedbackSessions ?? false}
            onChange={(v) => updateDeliverable("feedbackSessions", v)}
            label="1:1 feedback sessions"
            description="Coach-led conversations with each participant after the AC."
          />
          <Checkbox
            checked={draft.deliverables?.talentReview ?? false}
            onChange={(v) => updateDeliverable("talentReview", v)}
            label="Talent review session"
            description="Structured discussion with client leadership on cohort outcomes."
          />
        </CardBody>
      </Card>

      {/* Internal */}
      <Card>
        <div className="px-5 py-3 border-b border-ink-200 bg-ink-100/30">
          <h3 className="text-sm font-semibold text-navy-700">Internal notes</h3>
          <p className="text-2xs text-ink-500 mt-0.5">Optional. For Synovate eyes only.</p>
        </div>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Confidentiality requirements" hint="Special handling notes — common for BFSI engagements.">
              <Select
                value={draft.confidentialityFlag ? "yes" : "no"}
                onChange={(e) => update("confidentialityFlag", e.target.value === "yes")}
              >
                <option value="no">Standard handling</option>
                <option value="yes">Heightened — see notes</option>
              </Select>
            </Field>
            {draft.confidentialityFlag && (
              <Field label="Confidentiality notes">
                <TextInput
                  value={draft.confidentialityNotes ?? ""}
                  onChange={(e) => update("confidentialityNotes", e.target.value)}
                  placeholder="e.g. Data residency: India only"
                />
              </Field>
            )}
          </div>
          <Field label="Notes">
            <TextArea
              value={draft.internalNotes ?? ""}
              onChange={(e) => update("internalNotes", e.target.value)}
              placeholder="Anything worth remembering about this engagement."
              rows={3}
            />
          </Field>
        </CardBody>
      </Card>

      {/* Footer nav */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="secondary" onClick={() => navigate(`/engagement/${engagementId}/setup`)}>
          Back to Setup
        </Button>
        <Button
          variant="primary"
          onClick={() => navigate(`/engagement/${engagementId}/setup/competencies`)}
        >
          Continue to Competencies <ArrowRight size={13} />
        </Button>
      </div>
    </div>
  );
}

// ---------- Save indicator ----------
function SaveIndicator({ lastSaved }: { lastSaved: Date | null }) {
  if (!lastSaved) {
    return (
      <Badge tone="neutral">
        <Save size={11} /> Auto-saves as you type
      </Badge>
    );
  }
  return (
    <Badge tone="green">
      <CheckCircle2 size={11} /> Saved {formatTime(lastSaved)}
    </Badge>
  );
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// ---------- Completion logic ----------
function computeRequired(b: EngagementBasics): { complete: number; total: number; missing: string[] } {
  const checks: { label: string; ok: boolean }[] = [
    { label: "name",                 ok: !!b.name?.trim() },
    { label: "code",                 ok: !!b.code?.trim() },
    { label: "client",               ok: !!b.client?.trim() },
    { label: "engagement lead",      ok: !!b.synovateEngagementLead?.trim() },
    { label: "audience",             ok: !!b.audience?.trim() },
    { label: "purpose",              ok: !!b.purpose },
    { label: "objective",            ok: !!b.objective?.trim() },
    { label: "cohort size",          ok: !!b.cohortSize },
    { label: "mode",                 ok: !!b.mode },
    { label: "start date",           ok: !!b.startDate },
    { label: "end date",             ok: !!b.endDate },
    { label: "at least one deliverable", ok: !!(b.deliverables && Object.values(b.deliverables).some(Boolean)) },
  ];
  return {
    complete: checks.filter((c) => c.ok).length,
    total: checks.length,
    missing: checks.filter((c) => !c.ok).map((c) => c.label),
  };
}

function computeCompletion(b: EngagementBasics): { complete: boolean; summary: string } {
  const r = computeRequired(b);
  if (r.complete === r.total) {
    const parts: string[] = [b.client];
    if (b.audience) parts.push(b.audience.split("—")[0].trim());
    if (b.acDateRange) parts.push(b.acDateRange);
    return { complete: true, summary: parts.join(" · ") };
  }
  return { complete: false, summary: `${r.complete} of ${r.total} required fields` };
}
