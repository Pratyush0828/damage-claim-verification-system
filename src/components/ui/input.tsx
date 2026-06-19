import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "../../lib";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-12 w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan/50 focus:ring-2 focus:ring-cyan/10",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-32 w-full resize-y rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-600 focus:border-cyan/50 focus:ring-2 focus:ring-cyan/10",
        className,
      )}
      {...props}
    />
  );
}

