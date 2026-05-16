import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  ArrowRight, Plus, Trash2, ChevronDown, ChevronRight,
  UserCheck, ShieldCheck, AlertCircle, Mail,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field, TextInput, Select, Checkbox } from "@/components/ui/Form";
import { StepPageHeader } from "@/components/StepPageHeader";
import { useEngagement, useAppStore } from "@/lib/store";
import type { Assessor, AssessorRole } from "@/types";

const ROLE_META: Record<AssessorRole, { label: string; description: string; tone: "navy" | "ocean" | "neutral" }> = {
  lead:     { label: "Lead Assessor", description: "Runs calibration. Final say in disagreements.",     tone: "navy"    },
  assessor: { label: "Assessor",      description: "Rates participants across assigned tools.",         tone: "ocean"   },
  observer: { label: "Observer",      description: "Rates a subset; usually client-side stakeholders.", tone: "neutral" },
};

export function StepAssessors() {
  const { engagementId } = useParams<{ engagementId: string }>();
  const navigate = useNavigate();
  const engagement = useEngagement(engagementId);
  const setAssessors = useAppStore((s) => s.setAssessors);
  const setStepStatus = useAppStore((s) => s.setStepStatus);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const assessors = engagement?.assessors ?? [];
  const tools = engagement?.tools ?? [];
  const leadCount = assessors.filter((a) => a.role === "lead").length;
  const unassignedCount = assessors.filter((a) => a.assignedToolIds.length === 0).length;
  const uncalibratedCount = assessors.filter((a) => !a.calibrated).length;

  // Auto-compute step status
  useEffect(() => {
    if (!engagement) return;
    if (assessors.length === 0) {
      setStepStatus(engagement.id, "assessors", "not_started", undefined);
    } else if (leadCount === 0 || unassignedCount > 0) {
      setStepStatus(engagement.id, "assessors", "in_progress",
        leadCount === 0 ? "Lead Assessor needed" : `${unassignedCount} assessor${unassignedCount === 1 ? "" : "s"} unassigned`);
    } else {
      const summary = `${assessors.length} assessor${assessors.length === 1 ? "" : "s"} · ${leadCount} Lead`;
      setStepStatus(engagement.id, "assessors", "complete", summary);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessors.length, leadCount, unassignedCount]);

  if (!engagement || !engagementId) return null;

  function addAssessor() {
    if (!engagement) return;
    const newA: Assessor = {
      id: `a-${Date.now().toString(36)}`,
      name: "",
      email: "",
      role: assessors.length === 0 ? "lead" : "assessor",
      organisation: "Synovate",
      calibrated: false,
      assignedToolIds: [],
    };
    setAssessors(engagement.id, [...assessors, newA]);
    setExpandedId(newA.id);
  }

  function updateAssessor(id: string, patch: Partial<Assessor>) {
    if (!engagement) return;
    setAssessors(engagement.id, assessors.map((a) => a.id === id ? { ...a, ...patch } : a));
  }

  function removeAssessor(id: string) {
    if (!engagement) return;
    setAssessors(engagement.id, assessors.filter((a) => a.id !== id));
  }

  function toggleToolAssignment(assessorId: string, toolId: string) {
    const a = assessors.find((x) => x.id === assessorId);
    if (!a) return;
    const ids = a.assignedToolIds.includes(toolId)
      ? a.assignedToolIds.filter((t) => t !== toolId)
      : [...a.assignedToolIds, toolId];
    updateAssessor(assessorId, { assignedToolIds: ids });
  }

  // Empty state: no tools yet — they need Step 4 first
  if (tools.length === 0) {
    return (
      <div className="space-y-6">
        <StepPageHeader engagementId={engagementId} stepKey="assessors" />
        <Card>
          <CardBody className="py-12">
            <div className="max-w-lg mx-auto text-center">
              <div className="w-14 h-14 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto mb-5">
                <AlertCircle size={26} />
              </div>
              <h2 className="display-serif text-2xl font-semibold text-navy-700">Configure tools first</h2>
              <p className="text-sm text-ink-500 mt-3 leading-relaxed">
                Assessors are assigned to specific tools — so you need at least one tool configured before you can add assessors.
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
      <StepPageHeader engagementId={engagementId} stepKey="assessors" />

      {/* Summary band */}
      <Card>
        <CardBody className="py-4">
          <div className="flex items-stretch divide-x divide-ink-200">
            <div className="flex-1 px-4">
              <div className="text-2xs text-ink-500 uppercase tracking-wider font-medium">Total</div>
              <div className="text-2xl font-semibold text-navy-700 mt-0.5">{assessors.length}</div>
            </div>
            <div className="flex-1 px-4">
              <div className="text-2xs text-ink-500 uppercase tracking-wider font-medium">Lead</div>
              <div className={cn("text-2xl font-semibold mt-0.5", leadCount === 0 ? "text-amber-600" : "text-navy-700")}>{leadCount}</div>
            </div>
            <div className="flex-1 px-4">
              <div className="text-2xs text-ink-500 uppercase tracking-wider font-medium">Calibrated</div>
              <div className="text-2xl font-semibold text-navy-700 mt-0.5">{assessors.length - uncalibratedCount}/{assessors.length}</div>
            </div>
            <div className="flex-1 px-4">
              <div className="text-2xs text-ink-500 uppercase tracking-wider font-medium">Unassigned</div>
              <div className={cn("text-2xl font-semibold mt-0.5", unassignedCount > 0 ? "text-amber-600" : "text-navy-700")}>{unassignedCount}</div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Assessor list */}
      <div className="space-y-3">
        {assessors.map((a) => {
          const expanded = expandedId === a.id;
          return (
            <Card key={a.id} className={cn(a.assignedToolIds.length === 0 && "border-amber-300/60")}>
              {/* Header row */}
              <button
                className="w-full text-left p-4 flex items-center gap-4"
                onClick={() => setExpandedId(expanded ? null : a.id)}
              >
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                  a.role === "lead" ? "bg-navy-100 text-navy-700" :
                  a.role === "assessor" ? "bg-ocean-100 text-ocean-700" :
                  "bg-ink-100 text-ink-500"
                )}>
                  {a.role === "lead" ? <ShieldCheck size={18} /> : <UserCheck size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-navy-700 truncate">
                      {a.name || <span className="text-ink-400">Unnamed assessor</span>}
                    </h3>
                    <Badge tone={ROLE_META[a.role].tone}>{ROLE_META[a.role].label}</Badge>
                    {a.calibrated && <Badge tone="green">Calibrated</Badge>}
                    {a.assignedToolIds.length === 0 && <Badge tone="amber">No tools assigned</Badge>}
                  </div>
                  <div className="flex items-center gap-3 text-2xs text-ink-500 mt-0.5">
                    {a.email && <span className="inline-flex items-center gap-1"><Mail size={10} /> {a.email}</span>}
                    {a.organisation && <span>· {a.organisation}</span>}
                    <span>· {a.assignedToolIds.length} of {tools.length} tools</span>
                  </div>
                </div>
                {expanded ? <ChevronDown size={16} className="text-ink-400" /> : <ChevronRight size={16} className="text-ink-400" />}
              </button>

              {expanded && (
                <div className="border-t border-ink-200 bg-ink-100/30 p-5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Name" required>
                      <TextInput
                        value={a.name}
                        onChange={(e) => updateAssessor(a.id, { name: e.target.value })}
                        placeholder="e.g. Dr. Anita Rao"
                      />
                    </Field>
                    <Field label="Email" required>
                      <TextInput
                        value={a.email}
                        onChange={(e) => updateAssessor(a.id, { email: e.target.value })}
                        placeholder="name@organisation.com"
                      />
                    </Field>
                    <Field label="Role" required>
                      <Select
                        value={a.role}
                        onChange={(e) => updateAssessor(a.id, { role: e.target.value as AssessorRole })}
                      >
                        <option value="lead">Lead Assessor</option>
                        <option value="assessor">Assessor</option>
                        <option value="observer">Observer</option>
                      </Select>
                    </Field>
                    <Field label="Organisation">
                      <TextInput
                        value={a.organisation}
                        onChange={(e) => updateAssessor(a.id, { organisation: e.target.value })}
                        placeholder="Synovate / Client / Partner"
                      />
                    </Field>
                  </div>

                  {/* Calibration */}
                  <Checkbox
                    checked={a.calibrated}
                    onChange={(v) => updateAssessor(a.id, { calibrated: v })}
                    label="Calibrated for this engagement"
                    description="Has completed pre-AC calibration on the competency framework and tools."
                  />

                  {/* Tool assignments */}
                  <Field label="Assigned tools" required hint={`Select which tools ${a.name || "this assessor"} will rate.`}>
                    <div className="space-y-2">
                      {tools.map((t) => {
                        const checked = a.assignedToolIds.includes(t.id);
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => toggleToolAssignment(a.id, t.id)}
                            className={cn(
                              "w-full flex items-center gap-3 p-2.5 rounded-md border text-left transition-colors",
                              checked ? "border-ocean-300 bg-ocean-50/40" : "border-ink-200 bg-white hover:bg-ink-100/40",
                            )}
                          >
                            <div className={cn(
                              "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0",
                              checked ? "bg-ocean-600 border-ocean-600" : "border-ink-300 bg-white",
                            )}>
                              {checked && <div className="w-1.5 h-1.5 bg-white rounded-sm" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-navy-700">{t.name}</div>
                              <div className="text-2xs text-ink-500 mt-0.5">
                                {t.durationMinutes}m · {t.competencyIds.length} competencies
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </Field>

                  <div className="pt-2 flex justify-end">
                    <Button variant="ghost" size="sm" onClick={() => removeAssessor(a.id)}>
                      <Trash2 size={12} /> Remove assessor
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}

        <Card interactive>
          <button onClick={addAssessor} className="w-full p-5 text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-ocean-50 text-ocean-700 flex items-center justify-center">
                <Plus size={18} />
              </div>
              <div>
                <div className="text-sm font-semibold text-navy-700">Add assessor</div>
                <div className="text-2xs text-ink-500 mt-0.5">
                  {assessors.length === 0 ? "Start with the Lead Assessor — they'll run calibration." : "Add another rater for this engagement."}
                </div>
              </div>
            </div>
          </button>
        </Card>
      </div>

      {/* Footer nav */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="secondary" onClick={() => navigate(`/engagement/${engagementId}/setup/aggregation`)}>
          Back to Aggregation
        </Button>
        <Button variant="primary" onClick={() => navigate(`/engagement/${engagementId}/setup/participants`)}>
          Continue to Participants <ArrowRight size={13} />
        </Button>
      </div>
    </div>
  );
}
