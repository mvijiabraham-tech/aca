import { NavLink, Outlet, useParams, useNavigate } from "react-router-dom";
import {
  Settings, ClipboardEdit, Scale, FileText,
  ArrowLeft, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/Badge";
import { AdminBadge, ModeSwitcher } from "./Brand";
import { useEngagement, useAppStore, useAppMode, DEMO_ENGAGEMENT_IDS } from "@/lib/store";

type Destination = {
  key: string;
  label: string;
  subtitle: string;
  icon: typeof Settings;
};

const destinations: Destination[] = [
  { key: "setup",     label: "Set Up",    subtitle: "Configure",   icon: Settings },
  { key: "score",     label: "Score",     subtitle: "Rate",        icon: ClipboardEdit },
  { key: "calibrate", label: "Calibrate", subtitle: "Reconcile",   icon: Scale },
  { key: "report",    label: "Report",    subtitle: "Deliver",     icon: FileText },
];

export function EngagementShell() {
  const { engagementId } = useParams<{ engagementId: string }>();
  const navigate = useNavigate();
  const engagement = useEngagement(engagementId);
  const appMode = useAppMode();
  const totalEngagements = useAppStore((s) =>
    appMode === "prod"
      ? s.engagements.filter((e) => !DEMO_ENGAGEMENT_IDS.has(e.id)).length
      : s.engagements.length,
  );

  // Redirect to home if viewing a demo engagement in prod mode
  if (engagementId && appMode === "prod" && DEMO_ENGAGEMENT_IDS.has(engagementId)) {
    return (
      <div className="min-h-screen surface-canvas flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="display-serif text-2xl font-semibold text-navy-700">Demo engagement</div>
          <p className="text-sm text-ink-500 mt-2">This engagement is only available in Demo mode.</p>
          <button
            onClick={() => navigate("/")}
            className="mt-5 text-sm font-medium text-ocean-700 hover:text-ocean-800 inline-flex items-center gap-1.5"
          >
            <ArrowLeft size={14} /> Back to engagements
          </button>
        </div>
      </div>
    );
  }

  // Defensive — if engagement isn't found, bounce back to landing
  if (!engagement) {
    return (
      <div className="min-h-screen surface-canvas flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="display-serif text-2xl font-semibold text-navy-700">Engagement not found</div>
          <p className="text-sm text-ink-500 mt-2">It may have been deleted or the link is incorrect.</p>
          <button
            onClick={() => navigate("/")}
            className="mt-5 text-sm font-medium text-ocean-700 hover:text-ocean-800 inline-flex items-center gap-1.5"
          >
            <ArrowLeft size={14} /> Back to engagements
          </button>
        </div>
      </div>
    );
  }

  const completedSteps = engagement.setupSteps.filter((s) => s.status === "complete").length;
  const totalSteps = engagement.setupSteps.length;

  return (
    <div className="min-h-screen flex flex-col surface-canvas">
      {/* Engagement chrome — replaces the landing top nav */}
      <header className="bg-white border-b border-ink-200">
        <div className="max-w-[1400px] mx-auto px-8">
          {/* Top row: back link + engagement identity + admin */}
          <div className="flex items-center justify-between h-14 border-b border-ink-100">
            <div className="flex items-center gap-5 min-w-0 flex-1">
              <button
                onClick={() => navigate("/")}
                className="flex items-center gap-1.5 text-2xs font-medium text-ink-500 hover:text-navy-700 transition-colors whitespace-nowrap"
              >
                <ArrowLeft size={13} />
                All engagements
                <span className="text-ink-400 ml-1">({totalEngagements})</span>
              </button>

              <div className="h-5 w-px bg-ink-200 flex-shrink-0" />

              <div className="min-w-0 flex items-center gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-base font-semibold text-navy-700 display-serif truncate">
                      {engagement.basics.name}
                    </h1>
                    <Badge tone={engagement.status === "draft" ? "amber" : engagement.status === "live" ? "ocean" : "green"}>
                      {engagement.status === "draft" ? "Draft" : engagement.status === "live" ? "Live" : "Complete"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2.5 text-2xs text-ink-500 mt-0.5">
                    <span className="font-mono">{engagement.basics.code}</span>
                    <span className="text-ink-300">·</span>
                    <span>{engagement.basics.client}</span>
                    {engagement.basics.cohortSize && (
                      <>
                        <span className="text-ink-300">·</span>
                        <span>{engagement.basics.cohortSize} participants</span>
                      </>
                    )}
                    {engagement.status === "draft" && (
                      <>
                        <span className="text-ink-300">·</span>
                        <span>Setup {completedSteps}/{totalSteps}</span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  className="text-ink-400 hover:text-ink-700 p-1 rounded hover:bg-ink-100 transition-colors"
                  title="Switch engagement"
                  onClick={() => navigate("/")}
                >
                  <ChevronDown size={14} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <ModeSwitcher />
              <AdminBadge />
            </div>
          </div>

          {/* Destination tabs */}
          <nav className="flex items-center -mb-px">
            {destinations.map((d) => {
              const Icon = d.icon;
              const locked = isDestinationLocked(d.key, engagement.status);
              return (
                <NavLink
                  key={d.key}
                  to={`/engagement/${engagement.id}/${d.key}`}
                  className={({ isActive }) =>
                    cn(
                      "group relative px-5 py-3.5 text-sm font-medium transition-colors inline-flex items-center gap-2 border-b-2",
                      isActive
                        ? "text-navy-700 border-ocean-600"
                        : "text-ink-500 hover:text-navy-700 border-transparent",
                      locked && "opacity-50 cursor-not-allowed",
                    )
                  }
                  onClick={(e) => {
                    if (locked) {
                      e.preventDefault();
                    }
                  }}
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        size={14}
                        className={cn(isActive ? "text-ocean-600" : "text-ink-400 group-hover:text-ink-500")}
                      />
                      <span>{d.label}</span>
                      <span className={cn("text-2xs font-normal", isActive ? "text-ink-500" : "text-ink-400")}>
                        · {d.subtitle}
                      </span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-[1400px] mx-auto px-8 py-10">
          <Outlet />
        </div>
      </main>

      <footer className="border-t border-ink-200 py-4">
        <div className="max-w-[1400px] mx-auto px-8 flex items-center justify-between text-2xs text-ink-500">
          <span>Synovate · Assessment Centre Application</span>
          <span>v0.8 · Pass 6 · All destinations live</span>
        </div>
      </footer>
    </div>
  );
}

// Score / Calibrate / Report unlock only after engagement is Live
// In v0.5 we don't yet enforce this strictly — destinations are visible so the
// flow stays legible. We do dim them visually for Draft engagements.
function isDestinationLocked(key: string, status: string): boolean {
  if (key === "setup") return false;
  // Locked while still in Draft; once Live, downstream destinations open up
  return status === "draft";
}
