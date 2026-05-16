import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Building2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { BrandMark } from "@/components/layout/Brand";
import { useAppStore, useAppMode, DEMO_ENGAGEMENT_IDS } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import { hydrateFromSupabase } from "@/lib/sync";

export function ObserverHome() {
  const allEngagements = useAppStore((s) => s.engagements);
  const appMode = useAppMode();
  const hydrated = useAppStore((s) => s._hydrated);
  const hydrateStore = useAppStore((s) => s.hydrateFromSupabase);
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  // Hydrate from Supabase in prod mode
  useEffect(() => {
    if (appMode !== "prod" || !isSupabaseConfigured || hydrated) return;
    hydrateFromSupabase().then((engs) => {
      hydrateStore(engs);
    });
  }, [appMode, hydrated, hydrateStore]);

  // In prod mode, require a valid profile with email
  const emailVerified = appMode === "demo" || !!profile;

  // Filter to live/complete engagements where observer's email matches an assessor
  const myEngagements = useMemo(() => {
    const engagements = appMode === "prod"
      ? allEngagements.filter((e) => !DEMO_ENGAGEMENT_IDS.has(e.id))
      : allEngagements;

    return engagements.filter((e) => {
      if (e.status === "draft") return false;
      if (!profile) return true; // In demo mode show all non-draft
      return e.assessors.some(
        (a) => a.email.toLowerCase() === profile.email.toLowerCase(),
      );
    });
  }, [allEngagements, appMode, profile]);

  // Auto-redirect if single engagement
  useEffect(() => {
    if (emailVerified && myEngagements.length === 1) {
      navigate(`/observe/${myEngagements[0].id}`, { replace: true });
    }
  }, [emailVerified, myEngagements, navigate]);

  // Block access if email not verified (prod mode, no profile)
  if (!emailVerified) {
    return (
      <div className="min-h-screen surface-canvas flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-14 h-14 rounded-xl bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-5">
            <AlertCircle size={26} />
          </div>
          <h1 className="display-serif text-2xl font-semibold text-navy-700">
            Email not verified
          </h1>
          <p className="text-sm text-ink-500 mt-3 leading-relaxed">
            We could not verify your identity. Please sign in again or contact your Lead Assessor.
          </p>
          <Button variant="secondary" onClick={signOut} className="mt-6">
            <LogOut size={13} /> Sign out
          </Button>
        </div>
      </div>
    );
  }

  // Multiple engagements — show picker
  if (myEngagements.length > 1) {
    return (
      <div className="min-h-screen surface-canvas">
        <header className="bg-white border-b border-ink-200 sticky top-0 z-30">
          <div className="max-w-[1024px] mx-auto px-6 flex items-center justify-between h-14">
            <BrandMark />
            <div className="flex items-center gap-3">
              {profile && (
                <span className="text-sm font-medium text-navy-700">{profile.full_name}</span>
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
        <div className="max-w-[1024px] mx-auto px-6 py-10">
          <h1 className="display-serif text-2xl font-semibold text-navy-700 mb-2">
            Your engagements
          </h1>
          <p className="text-sm text-ink-500 mb-6">
            Select an engagement to begin scoring.
          </p>
          <div className="grid grid-cols-1 gap-3">
            {myEngagements.map((e) => (
              <Card key={e.id} interactive>
                <button
                  onClick={() => navigate(`/observe/${e.id}`)}
                  className="w-full text-left p-5 flex items-center gap-4"
                >
                  <div className="w-11 h-11 rounded-lg bg-ocean-50 text-ocean-700 flex items-center justify-center flex-shrink-0">
                    <Building2 size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="display-serif text-lg font-semibold text-navy-700 truncate">
                        {e.basics.name}
                      </h3>
                      <Badge tone={e.status === "live" ? "ocean" : "green"}>
                        {e.status === "live" ? "Live" : "Complete"}
                      </Badge>
                    </div>
                    <div className="text-xs text-ink-500 mt-0.5">
                      {e.basics.client}
                      {e.basics.cohortSize && ` \u00b7 ${e.basics.cohortSize} participants`}
                    </div>
                  </div>
                </button>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // No engagements — empty state
  if (myEngagements.length === 0) {
    return (
      <div className="min-h-screen surface-canvas flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-14 h-14 rounded-xl bg-ink-100 text-ink-400 flex items-center justify-center mx-auto mb-5">
            <Building2 size={26} />
          </div>
          <h1 className="display-serif text-2xl font-semibold text-navy-700">
            No engagements assigned to you
          </h1>
          <p className="text-sm text-ink-500 mt-3 leading-relaxed">
            You haven't been added as an observer to any active engagements.
            Contact your Lead Assessor if you believe this is an error.
          </p>
          <Button variant="secondary" onClick={signOut} className="mt-6">
            <LogOut size={13} /> Sign out
          </Button>
        </div>
      </div>
    );
  }

  // Single engagement — auto-redirect handled above, show loading while navigating
  return (
    <div className="min-h-screen surface-canvas flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-ocean-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
