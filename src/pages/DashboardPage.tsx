import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowRight, Box, Car, FilePlus2, Laptop, Search, ShieldAlert, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { DecisionBadge } from "../components/DecisionBadge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { formatDate } from "../lib";
import { apiError, claimsApi } from "../services/api";
import type { AccuracyMetrics, ClaimListItem, ObjectType } from "../types";

const icons = { car: Car, laptop: Laptop, package: Box };

export function DashboardPage() {
  const [claims, setClaims] = useState<ClaimListItem[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<AccuracyMetrics | null>(null);

  useEffect(() => {
    claimsApi.list().then(setClaims).catch((err) => setError(apiError(err))).finally(() => setLoading(false));
    claimsApi.metrics().then(setMetrics).catch(() => undefined);
  }, []);

  const filtered = claims.filter((claim) => claim.title.toLowerCase().includes(query.toLowerCase()));
  const stats = useMemo(() => ({
    total: claims.length,
    valid: claims.filter((c) => c.decision === "Valid").length,
    review: claims.filter((c) => c.decision === "Suspicious").length,
    highRisk: claims.filter((c) => c.decision === "Fraudulent").length,
  }), [claims]);

  return (
    <div>
      <Card className="relative mb-6 overflow-hidden border-cyan/10 p-5 sm:p-8">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-cyan/10 blur-3xl" />
        <div className="absolute bottom-0 right-12 hidden h-32 w-32 rounded-full border border-blue/15 md:block" />
        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan/20 bg-cyan/[0.06] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.18em] text-cyan"><Sparkles className="h-3 w-3" /> Live intelligence workspace</div>
            <h1 className="max-w-2xl text-3xl font-extrabold tracking-[-.035em] sm:text-5xl">Claims, verified with <span className="bg-gradient-to-r from-cyan to-blue bg-clip-text text-transparent">clarity.</span></h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400 sm:text-base">Turn images, narratives, and claim history into transparent risk decisions your team can trust.</p>
          </div>
          <Button asChild size="lg" className="w-full shrink-0 md:w-auto"><Link to="/claims/new"><FilePlus2 className="h-4 w-4" /> Start verification</Link></Button>
        </div>
      </Card>

      <Card className="mb-6 flex flex-col justify-between gap-5 border-blue/10 p-5 sm:flex-row sm:items-center">
        <div>
          <p className="eyebrow mb-1">Measured performance</p>
          <h2 className="text-lg font-bold">
            {metrics?.accuracy == null ? "Accuracy awaiting reviewed outcomes" : `${metrics.accuracy.toFixed(1)}% measured accuracy`}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {metrics?.message || "Reviewer feedback is required before model accuracy can be measured."}
          </p>
        </div>
        <div className="flex gap-6">
          <div><div className="text-xs text-slate-500">Reviewed</div><div className="mt-1 text-xl font-bold">{metrics?.reviewed_claims ?? 0}</div></div>
          <div><div className="text-xs text-slate-500">Macro F1</div><div className="mt-1 text-xl font-bold">{metrics?.macro_f1 == null ? "—" : `${metrics.macro_f1}%`}</div></div>
        </div>
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: "Total claims", value: stats.total, icon: Activity, color: "text-blue", glow: "bg-blue/10" },
          { label: "Verified valid", value: stats.valid, icon: ShieldCheck, color: "text-cyan", glow: "bg-cyan/10" },
          { label: "Needs review", value: stats.review, icon: TrendingUp, color: "text-amber-300", glow: "bg-amber-300/10" },
          { label: "High risk", value: stats.highRisk, icon: ShieldAlert, color: "text-red-300", glow: "bg-red-300/10" },
        ].map(({ label, value, icon: Icon, color, glow }) => (
          <Card key={label} className="group p-4 transition duration-300 hover:-translate-y-0.5 hover:border-white/20 sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-[.13em] text-slate-500 sm:text-xs">{label}</span>
              <div className={`grid h-8 w-8 place-items-center rounded-lg ${glow}`}><Icon className={`h-4 w-4 ${color}`} /></div>
            </div>
            <div className="text-3xl font-extrabold tracking-tight sm:text-4xl">{value}</div>
            <div className="mt-2 text-[10px] text-slate-600">Across your workspace</div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col justify-between gap-4 border-b border-white/[0.07] p-5 sm:flex-row sm:items-center">
          <div><p className="eyebrow mb-1">Claim stream</p><h2 className="text-lg font-bold">Recent verification activity</h2></div>
          <div className="relative w-full sm:w-72"><Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-600" /><Input className="pl-10" placeholder="Search claims…" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
        </div>
        {error && <div className="m-5 rounded-xl bg-red-400/10 p-4 text-red-300">{error}</div>}
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading claims…</div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-12 text-center sm:py-16">
            <div className="relative mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl border border-cyan/15 bg-cyan/[0.06] text-cyan shadow-[0_0_45px_rgba(77,225,193,.08)]"><FilePlus2 /><span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-cyan ring-4 ring-[#0d1a2d]" /></div>
            <h3 className="text-lg font-bold">Your verification queue is clear</h3>
            <p className="mx-auto mb-6 mt-2 max-w-sm text-sm leading-6 text-slate-500">Upload the first claim package and ClaimLens will analyze its evidence, narrative consistency, and risk signals.</p>
            <Button asChild size="lg"><Link to="/claims/new">Verify first claim <ArrowRight className="h-4 w-4" /></Link></Button>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.07]">
            {filtered.map((claim) => {
              const Icon = icons[claim.object_type as ObjectType];
              return (
                <Link key={claim.id} to={`/claims/${claim.id}`} className="grid items-center gap-4 p-5 transition hover:bg-white/[0.025] sm:grid-cols-[1fr_150px_150px_60px]">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/[0.05] text-slate-300"><Icon className="h-5 w-5" /></div>
                    <div className="min-w-0"><div className="truncate font-semibold">{claim.title}</div><div className="text-xs capitalize text-slate-500">{claim.object_type} · {formatDate(claim.created_at)}</div></div>
                  </div>
                  <DecisionBadge decision={claim.decision} />
                  <div><div className="text-xs text-slate-500">Fraud probability</div><div className="font-semibold">{claim.fraud_probability.toFixed(0)}%</div></div>
                  <ArrowRight className="h-4 w-4 text-slate-600" />
                </Link>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
