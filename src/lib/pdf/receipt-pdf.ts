import React from "react";
import { pdf } from "@react-pdf/renderer";
import { ReceiptPdfDocument } from "@/components/documents/pdf/ReceiptPdfDocument";
import type { Client, Invoice, Payment, Settings } from "@/lib/types";
import { toast } from "sonner";

export async function buildReceiptReactPdfBlob(opts: {
  payment: Payment;
  invoice: Invoice;
  client?: Client | null;
  settings: Settings;
}) {
  return pdf(React.createElement(ReceiptPdfDocument, opts) as any).toBlob();
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

export async function downloadReceiptPdf(opts: {
  payment: Payment;
  invoice: Invoice;
  client?: Client | null;
  settings: Settings;
}) {
  const filename = `${opts.payment.receiptNumber}.pdf`;

  try {
    const blob = await buildReceiptReactPdfBlob(opts);
    downloadBlob(blob, filename);
  } catch (error) {
    console.error("React PDF receipt generation failed.", error);
    toast.error("Failed to generate receipt PDF. Please try again.");
    throw error;
  }
}
