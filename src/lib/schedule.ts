import type { ScheduleSlot, EngagementTool, Participant, Assessor } from "@/types";

// ── Public interface ──────────────────────────────────────────────

export interface ScheduleGeneratorInput {
  days: number;
  startTime: string;   // "HH:MM"
  endTime: string;      // "HH:MM"
  tools: EngagementTool[];
  participants: Participant[];
  assessors: Assessor[];
}

export interface UnscheduledItem {
  toolId: string;
  participantId: string;
  reason: string;
}

export interface ScheduleGeneratorResult {
  slots: ScheduleSlot[];
  unscheduled: UnscheduledItem[];
}

// ── Time helpers ──────────────────────────────────────────────────

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(m: number): string {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

const BUFFER = 15; // minutes between consecutive slots

// ── BusyTracker ──────────────────────────────────────────────────

class BusyTracker {
  private intervals = new Map<string, { start: number; end: number }[]>();

  private key(day: number, entityId: string) {
    return `${day}-${entityId}`;
  }

  isBusy(day: number, entityId: string, start: number, end: number): boolean {
    const list = this.intervals.get(this.key(day, entityId));
    if (!list) return false;
    return list.some((i) => start < i.end && i.start < end);
  }

  markBusy(day: number, entityId: string, start: number, end: number): void {
    const k = this.key(day, entityId);
    if (!this.intervals.has(k)) this.intervals.set(k, []);
    this.intervals.get(k)!.push({ start, end });
  }
}

// ── Internal helpers ─────────────────────────────────────────────

/** Find earliest start within [dayStart, dayEnd - duration] where all entities are free. */
function findSlot(
  day: number,
  dayStart: number,
  dayEnd: number,
  duration: number,
  entityIds: string[],
  tracker: BusyTracker,
): number | null {
  // Scan in 5-minute increments
  for (let t = dayStart; t + duration <= dayEnd; t += 5) {
    const end = t + duration;
    const allFree = entityIds.every((id) => !tracker.isBusy(day, id, t, end + BUFFER));
    if (allFree) return t;
  }
  return null;
}

/** Pick first non-busy assessor assigned to this tool. Uses a round-robin offset to spread load. */
function findAssessor(
  tool: EngagementTool,
  day: number,
  start: number,
  end: number,
  tracker: BusyTracker,
  assessors: Assessor[],
  rrOffset: number,
): Assessor | null {
  const eligible = assessors.filter((a) => a.assignedToolIds.includes(tool.id));
  if (eligible.length === 0) return assessors[0] ?? null; // fallback: first assessor
  for (let i = 0; i < eligible.length; i++) {
    const a = eligible[(i + rrOffset) % eligible.length];
    if (!tracker.isBusy(day, a.id, start, end + BUFFER)) return a;
  }
  return null;
}

function makeSlotId(): string {
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

// ── Main generator ───────────────────────────────────────────────

export function generateSchedule(input: ScheduleGeneratorInput): ScheduleGeneratorResult {
  const { days, startTime, endTime, tools, participants, assessors } = input;
  const dayStart = timeToMinutes(startTime);
  const dayEnd = timeToMinutes(endTime);
  const tracker = new BusyTracker();
  const slots: ScheduleSlot[] = [];
  const unscheduled: UnscheduledItem[] = [];

  let rrCounter = 0;

  // ── Pass 1: group_interactive tools ─────────────────────────
  const groupTools = tools.filter((t) => t.format === "group_interactive");
  for (const tool of groupTools) {
    const pids = participants.filter((p) => p.toolIds.includes(tool.id)).map((p) => p.id);
    if (pids.length === 0) continue;
    let placed = false;

    for (let day = 1; day <= days; day++) {
      const start = findSlot(day, dayStart, dayEnd, tool.durationMinutes, pids, tracker);
      if (start == null) continue;
      const end = start + tool.durationMinutes;
      const assessor = findAssessor(tool, day, start, end, tracker, assessors, rrCounter++);

      const slot: ScheduleSlot = {
        id: makeSlotId(),
        day,
        startTime: minutesToTime(start),
        endTime: minutesToTime(end),
        toolId: tool.id,
        participantIds: pids,
        assessorIds: assessor ? [assessor.id] : [],
      };
      slots.push(slot);

      // Mark all entities busy
      for (const pid of pids) tracker.markBusy(day, pid, start, end + BUFFER);
      if (assessor) tracker.markBusy(day, assessor.id, start, end + BUFFER);
      placed = true;
      break;
    }

    if (!placed) {
      for (const pid of pids) {
        unscheduled.push({ toolId: tool.id, participantId: pid, reason: "no available time on any day" });
      }
    }
  }

  // ── Pass 2: individual_written tools (batched) ──────────────
  const writtenTools = tools.filter((t) => t.format === "individual_written");
  for (const tool of writtenTools) {
    const pids = participants.filter((p) => p.toolIds.includes(tool.id)).map((p) => p.id);
    if (pids.length === 0) continue;
    let placed = false;

    for (let day = 1; day <= days; day++) {
      // Written tools: all participants sit simultaneously; only need assessor free
      const start = findSlot(day, dayStart, dayEnd, tool.durationMinutes, pids, tracker);
      if (start == null) continue;
      const end = start + tool.durationMinutes;
      const assessor = findAssessor(tool, day, start, end, tracker, assessors, rrCounter++);

      const slot: ScheduleSlot = {
        id: makeSlotId(),
        day,
        startTime: minutesToTime(start),
        endTime: minutesToTime(end),
        toolId: tool.id,
        participantIds: pids,
        assessorIds: assessor ? [assessor.id] : [],
      };
      slots.push(slot);

      for (const pid of pids) tracker.markBusy(day, pid, start, end + BUFFER);
      if (assessor) tracker.markBusy(day, assessor.id, start, end + BUFFER);
      placed = true;
      break;
    }

    if (!placed) {
      for (const pid of pids) {
        unscheduled.push({ toolId: tool.id, participantId: pid, reason: "no available time on any day" });
      }
    }
  }

  // ── Pass 3: individual_interactive tools (1:1) ──────────────
  const interactiveTools = tools.filter((t) => t.format === "individual_interactive");
  for (const tool of interactiveTools) {
    const pids = participants.filter((p) => p.toolIds.includes(tool.id)).map((p) => p.id);

    for (const pid of pids) {
      let placed = false;

      for (let day = 1; day <= days; day++) {
        const start = findSlot(day, dayStart, dayEnd, tool.durationMinutes, [pid], tracker);
        if (start == null) continue;
        const end = start + tool.durationMinutes;
        const assessor = findAssessor(tool, day, start, end, tracker, assessors, rrCounter++);
        if (!assessor) continue;

        const slot: ScheduleSlot = {
          id: makeSlotId(),
          day,
          startTime: minutesToTime(start),
          endTime: minutesToTime(end),
          toolId: tool.id,
          participantIds: [pid],
          assessorIds: [assessor.id],
        };
        slots.push(slot);

        tracker.markBusy(day, pid, start, end + BUFFER);
        tracker.markBusy(day, assessor.id, start, end + BUFFER);
        placed = true;
        break;
      }

      if (!placed) {
        unscheduled.push({ toolId: tool.id, participantId: pid, reason: "no available time on any day" });
      }
    }
  }

  // Sort slots: by day, then start time
  slots.sort((a, b) => a.day - b.day || a.startTime.localeCompare(b.startTime));

  return { slots, unscheduled };
}
