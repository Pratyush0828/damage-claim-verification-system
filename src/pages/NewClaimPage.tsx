import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowLeft, ArrowRight, Box, Car, Check, CheckCircle2, CircleHelp, FileText,
  Laptop, Lightbulb, MessageSquare, Save, Send, ShieldCheck, Sparkles, X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { ClaimStepper } from "../components/ClaimStepper";
import { CompletionRing } from "../components/CompletionRing";
import { EvidenceUploadCard, type UploadEvidence } from "../components/EvidenceUploadCard";
import { VerificationLoader } from "../components/VerificationLoader";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input, Textarea } from "../components/ui/input";
import { cn } from "../lib";
import { apiError, claimsApi, evidenceApi } from "../services/api";
import type { EvidenceRequirement, ObjectType } from "../types";

const DRAFT_KEY = "claimlens_claim_draft_v2";
const types = [
  { value: "car" as const, label: "Car", icon: Car },
  { value: "laptop" as const, label: "Laptop", icon: Laptop },
  { value: "package" as const, label: "Package", icon: Box },
];
const tips: Record<ObjectType, string[]> = {
  car: ["Photograph in daylight when possible.", "Keep the full vehicle edge visible.", "Use the close-up to show depth and scale."],
  laptop: ["Keep the serial number sharp and readable.", "Avoid screen reflections and glare.", "Show both the full device and damaged component."],
  package: ["Make the tracking label readable.", "Capture all crushed, torn, or wet areas.", "Keep the entire outer package in one frame."],
};

function SubjectIllustration({ type }: { type: ObjectType }) {
  const line = { fill: "none", stroke: "url(#subjectLine)", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <div key={type} className="subject-illustration pointer-events-none h-52 w-80 text-cyan opacity-[0.2]" aria-hidden="true">
      <svg viewBox="0 0 320 210" className="h-full w-full">
        <defs>
          <linearGradient id="subjectLine"><stop stopColor="#4de1c1" /><stop offset="1" stopColor="#6aa7ff" /></linearGradient>
          <radialGradient id="subjectGlow"><stop stopColor="#4de1c1" stopOpacity=".22" /><stop offset="1" stopColor="#4de1c1" stopOpacity="0" /></radialGradient>
        </defs>
        <circle cx="178" cy="106" r="96" fill="url(#subjectGlow)" />
        <g>
          {type === "car" && <>
            <path {...line} d="M39 137c5-17 12-32 23-37l37-10 28-38h74c19 0 31 13 43 35l27 8c12 4 19 14 20 28l1 14h-28M88 137H67c-17 0-27-8-28-21l-1-8 23-8M137 137h70" />
            <path {...line} d="M104 89l30-28h61c13 0 22 9 31 27l-122 1ZM159 61v28M112 95h93M67 109h19M245 104h25" />
            <circle {...line} cx="112" cy="137" r="24" /><circle {...line} cx="112" cy="137" r="10" />
            <circle {...line} cx="232" cy="137" r="24" /><circle {...line} cx="232" cy="137" r="10" />
          </>}
          {type === "laptop" && <>
            <rect {...line} x="72" y="30" width="177" height="119" rx="9" /><rect {...line} x="84" y="42" width="153" height="95" rx="3" />
            <path {...line} d="M53 159h215l22 20c3 3 1 8-4 8H35c-5 0-7-5-4-8l22-20ZM53 159h215M128 173h65l7 8h-79l7-8Z" />
            <path {...line} d="m169 58-18 25 18 12-26 27" opacity=".65" />
          </>}
          {type === "package" && <>
            <path {...line} d="m160 25 91 45v88l-91 47-91-47V70l91-45Zm-91 45 91 46 91-46M160 116v89m-47-157 92 46v37l-22 11V105L91 59" />
            <rect {...line} x="91" y="99" width="48" height="31" rx="3" /><path {...line} d="M99 109h31M99 116h22M99 123h27" opacity=".7" />
          </>}
        </g>
        <g className="inspection-points" fill="currentColor">
          <circle cx="68" cy="82" r="3" /><circle cx="262" cy="105" r="3" /><circle cx="181" cy="177" r="3" />
        </g>
      </svg>
    </div>
  );
}

async function inspectImage(file: File): Promise<UploadEvidence["quality"]> {
  try {
    const bitmap = await createImageBitmap(file);
    if (bitmap.width < 800 || bitmap.height < 600) {
      bitmap.close();
      return { status: "Low resolution", detail: `${bitmap.width}×${bitmap.height} · use at least 800×600`, score: 42 };
    }
    const canvas = document.createElement("canvas");
    canvas.width = 96; canvas.height = 72;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Canvas unavailable");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let brightness = 0; let edges = 0; let previous = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const light = pixels[i] * .299 + pixels[i + 1] * .587 + pixels[i + 2] * .114;
      brightness += light;
      if (i > 0) edges += Math.abs(light - previous);
      previous = light;
    }
    brightness /= pixels.length / 4;
    edges /= pixels.length / 4;
    if (brightness < 52) return { status: "Too dark", detail: "Increase lighting and avoid heavy shadows.", score: 48 };
    if (edges < 9) return { status: "Blurry", detail: "Hold the camera steady and refocus.", score: 54 };
    return { status: "Clear", detail: `${Math.round(file.size / 1024)} KB · suitable for analysis`, score: 92 };
  } catch {
    return { status: "Clear", detail: `${Math.round(file.size / 1024)} KB · ready for analysis`, score: 80 };
  }
}

export function NewClaimPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [objectType, setObjectType] = useState<ObjectType>("car");
  const [requirements, setRequirements] = useState<Record<ObjectType, EvidenceRequirement[]> | null>(null);
  const [uploads, setUploads] = useState<Record<string, UploadEvidence>>({});
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [incidentDate, setIncidentDate] = useState("");
  const [messages, setMessages] = useState<{ role: "user"; content: string }[]>([]);
  const [draftMessage, setDraftMessage] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    evidenceApi.all().then(setRequirements).catch((err) => setError(apiError(err)));
    const stored = localStorage.getItem(DRAFT_KEY);
    if (stored) {
      try {
        const draft = JSON.parse(stored);
        setObjectType(draft.objectType || "car"); setTitle(draft.title || "");
        setDescription(draft.description || ""); setIncidentDate(draft.incidentDate || "");
        setMessages(draft.messages || []); setStep(draft.step || 0);
        setHasSavedDraft(true);
        setNotice("Your saved draft was restored. Images need to be reattached for security.");
      } catch { localStorage.removeItem(DRAFT_KEY); }
    }
  }, []);

  const currentRequirements = requirements?.[objectType] || [];
  const uploadedCount = Object.keys(uploads).length;
  const completion = useMemo(() => {
    const total = 3 + currentRequirements.length;
    const done = Number(title.trim().length >= 3) + Number(Boolean(incidentDate)) + Number(description.trim().length >= 40) + uploadedCount;
    return Math.round((done / Math.max(total, 1)) * 100);
  }, [title, incidentDate, description, uploadedCount, currentRequirements.length]);

  const saveDraft = () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ objectType, title, description, incidentDate, messages, step }));
    setHasSavedDraft(true);
    setNotice("Draft saved on this device. Uploaded images are not stored in browser drafts.");
  };
  const clearSavedDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setHasSavedDraft(false);
    setNotice("Saved draft removed. Your current form remains open.");
  };
  const changeType = (next: ObjectType) => {
    Object.values(uploads).forEach((item) => URL.revokeObjectURL(item.preview));
    setUploads({}); setObjectType(next); setNotice("");
  };
  const addUpload = async (key: string, file: File) => {
    const previous = uploads[key]; if (previous) URL.revokeObjectURL(previous.preview);
    const quality = await inspectImage(file);
    setUploads((current) => ({ ...current, [key]: { file, preview: URL.createObjectURL(file), quality } }));
  };
  const removeUpload = (key: string) => {
    if (uploads[key]) URL.revokeObjectURL(uploads[key].preview);
    setUploads((current) => { const next = { ...current }; delete next[key]; return next; });
  };
  const addMessage = () => {
    if (!draftMessage.trim()) return;
    setMessages([...messages, { role: "user", content: draftMessage.trim() }]); setDraftMessage("");
  };
  const validateStep = (target: number) => {
    setError("");
    if (target > 0 && title.trim().length < 3) return setError("Add a short claim title before continuing."), false;
    if (target > 1 && uploadedCount === 0) return setError("Upload at least one evidence image before continuing."), false;
    if (target > 2 && description.trim().length < 10) return setError("Add a factual incident narrative before review."), false;
    return true;
  };
  const goTo = (target: number) => { if (target <= step || validateStep(target)) setStep(target); };
  const next = () => { if (step < 3 && validateStep(step + 1)) { setStep(step + 1); window.scrollTo({ top: 0, behavior: "smooth" }); } };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (step < 3) return next();
    if (!validateStep(3)) return;
    setLoading(true); setError("");
    const form = new FormData();
    form.append("title", title); form.append("object_type", objectType); form.append("description", description);
    if (incidentDate) form.append("incident_date", incidentDate);
    form.append("conversation", JSON.stringify(messages));
    const entries = Object.entries(uploads);
    form.append("evidence_types", JSON.stringify(entries.map(([key]) => key)));
    entries.forEach(([, item]) => form.append("files", item.file));
    try {
      const claim = await claimsApi.create(form);
      localStorage.removeItem(DRAFT_KEY);
      navigate(`/claims/${claim.id}`);
    } catch (err) { setError(apiError(err)); } finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit} className="pb-24 xl:pb-0">
      {loading && <VerificationLoader objectType={objectType} />}
      <Link to="/" className="mb-5 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to dashboard</Link>
      <Card className="relative mb-6 min-h-52 overflow-hidden border-cyan/10 p-5 sm:p-7">
        <div className="absolute -bottom-8 -right-10 sm:right-5"><SubjectIllustration type={objectType} /></div>
        <div className="relative z-[1] max-w-[660px]">
          <p className="eyebrow mb-2">New verification · {objectType}</p>
          <h1 className="max-w-md text-3xl font-extrabold tracking-tight">Build an evidence package</h1>
          <p className="mt-2 max-w-lg text-sm leading-6 text-slate-400">A guided, four-step submission with live evidence quality checks.</p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.14em] text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan shadow-[0_0_10px_#4de1c1]" /> {objectType} evidence profile active
          </div>
        </div>
      </Card>

      <ClaimStepper current={step} onChange={goTo} />
      {notice && <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-blue/15 bg-blue/[0.06] p-4 text-sm text-blue"><Sparkles className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1">{notice}</span>{hasSavedDraft && <button type="button" onClick={clearSavedDraft} className="text-xs font-bold text-slate-400 hover:text-white">Clear saved draft</button>}<button type="button" onClick={() => setNotice("")}><X className="h-4 w-4" /></button></div>}

      <div className="grid gap-6 xl:grid-cols-[1fr_370px]">
        <div className="min-w-0">
          {step === 0 && (
            <Card className="section-enter p-5 sm:p-7">
              <p className="eyebrow mb-2">Step 01</p><h2 className="mb-6 text-xl font-bold">What was damaged?</h2>
              <div className="mb-7 grid grid-cols-3 gap-2 sm:gap-3">
                {types.map(({ value, label, icon: Icon }) => (
                  <button type="button" key={value} onClick={() => changeType(value)} aria-pressed={objectType === value} className={cn("rounded-2xl border p-3 text-left transition duration-300 sm:p-5", objectType === value ? "border-cyan/50 bg-cyan/[0.09] shadow-[0_0_24px_rgba(77,225,193,.05)]" : "border-white/10 bg-white/[0.02] hover:border-white/20")}>
                    <Icon className={cn("mb-4 h-5 w-5", objectType === value ? "text-cyan" : "text-slate-500")} /><span className="block text-sm font-bold">{label}</span><span className="mt-1 hidden text-xs text-slate-600 sm:block">Select {label.toLowerCase()} profile</span>
                  </button>
                ))}
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2"><label className="label">Claim title</label><Input placeholder="e.g. Rear bumper damaged in parking lot" value={title} onChange={(e) => setTitle(e.target.value)} minLength={3} /></div>
                <div><label className="label">Incident date</label><Input type="date" value={incidentDate} onChange={(e) => setIncidentDate(e.target.value)} /></div>
              </div>
            </Card>
          )}

          {step === 1 && (
            <Card className="section-enter p-5 sm:p-7">
              <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div><p className="eyebrow mb-2">Step 02</p><h2 className="text-xl font-bold">Upload damage evidence</h2><p className="mt-1 text-sm text-slate-500">We check image dimensions, lighting, and sharpness before submission.</p></div>
                <Badge className="w-fit bg-cyan/10 text-cyan">{uploadedCount}/{currentRequirements.length} ready</Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {currentRequirements.map((item) => <EvidenceUploadCard key={item.key} requirement={item} upload={uploads[item.key]} onSelect={(file) => addUpload(item.key, file)} onRemove={() => removeUpload(item.key)} />)}
              </div>
            </Card>
          )}

          {step === 2 && (
            <div className="section-enter space-y-5">
              <Card className="p-5 sm:p-7">
                <p className="eyebrow mb-2">Step 03</p><h2 className="mb-2 text-xl font-bold">Tell us what happened</h2><p className="mb-5 text-sm text-slate-500">A chronological, factual account produces the strongest consistency score.</p>
                <label className="label">Incident narrative</label>
                <Textarea className="min-h-52" placeholder="Include where and when it happened, how the damage occurred, who was present, and what you observed immediately afterward." value={description} onChange={(e) => setDescription(e.target.value)} minLength={10} />
                <div className="mt-2 flex justify-between text-xs"><span className={description.length >= 40 ? "text-cyan" : "text-slate-600"}>{description.length >= 40 ? "Good level of detail" : "Aim for at least 40 characters"}</span><span className="text-slate-600">{description.length} characters</span></div>
              </Card>
              <Card className="p-5 sm:p-7">
                <div className="mb-5 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-blue/10 text-blue"><MessageSquare className="h-4 w-4" /></div><div><h3 className="font-bold">Claim conversation</h3><p className="text-xs text-slate-500">Optional follow-up statements from the claimant</p></div></div>
                <div className="mb-4 min-h-28 space-y-3 rounded-xl border border-white/[0.07] bg-[#091422] p-3">
                  {messages.length === 0 && <div className="flex h-24 items-center justify-center text-center text-xs leading-5 text-slate-600">Add clarifying statements to strengthen consistency analysis.</div>}
                  {messages.map((message, index) => <div key={index} className="ml-auto max-w-[90%] rounded-xl rounded-br-sm bg-blue/10 p-3 text-sm text-slate-300">{message.content}<button type="button" className="float-right ml-3 text-slate-600 hover:text-white" onClick={() => setMessages(messages.filter((_, i) => i !== index))}><X className="h-3.5 w-3.5" /></button></div>)}
                </div>
                <div className="flex gap-2"><Input placeholder="Add claimant statement…" value={draftMessage} onChange={(e) => setDraftMessage(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addMessage(); } }} /><Button type="button" size="icon" onClick={addMessage}><Send className="h-4 w-4" /></Button></div>
              </Card>
            </div>
          )}

          {step === 3 && (
            <div className="section-enter space-y-5">
              <Card className="p-5 sm:p-7">
                <div className="mb-6 flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-cyan/10 text-cyan"><ShieldCheck className="h-5 w-5" /></div><div><p className="eyebrow mb-1">Step 04</p><h2 className="text-xl font-bold">Review and verify</h2></div></div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <ReviewItem label="Object type" value={objectType} /><ReviewItem label="Incident date" value={incidentDate || "Not provided"} />
                  <ReviewItem label="Claim title" value={title || "Missing"} wide /><ReviewItem label="Narrative" value={description || "Missing"} wide />
                </div>
              </Card>
              <Card className="p-5 sm:p-7">
                <div className="mb-5 flex items-center justify-between"><h3 className="font-bold">Evidence summary</h3><span className="text-xs text-slate-500">{uploadedCount} images</span></div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {currentRequirements.map((item) => uploads[item.key] ? (
                    <div key={item.key} className="overflow-hidden rounded-xl border border-white/10"><img src={uploads[item.key].preview} alt={item.label} className="aspect-[4/3] w-full object-cover" /><div className="p-3"><div className="truncate text-xs font-bold">{item.label}</div><div className="mt-1 text-[10px] text-cyan">{uploads[item.key].quality.status}</div></div></div>
                  ) : <div key={item.key} className="grid min-h-32 place-items-center rounded-xl border border-dashed border-amber-300/20 bg-amber-300/[0.03] p-3 text-center text-xs text-amber-200">{item.label}<br />Missing</div>)}
                </div>
              </Card>
            </div>
          )}

          {error && <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">{error}</div>}
          <div className="mt-6 hidden items-center justify-between gap-3 xl:flex">
            <Button type="button" variant="secondary" onClick={saveDraft}><Save className="h-4 w-4" /> Save draft</Button>
            <div className="flex gap-3">{step > 0 && <Button type="button" variant="ghost" onClick={() => setStep(step - 1)}>Back</Button>}<Button type="submit" size="lg" disabled={loading}>{step === 3 ? (loading ? "Analyzing…" : "Run verification") : "Continue"} <ArrowRight className="h-4 w-4" /></Button></div>
          </div>
        </div>

        <aside className="space-y-5">
          <Card className="p-5 xl:sticky xl:top-8">
            <div className="mb-5 flex items-center gap-4"><CompletionRing value={completion} /><div><p className="eyebrow mb-1">Package health</p><h3 className="font-bold">{completion === 100 ? "Ready to verify" : "Keep building"}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{uploadedCount} of {currentRequirements.length} required images attached</p></div></div>
            <div className="space-y-3 border-t border-white/[0.07] pt-5">
              <ChecklistItem done={title.trim().length >= 3} label="Claim subject added" />
              <ChecklistItem done={Boolean(incidentDate)} label="Incident date added" />
              <ChecklistItem done={uploadedCount === currentRequirements.length} label="Minimum evidence complete" />
              <ChecklistItem done={description.trim().length >= 40} label="Detailed narrative added" />
            </div>
            <div className="my-5 border-t border-white/[0.07]" />
            <div className="mb-3 flex items-center gap-2"><Lightbulb className="h-4 w-4 text-amber-300" /><h4 className="text-sm font-bold capitalize">{objectType} photo tips</h4></div>
            <div className="space-y-2.5">{tips[objectType].map((tip) => <div key={tip} className="flex gap-2.5 text-xs leading-5 text-slate-500"><CircleHelp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue" />{tip}</div>)}</div>
          </Card>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#07101d]/95 p-3 backdrop-blur-xl xl:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <Button type="button" variant="secondary" size="icon" onClick={saveDraft} aria-label="Save draft"><Save className="h-4 w-4" /></Button>
          {step > 0 && <Button type="button" variant="ghost" className="px-3" onClick={() => setStep(step - 1)}>Back</Button>}
          <Button type="submit" className="flex-1" disabled={loading}>{step === 3 ? (loading ? "Analyzing…" : "Run verification") : "Continue"} <ArrowRight className="h-4 w-4" /></Button>
        </div>
      </div>
    </form>
  );
}

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return <div className="flex items-center gap-3 text-sm"><span className={cn("grid h-5 w-5 place-items-center rounded-full border", done ? "border-cyan/30 bg-cyan/10 text-cyan" : "border-white/10 text-slate-700")}>{done && <Check className="h-3 w-3" />}</span><span className={done ? "text-slate-300" : "text-slate-600"}>{label}</span></div>;
}

function ReviewItem({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return <div className={cn("rounded-xl border border-white/[0.07] bg-white/[0.02] p-4", wide && "sm:col-span-2")}><div className="label">{label}</div><div className="text-sm leading-6 capitalize text-slate-300">{value}</div></div>;
}
