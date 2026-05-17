import { dictionary } from "@/mocks/dictionary";
import { toolLibrary } from "@/mocks/toolLibrary";
import type { Competency, CompetencySelection, Assessor, Participant, AssessorRole, CompetencyLevel, ProficiencyLevel, EngagementTool, ToolFormat } from "@/types";

// ─── Generic CSV parser (RFC 4180 quoted-field support) ─────────────────────

/** Split a single CSV line into fields, respecting double-quoted values. */
function splitCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        // Escaped quote ("") or end of quoted field
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        current += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ",") {
        fields.push(current.trim());
        current = "";
        i++;
      } else {
        current += ch;
        i++;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

/** Parse CSV text into array of row objects keyed by header. */
export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = splitCSVLine(lines[0]).map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? "";
    });
    rows.push(row);
  }

  return rows;
}

// ─── Competencies CSV (full custom definitions) ─────────────────────────────

const VALID_WEIGHTS = [0.5, 1.0, 1.5, 2.0];

const REQUIRED_COMP_COLUMNS = [
  "id", "name", "definition", "cluster",
  "l1_indicator_1", "l1_indicator_2", "l1_indicator_3", "l1_indicator_4",
  "l2_indicator_1", "l2_indicator_2", "l2_indicator_3", "l2_indicator_4",
  "l3_indicator_1", "l3_indicator_2", "l3_indicator_3", "l3_indicator_4",
];

const DEFAULT_LEVEL_NAMES: Record<ProficiencyLevel, string> = { 1: "Foundational", 2: "Proficient", 3: "Strategic" };
const DEFAULT_QUALIFIERS: Record<ProficiencyLevel, string> = { 1: "Demonstrates", 2: "Applies", 3: "Shapes" };
const DEFAULT_LEVEL_DESCRIPTIONS: Record<ProficiencyLevel, string> = {
  1: "Demonstrates the core behaviours in routine, well-defined situations.",
  2: "Applies the competency independently across the full scope of the role.",
  3: "Shapes how the competency is practised across teams and beyond.",
};

/** Detect whether the CSV has the wide custom-definition columns or just the legacy competency_id format. */
function isCustomFormat(headers: string[]): boolean {
  return REQUIRED_COMP_COLUMNS.every((col) => headers.includes(col));
}

export function parseCompetenciesCSV(
  rows: Record<string, string>[],
): { competencies: Competency[]; selections: CompetencySelection[]; errors: string[] } {
  if (rows.length === 0) return { competencies: [], selections: [], errors: [] };

  const headers = Object.keys(rows[0]);

  // Legacy format: competency_id, weight, critical (selects from dictionary)
  if (!isCustomFormat(headers)) {
    return parseLegacyCompetenciesCSV(rows);
  }

  // Custom full-definition format
  const competencies: Competency[] = [];
  const selections: CompetencySelection[] = [];
  const errors: string[] = [];
  const seenIds = new Set<string>();

  // Check required columns
  const missingCols = REQUIRED_COMP_COLUMNS.filter((col) => !headers.includes(col));
  if (missingCols.length > 0) {
    errors.push(`Missing required columns: ${missingCols.join(", ")}`);
    return { competencies, selections, errors };
  }

  rows.forEach((row, idx) => {
    const rowNum = idx + 2;
    const id = row.id?.trim();
    const name = row.name?.trim();
    const definition = row.definition?.trim();
    const cluster = row.cluster?.trim();

    if (!id) { errors.push(`Row ${rowNum}: missing required field 'id'`); return; }
    if (!name) { errors.push(`Row ${rowNum}: missing required field 'name'`); return; }
    if (!definition) { errors.push(`Row ${rowNum}: missing required field 'definition'`); return; }
    if (!cluster) { errors.push(`Row ${rowNum}: missing required field 'cluster'`); return; }

    if (seenIds.has(id)) {
      errors.push(`Row ${rowNum}: duplicate id '${id}'`);
      return;
    }
    seenIds.add(id);

    // Validate all 12 indicators are non-empty
    const indicatorKeys = REQUIRED_COMP_COLUMNS.slice(4); // l1_indicator_1 ... l3_indicator_4
    const emptyIndicators = indicatorKeys.filter((k) => !row[k]?.trim());
    if (emptyIndicators.length > 0) {
      errors.push(`Row ${rowNum}: empty indicators: ${emptyIndicators.join(", ")}`);
      return;
    }

    // Build levels
    const levels: CompetencyLevel[] = ([1, 2, 3] as ProficiencyLevel[]).map((lvl) => {
      const prefix = `l${lvl}`;
      return {
        level: lvl,
        name: row[`${prefix}_name`]?.trim() || DEFAULT_LEVEL_NAMES[lvl],
        qualifier: row[`${prefix}_qualifier`]?.trim() || DEFAULT_QUALIFIERS[lvl],
        description: row[`${prefix}_description`]?.trim() || DEFAULT_LEVEL_DESCRIPTIONS[lvl],
        indicators: [
          row[`${prefix}_indicator_1`].trim(),
          row[`${prefix}_indicator_2`].trim(),
          row[`${prefix}_indicator_3`].trim(),
          row[`${prefix}_indicator_4`].trim(),
        ],
      };
    });

    const retailSpecific = row.retail_specific?.toLowerCase() === "true";
    const sectorTags = row.sector_tags?.trim()
      ? row.sector_tags.split(/[;|]/).map((t) => t.trim()).filter(Boolean)
      : ["generic"];

    competencies.push({
      id,
      name,
      definition,
      cluster,
      retailSpecific,
      sectorTags,
      levels,
    });

    // Build selection
    let weight = 1.0;
    if (row.weight) {
      const parsed = parseFloat(row.weight);
      if (!isNaN(parsed) && VALID_WEIGHTS.includes(parsed)) {
        weight = parsed;
      }
    }
    const critical = row.critical?.toLowerCase() === "true";

    selections.push({ competencyId: id, weight, critical });
  });

  return { competencies, selections, errors };
}

/** Legacy format: just selects from dictionary by competency_id */
function parseLegacyCompetenciesCSV(
  rows: Record<string, string>[],
): { competencies: Competency[]; selections: CompetencySelection[]; errors: string[] } {
  const selections: CompetencySelection[] = [];
  const errors: string[] = [];

  rows.forEach((row, idx) => {
    const rowNum = idx + 2;
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
    selections.push({ competencyId, weight, critical });
  });

  // Legacy format contributes no custom competencies
  return { competencies: [], selections, errors };
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

// ─── Tools CSV ──────────────────────────────────────────────────────────────

const VALID_FORMATS: ToolFormat[] = ["individual_written", "individual_interactive", "group_interactive"];
const TOOL_TYPE_KEYS = [...toolLibrary.map((t) => t.key), "custom"];

export function parseToolsCSV(
  rows: Record<string, string>[],
  competencyIds: string[],
): { data: EngagementTool[]; errors: string[] } {
  const data: EngagementTool[] = [];
  const errors: string[] = [];
  const baseTs = Date.now().toString(36);

  rows.forEach((row, idx) => {
    const rowNum = idx + 2;
    const name = row.name?.trim();
    const toolType = row.tool_type?.trim().toLowerCase();

    if (!name) { errors.push(`Row ${rowNum}: missing required field 'name'`); return; }
    if (!toolType || !TOOL_TYPE_KEYS.includes(toolType)) {
      errors.push(`Row ${rowNum}: invalid tool_type '${toolType ?? ""}' (must be one of: ${TOOL_TYPE_KEYS.join(", ")})`);
      return;
    }

    const def = toolLibrary.find((t) => t.key === toolType);

    // Parse duration
    let durationMinutes = def?.defaultDurationMinutes ?? 60;
    if (row.duration_minutes?.trim()) {
      const parsed = parseInt(row.duration_minutes, 10);
      if (isNaN(parsed) || parsed < 1) {
        errors.push(`Row ${rowNum}: invalid duration_minutes '${row.duration_minutes}'`);
        return;
      }
      durationMinutes = parsed;
    }

    // Parse format
    let format: ToolFormat = def?.defaultFormat ?? "individual_interactive";
    if (row.format?.trim()) {
      const f = row.format.trim().toLowerCase() as ToolFormat;
      if (!VALID_FORMATS.includes(f)) {
        errors.push(`Row ${rowNum}: invalid format '${row.format}' (must be individual_written, individual_interactive, or group_interactive)`);
        return;
      }
      format = f;
    }

    // Parse competencies — semicolon or pipe separated
    let toolCompetencyIds: string[] = [];
    if (row.competencies?.trim()) {
      const requested = row.competencies.split(/[;|]/).map((c) => c.trim()).filter(Boolean);
      const invalid = requested.filter((c) => !competencyIds.includes(c));
      if (invalid.length > 0) {
        errors.push(`Row ${rowNum}: unknown competency IDs: ${invalid.join(", ")}`);
        return;
      }
      toolCompetencyIds = requested;
    }

    data.push({
      id: `t-${baseTs}${idx}`,
      name,
      toolTypeKey: toolType,
      competencyIds: toolCompetencyIds,
      durationMinutes,
      format,
      notes: row.notes?.trim() || undefined,
    });
  });

  return { data, errors };
}

// ─── Template generators ────────────────────────────────────────────────────

const COMPETENCIES_TEMPLATE_HEADER = "id,name,definition,cluster,l1_indicator_1,l1_indicator_2,l1_indicator_3,l1_indicator_4,l2_indicator_1,l2_indicator_2,l2_indicator_3,l2_indicator_4,l3_indicator_1,l3_indicator_2,l3_indicator_3,l3_indicator_4,weight,critical";
const COMPETENCIES_TEMPLATE_EXAMPLE = '"strategic-thinking","Strategic Thinking","Thinks ahead and connects dots across the business.","Leadership","Identifies trends in own area.","Links decisions to broader objectives.","Considers multiple perspectives before acting.","Seeks information beyond the immediate task.","Anticipates future challenges and prepares.","Integrates cross-functional insights into plans.","Balances short-term actions with long-term goals.","Challenges assumptions with structured reasoning.","Shapes the strategic agenda for the function.","Builds foresight capability across the team.","Reframes complex problems into strategic opportunities.","Drives alignment between strategy and execution at scale.",1.0,false';

export function downloadCSVTemplate(
  type: "competencies" | "assessors" | "participants" | "tools",
) {
  const templates: Record<typeof type, string> = {
    competencies: COMPETENCIES_TEMPLATE_HEADER + "\n" + COMPETENCIES_TEMPLATE_EXAMPLE + "\n",
    assessors: "name,email,role,organisation,calibrated,assigned_tools\n",
    participants: "name,employee_id,current_role,business_unit,location,email,years_in_role\n",
    tools: "name,tool_type,competencies,duration_minutes,format,notes\n",
  };

  const blob = new Blob([templates[type]], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${type}-template.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
