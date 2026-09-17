import React from "react";
import { pdf } from "@react-pdf/renderer";
import { InvoicePdfDocument } from "@/components/documents/pdf/InvoicePdfDocument";
import type { Client, Invoice, InvoiceItem, Settings } from "@/lib/types";
import { toast } from "sonner";

type InvoicePdfOptions = {
  invoice: Invoice;
  client?: Client | null;
  items: InvoiceItem[];
  settings: Settings;
};

export async function buildInvoiceReactPdfBlob(opts: InvoicePdfOptions) {
  return pdf(React.createElement(InvoicePdfDocument, opts) as any).toBlob();
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function downloadInvoicePdf(opts: InvoicePdfOptions) {
  const filename = `${opts.invoice.invoiceNumber}.pdf`;

  try {
    const blob = await buildInvoiceReactPdfBlob(opts);
    downloadBlob(blob, filename);
  } catch (error) {
    console.error("React PDF invoice generation failed.", error);
    toast.error("Failed to generate PDF. Please try again.");
    throw error;
  }
}
