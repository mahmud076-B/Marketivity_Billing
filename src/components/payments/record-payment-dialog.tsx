import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { Textarea } from "@/components/ui/input";
import { nowDhaka } from "@/lib/dates";
import { formatTaka, parseMoney } from "@/lib/money";
import { recordPayment } from "@/lib/server/payments";
import { PAYMENT_METHODS, type InvoiceListRow, type PaymentMethod } from "@/lib/types";

export function RecordPaymentDialog({
  open,
  onOpenChange,
  invoice,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  invoice: Pick<InvoiceListRow, "id" | "invoiceNumber" | "clientName" | "total" | "paidAmount" | "dueAmount" | "status"> | null;
  onDone?: (result: { paymentId: string; receiptNumber: string }) => void;
}) {
  const now = nowDhaka();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("bkash");
  const [date, setDate] = useState(now.isoDate);
  const [time, setTime] = useState(now.time);
  const [txn, setTxn] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const due = invoice?.dueAmount ?? 0;

  async function submit(allowOverpay = false) {
    if (!invoice) return;
    const value = parseMoney(amount);
    if (value <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }
    setBusy(true);
    try {
      const res = await recordPayment({
        data: {
          invoiceId: invoice.id,
          amount: value,
          method,
          paymentDate: date,
          paymentTime: time,
          externalTxnId: txn,
          notes,
          allowOverpay,
        },
      });
      if (res.needsOverpayConfirm) {
        const ok = window.confirm(
          `This payment exceeds the remaining due of ${formatTaka(res.previousDue)}. Record as overpayment/credit?`,
        );
        if (ok) await submit(true);
        return;
      }
      toast.success("Payment recorded successfully");
      onOpenChange(false);
      setAmount("");
      setTxn("");
      setNotes("");
      onDone?.({ paymentId: res.paymentId, receiptNumber: res.receiptNumber });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not record payment");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>
            {invoice
              ? `${invoice.invoiceNumber} · ${invoice.clientName} · due ${formatTaka(due)}`
              : "Select an invoice"}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Field label="Amount (৳)">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={due ? String(due) : "0"}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Method">
              <NativeSelect value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Date">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Time">
              <Input value={time} onChange={(e) => setTime(e.target.value)} />
            </Field>
            <Field label="Transaction ID">
              <Input value={txn} onChange={(e) => setTxn(e.target.value)} placeholder="bKash / bank ref" />
            </Field>
          </div>
          <Field label="Note">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button variant="brand" disabled={busy || !invoice} onClick={() => submit()}>
              {busy ? "Saving…" : "Save payment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </label>
  );
}
