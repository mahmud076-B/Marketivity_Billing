import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Copy, Download, MoreHorizontal, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/layout/app-shell";
import { RecordPaymentDialog } from "@/components/payments/record-payment-dialog";
import { StatusBadge } from "@/components/status-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { formatLongDate } from "@/lib/dates";
import { formatTaka } from "@/lib/money";
import { downloadInvoicePdf } from "@/lib/pdf/invoice-pdf";
import { downloadCsvString } from "@/lib/share";
import { listClients } from "@/lib/server/clients";
import { exportInvoicesCsv } from "@/lib/server/export";
import { deleteInvoice, duplicateInvoice, getInvoice, listInvoices, voidInvoice } from "@/lib/server/invoices";
import { getSettings } from "@/lib/server/settings";
import type { InvoiceListRow, InvoiceStatus } from "@/lib/types";

export const Route = createFileRoute("/_app/invoices/")({ component: InvoicesPage });

const FILTERS: { id: "all" | InvoiceStatus; label: string }[] = [
  { id: "all", label: "All" },
  { id: "paid", label: "Paid" },
  { id: "partially_paid", label: "Partial" },
  { id: "unpaid", label: "Unpaid" },
  { id: "overdue", label: "Overdue" },
  { id: "void", label: "Void" },
];

function InvoicesPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [status, setStatus] = useState<"all" | InvoiceStatus>("all");
  const [q, setQ] = useState("");
  const [clientId, setClientId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [payFor, setPayFor] = useState<InvoiceListRow | null>(null);
  const [voidId, setVoidId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: clients } = useQuery({ queryKey: ["clients"], queryFn: () => listClients() });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => getSettings() });
  const { data = [], isLoading } = useQuery({
    queryKey: ["invoices", status, q, clientId, from, to],
    queryFn: () => listInvoices({ data: { status, q, clientId: clientId || undefined, from: from || undefined, to: to || undefined } }),
  });

  const voidMut = useMutation({
    mutationFn: (id: string) => voidInvoice({ data: id }),
    onSuccess: () => {
      toast.success("Invoice voided");
      qc.invalidateQueries();
    },
  });
  const delMut = useMutation({
    mutationFn: (id: string) => deleteInvoice({ data: id }),
    onSuccess: () => {
      toast.success("Invoice deleted");
      qc.invalidateQueries();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete invoice");
    },
  });

  const rows = data;
  const filteredCount = useMemo(() => rows.length, [rows]);

  return (
    <div>
      <PageHeader
        title="Invoices"
        description={`${filteredCount} records`}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                const csvStr = await exportInvoicesCsv({ data: { status, q, clientId: clientId || undefined, from: from || undefined, to: to || undefined } });
                downloadCsvString("marketivity-invoices.csv", csvStr);
              }}
            >
              Export CSV
            </Button>
            <Button variant="brand" onClick={() => nav({ to: "/invoices/new" })}>
              <Plus /> Create invoice
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setStatus(f.id)}
            className={
              status === f.id
                ? "rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground"
                : "rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            }
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="mb-4 grid gap-2 sm:grid-cols-4">
        <div className="relative sm:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search invoice or client" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <NativeSelect value={clientId} onChange={(e) => setClientId(e.target.value)}>
          <option value="">All clients</option>
          {(clients ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.businessName || c.name}
            </option>
          ))}
        </NativeSelect>
        <div className="grid grid-cols-2 gap-2">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Plus className="size-5" />}
          title="No invoices yet"
          description="Create your first invoice and start managing your Marketivity billing."
          actionLabel="Create invoice"
          onAction={() => nav({ to: "/invoices/new" })}
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[52rem] text-left text-sm">
            <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Invoice</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Paid</th>
                <th className="px-4 py-3 font-medium">Due</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-secondary/40">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="font-medium text-foreground hover:text-brand"
                      onClick={() => nav({ to: "/invoices/$invoiceId", params: { invoiceId: r.id } })}
                    >
                      {r.invoiceNumber}
                    </button>
                    {r.isSample && <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Sample</div>}
                  </td>
                  <td className="px-4 py-3">{r.businessName || r.clientName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatLongDate(r.issueDate)}</td>
                  <td className="px-4 py-3 tabular">{formatTaka(r.total)}</td>
                  <td className="px-4 py-3 tabular">{formatTaka(r.paidAmount)}</td>
                  <td className="px-4 py-3 tabular">{formatTaka(r.dueAmount)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon-sm" variant="ghost">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => nav({ to: "/invoices/$invoiceId", params: { invoiceId: r.id } })}>
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => nav({ to: "/invoices/$invoiceId/edit", params: { invoiceId: r.id } })}
                        >
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={async () => {
                            if (!settings) return;
                            const full = await getInvoice({ data: r.id });
                            downloadInvoicePdf({
                              invoice: full.invoice,
                              client: full.invoice.client,
                              items: full.invoice.items ?? [],
                              settings,
                            });
                          }}
                        >
                          <Download className="size-4" /> Download PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={async () => {
                            const dup = await duplicateInvoice({ data: r.id });
                            toast.success("Invoice duplicated");
                            qc.invalidateQueries();
                            nav({ to: "/invoices/$invoiceId/edit", params: { invoiceId: dup.id } });
                          }}
                        >
                          <Copy className="size-4" /> Duplicate
                        </DropdownMenuItem>
                        {r.status !== "void" && r.status !== "paid" && (
                          <DropdownMenuItem onSelect={() => setPayFor(r)}>Record payment</DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {r.status !== "void" && (
                          <DropdownMenuItem onSelect={() => setVoidId(r.id)}>Void</DropdownMenuItem>
                        )}
                        {r.paidAmount > 0 ? (
                          <DropdownMenuItem
                            className="text-muted-foreground opacity-60 cursor-not-allowed"
                            onSelect={(e) => {
                              e.preventDefault();
                              toast.error("Invoices with payment history cannot be deleted. Please void the invoice instead.");
                            }}
                          >
                            <Trash2 className="size-4" /> Delete (Locked — Has Payments)
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem className="text-destructive" onSelect={() => setDeleteId(r.id)}>
                            <Trash2 className="size-4" /> Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <RecordPaymentDialog
        open={!!payFor}
        onOpenChange={(v) => !v && setPayFor(null)}
        invoice={payFor}
        onDone={() => qc.invalidateQueries()}
      />

      <AlertDialog open={!!voidId} onOpenChange={(v) => !v && setVoidId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void this invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              The invoice stays in history and its number will never be reused.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (voidId) voidMut.mutate(voidId);
                setVoidId(null);
              }}
            >
              Void invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes this invoice. Invoices with recorded payments cannot be deleted and must be voided instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => {
                if (deleteId) delMut.mutate(deleteId);
                setDeleteId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
