import { Check, FileText, Images, ScanSearch, ShieldCheck } from "lucide-react";
import { cn } from "../lib";

export const claimSteps = [
  { label: "Subject", icon: ScanSearch },
  { label: "Evidence", icon: Images },
  { label: "Narrative", icon: FileText },
  { label: "Review", icon: ShieldCheck },
];

export function ClaimStepper({
  current,
  onChange,
}: {
  current: number;
  onChange: (step: number) => void;
}) {
  return (
    <div className="mb-6 grid grid-cols-4 rounded-2xl border border-white/[0.08] bg-[#091422]/80 p-1.5">
      {claimSteps.map(({ label, icon: Icon }, index) => {
        const complete = index < current;
        const active = index === current;
        return (
          <button
            type="button"
            key={label}
            aria-label={`Go to ${label} step`}
            onClick={() => onChange(index)}
            className={cn(
              "relative flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl px-1 py-2.5 text-[9px] font-semibold transition sm:flex-row sm:gap-2 sm:px-2 sm:py-3 sm:text-sm",
              active && "bg-white/[0.07] text-white shadow-inner",
              complete && "text-cyan",
              !active && !complete && "text-slate-600 hover:text-slate-400",
            )}
          >
            <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-lg", active && "bg-cyan text-ink", complete && "bg-cyan/10")}>
              {complete ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
            </span>
            <span>{label}</span>
            {index < claimSteps.length - 1 && <span className="absolute -right-1 top-1/2 h-px w-2 bg-white/10 sm:hidden" />}
          </button>
        );
      })}
    </div>
  );
}
