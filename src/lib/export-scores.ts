import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { findCompetency } from "@/mocks/dictionary";
import { computeScoringStatus } from "@/lib/scoring";
import type {
  Engagement, EngagementTool, ParticipantToolScore,
} from "@/types";

/**
 * Generate and download an Excel file with the observer's scores for a tool.
 */
export function generateScoreExcel(
  engagement: Engagement,
  tool: EngagementTool,
  observerId: string,
  allScores: ParticipantToolScore[],
) {
  const wb = XLSX.utils.book_new();
  const observer = engagement.assessors.find((a) => a.id === observerId);
  const participants = engagement.participants.filter((p) => p.toolIds.includes(tool.id));

  const rows: Record<string, unknown>[] = [];

  participants.forEach((p) => {
    const score = allScores.find(
      (s) => s.participantId === p.id && s.toolId === tool.id && s.observerId === observerId,
    );
    const status = computeScoringStatus(score);

    tool.competencyIds.forEach((cid) => {
      const competency = findCompetency(cid);
      if (!competency) return;
      const target = engagement.proficiencyTargets.find((t) => t.competencyId === cid);
      const cs = score?.competencies.find((c) => c.competencyId === cid);

      const row: Record<string, unknown> = {
        Participant: p.name,
        Role: p.currentRole,
        "Business Unit": p.businessUnit ?? "",
        Status: status,
        Competency: competency.name,
        "Target Level": target ? `L${target.targetLevel}` : "",
        "What was done well": cs?.whatWasDoneWell ?? "",
        "What could be better": cs?.whatCouldBeBetter ?? "",
      };

      // Add indicator columns
      for (let i = 0; i < 4; i++) {
        const ind = cs?.indicators[i];
        if (ind?.notObserved) {
          row[`Indicator ${i + 1}`] = "N/O";
        } else if (ind?.rating !== undefined) {
          row[`Indicator ${i + 1}`] = ind.rating;
        } else {
          row[`Indicator ${i + 1}`] = "";
        }
      }

      rows.push(row);
    });
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Scores");

  const fileName = `${engagement.basics.name} - ${tool.name} - ${observer?.name ?? "Observer"}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Generate and download a PDF file with the observer's scores for a tool.
 */
export function generateScorePDF(
  engagement: Engagement,
  tool: EngagementTool,
  observerId: string,
  allScores: ParticipantToolScore[],
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const observer = engagement.assessors.find((a) => a.id === observerId);
  const participants = engagement.participants.filter((p) => p.toolIds.includes(tool.id));

  // Title page header
  doc.setFontSize(18);
  doc.text(engagement.basics.name, 14, 20);
  doc.setFontSize(12);
  doc.text(`Tool: ${tool.name}`, 14, 28);
  doc.text(`Observer: ${observer?.name ?? "Unknown"}`, 14, 34);
  doc.text(`Date: ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`, 14, 40);

  let startY = 48;

  participants.forEach((p, pIdx) => {
    if (pIdx > 0) {
      doc.addPage();
      startY = 20;
    }

    const score = allScores.find(
      (s) => s.participantId === p.id && s.toolId === tool.id && s.observerId === observerId,
    );
    const status = computeScoringStatus(score);

    doc.setFontSize(14);
    doc.text(`${p.name} — ${p.currentRole}${p.businessUnit ? ` · ${p.businessUnit}` : ""} [${status}]`, 14, startY);
    startY += 8;

    const tableData: (string | number)[][] = [];

    tool.competencyIds.forEach((cid) => {
      const competency = findCompetency(cid);
      if (!competency) return;
      const target = engagement.proficiencyTargets.find((t) => t.competencyId === cid);
      const cs = score?.competencies.find((c) => c.competencyId === cid);

      const indicators = [0, 1, 2, 3].map((i) => {
        const ind = cs?.indicators[i];
        if (ind?.notObserved) return "N/O";
        if (ind?.rating !== undefined) return String(ind.rating);
        return "-";
      });

      tableData.push([
        competency.name,
        target ? `L${target.targetLevel}` : "",
        cs?.whatWasDoneWell ?? "",
        cs?.whatCouldBeBetter ?? "",
        ...indicators,
      ]);
    });

    autoTable(doc, {
      startY,
      head: [["Competency", "Target", "Done Well", "Could Be Better", "I1", "I2", "I3", "I4"]],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 41, 59] },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 15 },
        2: { cellWidth: 55 },
        3: { cellWidth: 55 },
        4: { cellWidth: 12 },
        5: { cellWidth: 12 },
        6: { cellWidth: 12 },
        7: { cellWidth: 12 },
      },
      margin: { left: 14 },
    });
  });

  const fileName = `${engagement.basics.name} - ${tool.name} - ${observer?.name ?? "Observer"}.pdf`;
  doc.save(fileName);
}
