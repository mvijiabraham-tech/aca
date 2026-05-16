import { useParams, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import {
  ArrowRight, FileText, Image as ImageIcon, Upload,
  FileType2, FileImage,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field, Checkbox, TextArea } from "@/components/ui/Form";
import { StepPageHeader } from "@/components/StepPageHeader";
import { useEngagement, useAppStore } from "@/lib/store";
import type { ReportFormat } from "@/types";
import { DEFAULT_REPORT_FORMAT } from "@/types";

const SECTION_META: { key: keyof ReportFormat["sections"]; label: string; description: string; required: boolean }[] = [
  { key: "executiveSummary",  label: "Executive summary",     description: "One-page overview with OAR, key strengths, key development areas.", required: true  },
  { key: "competencyProfile", label: "Competency profile",    description: "Per-competency scores with target level and band.",               required: true  },
  { key: "indicatorEvidence", label: "Indicator evidence",    description: "Behavioural indicators with observer evidence and ratings.",      required: false },
  { key: "developmentAreas",  label: "Development areas",     description: "Specific gaps and recommended actions per competency.",           required: false },
  { key: "nextSteps",         label: "Recommended next steps", description: "Suggested IDP commitments and timeline.",                         required: false },
  { key: "cohortContext",     label: "Cohort context",        description: "How this participant compares to the cohort. Mask names option.", required: false },
];

export function StepReportFormat() {
  const { engagementId } = useParams<{ engagementId: string }>();
  const navigate = useNavigate();
  const engagement = useEngagement(engagementId);
  const setReportFormat = useAppStore((s) => s.setReportFormat);
  const setStepStatus = useAppStore((s) => s.setStepStatus);

  const format = engagement?.reportFormat ?? DEFAULT_REPORT_FORMAT;

  useEffect(() => {
    if (!engagement) return;
    const sectionsCount = Object.values(format.sections).filter(Boolean).length;
    const formatsCount = (format.outputFormats.pdf ? 1 : 0) + (format.outputFormats.pptx ? 1 : 0);
    if (sectionsCount === 0 || formatsCount === 0) {
      setStepStatus(engagement.id, "report", "in_progress",
        sectionsCount === 0 ? "No sections selected" : "No output format selected");
    } else {
      const summary = `${formatsCount === 2 ? "PDF + PPTX" : format.outputFormats.pdf ? "PDF" : "PPTX"} · ${format.branding.coBranded ? engagement.basics.client + " co-branded" : "Synovate only"}`;
      setStepStatus(engagement.id, "report", "complete", summary);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format.sections, format.outputFormats, format.branding]);

  if (!engagement || !engagementId) return null;

  function update(patch: Partial<ReportFormat>) {
    setReportFormat(engagement!.id, { ...format, ...patch });
  }

  function updateSection(key: keyof ReportFormat["sections"], value: boolean) {
    update({ sections: { ...format.sections, [key]: value } });
  }

  function updateBranding(patch: Partial<ReportFormat["branding"]>) {
    update({ branding: { ...format.branding, ...patch } });
  }

  function updateOutputs(patch: Partial<ReportFormat["outputFormats"]>) {
    update({ outputFormats: { ...format.outputFormats, ...patch } });
  }

  const selectedSections = SECTION_META.filter((s) => format.sections[s.key]);

  return (
    <div className="space-y-6">
      <StepPageHeader engagementId={engagementId} stepKey="report" />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: form */}
        <div className="lg:col-span-3 space-y-5">
          {/* Sections */}
          <Card>
            <div className="px-5 py-3 border-b border-ink-200 bg-ink-100/30">
              <h3 className="text-sm font-semibold text-navy-700">Report sections</h3>
              <p className="text-2xs text-ink-500 mt-0.5">Which sections appear in each participant's individual report.</p>
            </div>
            <CardBody className="space-y-3">
              {SECTION_META.map((s) => (
                <div key={s.key} className={cn("flex items-start gap-3", s.required && "opacity-90")}>
                  <Checkbox
                    checked={format.sections[s.key]}
                    onChange={(v) => updateSection(s.key, v)}
                    label={
                      <span className="flex items-center gap-2">
                        {s.label}
                        {s.required && <Badge tone="navy">Recommended</Badge>}
                      </span>
                    }
                    description={s.description}
                  />
                </div>
              ))}
            </CardBody>
          </Card>

          {/* Branding */}
          <Card>
            <div className="px-5 py-3 border-b border-ink-200 bg-ink-100/30">
              <h3 className="text-sm font-semibold text-navy-700">Branding</h3>
              <p className="text-2xs text-ink-500 mt-0.5">How the report is presented.</p>
            </div>
            <CardBody className="space-y-4">
              <Checkbox
                checked={format.branding.coBranded}
                onChange={(v) => updateBranding({ coBranded: v })}
                label={`Co-brand with ${engagement.basics.client}`}
                description="Synovate logo on the cover page alongside the client logo."
              />

              {format.branding.coBranded && (
                <Field
                  label="Client logo"
                  hint="PNG or SVG recommended. Transparent background for best results."
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-16 h-16 rounded-md border-2 border-dashed flex items-center justify-center flex-shrink-0",
                      format.branding.clientLogoUploaded ? "border-ocean-300 bg-ocean-50/30" : "border-ink-300 bg-ink-100/40"
                    )}>
                      {format.branding.clientLogoUploaded
                        ? <FileImage size={20} className="text-ocean-700" />
                        : <ImageIcon size={20} className="text-ink-400" />}
                    </div>
                    <div className="flex-1">
                      <div className="text-2xs text-ink-500">
                        {format.branding.clientLogoUploaded
                          ? format.branding.clientLogoFilename || "Logo uploaded"
                          : "No logo uploaded yet"}
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="mt-1.5"
                        onClick={() => updateBranding({
                          clientLogoUploaded: !format.branding.clientLogoUploaded,
                          clientLogoFilename: !format.branding.clientLogoUploaded ? `${engagement.basics.client.toLowerCase().replace(/\s+/g, "-")}-logo.png` : undefined,
                        })}
                      >
                        <Upload size={11} /> {format.branding.clientLogoUploaded ? "Replace" : "Upload"}
                      </Button>
                    </div>
                  </div>
                </Field>
              )}
            </CardBody>
          </Card>

          {/* Output formats */}
          <Card>
            <div className="px-5 py-3 border-b border-ink-200 bg-ink-100/30">
              <h3 className="text-sm font-semibold text-navy-700">Output formats</h3>
              <p className="text-2xs text-ink-500 mt-0.5">What deliverables get produced.</p>
            </div>
            <CardBody className="space-y-3">
              <Checkbox
                checked={format.outputFormats.pdf}
                onChange={(v) => updateOutputs({ pdf: v })}
                label="PDF — individual reports"
                description="One PDF per participant. Standard for feedback sessions and personal records."
              />
              <Checkbox
                checked={format.outputFormats.pptx}
                onChange={(v) => updateOutputs({ pptx: v })}
                label="PowerPoint — talent review deck"
                description="Cohort-level slides for talent discussions with client leadership."
              />
            </CardBody>
          </Card>

          {/* Custom notes */}
          <Card>
            <CardBody>
              <Field label="Custom notes" hint="Any specific requirements from the client (terminology, additional sections, etc).">
                <TextArea
                  value={format.customNotes ?? ""}
                  onChange={(e) => update({ customNotes: e.target.value })}
                  placeholder="Optional"
                  rows={3}
                />
              </Field>
            </CardBody>
          </Card>
        </div>

        {/* Right: live preview */}
        <div className="lg:col-span-2">
          <div className="sticky top-6 space-y-3">
            <div className="text-2xs uppercase tracking-wider font-semibold text-navy-700">
              Preview structure
            </div>
            <Card>
              <CardBody className="p-4 space-y-3">
                {/* Cover */}
                <div className="border border-ink-200 rounded-md p-4 bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-sm bg-navy-700 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-xs bg-ocean-300" />
                      </div>
                      <span className="text-2xs font-semibold text-navy-700">Synovate</span>
                    </div>
                    {format.branding.coBranded && (
                      <div className="flex items-center gap-2">
                        <span className="text-2xs text-ink-400">+</span>
                        {format.branding.clientLogoUploaded ? (
                          <div className="px-2 py-0.5 rounded bg-ocean-50 text-ocean-700 text-2xs font-medium">{engagement.basics.client}</div>
                        ) : (
                          <div className="px-2 py-0.5 rounded bg-ink-100 text-ink-500 text-2xs italic">{engagement.basics.client} logo</div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-2xs text-ink-500 mb-1">Assessment Centre Report</div>
                  <div className="display-serif text-sm font-semibold text-navy-700 leading-tight">
                    {engagement.basics.name}
                  </div>
                  <div className="text-2xs text-ink-500 mt-1">Participant: [name] · {engagement.basics.acDateRange || "[dates]"}</div>
                </div>

                {/* Sections */}
                {selectedSections.length === 0 && (
                  <div className="text-2xs text-amber-700 px-3 py-2 bg-amber-50 rounded-md border border-amber-300/40">
                    No sections selected. The report would be empty.
                  </div>
                )}

                {selectedSections.map((s, i) => (
                  <div key={s.key} className="border border-ink-200 rounded-md p-3 bg-white">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded bg-ink-100 text-ink-500 text-2xs font-mono font-semibold flex items-center justify-center">
                        {i + 1}
                      </div>
                      <div className="text-2xs font-semibold text-navy-700">{s.label}</div>
                    </div>
                    <div className="text-2xs text-ink-500 mt-1 leading-snug pl-7">
                      {s.description}
                    </div>
                  </div>
                ))}

                {/* Outputs footer */}
                <div className="border-t border-ink-200 pt-3 flex items-center justify-between text-2xs text-ink-500">
                  <span>Output:</span>
                  <div className="flex items-center gap-2">
                    {format.outputFormats.pdf && (
                      <Badge tone="ocean"><FileText size={9} /> PDF</Badge>
                    )}
                    {format.outputFormats.pptx && (
                      <Badge tone="ocean"><FileType2 size={9} /> PPTX</Badge>
                    )}
                    {!format.outputFormats.pdf && !format.outputFormats.pptx && (
                      <span className="text-amber-700">None</span>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>

            <div className="text-2xs text-ink-500 leading-relaxed">
              This is a structural preview only. The actual report is AI-drafted from scoring data, then Coach-edited in v0.8.
            </div>
          </div>
        </div>
      </div>

      {/* Footer nav */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="secondary" onClick={() => navigate(`/engagement/${engagementId}/setup/schedule`)}>
          Back to Schedule
        </Button>
        <Button variant="primary" onClick={() => navigate(`/engagement/${engagementId}/setup`)}>
          Back to Setup dashboard <ArrowRight size={13} />
        </Button>
      </div>
    </div>
  );
}
