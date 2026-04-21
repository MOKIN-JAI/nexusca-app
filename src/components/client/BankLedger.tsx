import { useQuery } from "@tanstack/react-query";
import { Landmark, CreditCard, PiggyBank, FileDown, Wallet, BadgeIndianRupee } from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/common/EmptyState";
import { supabase } from "@/lib/supabase";
import { compactInr, inr } from "@/lib/format";
import { useState } from "react";
import { toast } from "sonner";

interface Props { customerId: string }

async function fetchLedger(customerId: string) {
  const [{ data: accounts, error: e1 }, { data: banks, error: e2 }] = await Promise.all([
    supabase.from("bank_accounts").select("*").eq("customer_id", customerId),
    supabase.from("banks").select("*"),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  const acctIds = (accounts ?? []).map((a: any) => a.id);
  const { data: products } = acctIds.length
    ? await supabase.from("bank_products").select("*").in("account_id", acctIds)
    : { data: [] as any[] };

  const bankMap = new Map((banks ?? []).map((b: any) => [b.id, b]));
  const grouped = new Map<string, { bank: any; accounts: any[] }>();
  for (const a of accounts ?? []) {
    const key = a.bank_id;
    if (!grouped.has(key)) grouped.set(key, { bank: bankMap.get(key), accounts: [] });
    grouped.get(key)!.accounts.push({
      ...a,
      products: (products ?? []).filter((p: any) => p.account_id === a.id),
    });
  }
  return Array.from(grouped.values());
}

export function BankLedger({ customerId }: Props) {
  const { data, isLoading } = useQuery({ queryKey: ["ledger", customerId], queryFn: () => fetchLedger(customerId) });
  const [fy, setFy] = useState("2024-25");

  if (isLoading) return <Skeleton className="h-72 rounded-lg" />;
  if (!data || data.length === 0)
    return <EmptyState icon={Landmark} title="No bank accounts" description="Add a bank account to get started." />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-2">
        <span className="text-xs text-muted-foreground">Statement FY</span>
        <Select value={fy} onValueChange={setFy}>
          <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["2024-25", "2023-24", "2022-23", "2021-22"].map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Accordion type="multiple" defaultValue={data.map((g, i) => `b-${i}`)} className="space-y-2">
        {data.map((g, gi) => (
          <Card key={gi} className="border-border bg-surface-1">
            <AccordionItem value={`b-${gi}`} className="border-0">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex flex-1 items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Landmark className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">{g.bank?.name}</p>
                    <p className="text-[11px] text-muted-foreground">{g.accounts.length} account{g.accounts.length === 1 ? "" : "s"}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total</p>
                    <p className="tabular text-sm font-semibold">{compactInr(g.accounts.reduce((s, a) => s + Number(a.balance), 0))}</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 px-4 pb-4">
                {g.accounts.map((a: any) => (
                  <div key={a.id} className="rounded-md border border-border bg-surface-2/50 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium tabular">{a.account_number}</p>
                        <p className="text-[10px] text-muted-foreground">{a.account_type} · {a.branch ?? "—"} · IFSC {a.ifsc ?? "—"}</p>
                      </div>
                      <span className="tabular text-sm font-semibold text-success">{inr(a.balance)}</span>
                    </div>

                    <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                      <ProductGroup
                        title="Cards"
                        icon={CreditCard}
                        items={a.products.filter((p: any) => p.product_type === "card")}
                      />
                      <ProductGroup
                        title="Loans"
                        icon={BadgeIndianRupee}
                        items={a.products.filter((p: any) => p.product_type === "loan")}
                      />
                      <ProductGroup
                        title="FDs"
                        icon={PiggyBank}
                        items={a.products.filter((p: any) => p.product_type === "fd")}
                      />
                    </div>

                    <div className="mt-3 flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[11px]"
                        onClick={() =>
                          toast("Statement download (FY " + fy + ")", {
                            description: "Connect your bank statement source to enable real downloads.",
                          })
                        }
                      >
                        <FileDown className="mr-1 h-3 w-3" /> Download FY {fy} statement
                      </Button>
                    </div>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          </Card>
        ))}
      </Accordion>
    </div>
  );
}

function ProductGroup({ title, icon: Icon, items }: { title: string; icon: any; items: any[] }) {
  return (
    <Card className="border-border bg-background/40">
      <CardContent className="space-y-1.5 p-2.5">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <Icon className="h-3 w-3" /> {title}
          </p>
          <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">{items.length}</Badge>
        </div>
        {items.length === 0 ? (
          <p className="text-[11px] text-muted-foreground/70">—</p>
        ) : (
          <ul className="space-y-1">
            {items.map((p) => (
              <li key={p.id} className="rounded-sm bg-surface-2/40 px-2 py-1 text-[11px]">
                <p className="truncate font-medium">{p.name}</p>
                <p className="tabular text-muted-foreground">
                  {compactInr(p.amount)} {p.interest_rate ? `· ${p.interest_rate}%` : ""}
                  {p.maturity_date ? ` · matures ${p.maturity_date}` : ""}
                  {p.emi ? ` · EMI ${compactInr(p.emi)}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export { Wallet };
