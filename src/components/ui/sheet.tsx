import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

export function SheetContent({
  className,
  side = "left",
  children,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & { side?: "left" | "right" }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm" />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-50 flex h-full w-[min(20rem,88vw)] flex-col bg-sidebar text-sidebar-foreground shadow-2xl outline-none",
          side === "left" ? "left-0 top-0 border-r border-border" : "right-0 top-0 border-l border-border",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground hover:bg-secondary">
          <X className="size-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
