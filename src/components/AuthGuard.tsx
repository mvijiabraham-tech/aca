import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useAppMode } from "@/lib/store";
import { isSupabaseConfigured } from "@/lib/supabase";

/**
 * Wraps routes that require authentication in prod mode.
 * In demo mode or when Supabase isn't configured, passes through.
 */
export function AuthGuard() {
  const { user, loading } = useAuth();
  const appMode = useAppMode();

  // Demo mode or Supabase not configured — no auth required
  if (appMode === "demo" || !isSupabaseConfigured) {
    return <Outlet />;
  }

  // Still loading auth state — show spinner
  if (loading) {
    return (
      <div className="min-h-screen surface-canvas flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-ocean-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-ink-500 mt-4">Loading…</p>
        </div>
      </div>
    );
  }

  // Not authenticated — redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
