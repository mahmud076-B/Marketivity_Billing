import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function NativeSelect({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "flex h-10 w-full rounded-[10px] border border-input bg-background/60 px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
