import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, FileText, Upload, ShieldCheck, FileQuestion } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import type { KycDocument, KycStatus } from "@/lib/database.types";
import { cn } from "@/lib/utils";

const DOC_TYPES = [
  "PAN Card", "Aadhaar Card", "Passport", "Driving License", "Voter ID", "Bank Statement",
  "Salary Slip", "Form 16", "GST Certificate", "MSME Certificate", "Address Proof", "Investment Proof",
];

const tone: Record<KycStatus, string> = {
  missing: "border-muted-foreground/30 bg-muted text-muted-foreground",
  uploaded: "border-info/40 bg-info/15 text-info",
  verified: "border-success/40 bg-success/15 text-success",
};

interface Props { customerId: string; isEmployee: boolean; }

export function KycVault({ customerId, isEmployee }: Props) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["kyc", customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kyc_documents")
        .select("*")
        .eq("customer_id", customerId);
      if (error) throw error;
      return (data ?? []) as KycDocument[];
    },
  });

  const byType = new Map((data ?? []).map((d) => [d.doc_type, d]));
  const [openDoc, setOpenDoc] = useState<string | null>(null);

  async function uploadDoc(docType: string, file: File) {
    const path = `${customerId}/${docType.replace(/\s+/g, "_")}-${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("kyc-docs").upload(path, file, { upsert: true });
    if (upErr) {
      toast.error("Upload failed", { description: upErr.message });
      return;
    }
    const { data: signed } = await supabase.storage.from("kyc-docs").createSignedUrl(path, 60 * 60 * 24 * 7);

    const existing = byType.get(docType);
    const payload: any = {
      customer_id: customerId,
      doc_type: docType,
      file_url: signed?.signedUrl ?? path,
      uploaded_at: new Date().toISOString(),
      status: "uploaded" as KycStatus,
    };
    const sb: any = supabase;
    const { error } = existing
      ? await sb.from("kyc_documents").update(payload).eq("id", existing.id)
      : await sb.from("kyc_documents").insert(payload);
    if (error) {
      toast.error("Save failed", { description: error.message });
      return;
    }
    toast.success("Document uploaded");
    qc.invalidateQueries({ queryKey: ["kyc", customerId] });
    setOpenDoc(null);
  }

  async function verify(d: KycDocument) {
    const sb: any = supabase;
    const { error } = await sb
      .from("kyc_documents")
      .update({ status: "verified" as KycStatus, verified_at: new Date().toISOString() })
      .eq("id", d.id);
    if (error) toast.error("Verify failed", { description: error.message });
    else {
      toast.success("Marked verified");
      qc.invalidateQueries({ queryKey: ["kyc", customerId] });
    }
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      {DOC_TYPES.map((dt) => {
        const d = byType.get(dt);
        const status: KycStatus = d?.status ?? "missing";
        return (
          <Card key={dt} className="group border-border bg-surface-1">
            <CardContent className="space-y-3 p-3">
              <div className="flex items-start justify-between">
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-md", tone[status])}>
                  {status === "verified" ? <ShieldCheck className="h-4 w-4" /> :
                   status === "uploaded" ? <FileText className="h-4 w-4" /> :
                   <FileQuestion className="h-4 w-4" />}
                </div>
                <Badge variant="outline" className={cn("text-[10px] capitalize", tone[status])}>{status}</Badge>
              </div>
              <p className="text-sm font-medium leading-tight">{dt}</p>
              <div className="flex flex-wrap gap-1.5">
                <Dialog open={openDoc === dt} onOpenChange={(o) => setOpenDoc(o ? dt : null)}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]">
                      <Upload className="mr-1 h-3 w-3" />
                      {status === "missing" ? "Upload" : "Replace"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Upload {dt}</DialogTitle>
                      <DialogDescription>PDF, JPG or PNG. Max 10 MB.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                      <Label htmlFor={`f-${dt}`}>File</Label>
                      <Input
                        id={`f-${dt}`}
                        type="file"
                        accept="application/pdf,image/*"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) uploadDoc(dt, f);
                        }}
                      />
                    </div>
                  </DialogContent>
                </Dialog>
                {d?.file_url && (
                  <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-[11px]">
                    <a href={d.file_url} target="_blank" rel="noreferrer">View</a>
                  </Button>
                )}
                {isEmployee && d && status === "uploaded" && (
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] text-success" onClick={() => verify(d)}>
                    <CheckCircle2 className="mr-1 h-3 w-3" /> Verify
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
