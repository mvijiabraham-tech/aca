import { useParams, useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import {
  ChevronLeft, CheckCircle2, Sparkles, Edit3,
  Lock, FileText, Download, Loader2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { generateWithClaude } from "@/lib/ai";
import { generateIndividualReportPDF } from "@/lib/export-report";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useEngagement, useAppStore, useActingObserverId } from "@/lib/store";
import {
  effectiveCompetencyScore, computedOar, oarBandFor,
} from "@/lib/calibrate";
import { findCompetency } from "@/mocks/dictionary";
import { OAR_BAND_META } from "@/types";
import type {
  ReportSection, ReportSectionKey, ReportSectionStatus,
} from "@/types";

const SECTION_DEFS: { key: ReportSectionKey; label: string; description: string }[] = [
  { key: "executiveSummary",  label: "Executive summary",       description: "Two-paragraph overview with OAR, top strengths, top development areas." },
  { key: "competencyProfile", label: "Competency profile",      description: "Per-competency commentary based on the moderated scores." },
  { key: "indicatorEvidence", label: "Indicator evidence",      description: "Specific behavioural evidence per competency, drawn from observer notes." },
  { key: "developmentAreas",  label: "Development areas",       description: "Two-to-three priority development areas with rationale." },
  { key: "nextSteps",         label: "Next steps",              description: "Concrete development actions for the next 6-12 months." },
  { key: "cohortContext",     label: "Cohort context",          description: "How this participant compares to peers (optional)." },
];

export function ReportIndividual() {
  const { engagementId } = useParams<{ engagementId: string }>();
  const navigate = useNavigate();
  const engagement = useEngagement(engagementId);
  const upsertReportSection = useAppStore((s) => s.upsertReportSection);
  const actingId = useActingObserverId(engagementId);

  const [selectedPid, setSelectedPid] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<ReportSectionKey | null>(null);
  const [editContent, setEditContent] = useState("");
  const [promptCopied, setPromptCopied] = useState<string | null>(null);
  const [draftingSection, setDraftingSection] = useState<ReportSectionKey | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);

  if (!engagement) return null;

  const participants = engagement.participants;
  const activePid = selectedPid ?? participants[0]?.id ?? null;
  const activeParticipant = participants.find((p) => p.id === activePid);

  const participantSections = useMemo(
    () => engagement.report.sections.filter((s) => s.participantId === activePid),
    [engagement.report.sections, activePid],
  );

  function getSection(key: ReportSectionKey): ReportSection | undefined {
    return participantSections.find((s) => s.sectionKey === key);
  }

  function startEdit(key: ReportSectionKey) {
    const existing = getSection(key);
    setEditingSection(key);
    setEditContent(existing?.content ?? "");
  }

  function saveSection(status: ReportSectionStatus = "edited") {
    if (!editingSection || !activePid) return;
    const section: ReportSection = {
      participantId: activePid,
      sectionKey: editingSection,
      content: editContent,
      status,
      lastEditedAt: new Date().toISOString(),
      ...(status === "signed_off" ? {
        signedOffBy: actingId ?? undefined,
        signedOffAt: new Date().toISOString(),
      } : {}),
    };
    upsertReportSection(engagement!.id, section);
    setEditingSection(null);
  }

  function generatePrompt(key: ReportSectionKey): string {
    if (!activeParticipant) return "";
    const def = SECTION_DEFS.find((d) => d.key === key);
    const oar = computedOar(engagement!, activeParticipant.id);
    const band = oar !== null ? oarBandFor(engagement!, oar) : null;

    // Competency profile with scores
    const profile = engagement!.competencies.map((sel) => {
      const c = findCompetency(sel.competencyId, engagement?.customCompetencies);
      const score = effectiveCompetencyScore(engagement!, activeParticipant.id, sel.competencyId);
      const target = engagement!.proficiencyTargets.find((t) => t.competencyId === sel.competencyId);
      const gap = score !== null && target ? score - target.targetLevel : null;
      return `- ${c?.name}: ${score?.toFixed(2) ?? "—"} (target L${target?.targetLevel ?? "?"}, gap ${gap !== null ? (gap >= 0 ? "+" : "") + gap.toFixed(2) : "—"}, weight ${sel.weight}${sel.critical ? ", CRITICAL" : ""})`;
    }).join("\n");

    // Consolidated evidence per competency from all observer scores
    const evidenceBlocks = engagement!.competencies.map((sel) => {
      const c = findCompetency(sel.competencyId, engagement?.customCompetencies);
      const evidence = engagement!.scores
        .filter((s) => s.participantId === activeParticipant.id)
        .flatMap((s) => s.competencies.filter((cs) => cs.competencyId === sel.competencyId));

      const wellDone = [...new Set(evidence.map((e) => e.whatWasDoneWell).filter(Boolean))];
      const couldBeBetter = [...new Set(evidence.map((e) => e.whatCouldBeBetter).filter(Boolean))];
      const verbatim = [...new Set(evidence.map((e) => e.verbatimObservations).filter(Boolean))];
      const insights = [...new Set(evidence.map((e) => e.otherNotableInsights).filter(Boolean))];

      let block = `### ${c?.name ?? sel.competencyId}`;
      if (wellDone.length) block += `\nStrengths observed:\n${wellDone.map((t) => `  - ${t}`).join("\n")}`;
      if (couldBeBetter.length) block += `\nAreas for improvement:\n${couldBeBetter.map((t) => `  - ${t}`).join("\n")}`;
      if (verbatim.length) block += `\nVerbatim quotes:\n${verbatim.map((t) => `  - "${t}"`).join("\n")}`;
      if (insights.length) block += `\nOther insights:\n${insights.map((t) => `  - ${t}`).join("\n")}`;
      return block;
    }).join("\n\n");

    // Per-section writing guidance
    const sectionGuidance: Record<string, string> = {
      executiveSummary: `Write a 2-3 paragraph executive summary:
- Open with assessment context (role, engagement, number of competencies assessed)
- State the OAR score and band with a clear interpretation of role readiness
- Highlight the top 2 strengths and top 2 development areas with brief evidence references
- Close with an overall readiness assessment and developmental trajectory
- Use sub-headings where appropriate`,
      competencyProfile: `Write a detailed competency-by-competency analysis:
- 2-3 sentences per competency with specific evidence references
- Note the gap between score and target for each
- Group observations by cluster where natural
- Use precise language that would withstand participant scrutiny
- Include sub-headings for each competency`,
      indicatorEvidence: `Write indicator-level evidence for each competency:
- Reference specific behaviours observed in assessment exercises
- Distinguish between consistently and partially demonstrated indicators
- Include verbatim quotes where available, formatted as direct quotes
- Maintain objectivity while being constructive`,
      developmentAreas: `Identify 2-3 priority development areas, for each:
- Explain why it's a priority (link to gap, criticality, or role requirements)
- Provide SMART-style development recommendations (specific, measurable, time-bound)
- Suggest concrete activities: stretch assignments, coaching focus, learning resources
- Frame as growth opportunities, not deficits
- Use bullet points for recommendations`,
      nextSteps: `Outline concrete next steps for the next 6-12 months:
- Feedback session logistics and purpose
- Individual Development Plan creation with specific commitments
- Line manager engagement and support structures
- Follow-up cadence and accountability mechanisms
- Use bullet points for each action item`,
      cohortContext: `Provide anonymised cohort context:
- Position this participant's profile relative to the group
- Highlight distinctive strengths or patterns
- Note where the participant sits within the group distribution
- Maintain strict confidentiality while providing useful comparative context`,
    };

    return `PERSONA
You are a senior Assessment Centre lead assessor with 15+ years of experience in executive assessment and talent advisory. You write with the precision and authority of a seasoned industrial-organisational psychologist. Your feedback is evidence-based, constructive, and actionable — never generic or vague. You have personally observed this participant across multiple assessment exercises and have reviewed all observer evidence.

PARTICIPANT
Name: ${activeParticipant.name}
Role: ${activeParticipant.currentRole}
${activeParticipant.businessUnit ? `Business unit: ${activeParticipant.businessUnit}` : ""}

OAR
Overall: ${oar?.toFixed(2) ?? "—"}  (Band: ${band ? OAR_BAND_META[band].label : "—"})

COMPETENCY PROFILE
${profile}

EVIDENCE DATA (consolidated from all observers and assessment tools)
${evidenceBlocks}

SECTION TO WRITE: "${def?.label}"
${sectionGuidance[key] ?? def?.description}

STYLE REQUIREMENTS
- Write as a senior assessor addressing a professional audience (HR leaders, the participant's line manager, and potentially the participant)
- Third person, British/Indian English spelling throughout
- Evidence-based: reference specific competencies, scores, and observed behaviours — do not make claims without evidence
- Precise and actionable — avoid clichés ("good leader", "team player", "strong communicator")
- Use structured formatting: sub-headings (line ending with ":"), bullet points (lines starting with "- ") where appropriate
- Tone: authoritative yet developmental — honest about gaps while recognising strengths
- Aim for clarity and specificity over comprehensiveness`;
  }

  async function copyPrompt(key: ReportSectionKey) {
    const prompt = generatePrompt(key);
    try {
      await navigator.clipboard.writeText(prompt);
      setPromptCopied(key);
      setTimeout(() => setPromptCopied(null), 2000);
    } catch {
      // Fallback - just show the prompt in editing area
      setEditContent(prompt);
      setEditingSection(key);
    }
  }

  async function draftWithAI(key: ReportSectionKey) {
    const prompt = generatePrompt(key);
    if (!prompt) return;

    setDraftingSection(key);
    setDraftError(null);

    const result = await generateWithClaude(prompt);

    setDraftingSection(null);

    if ("error" in result) {
      setDraftError(result.error);
      // Fallback: copy prompt to clipboard so user can paste into external model
      try {
        await navigator.clipboard.writeText(prompt);
      } catch {
        // Clipboard also failed — open edit with the prompt text
        setEditContent(prompt);
        setEditingSection(key);
        return;
      }
      return;
    }

    // Success — open edit mode with the AI response pre-filled
    setEditContent(result.content);
    setEditingSection(key);
  }

  function downloadSectionAsMarkdown(key: ReportSectionKey) {
    const section = getSection(key);
    if (!section?.content || !activeParticipant) return;
    const def = SECTION_DEFS.find((d) => d.key === key);
    const md = `# ${def?.label}\n\n${section.content}`;
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeParticipant.name.replace(/\s+/g, "-")}-${key}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const oar = activePid ? computedOar(engagement, activePid) : null;
  const band = oar !== null ? oarBandFor(engagement, oar) : null;

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate(`/engagement/${engagement.id}/report`)}
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-navy-700 transition-colors"
      >
        <ChevronLeft size={14} /> Back to Report
      </button>

      <div className="max-w-2xl">
        <div className="text-2xs text-ocean-700 uppercase tracking-wider font-semibold mb-2">
          Report · Individual mode
        </div>
        <h1 className="display-serif text-[2rem] leading-[1.1] font-semibold text-navy-700 tracking-tight">
          Draft and sign off individual reports.
        </h1>
        <p className="text-base text-ink-500 mt-3 leading-relaxed">
          For each participant, generate AI prompts per section, paste them into your preferred model,
          edit the response, and sign off. The prompt includes the moderated scores and OAR computed in Calibrate.
        </p>
      </div>

      {/* Two-column: participant list + report editor */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5">
        {/* Participant list */}
        <Card>
          <div className="px-4 py-3 border-b border-ink-200 bg-ink-100/40">
            <h2 className="text-2xs uppercase tracking-wider font-semibold text-navy-700">
              Participants
            </h2>
          </div>
          <div className="divide-y divide-ink-100 max-h-[700px] overflow-y-auto">
            {participants.map((p) => {
              const psSections = engagement.report.sections.filter((s) => s.participantId === p.id);
              const signedOffCount = psSections.filter((s) => s.status === "signed_off").length;
              const isActive = p.id === activePid;
              return (
                <button
                  key={p.id}
                  onClick={() => { setSelectedPid(p.id); setEditingSection(null); }}
                  className={cn(
                    "w-full text-left p-3 transition-colors",
                    isActive ? "bg-ocean-50/50" : "hover:bg-ink-100/40",
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className={cn(
                      "w-7 h-7 rounded-md flex items-center justify-center text-2xs font-semibold flex-shrink-0",
                      isActive ? "bg-ocean-600 text-white" : "bg-ink-100 text-navy-700",
                    )}>
                      {initials(p.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-navy-700 truncate">{p.name}</div>
                      <div className="text-2xs text-ink-500 truncate">{p.currentRole}</div>
                      <div className="text-2xs text-ink-500 mt-0.5">
                        {signedOffCount} / {SECTION_DEFS.length} signed
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Sections */}
        <div className="space-y-4">
          {activeParticipant && (
            <>
              {/* Participant header */}
              <Card>
                <CardBody className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="display-serif text-xl font-semibold text-navy-700">
                      {activeParticipant.name}
                    </h2>
                    <div className="text-2xs text-ink-500 mt-0.5">
                      {activeParticipant.currentRole}
                      {activeParticipant.businessUnit && ` · ${activeParticipant.businessUnit}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={participantSections.filter((s) => s.status === "signed_off").length === 0}
                      onClick={() => {
                        try {
                          generateIndividualReportPDF(engagement, activeParticipant);
                        } catch (err) {
                          console.error("PDF generation failed:", err);
                          alert(`PDF generation failed: ${err instanceof Error ? err.message : String(err)}`);
                        }
                      }}
                    >
                      <Download size={12} /> Download PDF
                    </Button>
                    <div className="text-right">
                      <div className="text-2xs uppercase tracking-wider font-semibold text-ink-500">OAR</div>
                      <div className="font-mono text-2xl font-bold text-navy-700 leading-tight">
                        {oar !== null ? oar.toFixed(2) : "—"}
                      </div>
                      {band && (
                        <Badge tone={OAR_BAND_META[band].tone} className="mt-1">
                          {OAR_BAND_META[band].label}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Sections */}
              {SECTION_DEFS.map((def) => {
                const section = getSection(def.key);
                const status = section?.status ?? "not_started";
                const isEditing = editingSection === def.key;

                return (
                  <Card key={def.key}>
                    <div className={cn(
                      "px-5 py-3 border-b border-ink-200 flex items-center justify-between gap-3",
                      status === "signed_off" ? "bg-green-50/40" : "bg-ink-100/40",
                    )}>
                      <div className="flex items-center gap-3">
                        <FileText size={14} className="text-ink-500 flex-shrink-0" />
                        <h3 className="display-serif text-base font-semibold text-navy-700">
                          {def.label}
                        </h3>
                        <SectionStatusBadge status={status} />
                      </div>
                      {!isEditing && (
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => draftWithAI(def.key)}
                            disabled={draftingSection !== null}
                          >
                            {draftingSection === def.key ? (
                              <><Loader2 size={12} className="animate-spin" /> Drafting…</>
                            ) : (
                              <><Sparkles size={12} /> Draft with AI</>
                            )}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => copyPrompt(def.key)}>
                            {promptCopied === def.key ? (
                              <><CheckCircle2 size={12} /> Copied</>
                            ) : (
                              <><Sparkles size={12} /> Generate prompt</>
                            )}
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => startEdit(def.key)}>
                            <Edit3 size={12} /> {section ? "Edit" : "Add"}
                          </Button>
                        </div>
                      )}
                    </div>
                    <CardBody>
                      {draftError && !isEditing && draftingSection === null && (
                        <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
                          <span className="font-medium">AI drafting failed:</span> {draftError}
                          <span className="block mt-1 text-2xs text-amber-600">
                            Prompt copied to clipboard — paste into your preferred AI model instead.
                          </span>
                        </div>
                      )}
                      {isEditing ? (
                        <div className="space-y-3">
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            placeholder={`Write the ${def.label.toLowerCase()} here.`}
                            rows={10}
                            className="w-full px-3 py-2 text-sm border border-ink-200 rounded-md focus:outline-none focus:ring-2 focus:ring-ocean-600/20 focus:border-ocean-400 resize-y font-serif leading-relaxed"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={() => setEditingSection(null)}>
                              Cancel
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => saveSection("edited")}>
                              Save draft
                            </Button>
                            <Button size="sm" variant="primary" onClick={() => saveSection("signed_off")}>
                              <Lock size={12} /> Sign off section
                            </Button>
                          </div>
                        </div>
                      ) : section?.content ? (
                        <div className="prose prose-sm max-w-none">
                          <p className="text-sm text-ink-700 leading-relaxed whitespace-pre-wrap font-serif">
                            {section.content}
                          </p>
                          {section.signedOffAt && (
                            <div className="flex items-center justify-between mt-3 not-prose">
                              <div className="text-2xs text-ink-500">
                                Signed off {new Date(section.signedOffAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                              </div>
                              <Button size="sm" variant="ghost" onClick={() => downloadSectionAsMarkdown(def.key)}>
                                <Download size={12} /> Download as Markdown
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-ink-500 italic leading-relaxed">
                          {def.description} Generate the prompt, paste the response into your preferred AI model, then edit and sign off here.
                        </div>
                      )}
                    </CardBody>
                  </Card>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionStatusBadge({ status }: { status: ReportSectionStatus }) {
  switch (status) {
    case "signed_off": return <Badge tone="green"><CheckCircle2 size={10} /> Signed off</Badge>;
    case "edited":     return <Badge tone="amber">Draft</Badge>;
    case "drafted":    return <Badge tone="ocean">Drafted</Badge>;
    default:           return <Badge tone="neutral">Not started</Badge>;
  }
}

function initials(name: string): string {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}
