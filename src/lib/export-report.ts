import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { findCompetency } from "@/mocks/dictionary";
import {
  effectiveCompetencyScore, computedOar, oarBandFor, groupAverageScores,
} from "@/lib/calibrate";
import { OAR_BAND_META } from "@/types";
import type {
  Engagement, Participant, ReportSectionKey, CompetencyScore,
} from "@/types";

// ─── Section definitions (matches ReportIndividual.tsx) ─────────────────────
const SECTION_DEFS: { key: ReportSectionKey; label: string }[] = [
  { key: "executiveSummary",  label: "Executive Summary" },
  { key: "competencyProfile", label: "Competency Profile" },
  { key: "indicatorEvidence", label: "Indicator Evidence" },
  { key: "developmentAreas",  label: "Development Areas" },
  { key: "nextSteps",         label: "Recommended Next Steps" },
  { key: "cohortContext",     label: "Cohort Context" },
];

// ─── Brand colours ──────────────────────────────────────────────────────────
const NAVY   = [30, 41, 59]   as const;
const OCEAN  = [56, 133, 182] as const;
const OCEAN_LIGHT = [164, 206, 230] as const;
const WHITE  = [255, 255, 255] as const;
const GREEN  = [22, 163, 74]  as const;
const AMBER  = [217, 119, 6]  as const;
const RED    = [220, 38, 38]  as const;
const INK_LIGHT = [240, 240, 240] as const;

const BAND_COLOURS: Record<string, readonly [number, number, number]> = {
  below:         RED,
  developing:    AMBER,
  proficient:    OCEAN,
  strong:        GREEN,
  distinguished: NAVY,
};

// ─── Layout constants ───────────────────────────────────────────────────────
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_X = 20;
const MARGIN_TOP = 25;
const MARGIN_BOTTOM = 20;
const CONTENT_W = PAGE_W - 2 * MARGIN_X;
const USABLE_BOTTOM = PAGE_H - MARGIN_BOTTOM;
const HEADER_Y = 12;
const FOOTER_Y = PAGE_H - 10;

// ─── Low-level helpers ──────────────────────────────────────────────────────

function ensureSpace(doc: jsPDF, needed: number, cursorY: number): number {
  if (cursorY + needed > USABLE_BOTTOM) {
    doc.addPage();
    return MARGIN_TOP;
  }
  return cursorY;
}

function renderWrappedText(
  doc: jsPDF, text: string, x: number, startY: number,
  fontSize: number, lineHeightMult: number, maxWidth: number,
): number {
  doc.setFontSize(fontSize);
  const lh = fontSize * 0.3528 * lineHeightMult;
  const lines = doc.splitTextToSize(text, maxWidth) as string[];
  let y = startY;
  for (const line of lines) {
    y = ensureSpace(doc, lh, y);
    doc.text(line, x, y);
    y += lh;
  }
  return y;
}

function drawPolygon(doc: jsPDF, verts: [number, number][], style: "S" | "F" | "FD") {
  if (verts.length < 3) return;
  const [x0, y0] = verts[0];
  const deltas: number[][] = [];
  for (let i = 1; i < verts.length; i++) {
    deltas.push([verts[i][0] - verts[i - 1][0], verts[i][1] - verts[i - 1][1]]);
  }
  doc.lines(deltas, x0, y0, [1, 1], style, true);
}

// ─── Evidence collector ─────────────────────────────────────────────────────

interface EvidenceBlock {
  competencyName: string;
  cluster: string;
  score: number | null;
  target: number | null;
  wellDone: string[];
  couldBeBetter: string[];
  verbatim: string[];
  insights: string[];
}

function collectEvidence(
  engagement: Engagement, participantId: string, competencyId: string,
): EvidenceBlock {
  const comp = findCompetency(competencyId, engagement.customCompetencies);
  const tgt = engagement.proficiencyTargets.find((t) => t.competencyId === competencyId);
  const score = effectiveCompetencyScore(engagement, participantId, competencyId);

  const wellDone: string[] = [];
  const couldBeBetter: string[] = [];
  const verbatim: string[] = [];
  const insights: string[] = [];

  for (const s of engagement.scores) {
    if (s.participantId !== participantId) continue;
    const cs = s.competencies.find((c: CompetencyScore) => c.competencyId === competencyId);
    if (!cs) continue;
    if (cs.whatWasDoneWell) wellDone.push(cs.whatWasDoneWell);
    if (cs.whatCouldBeBetter) couldBeBetter.push(cs.whatCouldBeBetter);
    if (cs.verbatimObservations) verbatim.push(cs.verbatimObservations);
    if (cs.otherNotableInsights) insights.push(cs.otherNotableInsights);
  }

  return {
    competencyName: comp?.name ?? competencyId,
    cluster: comp?.cluster ?? "",
    score,
    target: tgt?.targetLevel ?? null,
    wellDone: [...new Set(wellDone)],
    couldBeBetter: [...new Set(couldBeBetter)],
    verbatim: [...new Set(verbatim)],
    insights: [...new Set(insights)],
  };
}

// ─── Chart: Radar / spider ──────────────────────────────────────────────────

function renderRadarChart(
  doc: jsPDF, cx: number, cy: number, radius: number,
  labels: string[], scores: (number | null)[], targets: (number | null)[],
  groupAverages?: (number | null)[],
) {
  const n = labels.length;
  if (n < 3) return;
  const step = (2 * Math.PI) / n;
  const start = -Math.PI / 2;
  const vtx = (lv: number, i: number): [number, number] => {
    const a = start + step * i;
    const r = radius * (lv / 5);
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };

  // Fill outermost polygon with light grey
  doc.setFillColor(245, 245, 245);
  drawPolygon(doc, Array.from({ length: n }, (_, i) => vtx(5, i)), "F");

  // Concentric grid
  doc.setDrawColor(215, 215, 215);
  doc.setLineWidth(0.15);
  for (let lv = 1; lv <= 5; lv++) {
    drawPolygon(doc, Array.from({ length: n }, (_, i) => vtx(lv, i)), "S");
  }
  // Axis lines
  for (let i = 0; i < n; i++) {
    const [ex, ey] = vtx(5, i);
    doc.line(cx, cy, ex, ey);
  }

  // Target polygon (light fill)
  doc.setFillColor(220, 236, 248);
  doc.setDrawColor(...OCEAN_LIGHT);
  doc.setLineWidth(0.6);
  drawPolygon(doc, targets.map((t, i) => vtx(t ?? 3, i)), "FD");

  // Group average polygon (dashed brown/orange line)
  if (groupAverages && groupAverages.some((g) => g !== null)) {
    const gaVerts = groupAverages.map((g, i) => vtx(g ?? 0, i));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = (doc as any).context2d?.context || (doc as any).internal?.context;
    void ctx; // not needed — use setLineDashPattern
    doc.setDrawColor(180, 100, 30); // brown/orange
    doc.setLineWidth(0.6);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (doc as any).setLineDashPattern([2, 1.5], 0);
    drawPolygon(doc, gaVerts, "S");
    // Reset dash
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (doc as any).setLineDashPattern([], 0);
    // Dot markers
    doc.setFillColor(180, 100, 30);
    for (const [gx, gy] of gaVerts) doc.circle(gx, gy, 0.7, "F");
  }

  // Score polygon (darker fill)
  if (scores.some((s) => s !== null)) {
    doc.setFillColor(130, 185, 215);
    doc.setDrawColor(...OCEAN);
    doc.setLineWidth(0.8);
    const sVerts = scores.map((s, i) => vtx(s ?? 0, i));
    drawPolygon(doc, sVerts, "FD");
    doc.setFillColor(...NAVY);
    for (const [sx, sy] of sVerts) doc.circle(sx, sy, 1, "F");

    // Score value labels at each vertex (10pt bold navy, offset outward)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    for (let i = 0; i < n; i++) {
      if (scores[i] === null) continue;
      const a = start + step * i;
      const labelR = radius * ((scores[i] ?? 0) / 5) + 5;
      const lx = cx + labelR * Math.cos(a);
      const ly = cy + labelR * Math.sin(a);
      const align: "left" | "center" | "right" =
        Math.abs(Math.cos(a)) < 0.15 ? "center" : Math.cos(a) > 0 ? "left" : "right";
      doc.text((scores[i] ?? 0).toFixed(1), lx, ly + 1, { align });
    }
  }

  // Axis labels (10pt, offset radius+12)
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);
  for (let i = 0; i < n; i++) {
    const a = start + step * i;
    const lr = radius + 12;
    const lx = cx + lr * Math.cos(a);
    const ly = cy + lr * Math.sin(a);
    const align: "left" | "center" | "right" =
      Math.abs(Math.cos(a)) < 0.15 ? "center" : Math.cos(a) > 0 ? "left" : "right";
    const lbl = labels[i].length > 20 ? labels[i].slice(0, 18) + "\u2026" : labels[i];
    doc.text(lbl, lx, ly + 1, { align });
  }

  // Level numbers along top axis (8pt)
  doc.setFontSize(8);
  doc.setTextColor(170, 170, 170);
  for (let lv = 1; lv <= 5; lv++) {
    const [lx, ly] = vtx(lv, 0);
    doc.text(`${lv}`, lx + 2, ly - 1);
  }
}

// ─── Chart: OAR scale bar ───────────────────────────────────────────────────

function renderOarScale(
  doc: jsPDF, x: number, y: number, w: number,
  oar: number | null, thresholds: [number, number, number, number],
) {
  const [t1, t2, t3, t4] = thresholds;
  const bands = [
    { key: "below", from: 1, to: t1 },
    { key: "developing", from: t1, to: t2 },
    { key: "proficient", from: t2, to: t3 },
    { key: "strong", from: t3, to: t4 },
    { key: "distinguished", from: t4, to: 5 },
  ];
  const barH = 8;
  const pos = (v: number) => x + ((v - 1) / 4) * w;

  // Coloured segments
  for (const b of bands) {
    doc.setFillColor(...(BAND_COLOURS[b.key] ?? OCEAN));
    const bx = pos(b.from);
    doc.rect(bx, y, pos(b.to) - bx, barH, "F");
  }

  // White threshold dividers
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.6);
  for (const t of [t1, t2, t3, t4]) {
    doc.line(pos(t), y, pos(t), y + barH);
  }

  // Band labels below
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  for (const b of bands) {
    const meta = OAR_BAND_META[b.key as keyof typeof OAR_BAND_META];
    doc.text(meta.label, pos((b.from + b.to) / 2), y + barH + 4, { align: "center" });
  }

  // Threshold values
  doc.setFontSize(5);
  doc.setTextColor(140, 140, 140);
  for (const t of [t1, t2, t3, t4]) {
    doc.text(t.toFixed(1), pos(t), y + barH + 8, { align: "center" });
  }

  // Triangle marker at OAR position
  if (oar !== null) {
    const mx = pos(oar);
    doc.setFillColor(...NAVY);
    doc.lines([[4, 0], [-2, 3]], mx - 2, y - 4, [1, 1], "F", true);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...NAVY);
    doc.text(oar.toFixed(2), mx, y - 6, { align: "center" });
  }
}

// ─── Chart: Horizontal bar chart ────────────────────────────────────────────

interface BarItem { label: string; score: number; target: number }

function renderBarChart(doc: jsPDF, x: number, y: number, w: number, items: BarItem[]): number {
  const labelW = 54;
  const barX = x + labelW;
  const barW = w - labelW - 15;
  const rowH = 11;
  const barH = 8;

  // Vertical grid + scale labels
  doc.setFontSize(8);
  doc.setTextColor(170, 170, 170);
  doc.setDrawColor(235, 235, 235);
  doc.setLineWidth(0.1);
  for (let v = 1; v <= 5; v++) {
    const vx = barX + (v / 5) * barW;
    doc.line(vx, y - 1, vx, y + items.length * rowH);
    doc.text(`${v}`, vx, y - 3, { align: "center" });
  }

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const ry = y + i * rowH;
    const gap = it.score - it.target;
    const color: [number, number, number] = gap >= 0 ? [...GREEN] : gap > -0.5 ? [...AMBER] : [...RED];

    // Label
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    const lbl = it.label.length > 24 ? it.label.slice(0, 22) + "\u2026" : it.label;
    doc.text(lbl, x, ry + barH / 2 + 1);

    // Bar
    const bw = Math.max(1, (it.score / 5) * barW);
    doc.setFillColor(...color);
    doc.roundedRect(barX, ry + 1, bw, barH - 2, 1, 1, "F");

    // Score value at bar end
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...color);
    doc.text(it.score.toFixed(2), barX + bw + 2, ry + barH / 2 + 1);

    // Target marker
    const tx = barX + (it.target / 5) * barW;
    doc.setDrawColor(...NAVY);
    doc.setLineWidth(0.8);
    doc.line(tx, ry, tx, ry + barH);
  }

  // Legend
  const ly = y + items.length * rowH + 4;
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.8);
  doc.line(barX, ly, barX + 8, ly);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("Target level", barX + 10, ly + 1);
  return ly + 6;
}

// ─── Content helpers ────────────────────────────────────────────────────────

function renderQuoteBlock(doc: jsPDF, x: number, y: number, text: string, maxW: number): number {
  const indent = 5;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(80, 80, 80);
  const lines = doc.splitTextToSize(text, maxW - indent) as string[];
  const lh = 8.5 * 0.3528 * 1.4;
  const blockH = lines.length * lh;
  y = ensureSpace(doc, blockH + 2, y);
  const topY = y - 1;
  for (const line of lines) {
    doc.text(line, x + indent, y);
    y += lh;
  }
  doc.setDrawColor(...OCEAN_LIGHT);
  doc.setLineWidth(1.2);
  doc.line(x + 1, topY, x + 1, y - lh + 2);
  return y;
}

function renderCalloutBox(
  doc: jsPDF, x: number, y: number, w: number,
  title: string, items: string[], color: readonly [number, number, number],
): number {
  if (items.length === 0) return y;

  // Estimate height
  doc.setFontSize(10);
  let estH = 12;
  for (const item of items) {
    const lines = doc.splitTextToSize(item, w - 14) as string[];
    estH += lines.length * 4.2 + 1.5;
  }
  estH += 4;

  y = ensureSpace(doc, estH, y);
  const top = y;

  // Light background
  const bgR = Math.round(255 * 0.92 + color[0] * 0.08);
  const bgG = Math.round(255 * 0.92 + color[1] * 0.08);
  const bgB = Math.round(255 * 0.92 + color[2] * 0.08);
  doc.setFillColor(bgR, bgG, bgB);
  doc.roundedRect(x, top, w, estH, 2, 2, "F");

  // Left accent bar
  doc.setFillColor(...color);
  doc.rect(x, top, 2.5, estH, "F");

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...color);
  y += 8;
  doc.text(title, x + 7, y);
  y += 6;

  // Items
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  for (const item of items) {
    const lines = doc.splitTextToSize(item, w - 14) as string[];
    for (let li = 0; li < lines.length; li++) {
      if (li === 0) doc.text("\u2022", x + 7, y);
      doc.text(lines[li], x + 11, y);
      y += 4.2;
    }
    y += 1.5;
  }
  return y + 4;
}

/** Renders content with sub-headings, bullet lists, and paragraphs. */
function renderFormattedContent(doc: jsPDF, content: string, startY: number): number {
  const blocks = content.split(/\n\n+/);
  let y = startY;

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    // Sub-heading: single short line ending with ":"
    if (!trimmed.includes("\n") && trimmed.endsWith(":") && trimmed.length < 60) {
      y = ensureSpace(doc, 8, y);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...NAVY);
      doc.text(trimmed, MARGIN_X, y);
      y += 6;
      continue;
    }

    // Bullet list: all lines start with "- "
    const lines = trimmed.split("\n");
    if (lines.length > 1 && lines.every((l) => l.startsWith("- "))) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(50, 50, 50);
      for (const line of lines) {
        y = ensureSpace(doc, 6, y);
        doc.setFontSize(10);
        doc.text("\u2022", MARGIN_X + 2, y);
        y = renderWrappedText(doc, line.slice(2), MARGIN_X + 7, y, 10, 1.4, CONTENT_W - 7);
        y += 1.5;
      }
      y += 2;
      continue;
    }

    // Regular paragraph
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);
    y = renderWrappedText(doc, trimmed, MARGIN_X, y, 10, 1.5, CONTENT_W);
    y += 4;
  }
  return y;
}

// ─── Part divider ────────────────────────────────────────────────────────────

function renderPartDivider(doc: jsPDF, partNumber: number, title: string) {
  doc.addPage();
  // Full-width navy banner at vertical centre
  const bannerH = 50;
  const bannerY = (PAGE_H - bannerH) / 2;
  doc.setFillColor(...NAVY);
  doc.rect(0, bannerY, PAGE_W, bannerH, "F");

  // "Part N" label
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(...OCEAN_LIGHT);
  doc.text(`Part ${partNumber}`, PAGE_W / 2, bannerY + 16, { align: "center" });

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...WHITE);
  doc.text(title, PAGE_W / 2, bannerY + 32, { align: "center" });

  // Thin ocean accent line below banner
  doc.setDrawColor(...OCEAN);
  doc.setLineWidth(1);
  doc.line(PAGE_W / 2 - 30, bannerY + bannerH + 2, PAGE_W / 2 + 30, bannerY + bannerH + 2);
}

// ─── Page 1: Cover ──────────────────────────────────────────────────────────

function renderCoverPage(
  doc: jsPDF, engagement: Engagement, participant: Participant,
) {
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");

  // Brand name
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Synovate", MARGIN_X, 40);

  // Client name — prominent, below Synovate
  if (engagement.basics.client) {
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...WHITE);
    doc.text(engagement.basics.client, MARGIN_X, 52);
  }

  // Client logo placeholder
  if (engagement.reportFormat.branding.clientLogoUploaded) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...OCEAN_LIGHT);
    const logoName = engagement.reportFormat.branding.clientLogoFilename || "client logo";
    doc.text(`[Logo: ${logoName}]`, MARGIN_X, 62);
  }

  const cy = PAGE_H * 0.38;
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...WHITE);
  doc.text("Individual Assessment Report", PAGE_W / 2, cy, { align: "center" });

  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text(participant.name, PAGE_W / 2, cy + 16, { align: "center" });

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...OCEAN_LIGHT);
  const roleText = [participant.currentRole, participant.businessUnit].filter(Boolean).join(" \u00B7 ");
  doc.text(roleText, PAGE_W / 2, cy + 28, { align: "center" });

  // Metadata block — moved up (no OAR block taking space)
  const by = PAGE_H - 55;
  doc.setTextColor(...OCEAN_LIGHT);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const details = [
    engagement.basics.name,
    `Code: ${engagement.basics.code}`,
    engagement.basics.acDateRange ? `AC dates: ${engagement.basics.acDateRange}` : null,
    `Engagement lead: ${engagement.basics.synovateEngagementLead}`,
  ].filter(Boolean) as string[];
  details.forEach((line, i) => {
    doc.text(line, PAGE_W / 2, by + i * 5, { align: "center" });
  });

  if (engagement.basics.confidentialityFlag) {
    doc.setFontSize(8);
    doc.setTextColor(200, 200, 200);
    doc.text("CONFIDENTIAL", PAGE_W / 2, PAGE_H - 15, { align: "center" });
  }
}

// ─── Part 1: Assessment Context ─────────────────────────────────────────────

function renderContextPage(doc: jsPDF, engagement: Engagement) {
  doc.addPage();
  let y = MARGIN_TOP;

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...NAVY);
  doc.text("Assessment Context", MARGIN_X, y);
  doc.setDrawColor(...OCEAN);
  doc.setLineWidth(0.5);
  doc.line(MARGIN_X, y + 2, MARGIN_X + 60, y + 2);
  y += 12;

  // AC context paragraph (admin-written or default)
  const acContext = engagement.reportFormat.acContext ||
    `This Assessment Centre was commissioned by ${engagement.basics.client || "[Client]"} as part of a structured assessment process for the ${engagement.basics.audience || "target population"}. The assessment was designed using a multi-trait multi-method methodology to produce robust, evidence-based evaluations of each participant against the competencies defined for the target role.`;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);
  y = renderWrappedText(doc, acContext, MARGIN_X, y, 10, 1.5, CONTENT_W);
  y += 8;

  // Engagement Objectives
  if (engagement.basics.objective) {
    y = ensureSpace(doc, 20, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...NAVY);
    doc.text("Engagement Objectives", MARGIN_X, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);
    y = renderWrappedText(doc, engagement.basics.objective, MARGIN_X, y, 10, 1.5, CONTENT_W);
    y += 8;
  }

  // Engagement metadata block
  y = ensureSpace(doc, 60, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...NAVY);
  doc.text("Engagement Details", MARGIN_X, y);
  y += 8;

  const purposeLabels: Record<string, string> = {
    selection: "Selection",
    promotion: "Promotion readiness",
    development: "Development",
    hi_po: "High-potential identification",
  };

  const metaRows: [string, string][] = [
    ["Client", engagement.basics.client || "--"],
    ["Engagement", engagement.basics.name],
    ["Purpose", purposeLabels[engagement.basics.purpose] || engagement.basics.purpose],
    ["Target audience", engagement.basics.audience || "--"],
    ["AC dates", engagement.basics.acDateRange || "--"],
    ["Mode", engagement.basics.mode === "in_person" ? "In-person" : engagement.basics.mode === "virtual" ? "Virtual" : "Hybrid"],
    ["Engagement lead", engagement.basics.synovateEngagementLead],
  ];

  autoTable(doc, {
    startY: y,
    body: metaRows.map(([label, value]) => [label, value]),
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 45, fontStyle: "bold" },
    },
    headStyles: { fillColor: [...NAVY], textColor: [...WHITE], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [...INK_LIGHT] },
    margin: { left: MARGIN_X, right: MARGIN_X },
    showHead: false,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable?.finalY ?? y + 50;
  y += 10;

  // How to Read This Report — guidance box
  y = ensureSpace(doc, 50, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...NAVY);
  doc.text("How to Read This Report", MARGIN_X, y);
  y += 6;

  const guideItems = [
    "Part 1 — Background & Context: describes the assessment methodology, competency framework, and engagement parameters.",
    "Part 2 — Individual Assessment: presents the participant's scores, strengths, evidence, and narrative analysis.",
    "Part 3 — Development & Next Steps: outlines development recommendations, action planning, and reflection templates.",
  ];
  y = renderCalloutBox(doc, MARGIN_X, y, CONTENT_W, "Reading Guide", guideItems, OCEAN);
  y += 6;

  // ── Construct of the Assessment Centre ──

  y = ensureSpace(doc, 30, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...NAVY);
  doc.text("Construct of the Assessment Centre", MARGIN_X, y);
  doc.setDrawColor(...OCEAN);
  doc.setLineWidth(0.5);
  doc.line(MARGIN_X, y + 2, MARGIN_X + 105, y + 2);
  y += 10;

  // Methodology paragraph
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  y = renderWrappedText(
    doc,
    "This Assessment Centre employs a multi-trait multi-method (MTMM) design, widely regarded as the gold standard in personnel assessment. Each competency is observed across multiple assessment tools, and each tool surfaces evidence for multiple competencies. This cross-referencing ensures that competency ratings are based on converging evidence from different contexts \u2014 reducing method bias and increasing the reliability and validity of outcomes.",
    MARGIN_X, y, 10, 1.5, CONTENT_W,
  );
  y += 6;

  // Tools × Competencies matrix
  y = ensureSpace(doc, 40, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...NAVY);
  doc.text("Tools \u00D7 Competencies Matrix", MARGIN_X, y);
  y += 6;

  // Build matrix data with abbreviations
  const compNames: string[] = [];
  const compIds: string[] = [];
  engagement.competencies.forEach((sel) => {
    const comp = findCompetency(sel.competencyId, engagement.customCompetencies);
    compNames.push(comp?.name ?? sel.competencyId);
    compIds.push(sel.competencyId);
  });

  // Abbreviate competency names for matrix headers
  const useCodeLabels = compNames.length > 8;
  const abbreviations: string[] = compNames.map((name, idx) => {
    if (useCodeLabels) return `C${idx + 1}`;
    const firstWord = name.split(/\s+/)[0];
    if (firstWord.length <= 8) return firstWord;
    return firstWord.slice(0, 6) + ".";
  });

  const matrixHead = ["Tool", ...abbreviations];
  const matrixBody: string[][] = [];

  for (const tool of engagement.tools) {
    const row = [tool.name];
    for (const cid of compIds) {
      row.push(tool.competencyIds.includes(cid) ? "\u2713" : "");
    }
    matrixBody.push(row);
  }

  autoTable(doc, {
    startY: y,
    head: [matrixHead],
    body: matrixBody,
    styles: { fontSize: 12, cellPadding: 2, halign: "center" },
    headStyles: { fillColor: [...NAVY], textColor: [...WHITE], fontStyle: "bold", halign: "center", fontSize: 10 },
    columnStyles: { 0: { halign: "left", cellWidth: 30, fontStyle: "bold" } },
    margin: { left: MARGIN_X, right: MARGIN_X },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable?.finalY ?? y + 40;
  y += 4;

  // Numbered legend mapping abbreviations → full names
  y = ensureSpace(doc, compNames.length * 5 + 8, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  for (let i = 0; i < compNames.length; i++) {
    doc.text(`${abbreviations[i]} = ${compNames[i]}`, MARGIN_X + 2, y);
    y += 5;
  }
  y += 6;

  // Aggregation methodology summary
  y = ensureSpace(doc, 40, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...NAVY);
  doc.text("Aggregation Methodology", MARGIN_X, y);
  y += 6;

  const agg = engagement.aggregation;
  const methodLabels: Record<string, string> = {
    average: "Average",
    minimum: "Minimum",
    median: "Median",
    weighted_average: "Weighted average",
    simple_average: "Simple average",
    highest_reliable: "Highest reliable",
    critical_floor: "Critical floor",
    exclude: "Exclude",
    zero: "Treat as zero",
    minimum_count: "Minimum count required",
  };

  const aggText =
    `Indicator-level ratings are aggregated per competency using the ${(methodLabels[agg.indicatorMethod] || agg.indicatorMethod).toLowerCase()} method (minimum ${agg.minIndicatorsRated} indicators rated). ` +
    `Tool-level competency scores are combined using the ${(methodLabels[agg.toolMethod] || agg.toolMethod).toLowerCase()} method (minimum ${agg.minToolsRated} tools required). ` +
    `The Overall Assessment Rating (OAR) is calculated as a ${(methodLabels[agg.oarMethod] || agg.oarMethod).toLowerCase()} of competency scores, ` +
    `then mapped to a 5-band scale: Below (<${agg.oarThresholds[0]}), Developing (${agg.oarThresholds[0]}\u2013${agg.oarThresholds[1]}), Proficient (${agg.oarThresholds[1]}\u2013${agg.oarThresholds[2]}), Strong (${agg.oarThresholds[2]}\u2013${agg.oarThresholds[3]}), Distinguished (\u2265${agg.oarThresholds[3]}).`;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  y = renderWrappedText(doc, aggText, MARGIN_X, y, 10, 1.5, CONTENT_W);
  y += 8;

  // Assessor panel summary
  y = ensureSpace(doc, 25, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...NAVY);
  doc.text("Assessor Panel", MARGIN_X, y);
  y += 6;

  const leads = engagement.assessors.filter((a) => a.role === "lead");
  const assessors = engagement.assessors.filter((a) => a.role === "assessor");
  const observers = engagement.assessors.filter((a) => a.role === "observer");
  const panelParts: string[] = [];
  if (leads.length > 0) panelParts.push(`${leads.length} Lead Assessor${leads.length > 1 ? "s" : ""}`);
  if (assessors.length > 0) panelParts.push(`${assessors.length} Assessor${assessors.length > 1 ? "s" : ""}`);
  if (observers.length > 0) panelParts.push(`${observers.length} Observer${observers.length > 1 ? "s" : ""}`);

  const panelText =
    `The assessment panel comprised ${engagement.assessors.length} member${engagement.assessors.length !== 1 ? "s" : ""}: ${panelParts.join(", ")}. ` +
    `All panel members were calibrated prior to the assessment to ensure consistent application of the rating scale and behavioural anchors. ` +
    `Scores were moderated through a structured calibration session led by the Lead Assessor.`;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  renderWrappedText(doc, panelText, MARGIN_X, y, 10, 1.5, CONTENT_W);
}

// ─── Part 2: Assessment Overview (radar + OAR + stats) ──────────────────────

function renderOverviewPage(
  doc: jsPDF, engagement: Engagement, participant: Participant,
  oar: number | null, bandKey: string | null,
) {
  doc.addPage();
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...NAVY);
  doc.text("Assessment Overview", MARGIN_X, MARGIN_TOP);
  doc.setDrawColor(...OCEAN);
  doc.setLineWidth(0.5);
  doc.line(MARGIN_X, MARGIN_TOP + 2, MARGIN_X + 65, MARGIN_TOP + 2);

  // Collect data
  const labels: string[] = [];
  const scores: (number | null)[] = [];
  const targets: (number | null)[] = [];
  engagement.competencies.forEach((sel) => {
    const comp = findCompetency(sel.competencyId, engagement.customCompetencies);
    labels.push(comp?.name ?? sel.competencyId);
    scores.push(effectiveCompetencyScore(engagement, participant.id, sel.competencyId));
    const tgt = engagement.proficiencyTargets.find((t) => t.competencyId === sel.competencyId);
    targets.push(tgt?.targetLevel ?? null);
  });

  // Compute group averages
  const groupAvgs = groupAverageScores(engagement);
  const groupAvgValues: (number | null)[] = engagement.competencies.map((sel) => {
    const ga = groupAvgs.find((g) => g.competencyId === sel.competencyId);
    return ga && ga.average > 0 ? ga.average : null;
  });
  const hasGroupAvg = groupAvgValues.some((g) => g !== null) && engagement.participants.length > 1;

  // Radar chart (centred, upper area)
  if (labels.length >= 3) {
    renderRadarChart(doc, PAGE_W / 2, 95, 48, labels, scores, targets, hasGroupAvg ? groupAvgValues : undefined);
  }

  // Legend below chart
  let ly = 155;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  // Target legend swatch
  doc.setFillColor(220, 236, 248);
  doc.rect(MARGIN_X + 10, ly - 2, 8, 3, "F");
  doc.setTextColor(100, 100, 100);
  doc.text("Target profile", MARGIN_X + 20, ly);
  // Score legend swatch
  doc.setFillColor(130, 185, 215);
  doc.rect(MARGIN_X + 58, ly - 2, 8, 3, "F");
  doc.text("Assessed score", MARGIN_X + 68, ly);
  // Group average legend swatch
  if (hasGroupAvg) {
    doc.setDrawColor(180, 100, 30);
    doc.setLineWidth(0.6);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (doc as any).setLineDashPattern([2, 1.5], 0);
    doc.line(MARGIN_X + 110, ly - 0.5, MARGIN_X + 118, ly - 0.5);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (doc as any).setLineDashPattern([], 0);
    doc.text("Group average", MARGIN_X + 120, ly);
  }

  // OAR scale bar
  ly += 15;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text("Overall Assessment Rating", MARGIN_X, ly);
  ly += 10;
  renderOarScale(doc, MARGIN_X, ly, CONTENT_W, oar, engagement.aggregation.oarThresholds);

  // Key stats box
  ly += 25;
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN_X, ly, CONTENT_W, 22, 2, 2, "S");

  const statX = [MARGIN_X + 15, MARGIN_X + 58, MARGIN_X + 100, MARGIN_X + 142];
  const statLabels = ["Competencies", "Tools", "Observers", "OAR Band"];
  const statValues = [
    `${engagement.competencies.length}`,
    `${engagement.tools.length}`,
    `${engagement.assessors.length}`,
    bandKey ? OAR_BAND_META[bandKey as keyof typeof OAR_BAND_META].label : "N/A",
  ];
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);
  statLabels.forEach((lbl, i) => doc.text(lbl, statX[i], ly + 8, { align: "center" }));
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  statValues.forEach((val, i) => doc.text(val, statX[i], ly + 17, { align: "center" }));
}

// ─── Competency Score Table ─────────────────────────────────────────────────

function renderScoreTable(
  doc: jsPDF, engagement: Engagement, participant: Participant,
  oar: number | null, bandKey: string | null,
): number {
  doc.addPage();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...NAVY);
  doc.text("Competency Score Summary", MARGIN_X, MARGIN_TOP);
  doc.setDrawColor(...OCEAN);
  doc.setLineWidth(0.5);
  doc.line(MARGIN_X, MARGIN_TOP + 2, MARGIN_X + 80, MARGIN_TOP + 2);

  const startY = MARGIN_TOP + 10;
  const tableBody: (string | { content: string; styles: Record<string, unknown> })[][] = [];

  engagement.competencies.forEach((sel) => {
    const comp = findCompetency(sel.competencyId, engagement.customCompetencies);
    if (!comp) return;
    const tgt = engagement.proficiencyTargets.find((t) => t.competencyId === sel.competencyId);
    const score = effectiveCompetencyScore(engagement, participant.id, sel.competencyId);
    const targetLevel = tgt?.targetLevel ?? null;
    const gap = score !== null && targetLevel !== null ? score - targetLevel : null;
    const gapStr = gap !== null ? (gap >= 0 ? `+${gap.toFixed(2)}` : gap.toFixed(2)) : "--";
    const gapFill = gap !== null
      ? (gap >= 0 ? [232, 253, 240] : gap > -0.5 ? [255, 243, 224] : [254, 226, 226])
      : [245, 245, 245];
    const gapText = gap !== null ? (gap >= 0 ? [...GREEN] : gap > -0.5 ? [...AMBER] : [...RED]) : [100, 100, 100];

    tableBody.push([
      comp.name,
      comp.cluster.charAt(0).toUpperCase() + comp.cluster.slice(1),
      targetLevel !== null ? `L${targetLevel}` : "--",
      score !== null ? score.toFixed(2) : "N/A",
      { content: gapStr, styles: { fillColor: gapFill, textColor: gapText, fontStyle: "bold" } },
      `${sel.weight}x`,
    ]);
  });

  autoTable(doc, {
    startY,
    head: [["Competency", "Cluster", "Target", "Score", "Gap", "Weight"]],
    body: tableBody,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [...NAVY], textColor: [...WHITE], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 48 },
      1: { cellWidth: 28 },
      2: { cellWidth: 18, halign: "center" },
      3: { cellWidth: 18, halign: "center" },
      4: { cellWidth: 20, halign: "center" },
      5: { cellWidth: 18, halign: "center" },
    },
    margin: { left: MARGIN_X, right: MARGIN_X },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let afterTable = (doc as any).lastAutoTable?.finalY ?? startY + 40;
  afterTable += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  const oarText = oar !== null ? `Overall Assessment Rating: ${oar.toFixed(2)}` : "Overall Assessment Rating: N/A";
  doc.text(oarText, MARGIN_X, afterTable);

  if (bandKey) {
    const bm = OAR_BAND_META[bandKey as keyof typeof OAR_BAND_META];
    const bc = BAND_COLOURS[bandKey] ?? OCEAN;
    doc.setTextColor(...bc);
    doc.text(` \u2014 ${bm.label}`, MARGIN_X + doc.getTextWidth(oarText) + 2, afterTable);
  }

  afterTable += 8;
  const [t1, t2, t3, t4] = engagement.aggregation.oarThresholds;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);
  doc.text(
    `Band thresholds: Below < ${t1} | Developing ${t1}\u2013${t2} | Proficient ${t2}\u2013${t3} | Strong ${t3}\u2013${t4} | Distinguished \u2265 ${t4}`,
    MARGIN_X, afterTable,
  );
  return afterTable + 6;
}

// ─── Strengths & Development Snapshot ────────────────────────────────────────

function renderStrengthsPage(doc: jsPDF, engagement: Engagement, participant: Participant) {
  doc.addPage();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...NAVY);
  doc.text("Strengths & Development Snapshot", MARGIN_X, MARGIN_TOP);
  doc.setDrawColor(...OCEAN);
  doc.setLineWidth(0.5);
  doc.line(MARGIN_X, MARGIN_TOP + 2, MARGIN_X + 100, MARGIN_TOP + 2);

  // Build bar chart items, sorted by gap
  const items: (BarItem & { gap: number })[] = [];
  engagement.competencies.forEach((sel) => {
    const comp = findCompetency(sel.competencyId, engagement.customCompetencies);
    const score = effectiveCompetencyScore(engagement, participant.id, sel.competencyId);
    const tgt = engagement.proficiencyTargets.find((t) => t.competencyId === sel.competencyId);
    if (score === null || !comp) return;
    const target = tgt?.targetLevel ?? 3;
    items.push({ label: comp.name, score, target, gap: score - target });
  });
  items.sort((a, b) => b.gap - a.gap);

  let y = MARGIN_TOP + 14;
  y = renderBarChart(doc, MARGIN_X, y, CONTENT_W, items);
  y += 6;

  // Strengths callout
  const strengths = items.filter((it) => it.gap >= 0.1).map((it) => `${it.label} (+${it.gap.toFixed(2)})`);
  const devAreas = items.filter((it) => it.gap < -0.1).map((it) => `${it.label} (${it.gap.toFixed(2)})`);

  y = renderCalloutBox(doc, MARGIN_X, y, CONTENT_W / 2 - 3, "Strengths", strengths, GREEN);
  y = renderCalloutBox(doc, MARGIN_X, y, CONTENT_W / 2 - 3, "Development Areas", devAreas, AMBER);
}

// ─── Evidence Highlights ─────────────────────────────────────────────────────

function renderEvidencePage(doc: jsPDF, engagement: Engagement, participant: Participant) {
  // Check if there is any evidence
  const hasEvidence = engagement.scores.some((s) => s.participantId === participant.id);
  if (!hasEvidence) return;

  doc.addPage();
  let y = MARGIN_TOP;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...NAVY);
  doc.text("Evidence Highlights", MARGIN_X, y);
  doc.setDrawColor(...OCEAN);
  doc.setLineWidth(0.5);
  doc.line(MARGIN_X, y + 2, MARGIN_X + 55, y + 2);
  y += 10;

  for (const sel of engagement.competencies) {
    const ev = collectEvidence(engagement, participant.id, sel.competencyId);
    const hasContent = ev.wellDone.length + ev.couldBeBetter.length + ev.verbatim.length + ev.insights.length > 0;
    if (!hasContent) continue;

    // Competency heading
    y = ensureSpace(doc, 30, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    doc.text(ev.competencyName, MARGIN_X, y);
    // Score + target meta
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    const nameW = doc.getTextWidth(ev.competencyName);
    doc.setFontSize(8);
    doc.text(
      `  Score: ${ev.score?.toFixed(2) ?? "N/A"} | Target: L${ev.target ?? "?"}`,
      MARGIN_X + nameW + 2, y,
    );
    y += 6;

    // Evidence sections
    const sections: { title: string; items: string[]; color: readonly [number, number, number] }[] = [
      { title: "What went well", items: ev.wellDone, color: GREEN },
      { title: "What could be improved", items: ev.couldBeBetter, color: AMBER },
    ];
    for (const sec of sections) {
      if (sec.items.length === 0) continue;
      y = ensureSpace(doc, 12, y);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...sec.color);
      doc.text(sec.title, MARGIN_X + 3, y);
      y += 4;
      for (const text of sec.items) {
        y = renderQuoteBlock(doc, MARGIN_X + 3, y, text, CONTENT_W - 6);
        y += 2;
      }
    }

    // Verbatim quotes
    if (ev.verbatim.length > 0) {
      y = ensureSpace(doc, 12, y);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...OCEAN);
      doc.text("Verbatim observations", MARGIN_X + 3, y);
      y += 4;
      for (const text of ev.verbatim) {
        y = renderQuoteBlock(doc, MARGIN_X + 3, y, text, CONTENT_W - 6);
        y += 2;
      }
    }

    // Notable insights
    if (ev.insights.length > 0) {
      y = ensureSpace(doc, 12, y);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...NAVY);
      doc.text("Notable insights", MARGIN_X + 3, y);
      y += 4;
      for (const text of ev.insights) {
        y = renderQuoteBlock(doc, MARGIN_X + 3, y, text, CONTENT_W - 6);
        y += 2;
      }
    }

    y += 6;
  }
}

// ─── Single narrative section renderer ───────────────────────────────────────

function renderNarrativeSection(
  doc: jsPDF, engagement: Engagement, participant: Participant,
  sectionKey: ReportSectionKey,
) {
  const def = SECTION_DEFS.find((d) => d.key === sectionKey);
  if (!def) return;

  const enabled = engagement.reportFormat.sections[sectionKey as keyof typeof engagement.reportFormat.sections];
  if (!enabled) return;

  const section = engagement.report.sections.find(
    (s) => s.participantId === participant.id && s.sectionKey === sectionKey,
  );
  if (!section?.content) return;

  doc.addPage();
  let y = MARGIN_TOP;

  // Section heading
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...NAVY);
  doc.text(def.label, MARGIN_X, y);

  if (section.status !== "signed_off") {
    const lw = doc.getTextWidth(def.label);
    doc.setFontSize(10);
    doc.setTextColor(...AMBER);
    doc.text("  (DRAFT)", MARGIN_X + lw, y);
  }

  y += 3;
  doc.setDrawColor(...OCEAN);
  doc.setLineWidth(0.4);
  doc.line(MARGIN_X, y, MARGIN_X + CONTENT_W, y);
  y += 8;

  renderFormattedContent(doc, section.content, y);
}

// ─── Part 3: Action Plan Worksheet ──────────────────────────────────────────

function renderWorksheetActionPlan(doc: jsPDF, participant: Participant) {
  doc.addPage();
  let y = MARGIN_TOP;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...NAVY);
  doc.text("Personal Development Action Plan", MARGIN_X, y);
  doc.setDrawColor(...OCEAN);
  doc.setLineWidth(0.5);
  doc.line(MARGIN_X, y + 2, MARGIN_X + 100, y + 2);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Participant: ${participant.name}`, MARGIN_X, y);
  y += 8;

  // Blank table with 6 rows for the participant to fill in
  const emptyRows = Array.from({ length: 6 }, () => ["", "", "", "", ""]);

  autoTable(doc, {
    startY: y,
    head: [["Priority Area", "Specific Actions", "Timeline", "Resources / Support", "Success Measures"]],
    body: emptyRows,
    styles: { fontSize: 8.5, cellPadding: 4, minCellHeight: 18 },
    headStyles: { fillColor: [...NAVY], textColor: [...WHITE], fontStyle: "bold", fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 42 },
      2: { cellWidth: 25 },
      3: { cellWidth: 36 },
      4: { cellWidth: 35 },
    },
    margin: { left: MARGIN_X, right: MARGIN_X },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable?.finalY ?? y + 120;
  y += 8;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(140, 140, 140);
  doc.text("Complete this plan during or after your feedback session. Focus on 2\u20133 priorities with specific, time-bound actions.", MARGIN_X, y);
}

// ─── Part 3: 90-Day Reflection Template ─────────────────────────────────────

function renderWorksheetReflection(doc: jsPDF, participant: Participant) {
  doc.addPage();
  let y = MARGIN_TOP;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...NAVY);
  doc.text("90-Day Reflection Template", MARGIN_X, y);
  doc.setDrawColor(...OCEAN);
  doc.setLineWidth(0.5);
  doc.line(MARGIN_X, y + 2, MARGIN_X + 80, y + 2);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Participant: ${participant.name}`, MARGIN_X, y);
  y += 10;

  const months = ["Month 1 (Days 1\u201330)", "Month 2 (Days 31\u201360)", "Month 3 (Days 61\u201390)"];
  const prompts = ["Key actions taken", "What worked well", "What to adjust", "Support needed"];

  for (const month of months) {
    y = ensureSpace(doc, 60, y);

    // Month heading with navy background
    doc.setFillColor(...NAVY);
    doc.roundedRect(MARGIN_X, y, CONTENT_W, 8, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...WHITE);
    doc.text(month, MARGIN_X + 4, y + 5.5);
    y += 12;

    for (const prompt of prompts) {
      y = ensureSpace(doc, 20, y);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...NAVY);
      doc.text(prompt, MARGIN_X, y);
      y += 4;

      // Lined writing area (3 lines)
      doc.setDrawColor(210, 210, 210);
      doc.setLineWidth(0.2);
      for (let l = 0; l < 3; l++) {
        doc.line(MARGIN_X, y + l * 6, MARGIN_X + CONTENT_W, y + l * 6);
      }
      y += 20;
    }

    y += 4;
  }

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(140, 140, 140);
  y = ensureSpace(doc, 8, y);
  doc.text("Use this template to track your development journey. Review with your line manager or coach at each milestone.", MARGIN_X, y);
}

// ─── Headers and footers ────────────────────────────────────────────────────

function addHeadersAndFooters(doc: jsPDF, engagement: Engagement) {
  const totalPages = doc.getNumberOfPages();
  const code = engagement.basics.code;
  const client = engagement.basics.client;

  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i);
    if (engagement.basics.confidentialityFlag) {
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(180, 180, 180);
      doc.text("CONFIDENTIAL", MARGIN_X, HEADER_Y);
    }
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text(code, PAGE_W - MARGIN_X, HEADER_Y, { align: "right" });

    doc.text(`${i}`, PAGE_W / 2, FOOTER_Y, { align: "center" });
    const brand = client ? `Synovate | ${client}` : "Synovate";
    doc.text(brand, PAGE_W - MARGIN_X, FOOTER_Y, { align: "right" });
  }
}

// ─── Public exports ─────────────────────────────────────────────────────────

/** Build the PDF document in memory (no save/download). */
export function buildIndividualReportDoc(
  engagement: Engagement, participant: Participant,
): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const oar = computedOar(engagement, participant.id);
  const bandKey = oar !== null ? oarBandFor(engagement, oar) : null;

  // ── Cover page ──
  renderCoverPage(doc, engagement, participant);

  // ── Part 1: Background & Context ──
  renderPartDivider(doc, 1, "Background & Context");
  renderContextPage(doc, engagement);

  // ── Part 2: Individual Assessment ──
  renderPartDivider(doc, 2, "Individual Assessment");
  renderNarrativeSection(doc, engagement, participant, "executiveSummary");
  renderOverviewPage(doc, engagement, participant, oar, bandKey);
  renderScoreTable(doc, engagement, participant, oar, bandKey);
  renderStrengthsPage(doc, engagement, participant);
  renderEvidencePage(doc, engagement, participant);
  renderNarrativeSection(doc, engagement, participant, "competencyProfile");
  renderNarrativeSection(doc, engagement, participant, "indicatorEvidence");

  // ── Part 3: Development & Next Steps ──
  renderPartDivider(doc, 3, "Development & Next Steps");
  renderNarrativeSection(doc, engagement, participant, "developmentAreas");
  renderNarrativeSection(doc, engagement, participant, "nextSteps");
  renderWorksheetActionPlan(doc, participant);
  renderWorksheetReflection(doc, participant);

  // ── Headers & footers on all pages ──
  addHeadersAndFooters(doc, engagement);

  return doc;
}

/** Build and trigger browser download of the individual report PDF. */
export function generateIndividualReportPDF(
  engagement: Engagement, participant: Participant,
) {
  const doc = buildIndividualReportDoc(engagement, participant);
  const fileName = `${engagement.basics.code} - ${participant.name} - Individual Report.pdf`;
  doc.save(fileName);
}
