import { CheckCircle2, Save, EyeOff } from "lucide-react";
import { cn } from "@/lib/cn";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { CompetencyScore, IndicatorScore, IndicatorRating } from "@/types";

// ---------- Constants ----------
export const RATING_LABELS: Record<number, string> = {
  1: "1 \u00b7 Substantially below expectations",
  2: "2 \u00b7 Below expectations",
  3: "3 \u00b7 Meets expectations",
  4: "4 \u00b7 Above expectations",
  5: "5 \u00b7 Substantially above expectations",
};

// ---------- CompetencyScoreCard ----------
export interface CompetencyScoreCardProps {
  competencyName: string;
  definition: string;
  targetLevelLabel: string;
  indicators: string[];
  draft: CompetencyScore;
  isComplete: boolean;
  size?: "default" | "touch";
  onIndicator: (idx: number, change: Partial<IndicatorScore>) => void;
  onNotes: (field: "verbatimAndOutliers" | "whatWasDoneWell" | "whatCouldBeBetter", value: string) => void;
}

export function CompetencyScoreCard({
  competencyName, definition, targetLevelLabel, indicators, draft, isComplete,
  size = "default", onIndicator, onNotes,
}: CompetencyScoreCardProps) {
  const ratedCount = draft.indicators.filter((i) => i.rating !== undefined || i.notObserved).length;
  const isCompCompletely = ratedCount === 4;

  const textareaRows = size === "touch" ? 4 : 3;
  const textareaClass = size === "touch" ? "text-base" : "text-sm";

  return (
    <Card className={cn(
      "overflow-hidden",
      isCompCompletely && "border-green-300/60",
    )}>
      <div className={cn(
        "px-5 py-3 border-b border-ink-200 flex items-center justify-between",
        isCompCompletely ? "bg-green-50/40" : "bg-ink-100/40",
      )}>
        <div className="flex items-center gap-3">
          <h3 className="display-serif text-lg font-semibold text-navy-700">
            {competencyName}
          </h3>
          <Badge tone="ocean">{targetLevelLabel}</Badge>
        </div>
        <div className="text-2xs font-mono text-ink-500">
          {ratedCount}/4 indicators
        </div>
      </div>
      <CardBody className="space-y-4">
        <p className="text-xs text-ink-500 leading-relaxed">{definition}</p>

        {/* Verbatim & outliers — full width */}
        <div>
          <label className="text-2xs uppercase tracking-wider font-semibold text-navy-700 block mb-1.5">
            Verbatim capture & outliers
          </label>
          <textarea
            value={draft.verbatimAndOutliers ?? ""}
            onChange={(e) => onNotes("verbatimAndOutliers", e.target.value)}
            disabled={isComplete}
            placeholder="Notable quotes, word-for-word narrations, and outlier observations."
            rows={textareaRows}
            className={cn(
              "w-full px-3 py-2 border border-ink-200 rounded-md focus:outline-none focus:ring-2 focus:ring-ocean-600/20 focus:border-ocean-400 transition-colors resize-none disabled:bg-ink-100/40",
              textareaClass,
            )}
          />
        </div>

        {/* Evidence notes — 2 column */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-2xs uppercase tracking-wider font-semibold text-green-700 block mb-1.5">
              What did the person do well
            </label>
            <textarea
              value={draft.whatWasDoneWell ?? ""}
              onChange={(e) => onNotes("whatWasDoneWell", e.target.value)}
              disabled={isComplete}
              placeholder="Specific evidence and examples observed."
              rows={textareaRows}
              className={cn(
                "w-full px-3 py-2 border border-ink-200 rounded-md focus:outline-none focus:ring-2 focus:ring-ocean-600/20 focus:border-ocean-400 transition-colors resize-none disabled:bg-ink-100/40",
                textareaClass,
              )}
            />
          </div>
          <div>
            <label className="text-2xs uppercase tracking-wider font-semibold text-amber-700 block mb-1.5">
              What can be improved
            </label>
            <textarea
              value={draft.whatCouldBeBetter ?? ""}
              onChange={(e) => onNotes("whatCouldBeBetter", e.target.value)}
              disabled={isComplete}
              placeholder="Gaps, development areas, or moments to probe further."
              rows={textareaRows}
              className={cn(
                "w-full px-3 py-2 border border-ink-200 rounded-md focus:outline-none focus:ring-2 focus:ring-ocean-600/20 focus:border-ocean-400 transition-colors resize-none disabled:bg-ink-100/40",
                textareaClass,
              )}
            />
          </div>
        </div>

        {/* Indicator ratings */}
        <div className="space-y-3">
          {indicators.map((indText, idx) => (
            <IndicatorRow
              key={idx}
              number={idx + 1}
              text={indText}
              indicator={draft.indicators[idx]}
              disabled={isComplete}
              size={size}
              onChange={(change) => onIndicator(idx, change)}
            />
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

// ---------- IndicatorRow ----------
export interface IndicatorRowProps {
  number: number;
  text: string;
  indicator: IndicatorScore;
  disabled: boolean;
  size?: "default" | "touch";
  onChange: (change: Partial<IndicatorScore>) => void;
}

export function IndicatorRow({ number, text, indicator, disabled, size = "default", onChange }: IndicatorRowProps) {
  const isRated = indicator.rating !== undefined && !indicator.notObserved;
  const isNotObserved = indicator.notObserved;

  const btnSize = size === "touch" ? "w-12 h-12 text-base" : "w-9 h-9 text-sm";
  const noBtnPadding = size === "touch" ? "px-4 h-12" : "px-2.5 h-9";

  return (
    <div className={cn(
      "rounded-md border transition-colors",
      isRated && "border-ocean-300/50 bg-ocean-50/20",
      isNotObserved && "border-ink-300 bg-ink-100/40",
      !isRated && !isNotObserved && "border-ink-200 bg-white",
    )}>
      <div className="flex items-start gap-3 p-3">
        <div className={cn(
          "w-6 h-6 rounded font-mono text-2xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5",
          isRated ? "bg-ocean-100 text-ocean-800" : "bg-ink-100 text-ink-500",
        )}>
          {number}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-ink-700 leading-relaxed">{text}</p>

          {/* Rating row */}
          <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
            {[1, 2, 3, 4, 5].map((rating) => {
              const isSelected = indicator.rating === rating && !indicator.notObserved;
              return (
                <button
                  key={rating}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange({ rating: rating as IndicatorRating, notObserved: false })}
                  className={cn(
                    "rounded-md font-mono font-semibold transition-all border",
                    btnSize,
                    isSelected
                      ? "bg-ocean-600 text-white border-ocean-600 shadow-sm scale-105"
                      : "bg-white text-ink-700 border-ink-200 hover:border-ocean-400 hover:bg-ocean-50/30",
                    disabled && "opacity-60 cursor-not-allowed",
                  )}
                  title={RATING_LABELS[rating]}
                >
                  {rating}
                </button>
              );
            })}
            <div className="w-px h-8 bg-ink-200 mx-1.5" />
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange({ notObserved: !indicator.notObserved, rating: indicator.notObserved ? indicator.rating : undefined })}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md text-2xs font-medium transition-all border",
                noBtnPadding,
                isNotObserved
                  ? "bg-ink-300 text-navy-700 border-ink-400"
                  : "bg-white text-ink-500 border-ink-200 hover:border-ink-300 hover:bg-ink-100/40",
                disabled && "opacity-60 cursor-not-allowed",
              )}
            >
              <EyeOff size={11} />
              Not observed
            </button>
          </div>
          {isRated && (
            <div className="mt-1.5 text-2xs text-ink-500">
              {RATING_LABELS[indicator.rating!]}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- SaveBadge ----------
export function SaveBadge({ lastSaved }: { lastSaved: Date | null }) {
  if (!lastSaved) {
    return (
      <Badge tone="neutral">
        <Save size={11} /> Auto-save on
      </Badge>
    );
  }
  return (
    <Badge tone="green">
      <CheckCircle2 size={11} /> Saved {formatTime(lastSaved)}
    </Badge>
  );
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
