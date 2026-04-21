import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertTriangle, FileWarning, TrendingDown, CalendarClock, ArrowRightLeft } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { supabase } from "@/lib/supabase";
import { compactInr } from "@/lib/format";
import { differenceInDays, parseISO } from "date-fns";

interface Flag {
  id: string;
  severity: "high" | "medium" | "low";
  customer_id: string;
  customer_name: string;
  category: "Liabilities" | "Cross-firm" | "ITR" | "FD Maturity";
  title: string;
  detail: string;
}

async function fetchFlags(): Promise<Flag[]> {
  const [{ data: customers }, { data: itrs }, { data: debtors }, { data: products }, { data: accounts }] = await Promise.all([
    supabase.from("customers").select("*"),
    supabase.from("itr_records").select("*"),
    supabase.from("sundry_debtors").select("*"),
    supabase.from("bank_products").select("*"),
    supabase.from("bank_accounts").select("id, customer_id"),
  ]);

  const cMap = new Map((customers ?? []).map((c: any) => [c.id, c]));
  const flags: Flag[] = [];

  for (const c of customers ?? []) {
    if (Number(c.total_liabilities) > Number(c.total_assets)) {
      flags.push({
        id: `liab-${c.id}`,
        severity: "high",
        customer_id: c.id,
        customer_name: c.full_name,
        category: "Liabilities",
        title: "Liabilities exceed assets",
        detail: `${compactInr(c.total_liabilities)} owed against ${compactInr(c.total_assets)} in assets.`,
      });
    }

    const filed = (itrs ?? []).filter((i: any) => i.customer_id === c.id && i.status === "filed").length;
    if (filed === 0) {
      flags.push({
        id: `noitr-${c.id}`,
        severity: "high",
        customer_id: c.id,
        customer_name: c.full_name,
        category: "ITR",
        title: "No ITR filed in records",
        detail: "Client has no filed Income Tax Return records on file.",
      });
    } else {
      const overdue = (itrs ?? []).find((i: any) => i.customer_id === c.id && i.status === "overdue");
      if (overdue) {
        flags.push({
          id: `overdueitr-${c.id}-${overdue.assessment_year}`,
          severity: "medium",
          customer_id: c.id,
          customer_name: c.full_name,
          category: "ITR",
          title: `Overdue ITR (AY ${overdue.assessment_year})`,
          detail: `Filing deadline passed. Total income on previous year: ${compactInr(overdue.total_income)}.`,
        });
      }
    }
  }

  // Cross-firm debtor advisory
  for (const d of debtors ?? []) {
    if (d.debtor_customer_id) {
      const fromName = cMap.get(d.customer_id)?.full_name ?? "—";
      const toName = cMap.get(d.debtor_customer_id)?.full_name ?? "—";
      flags.push({
        id: `xfirm-${d.id}`,
        severity: "medium",
        customer_id: d.customer_id,
        customer_name: fromName,
        category: "Cross-firm",
        title: "Cross-firm debtor relationship",
        detail: `${fromName} is owed ${compactInr(d.amount_outstanding)} by ${toName}, who is also a client of the firm.`,
      });
    }
  }

  // FD maturity in next 30 days
  const acctToCustomer = new Map((accounts ?? []).map((a: any) => [a.id, a.customer_id]));
  for (const p of products ?? []) {
    if (p.product_type === "fd" && p.maturity_date) {
      const days = differenceInDays(parseISO(p.maturity_date), new Date());
      if (days >= 0 && days <= 30) {
        const cid = acctToCustomer.get(p.account_id);
        const cn = cid ? cMap.get(cid)?.full_name ?? "—" : "—";
        flags.push({
          id: `fd-${p.id}`,
          severity: days <= 7 ? "high" : "low",
          customer_id: cid ?? "",
          customer_name: cn,
          category: "FD Maturity",
          title: `${p.name} matures in ${days} day${days === 1 ? "" : "s"}`,
          detail: `${compactInr(p.amount)} maturing on ${p.maturity_date}. Plan rollover or payout.`,
        });
      }
    }
  }

  return flags;
}

const sevTone = {
  high: "border-destructive/40 bg-destructive/10 text-destructive",
  medium: "border-warning/40 bg-warning/10 text-warning",
  low: "border-info/40 bg-info/10 text-info",
} as const;

const catIcon = {
  Liabilities: TrendingDown,
  "Cross-firm": ArrowRightLeft,
  ITR: FileWarning,
  "FD Maturity": CalendarClock,
} as const;

export default function EmployeeRisks() {
  const { data, isLoading } = useQuery({ queryKey: ["risk-flags"], queryFn: fetchFlags });

  const grouped = (data ?? []).reduce<Record<Flag["severity"], Flag[]>>(
    (acc, f) => {
      acc[f.severity].push(f);
      return acc;
    },
    { high: [], medium: [], low: [] },
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Risk Flags</h1>
        <p className="text-sm text-muted-foreground">
          Auto-generated alerts across all your clients. Sorted by severity.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      ) : (data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="No flags right now"
          description="When liabilities, missing ITRs, or maturing FDs surface, they'll show up here."
        />
      ) : (
        (["high", "medium", "low"] as const).map((sev) =>
          grouped[sev].length === 0 ? null : (
            <section key={sev} className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`uppercase ${sevTone[sev]}`}>
                  {sev}
                </Badge>
                <span className="text-xs text-muted-foreground">{grouped[sev].length} flag{grouped[sev].length === 1 ? "" : "s"}</span>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {grouped[sev].map((f) => {
                  const Icon = catIcon[f.category];
                  return (
                    <Card key={f.id} className="border-border bg-surface-1">
                      <CardHeader className="space-y-1 pb-2">
                        <div className="flex items-start justify-between gap-3">
                          <CardTitle className="flex items-center gap-2 text-sm">
                            <Icon className="h-4 w-4 text-primary" />
                            {f.title}
                          </CardTitle>
                          <Badge variant="outline" className="text-[10px]">{f.category}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <p className="text-xs text-muted-foreground">{f.detail}</p>
                        {f.customer_id && (
                          <Link
                            to={`/employee/client/${f.customer_id}`}
                            className="inline-flex text-xs font-medium text-primary hover:underline"
                          >
                            Open {f.customer_name} →
                          </Link>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          ),
        )
      )}
    </div>
  );
}
