import { forwardRef } from "react";
import { Scale } from "lucide-react";
import { cn } from "@/lib/utils";

export const Logo = forwardRef<
  HTMLDivElement,
  { className?: string; showWord?: boolean }
>(({ className, showWord = true }, ref) => {
  return (
    <div ref={ref} className={cn("flex items-center gap-2", className)}>
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shadow-elegant">
        <Scale className="h-[18px] w-[18px] text-primary-foreground" strokeWidth={2.4} />
      </div>
      {showWord && (
        <span className="text-lg font-semibold tracking-tight text-foreground">
          Nexus<span className="text-primary">CA</span>
        </span>
      )}
    </div>
  );
});
Logo.displayName = "Logo";
