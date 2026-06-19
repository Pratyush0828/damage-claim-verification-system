import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib";

const variants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/60",
  {
    variants: {
      variant: {
        default: "bg-cyan text-ink hover:bg-[#6ce8cd] shadow-[0_10px_30px_rgba(77,225,193,.14)]",
        secondary: "border border-white/10 bg-white/[0.06] text-white hover:bg-white/[0.1]",
        ghost: "text-slate-300 hover:bg-white/[0.06] hover:text-white",
        danger: "bg-red-500/15 text-red-300 hover:bg-red-500/25",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-3",
        lg: "h-13 px-7 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

interface Props extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof variants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild, ...props }: Props) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(variants({ variant, size }), className)} {...props} />;
}

