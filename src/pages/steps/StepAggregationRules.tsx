import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  ArrowRight, Wand2, ChevronDown, ChevronRight,
  Info, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field, NumberInput, RadioGroup } from "@/components/ui/Form";
import { StepPageHeader } from "@/components/StepPageHeader";
import { useEngagement, useAppStore } from "@/lib/store";
import type { AggregationRules } from "@/types";
import { DEFAULT_AGGREGATION } from "@/types";

export function StepAggregationRules() {
  const { engagementId } = useParams<{ engagementId: string }>();
  const navigate = useNavigate();
  const engagement = useEngagement(engagementId);
  const setAggregation = useAppStore((s) => s.setAggregation);
  const setStepStatus = useAppStore((s) => s.setStepStatus);

  const [advancedOpen, setAdvancedOpen] = useState(false);

  const rules = engagement?.aggregation ?? DEFAULT_AGGREGATION;

  // Update step status whenever rules change
  useEffect(() => {
    if (!engagement) return;
    if (rules.confirmed) {
      const summary = isUsingDefaults(rules) ? "Methodology defaults" : "Custom rules";
      setStepStatus(engagement.id, "aggregation", "complete", summary);
    } else {
      setStepStatus(engagement.id, "aggregation", "in_progress", "Pending confirmation");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rules.confirmed, rules.indicatorMethod, rules.toolMethod, rules.oarMethod]);

  if (!engagement || !engagementId) return null;

  function update(patch: Partial<AggregationRules>) {
    if (!engagement) return;
    setAggregation(engagement.id, { ...rules, ...patch });
  }

  function useDefaults() {
    if (!engagement) return;
    setAggregation(engagement.id, { ...DEFAULT_AGGREGATION, confirmed: true });
  }

  function confirm() {
    update({ confirmed: true });
  }

  return (
    <div className="space-y-6">
      <StepPageHeader
        engagementId={engagementId}
        stepKey="aggregation"
        actions={
          <>
            <Button variant="secondary" onClick={useDefaults}>
              <Wand2 size={13} /> Use methodology defaults
            </Button>
          </>
        }
      />

      {/* Explainer */}
      <Card>
        <CardBody className="bg-ocean-50/30">
          <div className="flex items-start gap-3">
            <Info size={18} className="text-ocean-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-xs text-ink-700 leading-relaxed">
              <div className="font-semibold text-navy-700 mb-1">How aggregation works</div>
              Ratings flow up three stages: each <strong>indicator rating (1-5)</strong> aggregates into a{" "}
              <strong>competency-in-tool</strong> score; competency-in-tool scores aggregate into a{" "}
              <strong>competency-engagement</strong> score; competency-engagement scores aggregate into the{" "}
              <strong>Overall Assessment Rating (OAR)</strong>. The defaults follow standard AC methodology and
              work for 95% of engagements. Change them only if your engagement has specific requirements.
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Visual pipeline */}
      <PipelineVisual rules={rules} />

      {/* Stage 1 */}
      <StageCard
        stage={1}
        title="Indicator → Competency-in-tool"
        description="How the 4 indicator ratings combine into one competency score per tool."
      >
        <div className="space-y-4">
          <Field label="Aggregation method">
            <RadioGroup
              value={rules.indicatorMethod}
              onChange={(v) => update({ indicatorMethod: v })}
              options={[
                { value: "average", label: "Average", description: "Sum of rated indicators ÷ count." },
                { value: "minimum", label: "Minimum", description: "Lowest indicator wins — conservative." },
                { value: "median", label: "Median", description: "Middle value — outlier-resistant." },
              ]}
              layout="row"
            />
          </Field>

          <Field label="Handling of 'Not Observed' ratings">
            <RadioGroup
              value={rules.notObservedHandling}
              onChange={(v) => update({ notObservedHandling: v })}
              options={[
                { value: "exclude", label: "Exclude", description: "Don't count toward the average." },
                { value: "zero", label: "Count as 0", description: "Penalises missing evidence." },
                { value: "minimum_count", label: "Require min count", description: "Enforce a minimum observed." },
              ]}
              layout="row"
            />
          </Field>

          <Field label="Minimum indicators rated for a valid score" hint="If fewer than this are rated, the tool-level competency score doesn't count.">
            <NumberInput
              value={rules.minIndicatorsRated}
              onChange={(e) => update({ minIndicatorsRated: parseInt(e.target.value, 10) || 1 })}
              min={1}
              max={4}
              className="max-w-[120px]"
            />
          </Field>
        </div>
      </StageCard>

      {/* Stage 2 */}
      <StageCard
        stage={2}
        title="Competency-in-tool → Competency-engagement"
        description="How the per-tool scores combine into one score per competency."
      >
        <div className="space-y-4">
          <Field label="Aggregation method">
            <RadioGroup
              value={rules.toolMethod}
              onChange={(v) => update({ toolMethod: v })}
              options={[
                { value: "average", label: "Simple average", description: "Equal weight per tool." },
                { value: "weighted_average", label: "Tool-weighted", description: "Per-tool weights honour evidence quality." },
                { value: "highest_reliable", label: "Highest reliable", description: "Best score where evidence is strong." },
              ]}
              layout="row"
            />
          </Field>

          <Field label="Minimum tools required for a reliable competency score" hint="Triangulation rule. ≥2 tools is the AC standard.">
            <NumberInput
              value={rules.minToolsRated}
              onChange={(e) => update({ minToolsRated: parseInt(e.target.value, 10) || 1 })}
              min={1}
              max={5}
              className="max-w-[120px]"
            />
          </Field>
        </div>
      </StageCard>

      {/* Stage 3 - Advanced (collapsible) */}
      <StageCard
        stage={3}
        title="Competency-engagement → OAR"
        description="How competency scores combine into the Overall Assessment Rating, with 5 named bands."
      >
        <div className="space-y-4">
          <Field label="Aggregation method">
            <RadioGroup
              value={rules.oarMethod}
              onChange={(v) => update({ oarMethod: v })}
              options={[
                { value: "weighted_average", label: "Weighted by competency", description: "Uses weights from Step 2." },
                { value: "simple_average", label: "Simple average", description: "Equal weight per competency." },
                { value: "critical_floor", label: "Critical floor", description: "Critical competency below threshold caps OAR." },
              ]}
              layout="row"
            />
          </Field>

          {/* Bands visualisation */}
          <div>
            <div className="text-2xs uppercase tracking-wider font-semibold text-navy-700 mb-2">
              OAR bands
            </div>
            <BandsVisual thresholds={rules.oarThresholds} />
            <button
              onClick={() => setAdvancedOpen(!advancedOpen)}
              className="mt-3 text-2xs font-medium text-ink-500 hover:text-navy-700 inline-flex items-center gap-1.5"
            >
              {advancedOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              {advancedOpen ? "Hide advanced" : "Customise band thresholds"}
            </button>
            {advancedOpen && (
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                {(["Developing", "Proficient", "Strong", "Distinguished"] as const).map((label, i) => (
                  <Field key={label} label={`Min for ${label}`}>
                    <NumberInput
                      value={rules.oarThresholds[i]}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value) || 0;
                        const next: AggregationRules["oarThresholds"] = [...rules.oarThresholds] as AggregationRules["oarThresholds"];
                        next[i] = v;
                        update({ oarThresholds: next });
                      }}
                      step={0.05}
                      min={0}
                      max={5}
                    />
                  </Field>
                ))}
              </div>
            )}
          </div>
        </div>
      </StageCard>

      {/* Confirm */}
      <Card>
        <CardBody className={cn(rules.confirmed ? "bg-green-50/40" : "bg-amber-50/30")}>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-navy-700">
                {rules.confirmed ? "Rules confirmed" : "Confirm aggregation rules"}
              </h3>
              <p className="text-xs text-ink-500 mt-0.5 leading-relaxed">
                {rules.confirmed
                  ? "These rules are locked for the engagement. Click below to revise if needed."
                  : "Once you're happy with the rules above, confirm. You can revisit and change them anytime in Setup."}
              </p>
            </div>
            {rules.confirmed ? (
              <Badge tone="green">
                <CheckCircle2 size={12} /> Confirmed
              </Badge>
            ) : (
              <Button variant="primary" onClick={confirm}>
                <CheckCircle2 size={13} /> Confirm rules
              </Button>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Footer nav */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="secondary" onClick={() => navigate(`/engagement/${engagementId}/setup/tools`)}>
          ← Back: Tools
        </Button>
        <Button
          variant="primary"
          onClick={() => navigate(`/engagement/${engagementId}/setup`)}
          disabled={!rules.confirmed}
        >
          {rules.confirmed ? "Back to Setup dashboard" : "Confirm rules first"} <ArrowRight size={13} />
        </Button>
      </div>
    </div>
  );
}

// ---------- Stage Card ----------
function StageCard({
  stage, title, description, children,
}: {
  stage: number;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <div className="px-5 py-3 border-b border-ink-200 bg-ink-100/30">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-md bg-ocean-100 text-ocean-700 flex items-center justify-center font-mono text-2xs font-semibold flex-shrink-0">
            S{stage}
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-navy-700">{title}</h3>
            <p className="text-2xs text-ink-500 mt-0.5">{description}</p>
          </div>
        </div>
      </div>
      <CardBody>{children}</CardBody>
    </Card>
  );
}

// ---------- Pipeline visual ----------
function PipelineVisual({ rules }: { rules: AggregationRules }) {
  return (
    <Card>
      <CardBody className="py-4">
        <div className="flex items-center gap-1 overflow-x-auto">
          <PipelineNode label="Indicator ratings" sub="1-5 per indicator" tone="ocean" />
          <PipelineArrow method={rules.indicatorMethod} />
          <PipelineNode label="Competency per tool" sub={`min ${rules.minIndicatorsRated} indicators`} tone="navy" />
          <PipelineArrow method={rules.toolMethod} />
          <PipelineNode label="Competency overall" sub={`min ${rules.minToolsRated} tools`} tone="navy" />
          <PipelineArrow method={rules.oarMethod} />
          <PipelineNode label="OAR" sub="5 bands" tone="green" />
        </div>
      </CardBody>
    </Card>
  );
}

function PipelineNode({ label, sub, tone }: { label: string; sub: string; tone: "ocean" | "navy" | "green" }) {
  const toneClasses = {
    ocean: "bg-ocean-50 border-ocean-300 text-ocean-800",
    navy:  "bg-navy-50 border-navy-200 text-navy-700",
    green: "bg-green-50 border-green-300 text-green-700",
  }[tone];
  return (
    <div className={cn("flex-1 min-w-[120px] text-center p-3 rounded-lg border-2", toneClasses)}>
      <div className="text-xs font-semibold">{label}</div>
      <div className="text-2xs opacity-80 mt-0.5">{sub}</div>
    </div>
  );
}

function PipelineArrow({ method }: { method: string }) {
  const label = methodShortLabel(method);
  return (
    <div className="flex flex-col items-center px-1 flex-shrink-0">
      <ArrowRight size={16} className="text-ink-400" />
      <div className="text-2xs text-ink-500 font-medium uppercase tracking-wider whitespace-nowrap mt-0.5">
        {label}
      </div>
    </div>
  );
}

function methodShortLabel(m: string): string {
  switch (m) {
    case "average": return "Avg";
    case "minimum": return "Min";
    case "median":  return "Med";
    case "weighted_average": return "Weighted";
    case "highest_reliable": return "Highest";
    case "simple_average":   return "Simple avg";
    case "critical_floor":   return "Crit floor";
    default: return m;
  }
}

// ---------- Bands visual ----------
function BandsVisual({ thresholds }: { thresholds: [number, number, number, number] }) {
  const bands = [
    { label: "Below standard", min: 0, max: thresholds[0],          color: "bg-red-50 text-red-700 border-red-300" },
    { label: "Developing",     min: thresholds[0], max: thresholds[1], color: "bg-amber-50 text-amber-700 border-amber-400/40" },
    { label: "Proficient",     min: thresholds[1], max: thresholds[2], color: "bg-ink-100 text-ink-700 border-ink-300" },
    { label: "Strong",         min: thresholds[2], max: thresholds[3], color: "bg-ocean-50 text-ocean-800 border-ocean-300" },
    { label: "Distinguished",  min: thresholds[3], max: 5.0,         color: "bg-green-50 text-green-700 border-green-300" },
  ];
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {bands.map((b, i) => (
        <div key={i} className={cn("p-2 rounded-md border text-center", b.color)}>
          <div className="text-2xs font-semibold uppercase tracking-wider">L{i + 1}</div>
          <div className="text-xs font-medium mt-0.5">{b.label}</div>
          <div className="text-2xs font-mono opacity-80 mt-0.5">
            {b.min.toFixed(2)}—{b.max.toFixed(2)}
          </div>
        </div>
      ))}
    </div>
  );
}

function isUsingDefaults(r: AggregationRules): boolean {
  return (
    r.indicatorMethod === DEFAULT_AGGREGATION.indicatorMethod &&
    r.notObservedHandling === DEFAULT_AGGREGATION.notObservedHandling &&
    r.minIndicatorsRated === DEFAULT_AGGREGATION.minIndicatorsRated &&
    r.toolMethod === DEFAULT_AGGREGATION.toolMethod &&
    r.minToolsRated === DEFAULT_AGGREGATION.minToolsRated &&
    r.oarMethod === DEFAULT_AGGREGATION.oarMethod &&
    r.oarThresholds.every((t, i) => t === DEFAULT_AGGREGATION.oarThresholds[i])
  );
}
