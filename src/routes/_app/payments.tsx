import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/app-shell";
import { RecordPaymentDialog } from "@/components/payments/record-payment-dialog";
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
import { NativeSelect } from "@/components/ui/select";
import { formatLongDate } from "@/lib/dates";
import { formatTaka } from "@/lib/money";
import { listInvoices } from "@/lib/server/invoices";
import { listPayments, voidPayment } from "@/lib/server/payments";
import { exportPaymentsCsv } from "@/lib/server/export";
import { downloadCsvString } from "@/lib/share";
import { PAYMENT_METHODS } from "@/lib/types";

export const Route = createFileRoute("/_app/payments")({ component: PaymentsPage });

function PaymentsPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data: invoices = [] } = useQuery({ queryKey: ["invoices"], queryFn: () => listInvoices({ data: {} }) });
  const { data: payments = [] } = useQuery({ queryKey: ["payments"], queryFn: () => listPayments({ data: "" }) });
  const openInvoices = useMemo(
    () => invoices.filter((i) => i.status !== "paid" && i.status !== "void"),
    [invoices],
  );
  const [invoiceId, setInvoiceId] = useState("");
  const [open, setOpen] = useState(false);
  const [voidPaymentId, setVoidPaymentId] = useState<string | null>(null);
  const [voidPaymentReason, setVoidPaymentReason] = useState("");
  const [isVoiding, setIsVoiding] = useState(false);
  const selected = invoices.find((i) => i.id === invoiceId) ?? openInvoices[0] ?? null;

  async function handleVoidPayment() {
    if (!voidPaymentId) return;
    try {
      setIsVoiding(true);
      await voidPayment({
        data: {
          paymentId: voidPaymentId,
          reason: voidPaymentReason.trim() || "Voided from payments list",
        },
      });
      toast.success("Payment voided and invoice balance restored");
      setVoidPaymentId(null);
      setVoidPaymentReason("");
      qc.invalidateQueries();
    } catch (err: any) {
      toast.error(err?.message || "Failed to void payment");
    } finally {
      setIsVoiding(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Payments"
        description="Record money in and generate a receipt automatically"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                const csvStr = await exportPaymentsCsv();
                downloadCsvString("marketivity-payments.csv", csvStr);
              }}
            >
              Export CSV
            </Button>
            <NativeSelect
              className="w-56"
              value={selected?.id ?? ""}
              onChange={(e) => setInvoiceId(e.target.value)}
            >
              {openInvoices.length === 0 && <option value="">No open invoices</option>}
              {openInvoices.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.invoiceNumber} · {formatTaka(i.dueAmount)} due
                </option>
              ))}
            </NativeSelect>
            <Button variant="brand" disabled={!selected} onClick={() => setOpen(true)}>
              Record payment
            </Button>
          </div>
        }
      />
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[54rem] text-sm">
          <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Receipt</th>
              <th className="px-4 py-3 text-left font-medium">Invoice</th>
              <th className="px-4 py-3 text-left font-medium">Client</th>
              <th className="px-4 py-3 text-left font-medium">Amount</th>
              <th className="px-4 py-3 text-left font-medium">Method</th>
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <button className="hover:text-brand font-medium" type="button" onClick={() => nav({ to: "/receipts/$receiptId", params: { receiptId: p.id } })}>
                    {p.receiptNumber}
                  </button>
                </td>
                <td className="px-4 py-3">{p.invoiceNumber}</td>
                <td className="px-4 py-3">{p.clientName}</td>
                <td className="px-4 py-3 tabular">
                  <span className={p.status === "void" ? "line-through text-muted-foreground" : "font-medium"}>
                    {formatTaka(p.amount)}
                  </span>
                  {p.status === "void" && p.voidReason && (
                    <span className="block text-[11px] text-destructive/80 font-normal">
                      {p.voidReason}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">{PAYMENT_METHODS.find((m) => m.id === p.method)?.label}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatLongDate(p.paymentDate)} · {p.paymentTime}
                </td>
                <td className="px-4 py-3">
                  {p.status === "void" ? (
                    <span className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-destructive uppercase">
                      VOID
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-emerald-600 dark:text-emerald-400 uppercase">
                      ACTIVE
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {p.status === "active" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => {
                        setVoidPaymentId(p.id);
                        setVoidPaymentReason("");
                      }}
                    >
                      Void
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <RecordPaymentDialog
        open={open}
        onOpenChange={setOpen}
        invoice={selected}
        onDone={(res) => {
          qc.invalidateQueries();
          nav({ to: "/receipts/$receiptId", params: { receiptId: res.paymentId } });
        }}
      />

      <AlertDialog open={!!voidPaymentId} onOpenChange={(v) => !v && setVoidPaymentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void this payment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reverse the payment, mark the receipt as VOID, and restore the due amount on the invoice. The transaction record will be preserved for audit purposes.
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
            <AlertDialogCancel disabled={isVoiding}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isVoiding}
              onClick={handleVoidPayment}
            >
              {isVoiding ? "Voiding..." : "Void payment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
