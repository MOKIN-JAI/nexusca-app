import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Save } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { maskAadhaar, maskPan } from "@/lib/format";
import type { Customer } from "@/lib/database.types";

interface Props { customerId: string; isEmployee: boolean }

export function ProfileTab({ customerId, isEmployee }: Props) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["customer", customerId],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("*").eq("id", customerId).maybeSingle();
      if (error) throw error;
      return data as Customer | null;
    },
  });

  const [reveal, setReveal] = useState(false);
  const [edits, setEdits] = useState<Partial<Customer>>({});

  if (isLoading) return <Skeleton className="h-72 rounded-lg" />;
  if (!data) return <p className="text-sm text-muted-foreground">Profile not found.</p>;

  const merged = { ...data, ...edits };
  const set = (k: keyof Customer, v: any) => setEdits((s) => ({ ...s, [k]: v }));

  async function save() {
    const sb: any = supabase;
    const { error } = await sb.from("customers").update(edits).eq("id", customerId);
    if (error) return toast.error("Save failed", { description: error.message });
    toast.success("Profile updated");
    setEdits({});
    qc.invalidateQueries({ queryKey: ["customer", customerId] });
    qc.invalidateQueries({ queryKey: ["overview"] });
  }

  const F = ({ label, k, type = "text" }: { label: string; k: keyof Customer; type?: string }) => (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type={type}
        value={(merged[k] as any) ?? ""}
        onChange={(e) => set(k, type === "number" ? Number(e.target.value) : e.target.value)}
        readOnly={!isEmployee}
      />
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
      <Card className="border-border bg-surface-1">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Personal & financial details</CardTitle>
          <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => setReveal((r) => !r)}>
            {reveal ? <EyeOff className="mr-1 h-3 w-3" /> : <Eye className="mr-1 h-3 w-3" />}
            {reveal ? "Mask" : "Reveal IDs"}
          </Button>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <F label="Full name" k="full_name" />
          <F label="Email" k="email" type="email" />
          <F label="Phone" k="phone" />
          <F label="Date of birth" k="dob" type="date" />
          <div className="space-y-1.5">
            <Label className="text-xs">PAN</Label>
            <Input value={reveal ? (merged.pan ?? "") : maskPan(merged.pan)} readOnly />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Aadhaar</Label>
            <Input value={reveal ? (merged.aadhaar ?? "") : maskAadhaar(merged.aadhaar)} readOnly />
          </div>
          <div className="col-span-2"><F label="Address" k="address" /></div>
          <F label="Total assets (₹)" k="total_assets" type="number" />
          <F label="Total liabilities (₹)" k="total_liabilities" type="number" />
          <F label="Annual revenue (₹)" k="annual_revenue" type="number" />
          <F label="Annual expenses (₹)" k="annual_expenses" type="number" />

          {isEmployee && Object.keys(edits).length > 0 && (
            <div className="col-span-2 flex justify-end">
              <Button size="sm" onClick={save}><Save className="mr-1 h-4 w-4" /> Save changes</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border bg-surface-1">
        <CardHeader><CardTitle className="text-sm">Activity</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>ITR status</span>
            <Badge variant="outline" className="capitalize">{merged.itr_status}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Created</span>
            <span className="tabular">{merged.created_at?.slice(0, 10)}</span>
          </div>
          {!isEmployee && (
            <p className="rounded-md border border-border bg-surface-2/40 p-2 text-[11px]">
              Read-only view. Contact your CA to update personal details.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
