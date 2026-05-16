import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Search, Calendar, Users, ChevronRight,
  Building2, FolderOpen, Filter,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AddEngagementModal } from "@/components/AddEngagementModal";
import { useAppStore, useAppMode, DEMO_ENGAGEMENT_IDS } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import { hydrateFromSupabase } from "@/lib/sync";
import type { Engagement, EngagementStatus } from "@/types";

type StatusFilter = "all" | EngagementStatus;

export function EngagementsLanding() {
  const allEngagements = useAppStore((s) => s.engagements);
  const appMode = useAppMode();
  const hydrated = useAppStore((s) => s._hydrated);
  const hydrateStore = useAppStore((s) => s.hydrateFromSupabase);
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // In prod mode with Supabase configured, hydrate from DB on mount
  useEffect(() => {
    if (appMode !== "prod" || !isSupabaseConfigured || hydrated) return;
    setLoading(true);
    hydrateFromSupabase().then((engs) => {
      hydrateStore(engs);
      setLoading(false);
    });
  }, [appMode, hydrated, hydrateStore]);

  // Redirect observer-only users to /observe
  useEffect(() => {
    if (!profile) return;
    const engagements = appMode === "prod"
      ? allEngagements.filter((e) => !DEMO_ENGAGEMENT_IDS.has(e.id))
      : allEngagements;
    if (engagements.length === 0) return;
    const userEmail = profile.email.toLowerCase();
    // Check if this user only appears as "observer" role (never as lead/assessor)
    const engagementsWithUser = engagements.filter((e) =>
      e.assessors.some((a) => a.email.toLowerCase() === userEmail),
    );
    if (engagementsWithUser.length === 0) return;
    const isObserverOnly = engagementsWithUser.every((e) => {
      const assessor = e.assessors.find((a) => a.email.toLowerCase() === userEmail);
      return assessor && assessor.role === "observer";
    });
    if (isObserverOnly) {
      navigate("/observe", { replace: true });
    }
  }, [appMode, profile, allEngagements, navigate]);

  const engagements = useMemo(
    () => appMode === "prod" ? allEngagements.filter((e) => !DEMO_ENGAGEMENT_IDS.has(e.id)) : allEngagements,
    [allEngagements, appMode],
  );

  const filtered = useMemo(() => {
    return engagements.filter((e) => {
      if (filter !== "all" && e.status !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!e.basics.name.toLowerCase().includes(q) &&
            !e.basics.client.toLowerCase().includes(q) &&
            !e.basics.code.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [engagements, search, filter]);

  const counts = {
    all: engagements.length,
    draft: engagements.filter((e) => e.status === "draft").length,
    live: engagements.filter((e) => e.status === "live").length,
    complete: engagements.filter((e) => e.status === "complete").length,
  };

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-start justify-between gap-6">
        <div className="max-w-2xl">
          <div className="text-2xs text-ocean-700 uppercase tracking-wider font-semibold mb-2 flex items-center gap-2">
            Engagements
            <Badge tone="neutral">v1.0</Badge>
          </div>
          <h1 className="display-serif text-[2.5rem] leading-[1.1] font-semibold text-navy-700 tracking-tight">
            All your assessment engagements.
          </h1>
          <p className="text-base text-ink-500 mt-3 leading-relaxed">
            Each engagement holds one cohort of participants going through one AC. Click any engagement
            to enter its workspace — set it up, score it, calibrate, and deliver reports.
          </p>
        </div>

        <Button variant="primary" size="lg" onClick={() => setModalOpen(true)}>
          <Plus size={15} /> Add engagement
        </Button>
      </div>

      {/* Search + Filter band */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            placeholder="Search by name, client, or code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-ink-200 rounded-md focus:outline-none focus:ring-2 focus:ring-ocean-600/20 focus:border-ocean-400 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1 bg-white rounded-md border border-ink-200 p-1">
          <FilterTab active={filter === "all"} onClick={() => setFilter("all")} count={counts.all}>
            All
          </FilterTab>
          <FilterTab active={filter === "draft"} onClick={() => setFilter("draft")} count={counts.draft}>
            Draft
          </FilterTab>
          <FilterTab active={filter === "live"} onClick={() => setFilter("live")} count={counts.live}>
            Live
          </FilterTab>
          <FilterTab active={filter === "complete"} onClick={() => setFilter("complete")} count={counts.complete}>
            Complete
          </FilterTab>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="w-8 h-8 border-2 border-ocean-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-ink-500 mt-4">Loading engagements…</p>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState onAdd={() => setModalOpen(true)} hasAny={engagements.length > 0} />
      ) : (
        <div className="space-y-3">
          {filtered.map((e) => (
            <EngagementRow
              key={e.id}
              engagement={e}
              onClick={() => navigate(`/engagement/${e.id}/setup`)}
            />
          ))}
        </div>
      )}

      <AddEngagementModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}

// ---------- Filter tab ----------
function FilterTab({
  active, onClick, count, children,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded text-2xs font-medium transition-colors inline-flex items-center gap-1.5",
        active ? "bg-navy-700 text-white" : "text-ink-500 hover:text-navy-700",
      )}
    >
      {children}
      <span className={cn("font-mono text-2xs", active ? "text-white/70" : "text-ink-400")}>
        {count}
      </span>
    </button>
  );
}

// ---------- Engagement row ----------
function EngagementRow({
  engagement,
  onClick,
}: {
  engagement: Engagement;
  onClick: () => void;
}) {
  const completedSteps = engagement.setupSteps.filter((s) => s.status === "complete").length;
  const totalSteps = engagement.setupSteps.length;
  const progressPct = (completedSteps / totalSteps) * 100;

  return (
    <Card interactive className="overflow-hidden">
      <button onClick={onClick} className="w-full text-left">
        <div className="flex items-stretch divide-x divide-ink-100">
          {/* Left — identity */}
          <div className="flex-1 p-5 min-w-0">
            <div className="flex items-start gap-4">
              <div className={cn(
                "w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0",
                engagement.status === "complete" ? "bg-green-50 text-green-700" :
                engagement.status === "live" ? "bg-ocean-50 text-ocean-700" :
                "bg-ink-100 text-ink-500"
              )}>
                <Building2 size={20} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="display-serif text-lg font-semibold text-navy-700 leading-tight truncate">
                    {engagement.basics.name}
                  </h3>
                  <Badge tone={
                    engagement.status === "draft" ? "amber" :
                    engagement.status === "live" ? "ocean" : "green"
                  }>
                    {engagement.status === "draft" ? "Draft" :
                     engagement.status === "live" ? "Live" : "Complete"}
                  </Badge>
                </div>

                <div className="text-xs text-ink-500 flex items-center gap-2.5 flex-wrap">
                  <span className="font-mono">{engagement.basics.code}</span>
                  <span className="text-ink-300">·</span>
                  <span>{engagement.basics.client}</span>
                  {engagement.basics.audience && (
                    <>
                      <span className="text-ink-300">·</span>
                      <span className="truncate">{engagement.basics.audience}</span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-4 mt-2 text-2xs text-ink-500">
                  {engagement.basics.acDateRange && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar size={11} />
                      {engagement.basics.acDateRange}
                    </span>
                  )}
                  {engagement.basics.cohortSize && (
                    <span className="inline-flex items-center gap-1">
                      <Users size={11} />
                      {engagement.basics.cohortSize} participants
                    </span>
                  )}
                  {engagement.basics.mode && (
                    <span className="capitalize">
                      {engagement.basics.mode.replace("_", "-")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Middle — progress (Draft only) or summary (Live/Complete) */}
          <div className="w-[280px] p-5 bg-ink-100/30 flex flex-col justify-center">
            {engagement.status === "draft" ? (
              <>
                <div className="text-2xs text-ink-500 uppercase tracking-wider font-medium">
                  Setup progress
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <div className="text-sm font-semibold text-navy-700">
                    {completedSteps} of {totalSteps} steps
                  </div>
                  <div className="font-mono text-xs text-ink-500">
                    {Math.round(progressPct)}%
                  </div>
                </div>
                <div className="h-1.5 bg-ink-200 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-ocean-600 rounded-full"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </>
            ) : engagement.status === "live" ? (
              <>
                <div className="text-2xs text-ink-500 uppercase tracking-wider font-medium">
                  In flight
                </div>
                <div className="text-sm font-semibold text-navy-700 mt-1">Scoring in progress</div>
                <div className="text-2xs text-ink-500 mt-1">Locked {formatRelative(engagement.lockedAt)}</div>
              </>
            ) : (
              <>
                <div className="text-2xs text-ink-500 uppercase tracking-wider font-medium">
                  Delivered
                </div>
                <div className="text-sm font-semibold text-navy-700 mt-1">All reports complete</div>
                <div className="text-2xs text-ink-500 mt-1">Completed {formatRelative(engagement.completedAt)}</div>
              </>
            )}
          </div>

          {/* Right — open affordance */}
          <div className="w-16 flex items-center justify-center text-ink-400 group-hover:text-navy-700">
            <ChevronRight size={18} />
          </div>
        </div>
      </button>
    </Card>
  );
}

function formatRelative(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ---------- Empty state ----------
function EmptyState({ onAdd, hasAny }: { onAdd: () => void; hasAny: boolean }) {
  return (
    <Card>
      <div className="py-16 px-8 text-center max-w-md mx-auto">
        <div className="w-14 h-14 rounded-xl bg-ink-100 text-ink-400 flex items-center justify-center mx-auto mb-5">
          {hasAny ? <Filter size={26} /> : <FolderOpen size={26} />}
        </div>
        <h2 className="display-serif text-2xl font-semibold text-navy-700">
          {hasAny ? "No engagements match" : "No engagements yet"}
        </h2>
        <p className="text-sm text-ink-500 mt-3 leading-relaxed">
          {hasAny
            ? "Try clearing your filter or search to see all engagements."
            : "Create your first engagement to start configuring an AC."}
        </p>
        {!hasAny && (
          <Button variant="primary" onClick={onAdd} className="mt-6">
            <Plus size={14} /> Add your first engagement
          </Button>
        )}
      </div>
    </Card>
  );
}
