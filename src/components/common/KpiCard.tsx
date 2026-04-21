import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "success" | "warning" | "destructive" | "info";
  className?: string;
}

const toneRing: Record<NonNullable<Props["tone"]>, string> = {
  default: "text-primary bg-primary/10",
  success: "text-success bg-success/10",
  warning: "text-warning bg-warning/15",
  destructive: "text-destructive bg-destructive/10",
  info: "text-info bg-info/10",
};

export function KpiCard({ icon: Icon, label, value, hint, tone = "default", className }: Props) {
  return (
    <Card className={cn("flex items-center gap-4 p-4 bg-surface-1 border-border shadow-card", className)}>
      <div className={cn("flex h-11 w-11 items-center justify-center rounded-lg", toneRing[tone])}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="tabular text-xl font-semibold leading-tight text-foreground">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </Card>
  );
}
