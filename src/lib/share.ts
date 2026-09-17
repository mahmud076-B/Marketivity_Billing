import { formatTaka } from "./money";
import type { Client, Invoice } from "./types";

export function invoiceWhatsappMessage(invoice: Invoice, client: Client | undefined) {
  const name = client?.name || "there";
  return `Hello ${name},

Your Marketivity invoice #${invoice.invoiceNumber} has been generated.

Total: ${formatTaka(invoice.total)}
Paid: ${formatTaka(invoice.paidAmount)}
Due: ${formatTaka(invoice.dueAmount)}

Please find the invoice attached.
Thank you for choosing Marketivity.`;
}

export function whatsappHref(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");
  const text = encodeURIComponent(message);
  if (digits.length >= 10) {
    const intl = digits.startsWith("880") ? digits : digits.startsWith("0") ? `88${digits}` : `880${digits}`;
    return `https://wa.me/${intl}?text=${text}`;
  }
  return `https://wa.me/?text=${text}`;
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  downloadBlob(filename, new Blob([csv], { type: "text/csv;charset=utf-8" }));
}

export function downloadCsvString(filename: string, csv: string) {
  downloadBlob(filename, new Blob([csv], { type: "text/csv;charset=utf-8" }));
}

export function downloadJson(filename: string, data: unknown) {
  downloadBlob(filename, new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
}
