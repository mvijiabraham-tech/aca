import { useAuth } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import { LogOut } from "lucide-react";

export function BrandMark() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-7 h-7 rounded-md bg-navy-700 flex items-center justify-center">
        <div className="w-3 h-3 rounded-sm bg-ocean-300" />
      </div>
      <div>
        <div className="text-sm font-semibold text-navy-700 leading-tight display-serif">
          Synovate ACA
        </div>
        <div className="text-2xs text-ink-500 leading-tight">Assessment Centre</div>
      </div>
    </div>
  );
}

export function AdminBadge() {
  const { profile, signOut } = useAuth();

  if (isSupabaseConfigured && profile) {
    const initials = profile.full_name
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

    return (
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-2xs text-ink-500">{profile.organisation ?? "Assessor"}</div>
          <div className="text-sm font-medium text-navy-700">{profile.full_name}</div>
        </div>
        <div className="w-8 h-8 rounded-md bg-ocean-100 text-ocean-800 flex items-center justify-center text-2xs font-semibold">
          {initials}
        </div>
        <button
          onClick={signOut}
          title="Sign out"
          className="p-1.5 rounded-md text-ink-400 hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut size={14} />
        </button>
      </div>
    );
  }

  return null;
}
