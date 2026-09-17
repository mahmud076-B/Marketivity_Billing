import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Copy, Download, Printer, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { InvoicePaper } from "@/components/documents/invoice-paper";
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
import { Input } from "@/components/ui/input";
import { formatLongDate } from "@/lib/dates";
import { formatTaka } from "@/lib/money";
import { downloadInvoicePdf } from "@/lib/pdf/invoice-pdf";
import { invoiceWhatsappMessage, whatsappHref } from "@/lib/share";
import { duplicateInvoice, getInvoice, voidInvoice } from "@/lib/server/invoices";
import { voidPayment } from "@/lib/server/payments";
import { getSettings } from "@/lib/server/settings";
import { PAYMENT_METHODS } from "@/lib/types";

export const Route = createFileRoute("/_app/invoices/$invoiceId/")({ component: InvoiceDetail });

function InvoiceDetail() {
  const { invoiceId } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [payOpen, setPayOpen] = useState(false);
  const [voidPaymentId, setVoidPaymentId] = useState<string | null>(null);
  const [voidPaymentReason, setVoidPaymentReason] = useState("");
  const [isVoidingPayment, setIsVoidingPayment] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: () => getInvoice({ data: invoiceId }),
  });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => getSettings() });

  if (isLoading || !data || !settings) {
    return <div className="h-64 animate-pulse rounded-2xl bg-muted" />;
  }

  const { invoice, payments, audit } = data;
  const client = invoice.client;

  function pdf() {
    downloadInvoicePdf({
      invoice,
      client,
      items: invoice.items ?? [],
      settings: settings!,
    });
  }

  const message = invoiceWhatsappMessage(invoice, client);

  async function handleVoidPayment() {
    if (!voidPaymentId) return;
    try {
      setIsVoidingPayment(true);
      await voidPayment({
        data: {
          paymentId: voidPaymentId,
          reason: voidPaymentReason.trim() || "Voided from invoice detail",
        },
      });
      toast.success("Payment voided and invoice balance restored");
      setVoidPaymentId(null);
      setVoidPaymentReason("");
      qc.invalidateQueries();
    } catch (err: any) {
      toast.error(err?.message || "Failed to void payment");
    } finally {
      setIsVoidingPayment(false);
    }
  }

  return (
    <div className="print:m-0 print:p-0">
      <div className="print:hidden">
        <PageHeader
        title={invoice.invoiceNumber}
        description={`${client?.businessName || client?.name || "Client"} · ${formatLongDate(invoice.issueDate)} ${invoice.issueTime}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={invoice.status} />
            {invoice.status !== "void" && invoice.status !== "paid" && (
              <Button variant="brand" onClick={() => setPayOpen(true)}>
                Record payment
              </Button>
            )}
            <Button variant="outline" onClick={() => nav({ to: "/invoices/$invoiceId/edit", params: { invoiceId } })}>
              Edit
            </Button>
          </div>
        }
      />
      </div>

      <div className="mb-6 flex flex-wrap gap-2 print:hidden">
        <Button variant="outline" onClick={pdf}>
          <Download /> Download PDF
        </Button>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer /> Print
        </Button>
        <Button
          variant="outline"
          onClick={async () => {
            await navigator.clipboard.writeText(message);
            toast.success("WhatsApp message copied");
          }}
        >
          Copy message
        </Button>
        <Button asChild variant="outline">
          <a href={whatsappHref(client?.phone || "", message)} target="_blank" rel="noreferrer">
            <Share2 /> WhatsApp
          </a>
        </Button>
        <Button
          variant="outline"
          onClick={async () => {
            const dup = await duplicateInvoice({ data: invoiceId });
            toast.success("Invoice duplicated");
            qc.invalidateQueries();
            nav({ to: "/invoices/$invoiceId/edit", params: { invoiceId: dup.id } });
          }}
        >
          <Copy /> Duplicate
        </Button>
        {invoice.status !== "void" && (
          <Button
            variant="ghost"
            onClick={async () => {
              if (!confirm("Void this invoice? The number will not be reused.")) return;
              await voidInvoice({ data: invoiceId });
              toast.success("Invoice voided");
              qc.invalidateQueries();
            }}
          >
            Void
          </Button>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="print:block print:w-full">
          <InvoicePaper invoice={invoice} client={client} settings={settings} />
        </div>
        <div className="print:hidden space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display font-semibold">Balance</h2>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Total</dt>
                <dd className="tabular">{formatTaka(invoice.total)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Paid</dt>
                <dd className="tabular">{formatTaka(invoice.paidAmount)}</dd>
              </div>
              <div className="flex justify-between font-semibold">
                <dt>Due</dt>
                <dd className="tabular">{formatTaka(invoice.dueAmount)}</dd>
              </div>
            </dl>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display font-semibold">Payments</h2>
            <ul className="mt-3 space-y-3 text-sm">
              {payments.length === 0 && <li className="text-muted-foreground">No payments yet.</li>}
              {payments.map((p) => (
                <li key={p.id} className="rounded-xl border border-border/60 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      className="text-left hover:text-brand"
                      onClick={() => nav({ to: "/receipts/$receiptId", params: { receiptId: p.id } })}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{p.receiptNumber}</span>
                        {p.status === "void" ? (
                          <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-destructive uppercase">
                            VOID
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-emerald-600 dark:text-emerald-400 uppercase">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <span className="block text-xs text-muted-foreground">
                        {PAYMENT_METHODS.find((m) => m.id === p.method)?.label} · {formatLongDate(p.paymentDate)}
                      </span>
                    </button>
                    <div className="text-right">
                      <span className={`tabular font-medium ${p.status === "void" ? "line-through text-muted-foreground" : ""}`}>
                        {formatTaka(p.amount)}
                      </span>
                      {p.status === "active" && (
                        <div className="mt-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => {
                              setVoidPaymentId(p.id);
                              setVoidPaymentReason("");
                            }}
                          >
                            Void
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  {p.status === "void" && p.voidReason && (
                    <div className="mt-1.5 text-[11px] text-destructive/80">
                      Reason: {p.voidReason}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display font-semibold">Activity</h2>
            <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
              {audit.map((a) => (
                <li key={a.id}>
                  <span className="text-foreground">{a.action.replaceAll(".", " ")}</span>
                  {a.details ? ` · ${a.details}` : ""}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <RecordPaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        invoice={{
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          clientName: client?.name || "",
          total: invoice.total,
          paidAmount: invoice.paidAmount,
          dueAmount: invoice.dueAmount,
          status: invoice.status,
        }}
        onDone={() => qc.invalidateQueries()}
      />

      <AlertDialog open={!!voidPaymentId} onOpenChange={(v) => !v && setVoidPaymentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void this payment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reverse the payment, mark the receipt as VOID, and restore the due amount on this invoice. The transaction will be preserved for audit history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-2">
            <label className="text-xs font-medium text-muted-foreground">Reason for voiding</label>
            <Input
              className="mt-1"
              placeholder="e.g. Client bounce, duplicate entry, erroneous amount"
              value={voidPaymentReason}
              onChange={(e) => setVoidPaymentReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isVoidingPayment}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isVoidingPayment}
              onClick={handleVoidPayment}
            >
              {isVoidingPayment ? "Voiding..." : "Void payment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
