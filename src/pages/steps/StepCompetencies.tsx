import { useParams, useNavigate } from "react-router-dom";
import { useState, useMemo, useEffect, useRef } from "react";
import {
  ArrowRight, Search, Upload, CheckCircle2, ChevronDown, ChevronRight,
  AlertTriangle, X, Info, Star, Download, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field, TextInput } from "@/components/ui/Form";
import { StepPageHeader } from "@/components/StepPageHeader";
import { useEngagement, useAppStore } from "@/lib/store";
import { dictionary, clusters, clusterMeta } from "@/mocks/dictionary";
import { parseCSV, parseCompetenciesCSV, downloadCSVTemplate } from "@/lib/csv-import";
import type { CompetencySelection } from "@/types";

const MIN_SELECTED = 4;

export function StepCompetencies() {
  const { engagementId } = useParams<{ engagementId: string }>();
  const navigate = useNavigate();
  const engagement = useEngagement(engagementId);
  const setCompetencies = useAppStore((s) => s.setCompetencies);
  const setStepStatus = useAppStore((s) => s.setStepStatus);

  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCsvHint, setShowCsvHint] = useState(false);
  const [csvMessage, setCsvMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Current selections from store
  const selectedMap = useMemo(() => {
    const m = new Map<string, CompetencySelection>();
    engagement?.competencies.forEach((c) => m.set(c.competencyId, c));
    return m;
  }, [engagement?.competencies]);

  const selectedCount = selectedMap.size;

  // Update step status whenever selections change
  useEffect(() => {
    if (!engagement) return;
    if (selectedCount === 0) {
      setStepStatus(engagement.id, "competencies", "not_started", undefined);
    } else if (selectedCount < MIN_SELECTED) {
      setStepStatus(engagement.id, "competencies", "in_progress", `${selectedCount} of ${MIN_SELECTED} minimum selected`);
    } else {
      setStepStatus(engagement.id, "competencies", "complete", `${selectedCount} competencies · Synovate dictionary`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCount]);

  if (!engagement || !engagementId) return null;

  function toggleSelection(competencyId: string) {
    if (!engagement) return;
    const exists = selectedMap.get(competencyId);
    let next: CompetencySelection[];
    if (exists) {
      next = engagement.competencies.filter((c) => c.competencyId !== competencyId);
    } else {
      next = [...engagement.competencies, { competencyId, weight: 1.0, critical: false }];
    }
    setCompetencies(engagement.id, next);
  }

  function updateSelection(competencyId: string, patch: Partial<CompetencySelection>) {
    if (!engagement) return;
    const next = engagement.competencies.map((c) =>
      c.competencyId === competencyId ? { ...c, ...patch } : c,
    );
    setCompetencies(engagement.id, next);
  }

  function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !engagement) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const rows = parseCSV(text);
      if (rows.length === 0) {
        setCsvMessage({ type: "error", text: "CSV is empty or has no data rows." });
        return;
      }
      const { data, errors } = parseCompetenciesCSV(rows);
      if (errors.length > 0) {
        setCsvMessage({ type: "error", text: errors.join(" · ") });
      }
      if (data.length > 0) {
        // Replace: CSV defines the full competency selection
        setCompetencies(engagement.id, data);
        setCsvMessage({ type: "success", text: `${data.length} competenc${data.length === 1 ? "y" : "ies"} imported.${errors.length > 0 ? ` ${errors.length} row(s) skipped.` : ""}` });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  // Filtered + grouped
  const filteredByCluster = useMemo(() => {
    const map: Record<string, typeof dictionary> = {};
    clusters.forEach((c) => { map[c.key] = []; });
    dictionary.forEach((c) => {
      if (search) {
        const q = search.toLowerCase();
        if (!c.name.toLowerCase().includes(q) && !c.definition.toLowerCase().includes(q)) return;
      }
      if (!map[c.cluster]) map[c.cluster] = [];
      map[c.cluster].push(c);
    });
    return map;
  }, [search]);

  return (
    <div className="space-y-6">
      <StepPageHeader
        engagementId={engagementId}
        stepKey="competencies"
        actions={
          <>
            <Button variant="secondary" onClick={() => setShowCsvHint((v) => !v)}>
              <Upload size={13} /> Upload CSV
            </Button>
          </>
        }
      />

      {/* CSV upload banner */}
      {showCsvHint && (
        <div className="bg-ocean-50/50 border border-ocean-300/50 rounded-lg p-4 flex items-start gap-3">
          <Info size={16} className="text-ocean-700 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-xs text-ink-700 leading-relaxed">
            <div className="font-semibold text-navy-700 mb-1">Upload competency selections via CSV</div>
            CSV with columns: competency_id, weight, critical. The competency_id must match an entry in the Synovate dictionary.
            Uploading replaces the current selection.
            <div className="mt-2 flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleCSVUpload}
              />
              <Button variant="secondary" size="sm" onClick={() => downloadCSVTemplate("competencies")}>
                <Download size={12} /> Download template
              </Button>
              <Button variant="primary" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload size={12} /> Upload file
              </Button>
            </div>
          </div>
          <button onClick={() => setShowCsvHint(false)} className="text-ink-400 hover:text-navy-700">
            <X size={14} />
          </button>
        </div>
      )}

      {csvMessage && (
        <div className={cn(
          "rounded-lg border px-4 py-3 text-sm flex items-start gap-2",
          csvMessage.type === "success"
            ? "bg-green-50 border-green-300 text-green-800"
            : "bg-amber-50 border-amber-300 text-amber-800",
        )}>
          {csvMessage.type === "success" ? <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" /> : <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />}
          <span>{csvMessage.text}</span>
        </div>
      )}

      {/* Selection summary band */}
      <div className="bg-white rounded-lg border border-ink-200 px-5 py-3 flex items-center gap-5">
        <div className="flex-1">
          <div className="text-xs text-ink-500 mb-1">Selected for this engagement</div>
          <div className="text-sm font-semibold text-navy-700">
            {selectedCount} {selectedCount === 1 ? "competency" : "competencies"}
            {selectedCount < MIN_SELECTED && (
              <span className="ml-2 text-2xs text-amber-700 font-medium">
                · need at least {MIN_SELECTED} to proceed
              </span>
            )}
          </div>
        </div>
        <div className="relative w-72">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <TextInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search competencies…"
            className="pl-8"
          />
        </div>
      </div>

      {/* Selected competencies — pinned at top if any */}
      {selectedCount > 0 && (
        <Card>
          <div className="px-5 py-3 border-b border-ink-200 bg-ocean-50/30">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-navy-700">Your selections</h3>
                <p className="text-2xs text-ink-500 mt-0.5">Adjust weight and critical flag per competency.</p>
              </div>
              <Badge tone="ocean">{selectedCount} selected</Badge>
            </div>
          </div>
          <div className="divide-y divide-ink-100">
            {Array.from(selectedMap.values()).map((sel) => {
              const c = dictionary.find((x) => x.id === sel.competencyId);
              if (!c) return null;
              return (
                <div key={sel.competencyId} className="p-4 hover:bg-ink-100/30 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-semibold text-navy-700">{c.name}</h4>
                        <Badge tone="neutral">{clusterMeta(c.cluster)?.label}</Badge>
                        {sel.critical && (
                          <Badge tone="amber">
                            <Star size={9} /> Critical
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-ink-500 leading-relaxed line-clamp-2">{c.definition}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Field label="Weight" className="w-24">
                        <select
                          value={sel.weight}
                          onChange={(e) => updateSelection(c.id, { weight: parseFloat(e.target.value) })}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-ink-200 rounded-md focus:outline-none focus:ring-2 focus:ring-ocean-600/20"
                        >
                          <option value="0.5">0.5x</option>
                          <option value="1.0">1.0x</option>
                          <option value="1.5">1.5x</option>
                          <option value="2.0">2.0x</option>
                        </select>
                      </Field>
                      <button
                        onClick={() => updateSelection(c.id, { critical: !sel.critical })}
                        className={cn(
                          "self-end pb-1.5 px-2.5 py-1.5 rounded-md text-2xs font-medium border transition-colors",
                          sel.critical
                            ? "bg-amber-50 border-amber-400/40 text-amber-700"
                            : "bg-white border-ink-200 text-ink-500 hover:text-amber-700",
                        )}
                        title="Critical competencies trigger alerts in Calibrate"
                      >
                        <Star size={11} />
                      </button>
                      <button
                        onClick={() => toggleSelection(c.id)}
                        className="self-end pb-1.5 text-ink-400 hover:text-red-600 transition-colors p-1.5"
                        title="Remove"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Library by cluster */}
      <div className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h3 className="display-serif text-lg font-semibold text-navy-700">Synovate dictionary</h3>
          <span className="text-2xs text-ink-500 font-medium uppercase tracking-wider">
            {dictionary.length} competencies · {clusters.length} clusters
          </span>
        </div>

        {clusters.map((cluster) => {
          const competencies = filteredByCluster[cluster.key] ?? [];
          if (competencies.length === 0) return null;
          return (
            <Card key={cluster.key}>
              <div className="px-5 py-3 border-b border-ink-200 bg-ink-100/30 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-navy-700">{cluster.label}</h4>
                  <p className="text-2xs text-ink-500 mt-0.5">{cluster.description}</p>
                </div>
                <Badge tone="neutral">{competencies.length}</Badge>
              </div>
              <div className="divide-y divide-ink-100">
                {competencies.map((c) => {
                  const isSelected = selectedMap.has(c.id);
                  const isExpanded = expandedId === c.id;
                  return (
                    <div key={c.id}>
                      <div className="p-4 flex items-start gap-4 hover:bg-ink-100/30 transition-colors">
                        <button
                          onClick={() => toggleSelection(c.id)}
                          className={cn(
                            "mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0",
                            isSelected
                              ? "bg-ocean-600 border-ocean-600"
                              : "bg-white border-ink-300 hover:border-ocean-400",
                          )}
                        >
                          {isSelected && <CheckCircle2 size={14} className="text-white" />}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h5 className="text-sm font-semibold text-navy-700">{c.name}</h5>
                            {c.sectorTags.filter((t) => t !== "generic").map((t) => (
                              <Badge key={t} tone="navy">{t}</Badge>
                            ))}
                          </div>
                          <p className="text-xs text-ink-500 mt-1 leading-relaxed">{c.definition}</p>

                          {/* Inline expansion: shows all 12 indicators */}
                          {isExpanded && (
                            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                              {c.levels.map((lvl) => (
                                <div key={lvl.level} className="bg-ink-100/40 rounded-md p-3 border border-ink-200">
                                  <div className="flex items-baseline gap-1.5 mb-2">
                                    <span className="text-2xs font-mono font-bold text-ocean-700">L{lvl.level}</span>
                                    <span className="text-2xs font-semibold text-navy-700">{lvl.name}</span>
                                    <span className="text-2xs text-ink-500">· {lvl.qualifier}</span>
                                  </div>
                                  <ul className="space-y-1.5">
                                    {lvl.indicators.map((ind, i) => (
                                      <li key={i} className="text-2xs text-ink-700 leading-snug flex gap-1.5">
                                        <span className="text-ink-400">•</span>
                                        <span>{ind}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => setExpandedId(isExpanded ? null : c.id)}
                          className="text-ink-400 hover:text-navy-700 transition-colors p-1 flex-shrink-0"
                          title={isExpanded ? "Hide indicators" : "Show indicators"}
                        >
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Helpful warning if too few selected */}
      {selectedCount > 0 && selectedCount < MIN_SELECTED && (
        <div className="bg-amber-50/50 border border-amber-400/40 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-xs text-ink-700 leading-relaxed">
            Select at least <strong>{MIN_SELECTED}</strong> competencies to lock this step. Typical engagements use 6-10.
          </div>
        </div>
      )}

      {/* Footer nav */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="secondary" onClick={() => navigate(`/engagement/${engagementId}/setup/engagement`)}>
          ← Back: Engagement basics
        </Button>
        <Button
          variant="primary"
          onClick={() => navigate(`/engagement/${engagementId}/setup/proficiency`)}
          disabled={selectedCount < MIN_SELECTED}
        >
          Continue to Proficiency targets <ArrowRight size={13} />
        </Button>
      </div>
    </div>
  );
}
