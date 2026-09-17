import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase",
  {
    variants: {
      variant: {
        default: "bg-secondary text-secondary-foreground",
        paid: "bg-success/15 text-success",
        partial: "bg-warning/15 text-warning",
        unpaid: "bg-muted text-muted-foreground",
        overdue: "bg-destructive/15 text-destructive",
        void: "bg-secondary text-muted-foreground line-through",
        brand: "bg-brand/15 text-brand",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}
