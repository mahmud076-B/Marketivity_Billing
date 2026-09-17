import { Mark } from "@/components/brand/logo";
import { formatLongDate } from "@/lib/dates";
import { formatTaka } from "@/lib/money";
import { PAYMENT_METHODS, type Client, type Invoice, type Payment, type Settings } from "@/lib/types";

export function ReceiptPaper({
  payment,
  invoice,
  client,
  settings,
}: {
  payment: Payment;
  invoice: Invoice;
  client?: Client | null;
  settings: Settings;
}) {
  const isVoid = payment.status === "void";
  const method = PAYMENT_METHODS.find((m) => m.id === payment.method)?.label ?? payment.method;
  const rows: [string, string][] = [
    ["Received from", client?.businessName || client?.name || "—"],
    ["Client", client?.name || "—"],
    ["Invoice", invoice.invoiceNumber],
    ["Amount received", formatTaka(payment.amount)],
    ["Method", method],
    ["Transaction ID", payment.transactionId],
    ...(payment.externalTxnId ? [["Reference", payment.externalTxnId] as [string, string]] : []),
    ["Previous due", formatTaka(payment.previousDue)],
    ["Remaining due", formatTaka(payment.remainingDue)],
    ["Status", isVoid ? "VOIDED (REVERSED)" : payment.remainingDue <= 0 ? "PAID" : "PARTIALLY PAID"],
    ...(isVoid
      ? ([
          ["Void reason", payment.voidReason || "Voided by user"],
          ["Voided at", payment.voidedAt ? formatLongDate(payment.voidedAt.slice(0, 10)) : "—"],
        ] as [string, string][])
      : []),
  ];
  return (
    <article className="relative overflow-hidden rounded-2xl border border-border bg-white text-[#1A1424] shadow-xl">
      {isVoid && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="rotate-[-25deg] rounded-2xl border-8 border-destructive/60 px-12 py-4 text-center font-black tracking-widest text-destructive/60 uppercase text-6xl shadow-sm">
            VOID
          </div>
        </div>
      )}
      <header className="relative bg-[#0B0714] px-7 py-6 text-[#F4EFE6]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Mark className="size-10" />
            <div>
              <div className="font-display text-lg font-bold">{settings.agencyName.toUpperCase()}</div>
              <div className="text-[11px] text-[#C4B8D4]">{settings.tagline}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-2">
              <span className="font-display text-2xl font-bold">RECEIPT</span>
              {isVoid && (
                <span className="rounded-full bg-destructive px-2 py-0.5 text-xs font-bold text-destructive-foreground tracking-wider uppercase">
                  VOID
                </span>
              )}
            </div>
            <div className="text-sm text-[#E8D5A3]">{payment.receiptNumber}</div>
            <div className="text-xs text-[#C4B8D4]">
              {formatLongDate(payment.paymentDate)} · {payment.paymentTime}
            </div>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-1 bg-[#F5A623]" />
      </header>
      <div className="space-y-3 px-7 py-6">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[8rem_1fr] gap-3 text-sm">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[#6B6278]">{k}</div>
            <div className={`font-medium ${isVoid && k === "Amount received" ? "line-through text-muted-foreground" : ""}`}>{v}</div>
          </div>
        ))}
        {isVoid ? (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-4 text-center text-sm font-semibold text-destructive">
            THIS RECEIPT HAS BEEN VOIDED AND REVERSED.
            {payment.voidReason && <span className="block mt-1 text-xs font-normal text-destructive/90">Reason: {payment.voidReason}</span>}
          </div>
        ) : (
          <div className="mt-4 rounded-xl bg-[#F7F1E8] px-4 py-4 text-center text-sm italic text-[#7B2FBE]">
            Payment received successfully. Thank you for choosing Marketivity.
          </div>
        )}
        {payment.notes && <p className="text-sm text-[#6B6278]">Note: {payment.notes}</p>}
      </div>
      <footer className="bg-[#0B0714] px-7 py-3 text-[11px] text-[#F5A623]">{settings.footerText}</footer>
    </article>
  );
}
