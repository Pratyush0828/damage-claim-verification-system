import { AlertTriangle, CheckCircle2, ShieldX } from "lucide-react";
import type { Decision } from "../types";
import { Badge } from "./ui/badge";

export function DecisionBadge({ decision }: { decision: Decision | null }) {
  if (!decision) return <Badge className="bg-slate-500/15 text-slate-300">Processing</Badge>;
  const config = {
    Valid: { icon: CheckCircle2, className: "bg-cyan/10 text-cyan border border-cyan/20" },
    Suspicious: { icon: AlertTriangle, className: "bg-amber-400/10 text-amber-300 border border-amber-400/20" },
    Fraudulent: { icon: ShieldX, className: "bg-red-400/10 text-red-300 border border-red-400/20" },
  }[decision];
  const Icon = config.icon;
  return (
    <Badge className={config.className}>
      <Icon className="mr-1.5 h-3.5 w-3.5" />
      {decision}
    </Badge>
  );
}

