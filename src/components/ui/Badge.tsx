import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "ocean" | "navy" | "amber" | "green" | "red";

const tones: Record<Tone, string> = {
  neutral: "bg-ink-100 text-ink-700 border-ink-200",
  ocean: "bg-ocean-50 text-ocean-800 border-ocean-300/50",
  navy: "bg-navy-100 text-navy-700 border-navy-200",
  amber: "bg-amber-50 text-amber-700 border-amber-400/40",
  green: "bg-green-50 text-green-700 border-green-300/60",
  red: "bg-red-50 text-red-700 border-red-300/60",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-2xs font-medium border",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
