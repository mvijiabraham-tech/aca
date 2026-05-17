import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import {
  ArrowRight, Plus, Trash2, ChevronDown, ChevronRight,
  Users, Upload, AlertCircle, Download, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field, TextInput, NumberInput } from "@/components/ui/Form";
import { StepPageHeader } from "@/components/StepPageHeader";
import { useEngagement, useAppStore } from "@/lib/store";
import { parseCSV, parseParticipantsCSV, downloadCSVTemplate } from "@/lib/csv-import";
import type { Participant } from "@/types";

export function StepParticipants() {
  const { engagementId } = useParams<{ engagementId: string }>();
  const navigate = useNavigate();
  const engagement = useEngagement(engagementId);
  const setParticipants = useAppStore((s) => s.setParticipants);
  const setStepStatus = useAppStore((s) => s.setStepStatus);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [csvMessage, setCsvMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const participants = engagement?.participants ?? [];
  const tools = engagement?.tools ?? [];
  const cohortSize = engagement?.basics.cohortSize ?? 0;
  const allMapped = participants.every((p) => p.toolIds.length === tools.length);

  // Auto-compute step status
  useEffect(() => {
    if (!engagement) return;
    if (participants.length === 0) {
      setStepStatus(engagement.id, "participants", "not_started", undefined);
    } else if (cohortSize > 0 && participants.length < cohortSize) {
      setStepStatus(engagement.id, "participants", "in_progress",
        `${participants.length} of ${cohortSize} expected · ${cohortSize - participants.length} to add`);
    } else if (!allMapped) {
      const unmapped = participants.filter((p) => p.toolIds.length < tools.length).length;
      setStepStatus(engagement.id, "participants", "in_progress",
        `${participants.length} participants · ${unmapped} with partial tool mapping`);
    } else {
      setStepStatus(engagement.id, "participants", "complete",
        `${participants.length} participants · all mapped`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participants.length, cohortSize, allMapped]);

  if (!engagement || !engagementId) return null;

  function addParticipant() {
    if (!engagement) return;
    const newP: Participant = {
      id: `p-${Date.now().toString(36)}`,
      name: "",
      currentRole: engagement.basics.audience.split("—")[0]?.trim() ?? "",
      // Default-map to all engagement tools
      toolIds: tools.map((t) => t.id),
    };
    setParticipants(engagement.id, [...participants, newP]);
    setExpandedId(newP.id);
  }

  function updateParticipant(id: string, patch: Partial<Participant>) {
    if (!engagement) return;
    setParticipants(engagement.id, participants.map((p) => p.id === id ? { ...p, ...patch } : p));
  }

  function removeParticipant(id: string) {
    if (!engagement) return;
    setParticipants(engagement.id, participants.filter((p) => p.id !== id));
  }

  function toggleToolMapping(participantId: string, toolId: string) {
    const p = participants.find((x) => x.id === participantId);
    if (!p) return;
    const ids = p.toolIds.includes(toolId)
      ? p.toolIds.filter((t) => t !== toolId)
      : [...p.toolIds, toolId];
    updateParticipant(participantId, { toolIds: ids });
  }

  function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !engagement) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const rows = parseCSV(text);
      if (rows.length === 0) {
        setCsvMessage({ type: "error", text: "CSV is empty or has no data rows." });
        return;
      }
      const { data, errors } = parseParticipantsCSV(rows, tools.map((t) => t.id));
      if (errors.length > 0) {
        setCsvMessage({ type: "error", text: errors.join(" · ") });
      }
      if (data.length > 0) {
        setParticipants(engagement.id, [...participants, ...data]);
        setCsvMessage({ type: "success", text: `${data.length} participant${data.length === 1 ? "" : "s"} imported.${errors.length > 0 ? ` ${errors.length} row(s) skipped.` : ""}` });
      } else if (errors.length > 0) {
        // Only errors, no success — message already set above
      }
    };
    reader.readAsText(file);
    // Reset so same file can be re-uploaded
    e.target.value = "";
  }

  // Empty state — needs tools first
  if (tools.length === 0) {
    return (
      <div className="space-y-6">
        <StepPageHeader engagementId={engagementId} stepKey="participants" />
        <Card>
          <CardBody className="py-12">
            <div className="max-w-lg mx-auto text-center">
              <div className="w-14 h-14 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto mb-5">
                <AlertCircle size={26} />
              </div>
              <h2 className="display-serif text-2xl font-semibold text-navy-700">Configure tools first</h2>
              <p className="text-sm text-ink-500 mt-3 leading-relaxed">
                Participants are mapped to tools — set up at least one tool before adding participants.
              </p>
              <div className="mt-6 flex justify-center gap-2">
                <Button variant="primary" onClick={() => navigate(`/engagement/${engagementId}/setup/tools`)}>
                  Go to Step 4: Tools
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StepPageHeader engagementId={engagementId} stepKey="participants" />

      {/* CSV upload */}
      <Card className="border-ocean-200/60 bg-ocean-50/30">
        <CardBody className="py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-ocean-100 text-ocean-700 flex items-center justify-center flex-shrink-0">
              <Upload size={16} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-navy-700">Bulk import via CSV</div>
              <div className="text-2xs text-ink-500 mt-0.5">
                Upload a CSV with columns: name, employee_id, current_role, business_unit, location, email, years_in_role
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleCSVUpload}
            />
            <Button variant="ghost" size="sm" onClick={() => downloadCSVTemplate("participants")}>
              <Download size={12} /> Template
            </Button>
            <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload size={12} /> Upload CSV
            </Button>
          </div>
        </CardBody>
      </Card>

      {csvMessage && (
        <div className={cn(
          "rounded-lg border px-4 py-3 text-sm flex items-start gap-2",
          csvMessage.type === "success"
            ? "bg-green-50 border-green-300 text-green-800"
            : "bg-amber-50 border-amber-300 text-amber-800",
        )}>
          {csvMessage.type === "success" ? <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" /> : <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />}
          <span>{csvMessage.text}</span>
        </div>
      )}

      {/* Summary band */}
      <Card>
        <CardBody className="py-4">
          <div className="flex items-stretch divide-x divide-ink-200">
            <div className="flex-1 px-4">
              <div className="text-2xs text-ink-500 uppercase tracking-wider font-medium">Added</div>
              <div className="text-2xl font-semibold text-navy-700 mt-0.5">{participants.length}</div>
            </div>
            <div className="flex-1 px-4">
              <div className="text-2xs text-ink-500 uppercase tracking-wider font-medium">Expected</div>
              <div className="text-2xl font-semibold text-navy-700 mt-0.5">{cohortSize || "—"}</div>
            </div>
            <div className="flex-1 px-4">
              <div className="text-2xs text-ink-500 uppercase tracking-wider font-medium">Fully mapped</div>
              <div className="text-2xl font-semibold text-navy-700 mt-0.5">
                {participants.filter((p) => p.toolIds.length === tools.length).length}/{participants.length}
              </div>
            </div>
            <div className="flex-1 px-4">
              <div className="text-2xs text-ink-500 uppercase tracking-wider font-medium">Total tool slots</div>
              <div className="text-2xl font-semibold text-navy-700 mt-0.5">
                {participants.reduce((sum, p) => sum + p.toolIds.length, 0)}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Participant list */}
      <div className="space-y-3">
        {participants.map((p, idx) => {
          const expanded = expandedId === p.id;
          const isFullyMapped = p.toolIds.length === tools.length;
          return (
            <Card key={p.id}>
              <button
                className="w-full text-left p-4 flex items-center gap-4"
                onClick={() => setExpandedId(expanded ? null : p.id)}
              >
                <div className="w-9 h-9 rounded-md bg-ink-100 text-ink-700 flex items-center justify-center flex-shrink-0 text-sm font-mono font-semibold">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-navy-700 truncate">
                      {p.name || <span className="text-ink-400">Unnamed participant</span>}
                    </h3>
                    {p.employeeId && <Badge tone="neutral">{p.employeeId}</Badge>}
                    {!isFullyMapped && <Badge tone="amber">{p.toolIds.length}/{tools.length} tools</Badge>}
                  </div>
                  <div className="flex items-center gap-2.5 text-2xs text-ink-500 mt-0.5">
                    {p.currentRole && <span>{p.currentRole}</span>}
                    {p.businessUnit && <><span className="text-ink-300">·</span><span>{p.businessUnit}</span></>}
                    {p.location && <><span className="text-ink-300">·</span><span>{p.location}</span></>}
                  </div>
                </div>
                {expanded ? <ChevronDown size={16} className="text-ink-400" /> : <ChevronRight size={16} className="text-ink-400" />}
              </button>

              {expanded && (
                <div className="border-t border-ink-200 bg-ink-100/30 p-5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Name" required>
                      <TextInput
                        value={p.name}
                        onChange={(e) => updateParticipant(p.id, { name: e.target.value })}
                        placeholder="e.g. Ankit Sharma"
                      />
                    </Field>
                    <Field label="Employee ID">
                      <TextInput
                        value={p.employeeId ?? ""}
                        onChange={(e) => updateParticipant(p.id, { employeeId: e.target.value })}
                        placeholder="e.g. FC-1042"
                      />
                    </Field>
                    <Field label="Current role" required>
                      <TextInput
                        value={p.currentRole}
                        onChange={(e) => updateParticipant(p.id, { currentRole: e.target.value })}
                        placeholder="e.g. Cluster Manager"
                      />
                    </Field>
                    <Field label="Business unit">
                      <TextInput
                        value={p.businessUnit ?? ""}
                        onChange={(e) => updateParticipant(p.id, { businessUnit: e.target.value })}
                        placeholder="e.g. South Zone"
                      />
                    </Field>
                    <Field label="Location">
                      <TextInput
                        value={p.location ?? ""}
                        onChange={(e) => updateParticipant(p.id, { location: e.target.value })}
                        placeholder="e.g. Bangalore"
                      />
                    </Field>
                    <Field label="Email">
                      <TextInput
                        value={p.email ?? ""}
                        onChange={(e) => updateParticipant(p.id, { email: e.target.value })}
                        placeholder="name@company.com"
                      />
                    </Field>
                    <Field label="Years in role">
                      <NumberInput
                        value={p.yearsInRole ?? ""}
                        onChange={(e) => updateParticipant(p.id, { yearsInRole: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                        min={0}
                        max={30}
                        className="max-w-[120px]"
                      />
                    </Field>
                  </div>

                  {/* Tool mapping */}
                  <Field label="Tools this participant will attempt" hint="Default: all engagement tools. Uncheck any the participant skips.">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {tools.map((t) => {
                        const checked = p.toolIds.includes(t.id);
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => toggleToolMapping(p.id, t.id)}
                            className={cn(
                              "flex items-center gap-3 p-2.5 rounded-md border text-left transition-colors",
                              checked ? "border-ocean-300 bg-ocean-50/40" : "border-ink-200 bg-white hover:bg-ink-100/40",
                            )}
                          >
                            <div className={cn(
                              "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0",
                              checked ? "bg-ocean-600 border-ocean-600" : "border-ink-300 bg-white",
                            )}>
                              {checked && <div className="w-1.5 h-1.5 bg-white rounded-sm" />}
                            </div>
                            <div className="text-sm text-navy-700 truncate">{t.name}</div>
                          </button>
                        );
                      })}
                    </div>
                  </Field>

                  <div className="pt-2 flex justify-end">
                    <Button variant="ghost" size="sm" onClick={() => removeParticipant(p.id)}>
                      <Trash2 size={12} /> Remove participant
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}

        <Card interactive>
          <button onClick={addParticipant} className="w-full p-5 text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-ocean-50 text-ocean-700 flex items-center justify-center">
                <Plus size={18} />
              </div>
              <div>
                <div className="text-sm font-semibold text-navy-700">Add participant</div>
                <div className="text-2xs text-ink-500 mt-0.5">
                  {participants.length === 0 ? "Add the first participant." : `${cohortSize > 0 ? cohortSize - participants.length : "—"} more to reach expected cohort.`}
                </div>
              </div>
            </div>
          </button>
        </Card>
      </div>

      {/* Footer nav */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="secondary" onClick={() => navigate(`/engagement/${engagementId}/setup/assessors`)}>
          Back to Assessors
        </Button>
        <Button
          variant="primary"
          onClick={() => navigate(`/engagement/${engagementId}/setup/schedule`)}
          disabled={participants.length === 0}
        >
          Continue to Schedule <ArrowRight size={13} />
        </Button>
      </div>
    </div>
  );
}

// Tiny visual indicator
export function _Users() { return <Users />; }
