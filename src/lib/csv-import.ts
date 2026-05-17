import { dictionary } from "@/mocks/dictionary";
import type { CompetencySelection, Assessor, Participant, AssessorRole } from "@/types";

// ─── Generic CSV parser ─────────────────────────────────────────────────────

/** Parse CSV text into array of row objects keyed by header. */
export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? "";
    });
    rows.push(row);
  }

  return rows;
}

// ─── Competencies CSV ───────────────────────────────────────────────────────

const VALID_WEIGHTS = [0.5, 1.0, 1.5, 2.0];

export function parseCompetenciesCSV(
  rows: Record<string, string>[],
): { data: CompetencySelection[]; errors: string[] } {
  const data: CompetencySelection[] = [];
  const errors: string[] = [];

  rows.forEach((row, idx) => {
    const rowNum = idx + 2; // 1-indexed, +1 for header
    const competencyId = row.competency_id?.trim();
    if (!competencyId) {
      errors.push(`Row ${rowNum}: missing required field 'competency_id'`);
      return;
    }

    const match = dictionary.find((c) => c.id === competencyId);
    if (!match) {
      errors.push(`Row ${rowNum}: unknown competency_id '${competencyId}'`);
      return;
    }

    let weight = 1.0;
    if (row.weight) {
      const parsed = parseFloat(row.weight);
      if (isNaN(parsed) || !VALID_WEIGHTS.includes(parsed)) {
        errors.push(`Row ${rowNum}: invalid weight '${row.weight}' (must be 0.5, 1.0, 1.5, or 2.0)`);
        return;
      }
      weight = parsed;
    }

    const critical = row.critical?.toLowerCase() === "true";

    data.push({ competencyId, weight, critical });
  });

  return { data, errors };
}

// ─── Assessors CSV ──────────────────────────────────────────────────────────

const VALID_ROLES: AssessorRole[] = ["lead", "assessor", "observer"];

export function parseAssessorsCSV(
  rows: Record<string, string>[],
  toolIds: string[],
): { data: Assessor[]; errors: string[] } {
  const data: Assessor[] = [];
  const errors: string[] = [];
  const baseTs = Date.now().toString(36);

  rows.forEach((row, idx) => {
    const rowNum = idx + 2;
    const name = row.name?.trim();
    const email = row.email?.trim();
    const roleStr = row.role?.trim().toLowerCase();

    if (!name) { errors.push(`Row ${rowNum}: missing required field 'name'`); return; }
    if (!email) { errors.push(`Row ${rowNum}: missing required field 'email'`); return; }
    if (!roleStr || !VALID_ROLES.includes(roleStr as AssessorRole)) {
      errors.push(`Row ${rowNum}: invalid role '${roleStr ?? ""}' (must be lead, assessor, or observer)`);
      return;
    }

    // Parse assigned_tools — comma-separated tool IDs, default to all
    let assignedToolIds = toolIds;
    if (row.assigned_tools?.trim()) {
      const requested = row.assigned_tools.split(/[;|]/).map((t) => t.trim()).filter(Boolean);
      const invalid = requested.filter((t) => !toolIds.includes(t));
      if (invalid.length > 0) {
        errors.push(`Row ${rowNum}: unknown tool IDs: ${invalid.join(", ")}`);
        return;
      }
      assignedToolIds = requested;
    }

    data.push({
      id: `a-${baseTs}${idx}`,
      name,
      email,
      role: roleStr as AssessorRole,
      organisation: row.organisation?.trim() || "Synovate",
      calibrated: row.calibrated?.toLowerCase() === "true",
      assignedToolIds,
    });
  });

  return { data, errors };
}

// ─── Participants CSV ───────────────────────────────────────────────────────

export function parseParticipantsCSV(
  rows: Record<string, string>[],
  toolIds: string[],
): { data: Participant[]; errors: string[] } {
  const data: Participant[] = [];
  const errors: string[] = [];
  const baseTs = Date.now().toString(36);

  rows.forEach((row, idx) => {
    const rowNum = idx + 2;
    const name = row.name?.trim();
    const currentRole = row.current_role?.trim();

    if (!name) { errors.push(`Row ${rowNum}: missing required field 'name'`); return; }
    if (!currentRole) { errors.push(`Row ${rowNum}: missing required field 'current_role'`); return; }

    let yearsInRole: number | undefined;
    if (row.years_in_role?.trim()) {
      const parsed = parseInt(row.years_in_role, 10);
      if (isNaN(parsed) || parsed < 0) {
        errors.push(`Row ${rowNum}: invalid years_in_role '${row.years_in_role}'`);
        return;
      }
      yearsInRole = parsed;
    }

    data.push({
      id: `p-${baseTs}${idx}`,
      name,
      employeeId: row.employee_id?.trim() || undefined,
      currentRole,
      businessUnit: row.business_unit?.trim() || undefined,
      location: row.location?.trim() || undefined,
      email: row.email?.trim() || undefined,
      yearsInRole,
      toolIds, // default: all engagement tools
    });
  });

  return { data, errors };
}

// ─── Template generators ────────────────────────────────────────────────────

export function downloadCSVTemplate(
  type: "competencies" | "assessors" | "participants",
) {
  const headers: Record<typeof type, string> = {
    competencies: "competency_id,weight,critical",
    assessors: "name,email,role,organisation,calibrated,assigned_tools",
    participants: "name,employee_id,current_role,business_unit,location,email,years_in_role",
  };

  const blob = new Blob([headers[type] + "\n"], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${type}-template.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
