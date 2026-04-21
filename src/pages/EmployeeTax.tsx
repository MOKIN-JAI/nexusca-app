import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

export default function EmployeeTax() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Tax Overview</h1>
      <Card className="border-border bg-surface-1">
        <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
          <Construction className="h-5 w-5 text-primary" />
          Per-client ITR archives are inside each <strong>Client Profile → Tax Archive</strong>. A firm-wide rollup view is coming soon.
        </CardContent>
      </Card>
    </div>
  );
}
