import { cn } from "../../lib";

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-white/[0.07]", className)}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-blue to-cyan transition-all duration-700"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

