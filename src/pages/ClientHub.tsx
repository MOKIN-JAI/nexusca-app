import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  LineChart, Line, CartesianGrid, Legend,
} from "recharts";
import {
  ArrowLeft, FileBadge, Landmark, Building2, Receipt, FileText, User, ShieldAlert, CheckCircle2,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { compactInr, initials, maskPan } from "@/lib/format";
import { useAuth } from "@/lib/auth-store";

import { KycVault } from "@/components/client/KycVault";
import { BankLedger } from "@/components/client/BankLedger";
import { PropertyCanvas } from "@/components/client/PropertyCanvas";
import { DebtorsList } from "@/components/client/DebtorsList";
import { TaxArchive } from "@/components/client/TaxArchive";
import { ProfileTab } from "@/components/client/ProfileTab";
import type { Customer, ItrRecord } from "@/lib/database.types";

async function fetchHub(customerId: string) {
  const [{ data: c }, { data: itrs }] = await Promise.all([
    supabase.from("customers").select("*").eq("id", customerId).maybeSingle(),
    supabase.from("itr_records").select("*").eq("customer_id", customerId).order("assessment_year"),
  ]);
  return { customer: c as Customer | null, itrs: (itrs ?? []) as ItrRecord[] };
}

const STATUS_COLORS = { filed: "hsl(var(--success))", pending: "hsl(var(--warning))", overdue: "hsl(var(--destructive))" } as const;

export default function ClientHub() {
  const { id: routeId } = useParams<{ id: string }>();
  const { profile, role } = useAuth();
  const isEmployee = role === "employee" || role === "admin";

  // Customer mode: resolve their own customer record by user_id.
  const { data: ownCustomerId } = useQuery({
    queryKey: ["own-customer", profile?.id],
    enabled: !routeId && !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase.from("customers").select("id").eq("user_id", profile!.id).maybeSingle();
      return (data as { id: string } | null)?.id ?? null;
    },
  });

  const customerId = routeId ?? ownCustomerId ?? "";

  const { data, isLoading } = useQuery({
    queryKey: ["hub", customerId],
    enabled: !!customerId,
    queryFn: () => fetchHub(customerId),
  });

  const itrPie = useMemo(() => {
    const c: Record<string, number> = { filed: 0, pending: 0, overdue: 0 };
    (data?.itrs ?? []).forEach((i) => (c[i.status] = (c[i.status] ?? 0) + 1));
    return Object.entries(c).map(([name, value]) => ({ name, value }));
  }, [data]);

  const pnl = useMemo(
    () => (data?.itrs ?? []).map((i) => ({
      year: i.assessment_year,
      income: Number(i.total_income),
      tax: Number(i.tax_paid),
    })),
    [data],
  );
  const trend = pnl.map((r) => ({ year: r.year, sales: r.income }));

  if (!customerId) {
    return (
      <div className="rounded-md border border-border bg-surface-1 p-6 text-sm text-muted-foreground">
        No customer record linked to your account.
      </div>
    );
  }
  if (isLoading || !data?.customer) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  const c = data.customer;
  const net = Number(c.total_assets) - Number(c.total_liabilities);
  const itrTone =
    c.itr_status === "filed" ? "border-success/40 bg-success/15 text-success" :
    c.itr_status === "pending" ? "border-warning/40 bg-warning/15 text-warning" :
    "border-destructive/40 bg-destructive/15 text-destructive";

  return (
    <div className="space-y-4">
      {/* Topbar — only when accessed without layout (customer route) */}
      {!isEmployee && (
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">My profile</h1>
          <ThemeToggle />
        </div>
      )}

      {/* Header */}
      <Card className="border-border bg-surface-1">
        <CardContent className="flex flex-wrap items-center gap-4 p-4">
          {isEmployee && (
            <Button asChild variant="ghost" size="icon">
              <Link to="/employee"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
          )}
          <Avatar className="h-14 w-14">
            <AvatarFallback className="bg-primary/15 text-primary text-base font-semibold">
              {initials(c.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold leading-tight">{c.full_name}</p>
            <p className="text-xs text-muted-foreground tabular">PAN {maskPan(c.pan)} · {c.email ?? "—"}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={itrTone}>
              {c.itr_status === "filed"
                ? <CheckCircle2 className="mr-1 h-3 w-3" />
                : <ShieldAlert className="mr-1 h-3 w-3" />}
              ITR {c.itr_status}
            </Badge>
            <Badge variant="outline">Net worth · {compactInr(net)}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Analytics row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-border bg-surface-1">
          <CardHeader className="py-3"><CardTitle className="text-sm">ITR status mix</CardTitle></CardHeader>
          <CardContent className="h-48 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={itrPie} dataKey="value" nameKey="name" innerRadius={36} outerRadius={62} paddingAngle={2}>
                  {itrPie.map((e) => (
                    <Cell key={e.name} fill={STATUS_COLORS[e.name as keyof typeof STATUS_COLORS]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="border-border bg-surface-1">
          <CardHeader className="py-3"><CardTitle className="text-sm">P&L (last 4 years)</CardTitle></CardHeader>
          <CardContent className="h-48 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pnl}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${(v / 1e5).toFixed(0)}L`} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                <Bar dataKey="income" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="tax" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="border-border bg-surface-1">
          <CardHeader className="py-3"><CardTitle className="text-sm">Sales trend</CardTitle></CardHeader>
          <CardContent className="h-48 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${(v / 1e5).toFixed(0)}L`} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                <Line dataKey="sales" type="monotone" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 6 tabs */}
      <Tabs defaultValue="kyc" className="space-y-3">
        <TabsList className="flex w-full flex-wrap justify-start gap-1 bg-surface-2 p-1">
          <TabsTrigger value="kyc" className="gap-1.5"><FileBadge className="h-3.5 w-3.5" /> KYC</TabsTrigger>
          <TabsTrigger value="banks" className="gap-1.5"><Landmark className="h-3.5 w-3.5" /> Bank Ledger</TabsTrigger>
          <TabsTrigger value="properties" className="gap-1.5"><Building2 className="h-3.5 w-3.5" /> Properties</TabsTrigger>
          <TabsTrigger value="debtors" className="gap-1.5"><Receipt className="h-3.5 w-3.5" /> Debtors</TabsTrigger>
          <TabsTrigger value="tax" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Tax Archive</TabsTrigger>
          <TabsTrigger value="profile" className="gap-1.5"><User className="h-3.5 w-3.5" /> Profile</TabsTrigger>
        </TabsList>
        <TabsContent value="kyc"><KycVault customerId={customerId} isEmployee={isEmployee} /></TabsContent>
        <TabsContent value="banks"><BankLedger customerId={customerId} /></TabsContent>
        <TabsContent value="properties"><PropertyCanvas customerId={customerId} /></TabsContent>
        <TabsContent value="debtors"><DebtorsList customerId={customerId} isEmployee={isEmployee} /></TabsContent>
        <TabsContent value="tax"><TaxArchive customerId={customerId} isEmployee={isEmployee} /></TabsContent>
        <TabsContent value="profile"><ProfileTab customerId={customerId} isEmployee={isEmployee} /></TabsContent>
      </Tabs>
    </div>
  );
}
