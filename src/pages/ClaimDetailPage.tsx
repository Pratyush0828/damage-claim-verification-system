import { useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, BrainCircuit, CheckCircle2, Eye, FileWarning, Gauge, History, Image as ImageIcon, MessageSquareQuote, ShieldCheck } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { DecisionBadge } from "../components/DecisionBadge";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { formatDate } from "../lib";
import { apiError, claimsApi } from "../services/api";
import type { Claim, Decision } from "../types";

function Score({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Eye }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-slate-400"><Icon className="h-4 w-4" /> {label}</span>
        <span className="font-semibold">{value.toFixed(0)}</span>
      </div>
      <Progress value={value} />
    </div>
  );
}

export function ClaimDetailPage() {
  const { id } = useParams();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [error, setError] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");
  const [reviewing, setReviewing] = useState(false);
  useEffect(() => { if (id) claimsApi.get(id).then(setClaim).catch((err) => setError(apiError(err))); }, [id]);
  if (error) return <Card className="p-8 text-red-300">{error}</Card>;
  if (!claim) return <div className="p-12 text-center text-slate-500">Loading verification report…</div>;

  const fraudColor = claim.fraud_probability >= 70 ? "text-red-300" : claim.fraud_probability >= 38 ? "text-amber-300" : "text-cyan";
  const reliability = claim.extracted_insights?.model_reliability as {
    score?: number; label?: string; signal_agreement?: number; data_quality?: number; explanation?: string;
  } | undefined;
  const submitReview = async (actual: Decision) => {
    setReviewing(true);
    try {
      const result = await claimsApi.review(claim.id, actual);
      setReviewMessage(result.correct
        ? "Reviewer outcome matches the prediction. Accuracy metrics updated."
        : `Reviewer marked this ${actual}; the prediction was ${result.predicted_decision}. Metrics updated.`);
    } catch (err) {
      setReviewMessage(apiError(err));
    } finally {
      setReviewing(false);
    }
  };
  return (
    <div>
      <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to dashboard</Link>
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div><div className="mb-3 flex items-center gap-3"><DecisionBadge decision={claim.decision} /><span className="text-xs uppercase tracking-[.16em] text-slate-600">{claim.object_type} claim</span></div><h1 className="text-3xl font-bold">{claim.title}</h1><p className="mt-2 text-sm text-slate-500">Submitted {formatDate(claim.created_at)} · ID {claim.id.slice(0, 8).toUpperCase()}</p></div>
        <Badge className="w-fit border border-white/10 bg-white/[0.04] text-slate-300">Model {claim.fraud_report?.model_version || "ensemble-v1"}</Badge>
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <Card className="relative overflow-hidden p-7">
          <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-cyan/[0.07] blur-3xl" />
          <div className="relative grid gap-8 md:grid-cols-[210px_1fr] md:items-center">
            <div className="relative mx-auto grid h-44 w-44 place-items-center rounded-full border-[10px] border-white/[0.05]">
              <div className="text-center"><div className={`text-5xl font-bold ${fraudColor}`}>{claim.fraud_probability.toFixed(0)}%</div><div className="mt-1 text-xs font-semibold uppercase tracking-[.13em] text-slate-500">Fraud risk</div></div>
              <svg className="absolute inset-[-10px] h-44 w-44 -rotate-90" viewBox="0 0 176 176"><circle cx="88" cy="88" r="82" fill="none" stroke="currentColor" strokeWidth="10" strokeDasharray={`${claim.fraud_probability * 5.15} 515`} className={fraudColor} strokeLinecap="round" /></svg>
            </div>
            <div><p className="mb-2 text-xs font-bold uppercase tracking-[.2em] text-cyan">Final assessment</p><h2 className="mb-3 text-2xl font-bold">{claim.decision} claim</h2><p className="leading-7 text-slate-400">{claim.reasoning_summary}</p><div className="mt-5 flex gap-6 text-sm"><div><span className="text-slate-500">Trust score</span><div className="text-lg font-bold">{claim.trust_score.toFixed(0)}%</div></div><div><span className="text-slate-500">Confidence</span><div className="text-lg font-bold">{claim.confidence_score.toFixed(0)}%</div></div></div></div>
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="mb-6 font-bold">Signal composition</h3>
          <div className="space-y-6">
            <Score label="Visual evidence" value={claim.image_score} icon={Eye} />
            <Score label="Text consistency" value={claim.nlp_score} icon={BrainCircuit} />
            <Score label="Claim history" value={claim.history_score} icon={History} />
            <Score label="Evidence complete" value={claim.evidence_score} icon={ShieldCheck} />
          </div>
        </Card>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card className="border-blue/10 p-6">
          <div className="mb-5 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-blue/10 text-blue"><Gauge className="h-5 w-5" /></div><div><p className="eyebrow mb-1">Prediction reliability</p><h3 className="font-bold">{(reliability?.score ?? claim.confidence_score).toFixed(0)}% · {reliability?.label || "Estimated"}</h3></div></div>
          <p className="mb-5 text-sm leading-6 text-slate-400">{reliability?.explanation || "This is estimated prediction reliability, not measured model accuracy."}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/[0.025] p-3"><div className="text-xs text-slate-500">Signal agreement</div><div className="mt-1 font-bold">{reliability?.signal_agreement?.toFixed(0) ?? "—"}%</div></div>
            <div className="rounded-xl bg-white/[0.025] p-3"><div className="text-xs text-slate-500">Data quality</div><div className="mt-1 font-bold">{reliability?.data_quality?.toFixed(0) ?? "—"}%</div></div>
          </div>
        </Card>
        <Card className="p-6">
          <p className="eyebrow mb-1">Human validation</p>
          <h3 className="mb-2 font-bold">What was the confirmed outcome?</h3>
          <p className="mb-5 text-sm leading-6 text-slate-500">Reviewer-confirmed outcomes create real accuracy, precision, recall, and F1 measurements.</p>
          <div className="grid grid-cols-3 gap-2">
            {(["Valid", "Suspicious", "Fraudulent"] as Decision[]).map((decision) => <Button key={decision} type="button" variant="secondary" size="sm" disabled={reviewing} onClick={() => submitReview(decision)}>{decision}</Button>)}
          </div>
          {reviewMessage && <div className="mt-4 rounded-xl border border-cyan/15 bg-cyan/[0.05] p-3 text-xs leading-5 text-cyan">{reviewMessage}</div>}
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card className="p-6">
            <div className="mb-5 flex items-center justify-between"><div><h3 className="font-bold">Uploaded evidence</h3><p className="mt-1 text-sm text-slate-500">{claim.images.length} images analyzed</p></div><ImageIcon className="text-slate-600" /></div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {claim.images.map((image) => (
                <div key={image.id} className="overflow-hidden rounded-xl border border-white/10 bg-[#091422]">
                  <div className="aspect-[4/3] overflow-hidden bg-black/20"><img src={image.url} alt={image.evidence_type} className="h-full w-full object-cover" /></div>
                  <div className="p-4"><div className="mb-2 flex items-center justify-between"><span className="text-sm font-semibold capitalize">{image.evidence_type.replaceAll("_", " ")}</span><Badge className="bg-white/[0.06] text-slate-300">{image.quality_score.toFixed(0)} quality</Badge></div><p className="text-xs capitalize text-slate-500">{image.damage_detected ? `${image.severity} damage detected` : "No confident damage signal"}</p></div>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-6">
            <div className="mb-5 flex items-center gap-3"><MessageSquareQuote className="h-5 w-5 text-blue" /><h3 className="font-bold">Narrative analysis</h3></div>
            <div className="rounded-xl bg-white/[0.025] p-5 text-sm leading-7 text-slate-300">“{claim.description}”</div>
            {claim.extracted_insights?.nlp_analysis?.contradictions?.length > 0 && <div className="mt-4 space-y-2">{claim.extracted_insights.nlp_analysis.contradictions.map((item: string) => <div key={item} className="flex gap-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-4 text-sm text-amber-200"><AlertCircle className="h-4 w-4 shrink-0" />{item}</div>)}</div>}
          </Card>
        </div>
        <div className="space-y-6">
          <Card className="p-6">
            <div className="mb-5 flex items-center gap-3"><FileWarning className="h-5 w-5 text-amber-300" /><h3 className="font-bold">Evidence checklist</h3></div>
            {claim.missing_evidence.length ? <div className="space-y-3">{claim.missing_evidence.map((item) => <div key={item} className="flex items-center gap-3 rounded-xl border border-amber-400/15 bg-amber-400/[0.05] p-3 text-sm"><AlertCircle className="h-4 w-4 text-amber-300" /><span>{item}</span><span className="ml-auto text-xs text-amber-300">Missing</span></div>)}</div> : <div className="flex gap-3 rounded-xl border border-cyan/15 bg-cyan/[0.05] p-4 text-sm text-cyan"><CheckCircle2 className="h-5 w-5" /> All minimum evidence is present.</div>}
          </Card>
          <Card className="p-6">
            <h3 className="mb-5 font-bold">Decision signals</h3>
            <div className="space-y-4">{claim.fraud_report?.signals.map((signal, index) => <div key={`${signal.name}-${index}`} className="border-b border-white/[0.07] pb-4 last:border-0 last:pb-0"><div className="mb-1 flex items-center justify-between"><span className="text-sm font-semibold capitalize">{signal.name.replaceAll("_", " ")}</span><span className={`h-2 w-2 rounded-full ${signal.severity === "high" ? "bg-red-400" : signal.severity === "medium" ? "bg-amber-300" : "bg-cyan"}`} /></div><p className="text-xs leading-5 text-slate-500">{signal.detail}</p></div>)}</div>
          </Card>
        </div>
      </div>
    </div>
  );
}
