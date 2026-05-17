import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { findCompetency } from "@/mocks/dictionary";
import {
  effectiveCompetencyScore, computedOar, oarBandFor,
} from "@/lib/calibrate";
import { OAR_BAND_META } from "@/types";
import type {
  Engagement, Participant, ReportSectionKey,
} from "@/types";

// ─── Section definitions (matches ReportIndividual.tsx) ─────────────────────
const SECTION_DEFS: { key: ReportSectionKey; label: string }[] = [
  { key: "executiveSummary",  label: "Executive Summary" },
  { key: "competencyProfile", label: "Competency Profile" },
  { key: "indicatorEvidence", label: "Indicator Evidence" },
  { key: "developmentAreas",  label: "Development Areas" },
  { key: "nextSteps",         label: "Next Steps" },
  { key: "cohortContext",     label: "Cohort Context" },
];

// ─── Brand colours ──────────────────────────────────────────────────────────
const NAVY   = [30, 41, 59]   as const; // navy-700
const OCEAN  = [56, 133, 182] as const; // ocean-600
const OCEAN_LIGHT = [164, 206, 230] as const; // ocean-300
const WHITE  = [255, 255, 255] as const;

const BAND_COLOURS: Record<string, readonly [number, number, number]> = {
  below:         [220, 38, 38],    // red-600
  developing:    [217, 119, 6],    // amber-600
  proficient:    [56, 133, 182],   // ocean-600
  strong:        [22, 163, 74],    // green-600
  distinguished: [30, 41, 59],     // navy-700
};

// ─── Constants ──────────────────────────────────────────────────────────────
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_X = 20;
const MARGIN_TOP = 25;
const MARGIN_BOTTOM = 20;
const CONTENT_W = PAGE_W - 2 * MARGIN_X;
const USABLE_BOTTOM = PAGE_H - MARGIN_BOTTOM;
const HEADER_Y = 12;
const FOOTER_Y = PAGE_H - 10;

// ─── Helpers ────────────────────────────────────────────────────────────────

function ensureSpace(doc: jsPDF, needed: number, cursorY: number): number {
  if (cursorY + needed > USABLE_BOTTOM) {
    doc.addPage();
    return MARGIN_TOP;
  }
  return cursorY;
}

function renderWrappedText(
  doc: jsPDF,
  text: string,
  x: number,
  startY: number,
  fontSize: number,
  lineHeightMult: number,
  maxWidth: number,
): number {
  doc.setFontSize(fontSize);
  const lineHeight = fontSize * 0.3528 * lineHeightMult; // pt → mm approx
  const lines = doc.splitTextToSize(text, maxWidth) as string[];
  let y = startY;
  for (const line of lines) {
    y = ensureSpace(doc, lineHeight, y);
    doc.text(line, x, y);
    y += lineHeight;
  }
  return y;
}

// ─── Cover page ─────────────────────────────────────────────────────────────

function renderCoverPage(
  doc: jsPDF,
  engagement: Engagement,
  participant: Participant,
  oar: number | null,
  bandKey: string | null,
) {
  // Full navy background
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");

  // Brand text
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Synovate", MARGIN_X, 40);

  // Co-branding
  if (engagement.reportFormat.branding.coBranded && engagement.basics.client) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Prepared for ${engagement.basics.client}`, MARGIN_X, 50);
  }

  // Title block — centred
  const centreY = PAGE_H * 0.38;
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text("Individual Assessment Report", PAGE_W / 2, centreY, { align: "center" });

  // Participant name
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text(participant.name, PAGE_W / 2, centreY + 16, { align: "center" });

  // Role + BU
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...OCEAN_LIGHT);
  const roleText = [participant.currentRole, participant.businessUnit].filter(Boolean).join(" · ");
  doc.text(roleText, PAGE_W / 2, centreY + 28, { align: "center" });

  // OAR score
  if (oar !== null) {
    doc.setTextColor(...WHITE);
    doc.setFontSize(36);
    doc.setFont("helvetica", "bold");
    doc.text(oar.toFixed(2), PAGE_W / 2, centreY + 50, { align: "center" });

    if (bandKey) {
      const bandColour = BAND_COLOURS[bandKey] ?? OCEAN;
      const bandMeta = OAR_BAND_META[bandKey as keyof typeof OAR_BAND_META];
      doc.setFontSize(14);
      doc.setTextColor(...bandColour);
      doc.text(bandMeta.label, PAGE_W / 2, centreY + 60, { align: "center" });
      doc.setFontSize(9);
      doc.setTextColor(...OCEAN_LIGHT);
      doc.text(bandMeta.description, PAGE_W / 2, centreY + 68, { align: "center" });
    }
  } else {
    doc.setTextColor(...OCEAN_LIGHT);
    doc.setFontSize(14);
    doc.text("OAR: N/A", PAGE_W / 2, centreY + 50, { align: "center" });
  }

  // Bottom block — engagement details
  const bottomY = PAGE_H - 60;
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
    doc.text(line, PAGE_W / 2, bottomY + i * 5, { align: "center" });
  });

  // Confidential marker
  if (engagement.basics.confidentialityFlag) {
    doc.setFontSize(8);
    doc.setTextColor(200, 200, 200);
    doc.text("CONFIDENTIAL", PAGE_W / 2, PAGE_H - 15, { align: "center" });
  }
}

// ─── Score table (page 2) ───────────────────────────────────────────────────

function renderScoreTable(
  doc: jsPDF,
  engagement: Engagement,
  participant: Participant,
  oar: number | null,
  bandKey: string | null,
): number {
  doc.addPage();

  // Title
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Competency Score Summary", MARGIN_X, MARGIN_TOP);

  // Underline
  doc.setDrawColor(...OCEAN);
  doc.setLineWidth(0.5);
  doc.line(MARGIN_X, MARGIN_TOP + 2, MARGIN_X + 80, MARGIN_TOP + 2);

  const startY = MARGIN_TOP + 10;

  // Build table data
  const tableBody: (string | { content: string; styles: Record<string, unknown> })[][] = [];

  engagement.competencies.forEach((sel) => {
    const comp = findCompetency(sel.competencyId);
    if (!comp) return;
    const target = engagement.proficiencyTargets.find((t) => t.competencyId === sel.competencyId);
    const score = effectiveCompetencyScore(engagement, participant.id, sel.competencyId);
    const targetLevel = target?.targetLevel ?? null;
    const gap = score !== null && targetLevel !== null ? score - targetLevel : null;

    const gapStr = gap !== null ? (gap >= 0 ? `+${gap.toFixed(2)}` : gap.toFixed(2)) : "--";
    const gapColour = gap !== null ? (gap >= 0 ? [22, 163, 74] : [220, 38, 38]) : [100, 100, 100];

    tableBody.push([
      comp.name,
      targetLevel !== null ? `L${targetLevel}` : "--",
      score !== null ? score.toFixed(2) : "N/A",
      { content: gapStr, styles: { textColor: gapColour } },
      `${sel.weight}x`,
      sel.critical ? "Yes" : "",
    ]);
  });

  autoTable(doc, {
    startY,
    head: [["Competency", "Target", "Score", "Gap", "Weight", "Critical"]],
    body: tableBody,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [...NAVY], textColor: [...WHITE], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 18, halign: "center" },
      2: { cellWidth: 18, halign: "center" },
      3: { cellWidth: 18, halign: "center" },
      4: { cellWidth: 18, halign: "center" },
      5: { cellWidth: 18, halign: "center" },
    },
    margin: { left: MARGIN_X, right: MARGIN_X },
  });

  // Summary row below table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let afterTable = (doc as any).lastAutoTable?.finalY ?? startY + 40;
  afterTable += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  const oarText = oar !== null ? `Overall Assessment Rating: ${oar.toFixed(2)}` : "Overall Assessment Rating: N/A";
  doc.text(oarText, MARGIN_X, afterTable);

  if (bandKey) {
    const bandMeta = OAR_BAND_META[bandKey as keyof typeof OAR_BAND_META];
    const bandColour = BAND_COLOURS[bandKey] ?? OCEAN;
    doc.setTextColor(...bandColour);
    doc.text(` — ${bandMeta.label}`, MARGIN_X + doc.getTextWidth(oarText) + 2, afterTable);
  }

  afterTable += 8;

  // Band thresholds reference
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);
  const [t1, t2, t3, t4] = engagement.aggregation.oarThresholds;
  doc.text(
    `Band thresholds: Below < ${t1} | Developing ${t1}–${t2} | Proficient ${t2}–${t3} | Strong ${t3}–${t4} | Distinguished ≥ ${t4}`,
    MARGIN_X,
    afterTable,
  );

  return afterTable + 6;
}

// ─── Narrative sections (pages 3+) ──────────────────────────────────────────

function renderNarrativeSections(
  doc: jsPDF,
  engagement: Engagement,
  participant: Participant,
) {
  const sections = engagement.report.sections.filter((s) => s.participantId === participant.id);

  for (const def of SECTION_DEFS) {
    // Skip if not enabled in report format
    const sectionEnabled = engagement.reportFormat.sections[def.key as keyof typeof engagement.reportFormat.sections];
    if (!sectionEnabled) continue;

    const section = sections.find((s) => s.sectionKey === def.key);
    if (!section?.content) continue;

    doc.addPage();
    let y = MARGIN_TOP;

    // Section heading
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...NAVY);
    doc.text(def.label, MARGIN_X, y);

    // Draft marker
    if (section.status !== "signed_off") {
      const labelWidth = doc.getTextWidth(def.label);
      doc.setFontSize(10);
      doc.setTextColor(217, 119, 6); // amber
      doc.text("  (DRAFT)", MARGIN_X + labelWidth, y);
    }

    y += 3;

    // Ocean rule under heading
    doc.setDrawColor(...OCEAN);
    doc.setLineWidth(0.4);
    doc.line(MARGIN_X, y, MARGIN_X + CONTENT_W, y);
    y += 8;

    // Body text — split on double newlines for paragraphs
    doc.setTextColor(50, 50, 50);
    doc.setFont("helvetica", "normal");

    const paragraphs = section.content.split(/\n\n+/);
    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (!trimmed) continue;
      y = renderWrappedText(doc, trimmed, MARGIN_X, y, 10, 1.5, CONTENT_W);
      y += 4; // paragraph spacing
    }
  }
}

// ─── Headers and footers (post-render loop) ─────────────────────────────────

function addHeadersAndFooters(
  doc: jsPDF,
  engagement: Engagement,
) {
  const totalPages = doc.getNumberOfPages();
  const code = engagement.basics.code;
  const client = engagement.basics.client;

  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i);

    // Header
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

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`${i}`, PAGE_W / 2, FOOTER_Y, { align: "center" });

    const brandLine = client ? `Synovate | ${client}` : "Synovate";
    doc.text(brandLine, PAGE_W - MARGIN_X, FOOTER_Y, { align: "right" });
  }
}

// ─── Public exports ─────────────────────────────────────────────────────────

/** Build the PDF document in memory (no save/download). */
export function buildIndividualReportDoc(
  engagement: Engagement,
  participant: Participant,
): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const oar = computedOar(engagement, participant.id);
  const bandKey = oar !== null ? oarBandFor(engagement, oar) : null;

  renderCoverPage(doc, engagement, participant, oar, bandKey);
  renderScoreTable(doc, engagement, participant, oar, bandKey);
  renderNarrativeSections(doc, engagement, participant);
  addHeadersAndFooters(doc, engagement);

  return doc;
}

/** Build and trigger browser download of the individual report PDF. */
export function generateIndividualReportPDF(
  engagement: Engagement,
  participant: Participant,
) {
  const doc = buildIndividualReportDoc(engagement, participant);
  const fileName = `${engagement.basics.code} - ${participant.name} - Individual Report.pdf`;
  doc.save(fileName);
}
