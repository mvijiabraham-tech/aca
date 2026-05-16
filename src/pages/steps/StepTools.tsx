import { useParams, useNavigate } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import {
  ArrowRight, Plus, Wrench, X, AlertTriangle, CheckCircle2,
  ChevronDown, ChevronRight, Layers, Clock, Users,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field, TextInput, NumberInput, Select } from "@/components/ui/Form";
import { StepPageHeader } from "@/components/StepPageHeader";
import { useEngagement, useAppStore } from "@/lib/store";
import { dictionary, clusterMeta } from "@/mocks/dictionary";
import { toolLibrary, findToolType, formatLabel } from "@/mocks/toolLibrary";
import type { EngagementTool } from "@/types";

export function StepTools() {
  const { engagementId } = useParams<{ engagementId: string }>();
  const navigate = useNavigate();
  const engagement = useEngagement(engagementId);
  const setTools = useAppStore((s) => s.setTools);
  const setStepStatus = useAppStore((s) => s.setStepStatus);

  const [addingTool, setAddingTool] = useState(false);
  const [expandedToolId, setExpandedToolId] = useState<string | null>(null);

  const tools = engagement?.tools ?? [];
  const selections = engagement?.competencies ?? [];
  const targets = engagement?.proficiencyTargets ?? [];

  // Coverage check — competencies × tool count
  const coverage = useMemo(() => {
    return selections.map((sel) => {
      const matchingTools = tools.filter((t) => t.competencyIds.includes(sel.competencyId));
      return {
        competencyId: sel.competencyId,
        toolCount: matchingTools.length,
        tools: matchingTools,
      };
    });
  }, [tools, selections]);

  const coverageFullyOk = coverage.every((c) => c.toolCount >= 2);
  const coverageZero = coverage.filter((c) => c.toolCount === 0);
  const coverageOne = coverage.filter((c) => c.toolCount === 1);

  // Update step status
  useEffect(() => {
    if (!engagement) return;
    if (tools.length === 0) {
      setStepStatus(engagement.id, "tools", "not_started", undefined);
    } else if (coverageZero.length > 0) {
      setStepStatus(engagement.id, "tools", "in_progress", `${tools.length} tools · ${coverageZero.length} competencies uncovered`);
    } else {
      const fullCoveragePct = Math.round(((selections.length - coverageOne.length) / Math.max(1, selections.length)) * 100);
      setStepStatus(engagement.id, "tools", "complete", `${tools.length} tools · ${fullCoveragePct}% full coverage`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tools.length, coverageZero.length, coverageOne.length]);

  if (!engagement || !engagementId) return null;

  // No competencies or targets yet — bounce
  if (selections.length === 0 || targets.length < selections.length) {
    return (
      <div className="space-y-6">
        <StepPageHeader engagementId={engagementId} stepKey="tools" />
        <Card>
          <CardBody className="py-12 text-center">
            <div className="w-14 h-14 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-5">
              <AlertTriangle size={26} />
            </div>
            <h2 className="display-serif text-2xl font-semibold text-navy-700">
              Set competencies and targets first
            </h2>
            <p className="text-sm text-ink-500 mt-3 max-w-md mx-auto leading-relaxed">
              Tools are configured against selected competencies and their proficiency levels. Complete Steps 2 and 3 first.
            </p>
            <div className="flex justify-center gap-2 mt-6">
              <Button
                variant="primary"
                onClick={() => navigate(`/engagement/${engagementId}/setup/${selections.length === 0 ? "competencies" : "proficiency"}`)}
              >
                Go to Step {selections.length === 0 ? "2" : "3"}
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  function addTool(toolTypeKey: string) {
    if (!engagement) return;
    const def = findToolType(toolTypeKey);
    if (!def) return;
    const newTool: EngagementTool = {
      id: `t-${Date.now()}`,
      name: def.name,
      toolTypeKey: def.key,
      competencyIds: [],
      durationMinutes: def.defaultDurationMinutes,
      format: def.defaultFormat,
    };
    setTools(engagement.id, [...tools, newTool]);
    setAddingTool(false);
    setExpandedToolId(newTool.id);
  }

  function updateTool(toolId: string, patch: Partial<EngagementTool>) {
    if (!engagement) return;
    const next = tools.map((t) => t.id === toolId ? { ...t, ...patch } : t);
    setTools(engagement.id, next);
  }

  function toggleToolCompetency(toolId: string, competencyId: string) {
    const t = tools.find((x) => x.id === toolId);
    if (!t) return;
    const ids = t.competencyIds.includes(competencyId)
      ? t.competencyIds.filter((c) => c !== competencyId)
      : [...t.competencyIds, competencyId];
    updateTool(toolId, { competencyIds: ids });
  }

  function removeTool(toolId: string) {
    if (!engagement) return;
    setTools(engagement.id, tools.filter((t) => t.id !== toolId));
  }

  return (
    <div className="space-y-6">
      <StepPageHeader
        engagementId={engagementId}
        stepKey="tools"
        actions={
          <Button variant="primary" onClick={() => setAddingTool(true)}>
            <Plus size={13} /> Add tool
          </Button>
        }
      />

      {/* Tools list */}
      {tools.length === 0 && !addingTool && (
        <Card>
          <CardBody className="py-12 text-center">
            <div className="w-14 h-14 rounded-xl bg-ink-100 text-ink-400 flex items-center justify-center mx-auto mb-5">
              <Wrench size={26} />
            </div>
            <h2 className="display-serif text-2xl font-semibold text-navy-700">
              No tools configured yet
            </h2>
            <p className="text-sm text-ink-500 mt-3 max-w-md mx-auto leading-relaxed">
              Add at least one tool per competency — ideally two — so the scoring evidence triangulates well.
            </p>
            <Button variant="primary" onClick={() => setAddingTool(true)} className="mt-6">
              <Plus size={14} /> Add first tool
            </Button>
          </CardBody>
        </Card>
      )}

      {/* Existing tools */}
      {tools.length > 0 && (
        <div className="space-y-3">
          {tools.map((tool) => {
            const def = findToolType(tool.toolTypeKey);
            const isExpanded = expandedToolId === tool.id;
            return (
              <Card key={tool.id}>
                <button
                  onClick={() => setExpandedToolId(isExpanded ? null : tool.id)}
                  className="w-full text-left p-5 hover:bg-ink-100/30 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-ocean-50 text-ocean-700 flex items-center justify-center flex-shrink-0">
                      <Wrench size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-base font-semibold text-navy-700 display-serif">
                          {tool.name}
                        </h4>
                        <Badge tone="neutral">{def?.name}</Badge>
                        {tool.competencyIds.length === 0 && (
                          <Badge tone="amber">No competencies</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-2xs text-ink-500">
                        <span className="inline-flex items-center gap-1">
                          <Layers size={11} /> {tool.competencyIds.length} competencies
                        </span>
                        <span className="text-ink-300">·</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock size={11} /> {tool.durationMinutes}m
                        </span>
                        <span className="text-ink-300">·</span>
                        <span className="inline-flex items-center gap-1">
                          <Users size={11} /> {formatLabel(tool.format)}
                        </span>
                      </div>
                    </div>
                    <div className="text-ink-400 self-center">
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-ink-200 p-5 bg-ink-100/20 space-y-4">
                    {/* Configuration grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Field label="Tool name" required>
                        <TextInput
                          value={tool.name}
                          onChange={(e) => updateTool(tool.id, { name: e.target.value })}
                        />
                      </Field>
                      <Field label="Duration (minutes)" required>
                        <NumberInput
                          value={tool.durationMinutes}
                          onChange={(e) => updateTool(tool.id, { durationMinutes: parseInt(e.target.value, 10) || 0 })}
                          min={5}
                        />
                      </Field>
                      <Field label="Delivery format" required>
                        <Select
                          value={tool.format}
                          onChange={(e) => updateTool(tool.id, { format: e.target.value as EngagementTool["format"] })}
                        >
                          <option value="individual">Individual</option>
                          <option value="paired">Paired</option>
                          <option value="group_small">Group (4-6)</option>
                          <option value="group_large">Group (8+)</option>
                        </Select>
                      </Field>
                    </div>

                    {/* Competencies covered */}
                    <Field label="Competencies this tool surfaces" required hint="Pick at least one. Two-three is typical.">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
                        {selections.map((sel) => {
                          const c = dictionary.find((x) => x.id === sel.competencyId);
                          if (!c) return null;
                          const target = targets.find((t) => t.competencyId === c.id);
                          const isChecked = tool.competencyIds.includes(c.id);
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => toggleToolCompetency(tool.id, c.id)}
                              className={cn(
                                "text-left px-3 py-2 rounded-md border-2 transition-all flex items-start gap-2.5",
                                isChecked
                                  ? "border-ocean-500 bg-ocean-50/40"
                                  : "border-ink-200 bg-white hover:border-ink-300",
                              )}
                            >
                              <div className={cn(
                                "w-4 h-4 rounded mt-0.5 flex-shrink-0 border-2 flex items-center justify-center transition-colors",
                                isChecked ? "bg-ocean-600 border-ocean-600" : "border-ink-300",
                              )}>
                                {isChecked && <CheckCircle2 size={11} className="text-white" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-medium text-navy-700">{c.name}</div>
                                <div className="text-2xs text-ink-500 mt-0.5">
                                  {clusterMeta(c.cluster)?.label}
                                  {target && <> · target L{target.targetLevel}</>}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </Field>

                    {/* Auto-generated scoring template preview */}
                    {tool.competencyIds.length > 0 && (
                      <div>
                        <div className="text-2xs uppercase tracking-wider font-semibold text-navy-700 mb-2">
                          Auto-generated scoring template
                        </div>
                        <div className="text-2xs text-ink-500 mb-3">
                          Observers will rate against these indicators. Generated from your competency × proficiency selections.
                        </div>
                        <div className="space-y-3">
                          {tool.competencyIds.map((cid) => {
                            const c = dictionary.find((x) => x.id === cid);
                            const target = targets.find((t) => t.competencyId === cid);
                            if (!c || !target) return null;
                            const level = c.levels.find((l) => l.level === target.targetLevel);
                            if (!level) return null;
                            return (
                              <div key={cid} className="bg-white rounded-md border border-ink-200 p-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="text-sm font-semibold text-navy-700">{c.name}</div>
                                  <Badge tone="ocean">L{level.level} · {level.name}</Badge>
                                </div>
                                <div className="space-y-1.5 mb-3">
                                  <div className="text-2xs uppercase tracking-wider font-semibold text-ink-500">
                                    Rate each on 1-5 (or mark Not Observed)
                                  </div>
                                  {level.indicators.map((ind, i) => (
                                    <div key={i} className="text-2xs text-ink-700 leading-snug flex items-start gap-2 px-2 py-1.5 bg-ink-100/40 rounded">
                                      <span className="font-mono text-ocean-700 flex-shrink-0">{i + 1}.</span>
                                      <span className="flex-1">{ind}</span>
                                      <span className="font-mono text-ink-400 flex-shrink-0">1-5</span>
                                    </div>
                                  ))}
                                </div>
                                <div className="text-2xs uppercase tracking-wider font-semibold text-ink-500 mb-1.5">
                                  Plus two text fields
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-2xs text-ink-700">
                                  <div className="px-2 py-1.5 bg-green-50/40 rounded border border-green-300/40">What was done well</div>
                                  <div className="px-2 py-1.5 bg-amber-50/40 rounded border border-amber-400/30">What could have been better</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Remove */}
                    <div className="flex justify-end pt-2 border-t border-ink-200">
                      <Button variant="ghost" size="sm" onClick={() => removeTool(tool.id)}>
                        <X size={11} /> Remove this tool
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Add tool selector */}
      {addingTool && (
        <Card>
          <div className="px-5 py-3 border-b border-ink-200 bg-ink-100/30 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-navy-700">Choose a tool type</h3>
              <p className="text-2xs text-ink-500 mt-0.5">10 standard types pre-loaded. Custom types coming in v1.</p>
            </div>
            <button onClick={() => setAddingTool(false)} className="text-ink-400 hover:text-navy-700">
              <X size={16} />
            </button>
          </div>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {toolLibrary.map((t) => (
                <button
                  key={t.key}
                  onClick={() => addTool(t.key)}
                  className="text-left p-3 rounded-md border-2 border-ink-200 bg-white hover:border-ocean-400 hover:bg-ocean-50/30 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <Wrench size={16} className="text-ocean-600 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-navy-700">{t.name}</div>
                      <div className="text-2xs text-ink-500 mt-0.5 leading-snug line-clamp-2">{t.description}</div>
                      <div className="text-2xs text-ink-400 mt-1 font-mono">
                        {t.defaultDurationMinutes}m · {formatLabel(t.defaultFormat)}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Coverage matrix */}
      {tools.length > 0 && (
        <Card>
          <div className="px-5 py-3 border-b border-ink-200 bg-ink-100/30">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-navy-700">Coverage matrix</h3>
                <p className="text-2xs text-ink-500 mt-0.5">≥2 tools per competency is the methodological standard.</p>
              </div>
              <Badge tone={coverageFullyOk ? "green" : coverageZero.length > 0 ? "red" : "amber"}>
                {coverageFullyOk ? "All competencies fully covered" : `${coverageZero.length + coverageOne.length} competencies need attention`}
              </Badge>
            </div>
          </div>
          <CardBody className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left">
                  <th className="pb-2 pr-3 font-semibold text-2xs uppercase tracking-wider text-ink-500">Competency</th>
                  {tools.map((t) => (
                    <th key={t.id} className="pb-2 px-2 font-semibold text-2xs text-ink-500 text-center min-w-[80px]" title={t.name}>
                      <div className="truncate max-w-[100px] mx-auto">{findToolType(t.toolTypeKey)?.name.split(" ")[0]}</div>
                    </th>
                  ))}
                  <th className="pb-2 pl-3 font-semibold text-2xs uppercase tracking-wider text-ink-500 text-right">Tools</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {coverage.map((cov) => {
                  const c = dictionary.find((x) => x.id === cov.competencyId);
                  if (!c) return null;
                  return (
                    <tr key={cov.competencyId}>
                      <td className="py-2 pr-3 text-ink-700 font-medium">{c.name}</td>
                      {tools.map((t) => {
                        const covered = t.competencyIds.includes(cov.competencyId);
                        return (
                          <td key={t.id} className="py-2 px-2 text-center">
                            {covered ? (
                              <div className="inline-flex w-5 h-5 rounded-full bg-ocean-600 text-white items-center justify-center mx-auto">
                                <CheckCircle2 size={12} />
                              </div>
                            ) : (
                              <div className="inline-block w-5 h-5 rounded-full bg-ink-100 mx-auto" />
                            )}
                          </td>
                        );
                      })}
                      <td className="py-2 pl-3 text-right">
                        <Badge tone={
                          cov.toolCount === 0 ? "red" :
                          cov.toolCount === 1 ? "amber" : "green"
                        }>
                          {cov.toolCount}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}

      {/* Footer nav */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="secondary" onClick={() => navigate(`/engagement/${engagementId}/setup/proficiency`)}>
          ← Back: Proficiency targets
        </Button>
        <Button
          variant="primary"
          onClick={() => navigate(`/engagement/${engagementId}/setup/aggregation`)}
          disabled={tools.length === 0 || coverageZero.length > 0}
        >
          Continue to Aggregation rules <ArrowRight size={13} />
        </Button>
      </div>
    </div>
  );
}
