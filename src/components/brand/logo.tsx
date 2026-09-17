import { cn } from "@/lib/utils";

export const MARKETIVITY_LOGO = "/Marketivity_Exact_Logo_Web_Assets/Marketivity_logo_exact.svg";

export function Mark({ className }: { className?: string }) {
  return (
    <img 
      src={MARKETIVITY_LOGO} 
      alt="Marketivity Logo" 
      className={cn("h-8 w-auto object-contain", className)} 
    />
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  // The exact logo SVG already contains the wordmark and styling,
  // so we just render the same asset but perhaps larger or with its natural aspect ratio.
  return (
    <img 
      src={MARKETIVITY_LOGO} 
      alt="Marketivity Digital Growth Partners" 
      className={cn("h-8 w-auto object-contain", compact ? "max-w-[120px]" : "max-w-[160px]")} 
    />
  );
}
