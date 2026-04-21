import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRightLeft, Receipt, AlertCircle, Calendar } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { EmptyState } from "@/components/common/EmptyState";
import { supabase } from "@/lib/supabase";
import { compactInr, inr } from "@/lib/format";
import { differenceInDays, format, parseISO } from "date-fns";
import type { SundryDebtor } from "@/lib/database.types";

interface Props { customerId: string; isEmployee: boolean }

type DebtorRow = SundryDebtor & { debtor_customer_name?: string };

async function fetchDebtors(customerId: string, isEmployee: boolean): Promise<DebtorRow[]> {
  const { data, error } = await supabase
    .from("sundry_debtors")
    .select("*")
    .eq("customer_id", customerId)
    .order("amount_outstanding", { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as SundryDebtor[];
  if (!isEmployee) {
    // Strip the cross-firm link from customer-side view, even if RLS exposed it.
    return rows.map((r) => ({ ...r, debtor_customer_id: null }));
  }
  const linkedIds = rows.map((r) => r.debtor_customer_id).filter(Boolean) as string[];
  if (linkedIds.length === 0) return rows;
  const { data: linkedC } = await supabase
    .from("customers")
    .select("id, full_name")
    .in("id", linkedIds);
  const nameMap = new Map((linkedC ?? []).map((c: any) => [c.id, c.full_name as string]));
  return rows.map((r) => ({ ...r, debtor_customer_name: r.debtor_customer_id ? nameMap.get(r.debtor_customer_id) : undefined }));
}

export function DebtorsList({ customerId, isEmployee }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["debtors", customerId, isEmployee],
    queryFn: () => fetchDebtors(customerId, isEmployee),
  });
  const [open, setOpen] = useState<DebtorRow | null>(null);

  if (isLoading) return <Skeleton className="h-72 rounded-lg" />;
  if (!data || data.length === 0)
    return <EmptyState icon={Receipt} title="No outstanding debtors" description="When invoices age, they'll show here." />;

  const total = data.reduce((s, d) => s + Number(d.amount_outstanding), 0);

  return (
    <>
      <Card className="border-border bg-surface-1">
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-medium">{data.length} debtor{data.length === 1 ? "" : "s"}</p>
            <p className="tabular text-sm font-semibold text-warning">{inr(total)} outstanding</p>
          </div>
          <ul className="divide-y divide-border">
            {data.map((d) => {
              const overdue = d.due_date ? differenceInDays(new Date(), parseISO(d.due_date)) > 0 : false;
              return (
                <li key={d.id}>
                  <button
                    onClick={() => setOpen(d)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Receipt className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{d.debtor_name}</p>
                        {isEmployee && d.debtor_customer_id && (
                          <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary text-[10px]">
                            <ArrowRightLeft className="mr-1 h-2.5 w-2.5" /> Firm client
                          </Badge>
                        )}
                        {overdue && (
                          <Badge variant="outline" className="border-destructive/40 bg-destructive/10 text-destructive text-[10px]">
                            Overdue
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] tabular text-muted-foreground">
                        {d.debtor_pan ?? "—"} · invoiced {d.invoice_date ?? "—"}
                      </p>
                    </div>
                    <p className="tabular text-sm font-semibold">{compactInr(d.amount_outstanding)}</p>
                  </button>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full sm:max-w-md">
          {open && (
            <>
              <SheetHeader>
                <SheetTitle>{open.debtor_name}</SheetTitle>
                <SheetDescription className="tabular">PAN {open.debtor_pan ?? "—"}</SheetDescription>
              </SheetHeader>
              <div className="mt-5 space-y-4">
                <div className="rounded-md border border-border bg-surface-2/50 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Outstanding</p>
                  <p className="tabular text-2xl font-semibold text-warning">{inr(open.amount_outstanding)}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-md border border-border bg-surface-2/30 p-3">
                    <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                      <Calendar className="h-3 w-3" /> Invoiced
                    </p>
                    <p className="tabular">{open.invoice_date ?? "—"}</p>
                  </div>
                  <div className="rounded-md border border-border bg-surface-2/30 p-3">
                    <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                      <Calendar className="h-3 w-3" /> Due
                    </p>
                    <p className="tabular">{open.due_date ?? "—"}</p>
                  </div>
                </div>
                {open.notes && (
                  <div className="rounded-md border border-border bg-surface-2/30 p-3 text-xs">
                    <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Notes</p>
                    {open.notes}
                  </div>
                )}

                {/* Firm intelligence panel — employee only */}
                {isEmployee && open.debtor_customer_id && (
                  <div className="rounded-md border border-primary/40 bg-primary/10 p-3 text-xs">
                    <p className="mb-1 flex items-center gap-1.5 font-medium text-primary">
                      <AlertCircle className="h-3.5 w-3.5" /> Firm Intelligence
                    </p>
                    <p className="text-foreground">
                      This debtor is also a client of the firm:{" "}
                      <strong>{open.debtor_customer_name ?? "—"}</strong>.
                    </p>
                    <Link
                      to={`/employee/client/${open.debtor_customer_id}`}
                      className="mt-2 inline-flex font-medium text-primary hover:underline"
                    >
                      Open their profile →
                    </Link>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Confidential — never share this link with the creditor client.
                    </p>
                  </div>
                )}
                {open.invoice_date && open.due_date && (
                  <p className="text-[11px] text-muted-foreground">
                    Aging:{" "}
                    {differenceInDays(new Date(), parseISO(open.invoice_date))} days from invoice ·{" "}
                    {format(parseISO(open.due_date), "PP")} due date
                  </p>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
