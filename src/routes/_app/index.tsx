import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  CircleDollarSign,
  FileText,
  Plus,
  Receipt,
  UserPlus,
  Wallet,
  AlertCircle,
} from "lucide-react";
import { PageHeader } from "@/components/layout/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatLongDate, relativeDate } from "@/lib/dates";
import { formatTaka } from "@/lib/money";
import { getDashboard } from "@/lib/server/analytics";
import type { InvoiceStatus } from "@/lib/types";

export const Route = createFileRoute("/_app/")({ component: Dashboard });

function Dashboard() {
  const nav = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: () => getDashboard() });
  const stats = data?.stats;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Marketivity billing at a glance"
        actions={
          <Button variant="brand" onClick={() => nav({ to: "/invoices/new" })}>
            <Plus /> Create invoice
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {isLoading || !stats ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)
        ) : (
          <>
            <Stat icon={<CircleDollarSign className="size-4" />} label="Total revenue" value={formatTaka(stats.totalRevenue)} hint="All active invoices" />
            <Stat icon={<Wallet className="size-4" />} label="Total paid" value={formatTaka(stats.totalPaid)} hint={`${stats.paidCount} paid invoices`} />
            <Stat icon={<AlertCircle className="size-4" />} label="Total due" value={formatTaka(stats.totalDue)} hint={`${stats.pendingPayments} pending`} />
            <Stat icon={<FileText className="size-4" />} label="Total invoices" value={String(stats.totalInvoices)} hint={`${stats.voidCount} voided`} />
            <Stat
              icon={<CircleDollarSign className="size-4" />}
              label="This month"
              value={formatTaka(stats.monthRevenue)}
              hint={
                stats.prevMonthRevenue
                  ? `Prev month ${formatTaka(stats.prevMonthRevenue)}`
                  : "Current Dhaka month"
              }
            />
            <Stat icon={<Receipt className="size-4" />} label="Pending payments" value={String(stats.pendingPayments)} hint={`${stats.overdueCount} overdue`} />
          </>
        )}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Quick label="Create invoice" icon={<Plus className="size-4" />} onClick={() => nav({ to: "/invoices/new" })} primary />
        <Quick label="Add client" icon={<UserPlus className="size-4" />} onClick={() => nav({ to: "/clients" })} />
        <Quick label="Record payment" icon={<Wallet className="size-4" />} onClick={() => nav({ to: "/payments" })} />
        <Quick label="View transactions" icon={<Receipt className="size-4" />} onClick={() => nav({ to: "/transactions" })} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <h2 className="font-display text-base font-semibold">Recent invoices</h2>
            <ul className="mt-4 space-y-3">
              {(data?.recentInvoices ?? []).length === 0 && (
                <li className="text-sm text-muted-foreground">No invoices yet.</li>
              )}
              {data?.recentInvoices.map((inv) => (
                <li key={inv.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 rounded-xl px-1 py-1 text-left hover:bg-secondary"
                    onClick={() => nav({ to: "/invoices/$invoiceId", params: { invoiceId: inv.id } })}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{inv.invoiceNumber}</div>
                      <div className="text-xs text-muted-foreground">
                        {inv.clientName} · {relativeDate(inv.issueDate)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm tabular">{formatTaka(inv.total)}</span>
                      <StatusBadge status={inv.status as InvoiceStatus} />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <h2 className="font-display text-base font-semibold">Recent payments</h2>
            <ul className="mt-4 space-y-3">
              {(data?.recentPayments ?? []).length === 0 && (
                <li className="text-sm text-muted-foreground">No payments yet.</li>
              )}
              {data?.recentPayments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">{p.clientName}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.receiptNumber} · {formatLongDate(p.paymentDate)}
                    </div>
                  </div>
                  <div className="text-sm tabular">{formatTaka(p.amount)}</div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card className="transition-transform duration-150 hover:-translate-y-0.5">
      <CardContent className="p-5">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
          <span className="text-brand">{icon}</span>
        </div>
        <div className="mt-2 font-display text-2xl font-semibold tabular tracking-tight">{value}</div>
        <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
      </CardContent>
    </Card>
  );
}

function Quick({
  label,
  icon,
  onClick,
  primary,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        primary
          ? "flex h-12 items-center justify-center gap-2 rounded-2xl bg-brand text-sm font-semibold text-brand-foreground"
          : "flex h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-card text-sm font-medium hover:bg-secondary"
      }
    >
      {icon}
      {label}
    </button>
  );
}
