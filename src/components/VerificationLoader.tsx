import { BrainCircuit, Check, FileSearch, History, Images, ScanLine, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "../lib";
import type { ObjectType } from "../types";

const stages = [
  { label: "Inspecting damage images", detail: "Checking object alignment, damage visibility, and quality", icon: Images },
  { label: "Reading claim narrative", detail: "Extracting incident details and consistency signals", icon: FileSearch },
  { label: "Reviewing claim history", detail: "Looking for unusual frequency and duplicate patterns", icon: History },
  { label: "Calculating final risk", detail: "Combining evidence into an explainable verdict", icon: BrainCircuit },
];

export function VerificationLoader({ objectType }: { objectType: ObjectType }) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const interval = window.setInterval(() => setActive((value) => Math.min(value + 1, stages.length - 1)), 1500);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="verification-loader fixed inset-0 z-[100] flex items-center justify-center bg-[#030812]/92 p-5 backdrop-blur-xl">
      <div className="verification-orb absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan/[0.06] blur-3xl" />
      <div className="relative w-full max-w-lg overflow-hidden rounded-[28px] border border-cyan/15 bg-[#091523]/95 p-6 shadow-[0_35px_100px_rgba(0,0,0,.55)] sm:p-8">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan/70 to-transparent" />
        <div className="mb-7 flex items-center gap-4">
          <div className="verification-scanner relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-cyan/20 bg-cyan/[0.06] text-cyan">
            <ShieldCheck className="h-7 w-7" />
            <div className="scan-beam absolute inset-x-1 h-px bg-cyan shadow-[0_0_12px_2px_rgba(77,225,193,.85)]" />
          </div>
          <div>
            <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-cyan"><ScanLine className="h-3.5 w-3.5" /> Verification in progress</div>
            <h2 className="text-xl font-extrabold capitalize sm:text-2xl">Analyzing your {objectType} claim</h2>
            <p className="mt-1 text-xs text-slate-500">Please keep this window open. This usually takes a few seconds.</p>
          </div>
        </div>

        <div className="mb-7 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div className="verification-progress h-full rounded-full bg-gradient-to-r from-blue via-cyan to-blue" />
        </div>

        <div className="space-y-3">
          {stages.map(({ label, detail, icon: Icon }, index) => {
            const complete = index < active;
            const current = index === active;
            return (
              <div key={label} className={cn("flex items-center gap-3 rounded-2xl border p-3.5 transition duration-500", current ? "border-cyan/20 bg-cyan/[0.055]" : "border-transparent", index > active && "opacity-35")}>
                <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl border transition", complete ? "border-cyan/20 bg-cyan/10 text-cyan" : current ? "border-blue/25 bg-blue/10 text-blue" : "border-white/10 text-slate-600")}>
                  {complete ? <Check className="h-4 w-4" /> : <Icon className={cn("h-4 w-4", current && "verification-icon")} />}
                </div>
                <div className="min-w-0">
                  <div className={cn("text-sm font-bold", current ? "text-white" : complete ? "text-slate-300" : "text-slate-500")}>{label}</div>
                  <div className="mt-0.5 text-[11px] leading-4 text-slate-600">{detail}</div>
                </div>
                {current && <span className="ml-auto flex gap-1"><i /><i /><i /></span>}
              </div>
            );
          })}
        </div>
        <p className="mt-6 text-center text-[10px] font-semibold uppercase tracking-[.15em] text-slate-600">Secure multimodal analysis · Do not refresh</p>
      </div>
    </div>
  );
}
