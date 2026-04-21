import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Landmark, Users, ChevronRight, Wallet } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/common/EmptyState";
import { supabase } from "@/lib/supabase";
import { compactInr, initials, inr } from "@/lib/format";
import { cn } from "@/lib/utils";

interface BankWithClients {
  id: string;
  name: string;
  ifsc_prefix: string | null;
  total_balance: number;
  client_count: number;
  clients: {
    customer_id: string;
    customer_name: string;
    accounts: { id: string; account_number: string; account_type: string; balance: number; branch: string | null }[];
  }[];
}

async function fetchBanks(): Promise<BankWithClients[]> {
  const [{ data: banks, error: e1 }, { data: accounts, error: e2 }, { data: customers, error: e3 }] =
    await Promise.all([
      supabase.from("banks").select("*").order("name"),
      supabase.from("bank_accounts").select("*"),
      supabase.from("customers").select("id, full_name"),
    ]);
  if (e1) throw e1;
  if (e2) throw e2;
  if (e3) throw e3;

  const cName = new Map((customers ?? []).map((c: any) => [c.id, c.full_name as string]));

  return (banks ?? []).map((b: any) => {
    const bankAccts = (accounts ?? []).filter((a: any) => a.bank_id === b.id);
    const grouped = new Map<string, BankWithClients["clients"][number]>();
    let totalBal = 0;
    for (const a of bankAccts) {
      totalBal += Number(a.balance ?? 0);
      if (!grouped.has(a.customer_id)) {
        grouped.set(a.customer_id, {
          customer_id: a.customer_id,
          customer_name: cName.get(a.customer_id) ?? "—",
          accounts: [],
        });
      }
      grouped.get(a.customer_id)!.accounts.push({
        id: a.id,
        account_number: a.account_number,
        account_type: a.account_type,
        balance: Number(a.balance ?? 0),
        branch: a.branch,
      });
    }
    return {
      id: b.id,
      name: b.name,
      ifsc_prefix: b.ifsc_prefix,
      total_balance: totalBal,
      client_count: grouped.size,
      clients: Array.from(grouped.values()),
    };
  });
}

export default function EmployeeBanks() {
  const { data, isLoading } = useQuery({ queryKey: ["banks-relational"], queryFn: fetchBanks });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = data?.find((b) => b.id === selectedId) ?? data?.[0];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Banks</h1>
        <p className="text-sm text-muted-foreground">
          Cross-client view — see every client holding accounts at the same bank.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
          <Skeleton className="h-[520px] rounded-lg" />
          <Skeleton className="h-[520px] rounded-lg" />
        </div>
      ) : (data?.length ?? 0) === 0 ? (
        <EmptyState icon={Landmark} title="No banks yet" description="Banks will appear once clients add accounts." />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
          {/* List */}
          <Card className="overflow-hidden border-border bg-surface-1">
            <CardHeader className="py-3">
              <CardTitle className="text-sm">All Banks · {data!.length}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {data!.map((b) => {
                  const active = (selected?.id ?? "") === b.id;
                  return (
                    <li key={b.id}>
                      <button
                        onClick={() => setSelectedId(b.id)}
                        className={cn(
                          "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2",
                          active && "bg-surface-2",
                        )}
                      >
                        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary", active && "bg-primary/20")}>
                          <Landmark className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{b.name}</p>
                          <p className="text-[11px] text-muted-foreground tabular">
                            {b.client_count} client{b.client_count === 1 ? "" : "s"} · {compactInr(b.total_balance)}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          {/* Detail */}
          <Card className="border-border bg-surface-1">
            {selected ? (
              <>
                <CardHeader className="border-b border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
                        <Landmark className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{selected.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          IFSC prefix: <span className="tabular">{selected.ifsc_prefix ?? "—"}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Combined balance</p>
                      <p className="tabular text-base font-semibold text-success">{inr(selected.total_balance)}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 p-4">
                  {selected.clients.length === 0 ? (
                    <EmptyState icon={Users} title="No clients hold accounts here" />
                  ) : (
                    <>
                      {selected.client_count > 1 && (
                        <div className="rounded-md border border-primary/30 bg-primary/10 p-3 text-xs text-foreground">
                          <span className="font-medium text-primary">Firm intelligence:</span>{" "}
                          {selected.client_count} of your clients bank with {selected.name}. Cross-reference
                          opportunities and consolidated relationship pricing.
                        </div>
                      )}
                      {selected.clients.map((cl) => (
                        <div key={cl.customer_id} className="rounded-md border border-border bg-surface-2/40 p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <Link
                              to={`/employee/client/${cl.customer_id}`}
                              className="flex items-center gap-2 hover:text-primary"
                            >
                              <Avatar className="h-7 w-7">
                                <AvatarFallback className="bg-primary/15 text-primary text-[10px]">
                                  {initials(cl.customer_name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium">{cl.customer_name}</span>
                            </Link>
                            <Badge variant="outline" className="gap-1 text-[10px]">
                              <Wallet className="h-3 w-3" />
                              {cl.accounts.length} account{cl.accounts.length === 1 ? "" : "s"}
                            </Badge>
                          </div>
                          <ul className="space-y-1.5">
                            {cl.accounts.map((a) => (
                              <li key={a.id} className="flex items-center justify-between rounded-sm bg-background/50 px-2 py-1.5 text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="tabular text-muted-foreground">{a.account_number}</span>
                                  <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">{a.account_type}</Badge>
                                  {a.branch && <span className="text-muted-foreground">· {a.branch}</span>}
                                </div>
                                <span className="tabular font-medium">{inr(a.balance)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </>
                  )}
                </CardContent>
              </>
            ) : (
              <CardContent>
                <EmptyState icon={Landmark} title="Select a bank" />
              </CardContent>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
