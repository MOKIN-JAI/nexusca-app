import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, Clock, FileText, Plus, Upload, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/common/EmptyState";
import { supabase } from "@/lib/supabase";
import { compactInr, inr } from "@/lib/format";
import type { ItrRecord, ItrStatus } from "@/lib/database.types";

interface Props { customerId: string; isEmployee: boolean }

const tone: Record<ItrStatus, string> = {
  filed: "border-success/40 bg-success/15 text-success",
  pending: "border-warning/40 bg-warning/15 text-warning",
  overdue: "border-destructive/40 bg-destructive/15 text-destructive",
};

export function TaxArchive({ customerId, isEmployee }: Props) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["itrs", customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itr_records")
        .select("*")
        .eq("customer_id", customerId)
        .order("assessment_year", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ItrRecord[];
    },
  });

  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [form, setForm] = useState({
    assessment_year: "2025-26",
    filed_on: "",
    total_income: "",
    tax_paid: "",
    refund: "",
    status: "filed" as ItrStatus,
    acknowledgment_no: "",
  });

  async function add() {
    const sb: any = supabase;
    const { error } = await sb.from("itr_records").insert({
      customer_id: customerId,
      assessment_year: form.assessment_year,
      filed_on: form.filed_on || null,
      total_income: Number(form.total_income || 0),
      tax_paid: Number(form.tax_paid || 0),
      refund: Number(form.refund || 0),
      status: form.status,
      acknowledgment_no: form.acknowledgment_no || null,
    });
    if (error) {
      toast.error("Could not add ITR", { description: error.message });
      return;
    }
    toast.success("ITR record added");
    qc.invalidateQueries({ queryKey: ["itrs", customerId] });
    setOpen(false);
  }

  async function uploadItrDoc(record: ItrRecord, file: File) {
    setUploading(record.id);
    try {
      const path = `${customerId}/${record.assessment_year}-${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("itr-docs").upload(path, file, { upsert: true });
      if (upErr) {
        toast.error("Upload failed", { description: upErr.message });
        return;
      }
      const { data: signed } = await supabase.storage
        .from("itr-docs")
        .createSignedUrl(path, 60 * 60 * 24 * 7);
      const sb: any = supabase;
      const { error } = await sb
        .from("itr_records")
        .update({ doc_url: signed?.signedUrl ?? path })
        .eq("id", record.id);
      if (error) {
        toast.error("Save failed", { description: error.message });
        return;
      }
      toast.success("ITR document uploaded");
      qc.invalidateQueries({ queryKey: ["itrs", customerId] });
    } finally {
      setUploading(null);
    }
  }

  if (isLoading) return <Skeleton className="h-72 rounded-lg" />;

  return (
    <div className="space-y-4">
      {isEmployee && (
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Add ITR</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add ITR record</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Assessment Year">
                  <Input value={form.assessment_year} onChange={(e) => setForm({ ...form, assessment_year: e.target.value })} placeholder="2025-26" />
                </Field>
                <Field label="Filed on">
                  <Input type="date" value={form.filed_on} onChange={(e) => setForm({ ...form, filed_on: e.target.value })} />
                </Field>
                <Field label="Total income">
                  <Input type="number" value={form.total_income} onChange={(e) => setForm({ ...form, total_income: e.target.value })} />
                </Field>
                <Field label="Tax paid">
                  <Input type="number" value={form.tax_paid} onChange={(e) => setForm({ ...form, tax_paid: e.target.value })} />
                </Field>
                <Field label="Refund">
                  <Input type="number" value={form.refund} onChange={(e) => setForm({ ...form, refund: e.target.value })} />
                </Field>
                <Field label="Status">
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as ItrStatus })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="filed">Filed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Acknowledgment #" className="col-span-2">
                  <Input value={form.acknowledgment_no} onChange={(e) => setForm({ ...form, acknowledgment_no: e.target.value })} />
                </Field>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={add}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {(data?.length ?? 0) === 0 ? (
        <EmptyState icon={FileText} title="No ITR records" description="Filed returns will be archived here for easy retrieval." />
      ) : (
        <div className="relative space-y-4 pl-6">
          <span className="absolute left-2 top-2 bottom-2 w-px bg-border" />
          {data!.map((i) => (
            <Card key={i.id} className="relative border-border bg-surface-1">
              <span className="absolute -left-[18px] top-5 flex h-3 w-3 items-center justify-center rounded-full border-2 border-background bg-primary" />
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">AY {i.assessment_year}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {i.filed_on ? `Filed ${i.filed_on}` : "Not filed"}
                      {i.acknowledgment_no ? ` · ${i.acknowledgment_no}` : ""}
                    </p>
                  </div>
                  <Badge variant="outline" className={tone[i.status]}>
                    {i.status === "filed" ? <CheckCircle2 className="mr-1 h-3 w-3" /> : <Clock className="mr-1 h-3 w-3" />}
                    {i.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 rounded-md bg-surface-2/40 p-2 text-xs">
                  <Stat label="Total income" value={compactInr(i.total_income)} />
                  <Stat label="Tax paid" value={compactInr(i.tax_paid)} />
                  <Stat label="Refund" value={inr(i.refund)} tone="success" />
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {i.doc_url && (
                    <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-[11px]">
                      <a href={i.doc_url} target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-1 h-3 w-3" /> View ITR PDF
                      </a>
                    </Button>
                  )}
                  <label className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md border border-border px-2 text-[11px] hover:bg-surface-2">
                    {uploading === i.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Upload className="h-3 w-3" />
                    )}
                    {i.doc_url ? "Replace PDF" : "Upload PDF"}
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadItrDoc(i, f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={"space-y-1.5 " + (className ?? "")}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "success" }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`tabular font-medium ${tone === "success" ? "text-success" : ""}`}>{value}</p>
    </div>
  );
}
