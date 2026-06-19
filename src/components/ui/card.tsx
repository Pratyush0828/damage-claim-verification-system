import type { HTMLAttributes } from "react";
import { cn } from "../../lib";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("glass rounded-[22px]", className)} {...props} />;
}
