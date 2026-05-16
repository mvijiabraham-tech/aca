import { useState } from "react";
import { ChevronDown, User, ShieldCheck, AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/Badge";
import { useAppStore, useAppMode } from "@/lib/store";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { Engagement } from "@/types";

interface ObserverPersonaSwitcherProps {
  engagement: Engagement;
  observerId: string | null;
}

const ROLE_LABEL: Record<string, string> = {
  lead: "Lead",
  assessor: "Assessor",
  observer: "Observer",
};

export function ObserverPersonaSwitcher({ engagement, observerId }: ObserverPersonaSwitcherProps) {
  const setActingObserver = useAppStore((s) => s.setActingObserver);
  const appMode = useAppMode();
  const [open, setOpen] = useState(false);

  const current = engagement.assessors.find((a) => a.id === observerId);

  // In prod mode with Supabase, observer is resolved from auth — show read-only badge
  if (appMode === "prod" && isSupabaseConfigured && current) {
    return (
      <div className="flex items-center gap-2.5 px-3 py-2 bg-white border border-ink-200 rounded-md">
        <div className="w-7 h-7 rounded-md bg-ocean-50 text-ocean-800 flex items-center justify-center text-2xs font-semibold flex-shrink-0">
          {initials(current.name)}
        </div>
        <div className="min-w-0">
          <div className="text-2xs text-ink-500 leading-tight uppercase tracking-wider font-medium">
            Logged in as
          </div>
          <div className="text-sm font-semibold text-navy-700 leading-tight truncate">
            {current.name}
          </div>
        </div>
        <Badge tone={current.role === "lead" ? "navy" : current.role === "assessor" ? "ocean" : "neutral"} className="ml-1">
          {ROLE_LABEL[current.role]}
        </Badge>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 px-3 py-2 bg-white border border-ink-200 rounded-md hover:border-ink-300 transition-colors text-left"
      >
        <div className="w-7 h-7 rounded-md bg-ocean-50 text-ocean-800 flex items-center justify-center text-2xs font-semibold flex-shrink-0">
          {current ? initials(current.name) : "?"}
        </div>
        <div className="min-w-0">
          <div className="text-2xs text-ink-500 leading-tight uppercase tracking-wider font-medium">
            Acting as observer
          </div>
          <div className="text-sm font-semibold text-navy-700 leading-tight truncate">
            {current?.name ?? "Choose an observer"}
          </div>
        </div>
        {current && (
          <Badge tone={current.role === "lead" ? "navy" : current.role === "assessor" ? "ocean" : "neutral"} className="ml-1">
            {ROLE_LABEL[current.role]}
          </Badge>
        )}
        <ChevronDown size={14} className="text-ink-400 flex-shrink-0" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-[340px] bg-white border border-ink-200 rounded-lg shadow-lg z-20 overflow-hidden">
            <div className="px-3 py-2 border-b border-ink-200 bg-ink-100/50">
              <div className="text-2xs font-semibold text-ink-500 uppercase tracking-wider">
                Switch persona for this engagement
              </div>
              <div className="text-2xs text-ink-500 mt-0.5">
                Demo helper — in production each observer logs in as themselves.
              </div>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {engagement.assessors.map((a) => {
                const isCurrent = a.id === observerId;
                return (
                  <button
                    key={a.id}
                    onClick={() => {
                      setActingObserver(engagement.id, a.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "w-full px-3 py-2.5 text-left hover:bg-ink-100/50 transition-colors flex items-center gap-3",
                      isCurrent && "bg-ocean-50/40",
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-md flex items-center justify-center text-2xs font-semibold flex-shrink-0",
                      isCurrent ? "bg-ocean-100 text-ocean-800" : "bg-ink-100 text-ink-700",
                    )}>
                      {initials(a.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-navy-700 truncate">{a.name}</span>
                        {a.role === "lead" && <ShieldCheck size={11} className="text-navy-700 flex-shrink-0" />}
                      </div>
                      <div className="text-2xs text-ink-500 flex items-center gap-1.5 mt-0.5">
                        <span>{ROLE_LABEL[a.role]}</span>
                        <span className="text-ink-300">·</span>
                        <span>{a.assignedToolIds.length} tool{a.assignedToolIds.length === 1 ? "" : "s"}</span>
                        {!a.calibrated && (
                          <>
                            <span className="text-ink-300">·</span>
                            <span className="inline-flex items-center gap-0.5 text-amber-700">
                              <AlertCircle size={9} /> not calibrated
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    {isCurrent && (
                      <div className="text-2xs font-medium text-ocean-700 flex-shrink-0">Active</div>
                    )}
                  </button>
                );
              })}
            </div>
            {engagement.assessors.length === 0 && (
              <div className="px-3 py-6 text-center text-2xs text-ink-500">
                <User size={20} className="mx-auto mb-2 text-ink-400" />
                No assessors configured for this engagement.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function initials(name: string): string {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}
