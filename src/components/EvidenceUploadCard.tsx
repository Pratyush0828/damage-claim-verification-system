import { Camera, CheckCircle2, RefreshCw, Trash2, TriangleAlert, UploadCloud } from "lucide-react";
import { cn } from "../lib";
import type { EvidenceRequirement } from "../types";

export interface UploadEvidence {
  file: File;
  preview: string;
  quality: {
    status: "Clear" | "Too dark" | "Blurry" | "Low resolution";
    detail: string;
    score: number;
  };
}

export function EvidenceUploadCard({
  requirement,
  upload,
  onSelect,
  onRemove,
}: {
  requirement: EvidenceRequirement;
  upload?: UploadEvidence;
  onSelect: (file: File) => void;
  onRemove: () => void;
}) {
  const good = upload?.quality.status === "Clear";
  return (
    <div className={cn("group relative overflow-hidden rounded-2xl border transition duration-300", upload ? "border-cyan/25 bg-[#091827]" : "border-dashed border-white/15 bg-white/[0.018] hover:border-cyan/35")}>
      {upload ? (
        <>
          <div className="relative aspect-[4/3] overflow-hidden bg-black/20">
            <img src={upload.preview} alt={requirement.label} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#07111f] via-transparent to-transparent" />
            <div className={cn("absolute left-3 top-3 flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md", good ? "border-cyan/25 bg-cyan/15 text-cyan" : "border-amber-300/25 bg-amber-300/15 text-amber-200")}>
              {good ? <CheckCircle2 className="h-3 w-3" /> : <TriangleAlert className="h-3 w-3" />}
              {upload.quality.status}
            </div>
            <button type="button" onClick={onRemove} aria-label={`Remove ${requirement.label}`} className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-black/45 text-slate-300 backdrop-blur hover:bg-red-400/20 hover:text-red-200">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="p-4">
            <div className="mb-1 truncate text-sm font-bold">{requirement.label}</div>
            <p className="mb-3 text-xs leading-5 text-slate-500">{upload.quality.detail}</p>
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-cyan hover:text-white">
              <RefreshCw className="h-3.5 w-3.5" /> Replace image
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && onSelect(e.target.files[0])} />
            </label>
          </div>
        </>
      ) : (
        <label className="flex min-h-64 cursor-pointer flex-col items-center justify-center p-5 text-center">
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && onSelect(e.target.files[0])} />
          <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-400 transition group-hover:border-cyan/20 group-hover:bg-cyan/[0.06] group-hover:text-cyan">
            <UploadCloud className="h-5 w-5" />
          </div>
          <div className="text-sm font-bold">{requirement.label}</div>
          <p className="mt-2 max-w-[220px] text-xs leading-5 text-slate-500">{requirement.description}</p>
          <span className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-slate-600"><Camera className="h-3 w-3" /> JPG, PNG or WebP</span>
        </label>
      )}
    </div>
  );
}

