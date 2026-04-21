import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Users, Wallet, TrendingDown, FileWarning, Building2, MapPin, Landmark } from "lucide-react";

import { KpiCard } from "@/components/common/KpiCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabase";
import { compactInr, initials, maskPan } from "@/lib/format";
import { useAuth } from "@/lib/auth-store";
import type { Customer } from "@/lib/database.types";

type ClientRow = Customer & {
  bank_count: number;
  property_count: number;
};

async function fetchOverview() {
  const { data: customers, error } = await supabase
    .from("customers")
    .select("*")
    .order("full_name");
  if (error) throw error;
  const ids = (customers ?? []).map((c) => c.id);
  if (ids.length === 0) return [] as ClientRow[];
  const [accounts, props] = await Promise.all([
    supabase.from("bank_accounts").select("customer_id, bank_id").in("customer_id", ids),
    supabase.from("properties").select("customer_id").in("customer_id", ids),
  ]);
  const bankMap = new Map<string, Set<string>>();
  (accounts.data ?? []).forEach((a: any) => {
    if (!bankMap.has(a.customer_id)) bankMap.set(a.customer_id, new Set());
    bankMap.get(a.customer_id)!.add(a.bank_id);
  });
  const propMap = new Map<string, number>();
  (props.data ?? []).forEach((p: any) => propMap.set(p.customer_id, (propMap.get(p.customer_id) ?? 0) + 1));
  return (customers ?? []).map((c) => ({
    ...(c as Customer),
    bank_count: bankMap.get(c.id)?.size ?? 0,
    property_count: propMap.get(c.id) ?? 0,
  })) as ClientRow[];
}

const itrTone = (s: string) =>
  s === "filed" ? "bg-success/15 text-success border-success/30"
    : s === "pending" ? "bg-warning/15 text-warning border-warning/30"
    : "bg-destructive/15 text-destructive border-destructive/30";

export default function EmployeeOverview() {
  const { profile } = useAuth();
  const { data, isLoading, error } = useQuery({ queryKey: ["overview"], queryFn: fetchOverview });

  const totalAssets = (data ?? []).reduce((s, c) => s + Number(c.total_assets ?? 0), 0);
  const totalLiab = (data ?? []).reduce((s, c) => s + Number(c.total_liabilities ?? 0), 0);
  const overdueItrs = (data ?? []).filter((c) => c.itr_status !== "filed").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back, {profile?.full_name?.split(" ")[0] ?? "—"}.
        </h1>
        <p className="text-sm text-muted-foreground">
          {data?.length ?? 0} client{(data?.length ?? 0) === 1 ? "" : "s"} assigned to you.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard icon={Users} label="Active Clients" value={String(data?.length ?? 0)} />
        <KpiCard icon={Wallet} label="Total AUM" value={compactInr(totalAssets)} tone="success" />
        <KpiCard icon={TrendingDown} label="Total Liabilities" value={compactInr(totalLiab)} tone="warning" />
        <KpiCard icon={FileWarning} label="ITR Issues" value={String(overdueItrs)} tone={overdueItrs ? "destructive" : "success"} />
      </div>

      <div>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-lg font-semibold">Clients</h2>
          <Link to="/employee/banks" className="text-xs text-primary hover:underline">
            View bank relationships →
          </Link>
        </div>

        {error && (
          <Card className="border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            Failed to load clients. Make sure you've connected Supabase and run the SQL setup.
          </Card>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-56 w-full rounded-lg" />
            ))}
          </div>
        ) : (data?.length ?? 0) === 0 ? (
          <EmptyState
            icon={Users}
            title="No clients assigned"
            description="Once clients are assigned to you, they'll appear here."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data!.map((c) => {
              const net = Number(c.total_assets) - Number(c.total_liabilities);
              return (
                <Link key={c.id} to={`/employee/client/${c.id}`} className="group">
                  <Card className="h-full overflow-hidden border-border bg-surface-1 transition-all hover:border-primary/40 hover:shadow-elegant">
                    <div className="h-1 bg-gradient-primary opacity-70 group-hover:opacity-100" />
                    <CardContent className="space-y-3 p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-11 w-11 border border-border">
                          <AvatarFallback className="bg-primary/15 text-primary text-sm font-semibold">
                            {initials(c.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{c.full_name}</p>
                          <p className="text-[11px] tabular text-muted-foreground">{maskPan(c.pan)}</p>
                        </div>
                        <Badge variant="outline" className={itrTone(c.itr_status)}>
                          {c.itr_status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 rounded-md bg-surface-2/60 p-2">
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Assets</p>
                          <p className="tabular text-sm font-semibold text-success">{compactInr(c.total_assets)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Liabilities</p>
                          <p className="tabular text-sm font-semibold text-warning">{compactInr(c.total_liabilities)}</p>
                        </div>
                        <div className="col-span-2 border-t border-border pt-2">
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Net worth</p>
                          <p className={`tabular text-sm font-semibold ${net >= 0 ? "text-foreground" : "text-destructive"}`}>
                            {compactInr(net)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Landmark className="h-3 w-3" /> {c.bank_count} banks
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="h-3 w-3" /> {c.property_count} properties
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> IN
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
