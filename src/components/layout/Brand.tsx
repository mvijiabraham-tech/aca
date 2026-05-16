import { cn } from "@/lib/cn";
import { useAppMode, useAppStore } from "@/lib/store";
import type { AppMode } from "@/lib/store";

export function ModeSwitcher() {
  const mode = useAppMode();
  const setAppMode = useAppStore((s) => s.setAppMode);

  return (
    <div className="flex items-center gap-0.5 bg-ink-100 rounded-full p-0.5">
      {(["demo", "prod"] as AppMode[]).map((m) => (
        <button
          key={m}
          onClick={() => setAppMode(m)}
          className={cn(
            "px-3 py-1 rounded-full text-2xs font-medium transition-colors capitalize",
            mode === m
              ? "bg-navy-700 text-white shadow-sm"
              : "text-ink-500 hover:text-navy-700",
          )}
        >
          {m === "demo" ? "Demo" : "Prod"}
        </button>
      ))}
    </div>
  );
}

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
  return (
    <div className="flex items-center gap-3">
      <div className="text-right">
        <div className="text-2xs text-ink-500">Admin</div>
        <div className="text-sm font-medium text-navy-700">MV</div>
      </div>
      <div className="w-8 h-8 rounded-md bg-ocean-100 text-ocean-800 flex items-center justify-center text-2xs font-semibold">
        MV
      </div>
    </div>
  );
}
