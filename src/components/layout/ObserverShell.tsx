import { Outlet, useParams, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { BrandMark } from "./Brand";
import { useEngagement } from "@/lib/store";
import { useAuth } from "@/lib/auth";

export function ObserverShell() {
  const { engagementId } = useParams<{ engagementId: string }>();
  const navigate = useNavigate();
  const engagement = useEngagement(engagementId);
  const { profile, signOut } = useAuth();

  if (!engagement) {
    return (
      <div className="min-h-screen surface-canvas flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="display-serif text-2xl font-semibold text-navy-700">Engagement not found</div>
          <p className="text-sm text-ink-500 mt-2">It may have been deleted or the link is incorrect.</p>
          <button
            onClick={() => navigate("/observe")}
            className="mt-5 text-sm font-medium text-ocean-700 hover:text-ocean-800"
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col surface-canvas">
      {/* Sticky header */}
      <header className="bg-white border-b border-ink-200 sticky top-0 z-30">
        <div className="max-w-[1024px] mx-auto px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-4 min-w-0">
            <BrandMark />
            <div className="h-5 w-px bg-ink-200 flex-shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-navy-700 display-serif truncate">
                  {engagement.basics.name}
                </span>
                <Badge tone={engagement.status === "live" ? "ocean" : "green"}>
                  {engagement.status === "live" ? "Live" : "Complete"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {profile && (
              <div className="flex items-center gap-2">
                <div className="text-right hidden sm:block">
                  <div className="text-2xs text-ink-500">Observer</div>
                  <div className="text-sm font-medium text-navy-700">{profile.full_name}</div>
                </div>
                <Badge tone="neutral">Observer</Badge>
              </div>
            )}
            <button
              onClick={signOut}
              title="Sign out"
              className="p-2 rounded-md text-ink-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-[1024px] mx-auto px-6 py-8">
          <Outlet />
        </div>
      </main>

      <footer className="border-t border-ink-200 py-4">
        <div className="max-w-[1024px] mx-auto px-6 text-center text-2xs text-ink-500">
          Synovate · Assessment Centre Application
        </div>
      </footer>
    </div>
  );
}
