import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight, Plus, Trash2, AlertCircle, AlertTriangle,
  CalendarDays, Clock, Users, MapPin, Zap, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field, TextInput, Select } from "@/components/ui/Form";
import { StepPageHeader } from "@/components/StepPageHeader";
import { useEngagement, useAppStore } from "@/lib/store";
import { generateSchedule } from "@/lib/schedule";
import type { UnscheduledItem } from "@/lib/schedule";
import type { ScheduleSlot } from "@/types";

interface Conflict {
  slotId: string;
  kind: "participant_double_booked" | "assessor_double_booked";
  entityId: string;
  conflictingSlotIds: string[];
}

function detectConflicts(slots: ScheduleSlot[]): Conflict[] {
  const conflicts: Conflict[] = [];
  // For each pair of overlapping slots, find common participants or assessors
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const a = slots[i]; const b = slots[j];
      if (a.day !== b.day) continue;
      // Time overlap test (string compare works for "HH:MM")
      const overlap = a.startTime < b.endTime && b.startTime < a.endTime;
      if (!overlap) continue;
      // Participant overlaps
      a.participantIds.forEach((pid) => {
        if (b.participantIds.includes(pid)) {
          conflicts.push({ slotId: a.id, kind: "participant_double_booked", entityId: pid, conflictingSlotIds: [b.id] });
          conflicts.push({ slotId: b.id, kind: "participant_double_booked", entityId: pid, conflictingSlotIds: [a.id] });
        }
      });
      // Assessor overlaps
      a.assessorIds.forEach((aid) => {
        if (b.assessorIds.includes(aid)) {
          conflicts.push({ slotId: a.id, kind: "assessor_double_booked", entityId: aid, conflictingSlotIds: [b.id] });
          conflicts.push({ slotId: b.id, kind: "assessor_double_booked", entityId: aid, conflictingSlotIds: [a.id] });
        }
      });
    }
  }
  return conflicts;
}

export function StepSchedule() {
  const { engagementId } = useParams<{ engagementId: string }>();
  const navigate = useNavigate();
  const engagement = useEngagement(engagementId);
  const setSchedule = useAppStore((s) => s.setSchedule);
  const setStepStatus = useAppStore((s) => s.setStepStatus);

  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [view, setView] = useState<"by_day" | "by_assessor">("by_day");

  // Auto-generate state
  const [genDays, setGenDays] = useState(2);
  const [genStart, setGenStart] = useState("09:00");
  const [genEnd, setGenEnd] = useState("17:00");
  const [genOpen, setGenOpen] = useState(true);
  const [unscheduledItems, setUnscheduledItems] = useState<UnscheduledItem[]>([]);

  const slots = engagement?.schedule ?? [];
  const tools = engagement?.tools ?? [];
  const assessors = engagement?.assessors ?? [];
  const participants = engagement?.participants ?? [];

  const conflicts = useMemo(() => detectConflicts(slots), [slots]);
  const conflictingSlotIds = useMemo(() => new Set(conflicts.map((c) => c.slotId)), [conflicts]);

  // Calculate scheduled tool-participant pairs vs expected
  const expectedTotal = useMemo(() => {
    return participants.reduce((sum, p) => sum + p.toolIds.length, 0);
  }, [participants]);

  const scheduledTotal = useMemo(() => {
    const seen = new Set<string>();
    slots.forEach((s) => {
      s.participantIds.forEach((pid) => seen.add(`${pid}|${s.toolId}`));
    });
    return seen.size;
  }, [slots]);

  // Auto-compute step status
  useEffect(() => {
    if (!engagement) return;
    if (slots.length === 0) {
      setStepStatus(engagement.id, "schedule", "not_started", undefined);
    } else if (conflicts.length > 0) {
      const uniqueConflicts = new Set(conflicts.map((c) => `${c.kind}-${c.entityId}`)).size;
      setStepStatus(engagement.id, "schedule", "in_progress",
        `${uniqueConflicts} conflict${uniqueConflicts === 1 ? "" : "s"} to resolve`);
    } else if (scheduledTotal < expectedTotal) {
      setStepStatus(engagement.id, "schedule", "in_progress",
        `${scheduledTotal}/${expectedTotal} scheduled`);
    } else {
      const dayCount = new Set(slots.map((s) => s.day)).size;
      setStepStatus(engagement.id, "schedule", "complete",
        `${engagement.basics.acDateRange || `${dayCount} days`} · ${scheduledTotal}/${expectedTotal} scheduled`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots.length, conflicts.length, scheduledTotal, expectedTotal]);

  if (!engagement || !engagementId) return null;

  // Empty state — needs prerequisites
  const missingPrereqs: string[] = [];
  if (tools.length === 0) missingPrereqs.push("tools");
  if (assessors.length === 0) missingPrereqs.push("assessors");
  if (participants.length === 0) missingPrereqs.push("participants");

  if (missingPrereqs.length > 0) {
    return (
      <div className="space-y-6">
        <StepPageHeader engagementId={engagementId} stepKey="schedule" />
        <Card>
          <CardBody className="py-12">
            <div className="max-w-lg mx-auto text-center">
              <div className="w-14 h-14 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto mb-5">
                <AlertCircle size={26} />
              </div>
              <h2 className="display-serif text-2xl font-semibold text-navy-700">Complete earlier steps first</h2>
              <p className="text-sm text-ink-500 mt-3 leading-relaxed">
                The schedule combines tools, assessors, and participants. You need at least one of each before scheduling.
                Missing: <strong>{missingPrereqs.join(", ")}</strong>.
              </p>
              <div className="mt-6 flex justify-center gap-2">
                <Button variant="primary" onClick={() => navigate(`/engagement/${engagementId}/setup`)}>
                  Back to Setup
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  function addSlot() {
    if (!engagement) return;
    const newSlot: ScheduleSlot = {
      id: `s-${Date.now().toString(36)}`,
      day: 1,
      startTime: "09:00",
      endTime: "10:00",
      toolId: tools[0]?.id ?? "",
      participantIds: [],
      assessorIds: [],
    };
    setSchedule(engagement.id, [...slots, newSlot]);
    setEditingSlotId(newSlot.id);
  }

  function updateSlot(id: string, patch: Partial<ScheduleSlot>) {
    if (!engagement) return;
    setSchedule(engagement.id, slots.map((s) => s.id === id ? { ...s, ...patch } : s));
  }

  function removeSlot(id: string) {
    if (!engagement) return;
    setSchedule(engagement.id, slots.filter((s) => s.id !== id));
  }

  function toggleSlotEntity(slotId: string, field: "participantIds" | "assessorIds", entityId: string) {
    const s = slots.find((x) => x.id === slotId);
    if (!s) return;
    const list = s[field];
    const next = list.includes(entityId) ? list.filter((x) => x !== entityId) : [...list, entityId];
    updateSlot(slotId, { [field]: next });
  }

  function handleGenerate() {
    if (!engagement) return;
    const result = generateSchedule({
      days: genDays,
      startTime: genStart,
      endTime: genEnd,
      tools,
      participants,
      assessors,
    });
    setSchedule(engagement.id, result.slots);
    setUnscheduledItems(result.unscheduled);
    setGenOpen(false);
    setEditingSlotId(null);
  }

  // Group slots by day for the "by_day" view
  const slotsByDay = useMemo(() => {
    const m = new Map<number, ScheduleSlot[]>();
    slots.forEach((s) => {
      if (!m.has(s.day)) m.set(s.day, []);
      m.get(s.day)!.push(s);
    });
    // Sort each day by start time
    m.forEach((arr) => arr.sort((a, b) => a.startTime.localeCompare(b.startTime)));
    return Array.from(m.entries()).sort((a, b) => a[0] - b[0]);
  }, [slots]);

  return (
    <div className="space-y-6">
      <StepPageHeader engagementId={engagementId} stepKey="schedule" />

      {/* Summary band */}
      <Card>
        <CardBody className="py-4">
          <div className="flex items-stretch divide-x divide-ink-200">
            <div className="flex-1 px-4">
              <div className="text-2xs text-ink-500 uppercase tracking-wider font-medium">Slots</div>
              <div className="text-2xl font-semibold text-navy-700 mt-0.5">{slots.length}</div>
            </div>
            <div className="flex-1 px-4">
              <div className="text-2xs text-ink-500 uppercase tracking-wider font-medium">Days used</div>
              <div className="text-2xl font-semibold text-navy-700 mt-0.5">{slotsByDay.length}</div>
            </div>
            <div className="flex-1 px-4">
              <div className="text-2xs text-ink-500 uppercase tracking-wider font-medium">Scheduled</div>
              <div className={cn("text-2xl font-semibold mt-0.5", scheduledTotal === expectedTotal ? "text-green-700" : "text-navy-700")}>
                {scheduledTotal}/{expectedTotal}
              </div>
            </div>
            <div className="flex-1 px-4">
              <div className="text-2xs text-ink-500 uppercase tracking-wider font-medium">Conflicts</div>
              <div className={cn("text-2xl font-semibold mt-0.5", conflicts.length > 0 ? "text-red-600" : "text-green-700")}>
                {conflicts.length}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Auto-generate card */}
      <Card>
        <button
          onClick={() => setGenOpen(!genOpen)}
          className="w-full text-left px-4 py-3 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-ocean-600" />
            <span className="text-sm font-semibold text-navy-700">Auto-generate schedule</span>
          </div>
          <ChevronDown size={16} className={cn("text-ink-400 transition-transform", genOpen && "rotate-180")} />
        </button>
        {genOpen && (
          <div className="border-t border-ink-200 px-4 py-4 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Days">
                <Select value={String(genDays)} onChange={(e) => setGenDays(parseInt(e.target.value, 10))}>
                  {[1, 2, 3, 4, 5].map((d) => <option key={d} value={d}>{d}</option>)}
                </Select>
              </Field>
              <Field label="Start time">
                <TextInput value={genStart} onChange={(e) => setGenStart(e.target.value)} placeholder="09:00" />
              </Field>
              <Field label="End time">
                <TextInput value={genEnd} onChange={(e) => setGenEnd(e.target.value)} placeholder="17:00" />
              </Field>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-2xs text-ink-500">
                {slots.length > 0 ? "Replaces existing slots" : "Creates a first-draft schedule"}
              </span>
              <Button variant="primary" size="sm" onClick={handleGenerate}>
                <Zap size={13} /> Generate schedule
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Unscheduled items warning */}
      {unscheduledItems.length > 0 && (
        <Card className="border-amber-300/60 bg-amber-50/30">
          <CardBody className="py-3">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-amber-700">
                  {unscheduledItems.length} item{unscheduledItems.length === 1 ? "" : "s"} could not be scheduled
                </div>
                <div className="text-2xs text-amber-700/80 mt-1 space-y-0.5">
                  {unscheduledItems.map((u, i) => {
                    const tool = tools.find((t) => t.id === u.toolId);
                    const participant = participants.find((p) => p.id === u.participantId);
                    return (
                      <div key={i}>
                        {participant?.name ?? "?"} × {tool?.name ?? "?"} — {u.reason}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Conflict summary if any */}
      {conflicts.length > 0 && (
        <Card className="border-red-300/60 bg-red-50/30">
          <CardBody className="py-3">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-red-700">
                  {new Set(conflicts.map((c) => `${c.kind}-${c.entityId}`)).size} conflict{conflicts.length > 1 ? "s" : ""} detected
                </div>
                <div className="text-2xs text-red-700/80 mt-0.5">
                  Slots highlighted in red have a participant or assessor double-booked. Resolve before locking the engagement.
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* View toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-white rounded-md border border-ink-200 p-1">
          <button
            onClick={() => setView("by_day")}
            className={cn("px-3 py-1.5 rounded text-2xs font-medium",
              view === "by_day" ? "bg-navy-700 text-white" : "text-ink-500 hover:text-navy-700")}
          >
            By day
          </button>
          <button
            onClick={() => setView("by_assessor")}
            className={cn("px-3 py-1.5 rounded text-2xs font-medium",
              view === "by_assessor" ? "bg-navy-700 text-white" : "text-ink-500 hover:text-navy-700")}
          >
            By assessor
          </button>
        </div>
        <Button variant="primary" size="sm" onClick={addSlot}>
          <Plus size={13} /> Add slot
        </Button>
      </div>

      {/* By-day view */}
      {view === "by_day" && (
        <div className="space-y-5">
          {slotsByDay.length === 0 && (
            <Card>
              <CardBody className="py-10 text-center">
                <CalendarDays size={28} className="mx-auto text-ink-300 mb-2" />
                <div className="text-sm font-medium text-navy-700">No slots scheduled yet</div>
                <div className="text-2xs text-ink-500 mt-1">Click "Add slot" to start building the schedule.</div>
              </CardBody>
            </Card>
          )}

          {slotsByDay.map(([day, daySlots]) => (
            <div key={day}>
              <div className="flex items-baseline justify-between mb-2">
                <h3 className="display-serif text-lg font-semibold text-navy-700">
                  Day {day}
                </h3>
                <span className="text-2xs text-ink-500">
                  {daySlots.length} slot{daySlots.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="space-y-2">
                {daySlots.map((slot) => (
                  <SlotRow
                    key={slot.id}
                    slot={slot}
                    isEditing={editingSlotId === slot.id}
                    isConflicting={conflictingSlotIds.has(slot.id)}
                    tools={tools}
                    assessors={assessors}
                    participants={participants}
                    onToggleEdit={() => setEditingSlotId(editingSlotId === slot.id ? null : slot.id)}
                    onUpdate={(patch) => updateSlot(slot.id, patch)}
                    onRemove={() => removeSlot(slot.id)}
                    onToggleEntity={(field, id) => toggleSlotEntity(slot.id, field, id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* By-assessor view */}
      {view === "by_assessor" && (
        <div className="space-y-4">
          {assessors.map((a) => {
            const aSlots = slots
              .filter((s) => s.assessorIds.includes(a.id))
              .sort((x, y) => x.day - y.day || x.startTime.localeCompare(y.startTime));
            return (
              <Card key={a.id}>
                <CardBody>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-navy-700">{a.name || "Unnamed assessor"}</h3>
                      <div className="text-2xs text-ink-500 mt-0.5">
                        {a.role === "lead" ? "Lead Assessor" : a.role === "assessor" ? "Assessor" : "Observer"} ·
                        {" "}{aSlots.length} slot{aSlots.length === 1 ? "" : "s"} scheduled
                      </div>
                    </div>
                  </div>
                  {aSlots.length === 0 ? (
                    <div className="text-2xs text-ink-400 italic">Not yet scheduled into any slot.</div>
                  ) : (
                    <div className="space-y-1.5">
                      {aSlots.map((s) => {
                        const tool = tools.find((t) => t.id === s.toolId);
                        const conflict = conflictingSlotIds.has(s.id);
                        return (
                          <div
                            key={s.id}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 rounded text-2xs",
                              conflict ? "bg-red-50 text-red-800" : "bg-ink-100/40 text-ink-700",
                            )}
                          >
                            <span className="font-mono">Day {s.day}</span>
                            <span className="text-ink-300">·</span>
                            <span>{s.startTime}–{s.endTime}</span>
                            <span className="text-ink-300">·</span>
                            <span className="font-medium">{tool?.name ?? "—"}</span>
                            <span className="text-ink-300">·</span>
                            <span>{s.participantIds.length} pax</span>
                            {s.room && <><span className="text-ink-300">·</span><span>{s.room}</span></>}
                            {conflict && <Badge tone="red"><AlertTriangle size={9} /> Conflict</Badge>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* Footer nav */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="secondary" onClick={() => navigate(`/engagement/${engagementId}/setup/participants`)}>
          Back to Participants
        </Button>
        <Button variant="primary" onClick={() => navigate(`/engagement/${engagementId}/setup/report`)}>
          Continue to Report format <ArrowRight size={13} />
        </Button>
      </div>
    </div>
  );
}

// ---------- Slot row ----------
interface SlotRowProps {
  slot: ScheduleSlot;
  isEditing: boolean;
  isConflicting: boolean;
  tools: { id: string; name: string }[];
  assessors: { id: string; name: string; role: string }[];
  participants: { id: string; name: string }[];
  onToggleEdit: () => void;
  onUpdate: (patch: Partial<ScheduleSlot>) => void;
  onRemove: () => void;
  onToggleEntity: (field: "participantIds" | "assessorIds", id: string) => void;
}

function SlotRow({
  slot, isEditing, isConflicting, tools, assessors, participants,
  onToggleEdit, onUpdate, onRemove, onToggleEntity,
}: SlotRowProps) {
  const tool = tools.find((t) => t.id === slot.toolId);

  return (
    <Card className={cn(isConflicting && "border-red-300/60")}>
      <button onClick={onToggleEdit} className="w-full text-left p-3 flex items-center gap-4">
        <div className={cn(
          "w-12 px-2 py-1.5 rounded text-center flex-shrink-0",
          isConflicting ? "bg-red-50 text-red-700" : "bg-ink-100 text-ink-700",
        )}>
          <div className="text-2xs font-mono font-semibold leading-tight">{slot.startTime}</div>
          <div className="text-2xs font-mono text-ink-500 leading-tight">–{slot.endTime}</div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-navy-700 truncate">{tool?.name ?? "—"}</span>
            {isConflicting && <Badge tone="red"><AlertTriangle size={9} /> Conflict</Badge>}
          </div>
          <div className="flex items-center gap-2.5 text-2xs text-ink-500 mt-0.5">
            <span className="inline-flex items-center gap-1">
              <Users size={10} /> {slot.participantIds.length} pax
            </span>
            <span className="text-ink-300">·</span>
            <span>{slot.assessorIds.length} assessor{slot.assessorIds.length === 1 ? "" : "s"}</span>
            {slot.room && <><span className="text-ink-300">·</span><span className="inline-flex items-center gap-1"><MapPin size={10} /> {slot.room}</span></>}
          </div>
        </div>
        <Clock size={14} className="text-ink-400" />
      </button>

      {isEditing && (
        <div className="border-t border-ink-200 bg-ink-100/30 p-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Field label="Day">
              <Select value={String(slot.day)} onChange={(e) => onUpdate({ day: parseInt(e.target.value, 10) })}>
                {[1,2,3,4,5].map((d) => <option key={d} value={d}>Day {d}</option>)}
              </Select>
            </Field>
            <Field label="Start">
              <TextInput value={slot.startTime} onChange={(e) => onUpdate({ startTime: e.target.value })} placeholder="09:00" />
            </Field>
            <Field label="End">
              <TextInput value={slot.endTime} onChange={(e) => onUpdate({ endTime: e.target.value })} placeholder="10:00" />
            </Field>
            <Field label="Tool">
              <Select value={slot.toolId} onChange={(e) => onUpdate({ toolId: e.target.value })}>
                {tools.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </Field>
            <Field label="Room">
              <TextInput value={slot.room ?? ""} onChange={(e) => onUpdate({ room: e.target.value })} placeholder="optional" />
            </Field>
          </div>

          <Field label="Participants">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
              {participants.map((p) => {
                const checked = slot.participantIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onToggleEntity("participantIds", p.id)}
                    className={cn(
                      "px-2.5 py-1.5 rounded text-2xs border text-left transition-colors flex items-center gap-2",
                      checked ? "border-ocean-300 bg-ocean-50/40 text-navy-700" : "border-ink-200 bg-white text-ink-700 hover:bg-ink-100/40",
                    )}
                  >
                    <div className={cn("w-3 h-3 rounded-sm border flex-shrink-0", checked ? "bg-ocean-600 border-ocean-600" : "border-ink-300")} />
                    <span className="truncate">{p.name || "Unnamed"}</span>
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Assessors">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
              {assessors.map((a) => {
                const checked = slot.assessorIds.includes(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => onToggleEntity("assessorIds", a.id)}
                    className={cn(
                      "px-2.5 py-1.5 rounded text-2xs border text-left transition-colors flex items-center gap-2",
                      checked ? "border-ocean-300 bg-ocean-50/40 text-navy-700" : "border-ink-200 bg-white text-ink-700 hover:bg-ink-100/40",
                    )}
                  >
                    <div className={cn("w-3 h-3 rounded-sm border flex-shrink-0", checked ? "bg-ocean-600 border-ocean-600" : "border-ink-300")} />
                    <span className="truncate">{a.name || "Unnamed"}</span>
                  </button>
                );
              })}
            </div>
          </Field>

          <div className="pt-2 flex justify-end">
            <Button variant="ghost" size="sm" onClick={onRemove}>
              <Trash2 size={12} /> Remove slot
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
