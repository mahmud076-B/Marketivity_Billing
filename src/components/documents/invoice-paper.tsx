import { computeTotals } from "@/lib/calculations";
import { formatLongDate } from "@/lib/dates";
import { formatTaka, formatUsd } from "@/lib/money";
import type { Client, InvoiceItem, InvoiceStatus, Settings } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/types";
import { Mark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

export type PaperInvoice = {
  invoiceNumber: string;
  issueDate: string;
  issueTime: string;
  dueDate?: string | null;
  status: InvoiceStatus;
  items: Pick<InvoiceItem, "serviceName" | "description" | "qty" | "unitPrice" | "amount">[];
  discountType: "none" | "fixed" | "percent";
  discountValue: number;
  taxEnabled: boolean;
  taxRate: number;
  taxAmount: number;
  serviceCharge: number;
  cashOutCharge: number;
  subtotal: number;
  total: number;
  paidAmount: number;
  dueAmount: number;
  paymentTerms: string;
  notes: string;
  isBoosting?: boolean;
  adBudgetUsd?: number | null;
  marketivityRate?: number | null;
};

export function InvoicePaper({
  invoice,
  client,
  settings,
  className,
}: {
  invoice: PaperInvoice;
  client?: Partial<Client> | null;
  settings: Settings;
  className?: string;
}) {
  const totals = computeTotals({
    items: invoice.items,
    discountType: invoice.discountType,
    discountValue: invoice.discountValue,
    taxEnabled: invoice.taxEnabled,
    taxRate: invoice.taxRate,
    serviceCharge: invoice.serviceCharge,
    cashOutCharge: invoice.cashOutCharge,
  });

  return (
    <article
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-white text-[#1A1424] shadow-xl print:rounded-none print:border-0 print:shadow-none",
        className,
      )}
    >
      <header className="relative bg-[#FFF0F5] px-7 py-6 text-[#1A1424]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {settings.logoDataUrl ? (
              <img src={settings.logoDataUrl} alt="" className="size-10 rounded-xl object-cover" />
            ) : (
              <img src="/Marketivity_Exact_Logo_Web_Assets/Marketivity_logo_exact_transparent.png" alt="" className="size-10 rounded-xl object-cover" />
            )}
            <div>
              <div className="font-display text-lg font-bold tracking-wide">
                {(settings.agencyName || "MARKETIVITY").toUpperCase()}
              </div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-[#C4B8D4]">
                {settings.positioning || "Digital Growth Partners"}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-display text-2xl font-bold tracking-tight">INVOICE</div>
            <div className="text-sm text-[#E8D5A3]">{invoice.invoiceNumber}</div>
            <div className="text-xs text-[#C4B8D4]">
              {formatLongDate(invoice.issueDate)} · {invoice.issueTime}
            </div>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-1 bg-[#F5A623]">
          <div className="h-full w-1/4 bg-[#7B2FBE]" />
        </div>
      </header>

      <div className="grid gap-6 px-7 py-6 sm:grid-cols-2">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7B2FBE]">Bill to</div>
          <div className="mt-1 font-semibold">{client?.businessName || client?.name || "Select a client"}</div>
          {client?.businessName && client?.name && (
            <div className="text-sm text-[#6B6278]">{client.name}</div>
          )}
          <div className="mt-1 space-y-0.5 text-sm text-[#6B6278]">
            {client?.phone && <div>{client.phone}</div>}
            {client?.email && <div>{client.email}</div>}
            {client?.address && <div>{client.address}</div>}
          </div>
        </div>
        <div className="sm:text-right">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7B2FBE]">From</div>
          <div className="mt-1 font-semibold">{settings.agencyName}</div>
          <div className="mt-1 space-y-0.5 text-sm text-[#6B6278]">
            {settings.phone && <div>{settings.phone}</div>}
            {settings.email && <div>{settings.email}</div>}
            {settings.address && <div>{settings.address}</div>}
          </div>
          {invoice.dueDate && (
            <div className="mt-3 text-xs">
              Due {formatLongDate(invoice.dueDate)}
            </div>
          )}
        </div>
      </div>

      {invoice.isBoosting && invoice.adBudgetUsd ? (
        <div className="mx-7 mb-3 rounded-xl bg-[#F7F1E8] px-4 py-3 text-sm">
          Advertising budget {formatUsd(invoice.adBudgetUsd)} × ৳{invoice.marketivityRate ?? 150} / USD
        </div>
      ) : null}

      <div className="px-7">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.12em] text-[#6B6278]">
              <th className="pb-2 font-semibold">Service</th>
              <th className="hidden pb-2 font-semibold sm:table-cell">Description</th>
              <th className="pb-2 font-semibold">Qty</th>
              <th className="pb-2 font-semibold">Rate</th>
              <th className="pb-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="border-t border-[#E6DFD4] py-6 text-center text-[#6B6278]">
                  Services will appear here
                </td>
              </tr>
            ) : (
              invoice.items.map((item, i) => (
                <tr key={i} className="border-t border-[#E6DFD4]">
                  <td className="py-2.5 font-medium">{item.serviceName || "Service"}</td>
                  <td className="hidden py-2.5 text-[#6B6278] sm:table-cell">{item.description || "—"}</td>
                  <td className="py-2.5 tabular">{item.qty}</td>
                  <td className="py-2.5 tabular">{formatTaka(item.unitPrice)}</td>
                  <td className="py-2.5 text-right tabular font-medium">{formatTaka(item.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col gap-6 px-7 pb-6 sm:flex-row sm:justify-between">
        <div className="space-y-3 text-sm">
          <span
            className={cn(
              "inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
              invoice.status === "paid" && "bg-emerald-100 text-emerald-800",
              invoice.status === "partially_paid" && "bg-amber-100 text-amber-800",
              invoice.status === "unpaid" && "bg-zinc-100 text-zinc-700",
              invoice.status === "overdue" && "bg-red-100 text-red-800",
              invoice.status === "void" && "bg-zinc-200 text-zinc-500 line-through",
            )}
          >
            {STATUS_LABEL[invoice.status]}
          </span>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7B2FBE]">
              Payment information
            </div>
            <div className="mt-1 space-y-0.5 text-[#6B6278]">
              {settings.bkashNumber && <div>bKash {settings.bkashNumber}</div>}
              {settings.nagadNumber && <div>Nagad {settings.nagadNumber}</div>}
              {settings.bankInfo && <div>{settings.bankInfo}</div>}
              {settings.paymentInstructions && <div className="max-w-xs">{settings.paymentInstructions}</div>}
            </div>
          </div>
          {(invoice.paymentTerms || invoice.notes) && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7B2FBE]">
                Notes / terms
              </div>
              <div className="mt-1 max-w-xs whitespace-pre-wrap text-[#6B6278]">
                {[invoice.paymentTerms, invoice.notes].filter(Boolean).join("\n")}
              </div>
            </div>
          )}
        </div>
        <dl className="min-w-52 space-y-1.5 text-sm">
          <div className="flex justify-between gap-8 text-[#6B6278]">
            <dt>Subtotal</dt>
            <dd className="tabular">{formatTaka(invoice.subtotal)}</dd>
          </div>
          {invoice.discountType !== "none" && invoice.discountValue > 0 && (
            <div className="flex justify-between gap-8 text-[#6B6278]">
              <dt>Discount{invoice.discountType === "percent" ? ` (${invoice.discountValue}%)` : ""}</dt>
              <dd className="tabular">−{formatTaka(totals.discountAmount)}</dd>
            </div>
          )}
          {invoice.taxEnabled && (
            <div className="flex justify-between gap-8 text-[#6B6278]">
              <dt>VAT / Tax ({invoice.taxRate}%)</dt>
              <dd className="tabular">{formatTaka(invoice.taxAmount)}</dd>
            </div>
          )}
          {invoice.serviceCharge > 0 && (
            <div className="flex justify-between gap-8 text-[#6B6278]">
              <dt>Service charge</dt>
              <dd className="tabular">{formatTaka(invoice.serviceCharge)}</dd>
            </div>
          )}
          {invoice.cashOutCharge > 0 && (
            <div className="flex justify-between gap-8 text-[#6B6278]">
              <dt>Cash out charge</dt>
              <dd className="tabular">{formatTaka(invoice.cashOutCharge)}</dd>
            </div>
          )}
          <div className="flex justify-between gap-8 border-t border-[#E6DFD4] pt-2 font-semibold">
            <dt>Total</dt>
            <dd className="tabular">{formatTaka(invoice.total)}</dd>
          </div>
          <div className="flex justify-between gap-8 text-[#6B6278]">
            <dt>Paid</dt>
            <dd className="tabular">{formatTaka(invoice.paidAmount)}</dd>
          </div>
          <div className="flex justify-between gap-8 font-semibold text-[#7B2FBE]">
            <dt>Due</dt>
            <dd className="tabular">{formatTaka(invoice.dueAmount)}</dd>
          </div>
        </dl>
      </div>

      <footer className="flex items-center justify-between bg-[#0B0714] px-7 py-3 text-[11px] text-[#C4B8D4]">
        <span className="text-[#F5A623]">{settings.footerText}</span>
        <span>{[settings.phone, settings.email].filter(Boolean).join(" · ")}</span>
      </footer>
    </article>
  );
}
