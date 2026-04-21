import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Users, ChevronRight, UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/common/EmptyState";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-store";
import { compactInr, initials, maskPan } from "@/lib/format";
import type { Customer } from "@/lib/database.types";

export default function EmployeeClients() {
  const qc = useQueryClient();
  const user = useAuth((s) => s.user);

  const { data, isLoading } = useQuery({
    queryKey: ["all-clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("*").order("full_name");
      if (error) throw error;
      return (data ?? []) as Customer[];
    },
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", pan: "" });

  const invite = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not signed in");
      if (!form.full_name.trim()) throw new Error("Full name is required");
      if (!form.pan.trim()) throw new Error("PAN is required");
      const sb: any = supabase;
      const { error } = await sb.from("customers").insert({
        full_name: form.full_name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        pan: form.pan.trim().toUpperCase(),
        assigned_to: user.id, // RLS requires this for employee insert
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Client added", {
        description: "Demo data has been seeded automatically.",
      });
      setForm({ full_name: "", email: "", phone: "", pan: "" });
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["all-clients"] });
    },
    onError: (e: Error) => toast.error("Could not add client", { description: e.message }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">All Clients</h1>
          <p className="text-sm text-muted-foreground">Every client assigned to you.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-gradient-primary text-primary-foreground">
              <UserPlus className="mr-1.5 h-4 w-4" /> Add client
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Onboard a new client</DialogTitle>
              <DialogDescription>
                Creates a client record assigned to you. Demo bank, property, debtor and ITR data
                are seeded automatically so the dashboards aren't empty.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="cl-name">Full name</Label>
                <Input
                  id="cl-name"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder="Anjali Sharma"
                  maxLength={120}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cl-pan">PAN</Label>
                <Input
                  id="cl-pan"
                  value={form.pan}
                  onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })}
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cl-phone">Phone</Label>
                <Input
                  id="cl-phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+91 …"
                  maxLength={20}
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="cl-email">Email</Label>
                <Input
                  id="cl-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="anjali@example.com"
                  maxLength={255}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => invite.mutate()} disabled={invite.isPending}>
                {invite.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create client
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <Skeleton className="h-72 rounded-lg" />
      ) : (data?.length ?? 0) === 0 ? (
        <EmptyState icon={Users} title="No clients yet" description="Use 'Add client' to onboard your first one." />
      ) : (
        <Card className="border-border bg-surface-1">
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {data!.map((c) => (
                <li key={c.id}>
                  <Link to={`/employee/client/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/15 text-primary text-xs">{initials(c.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{c.full_name}</p>
                      <p className="text-[11px] tabular text-muted-foreground">{maskPan(c.pan)} · {c.email ?? "—"}</p>
                    </div>
                    <Badge variant="outline" className="capitalize">{c.itr_status}</Badge>
                    <span className="hidden tabular text-xs text-muted-foreground sm:inline">{compactInr(c.total_assets)}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
