// @ts-nocheck
import assert from "node:assert/strict";
import test from "node:test";
import { execFile } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import React from "react";
import { renderToFile } from "@react-pdf/renderer";
import { createServer } from "vite";

const execFileAsync = promisify(execFile);
const root = process.cwd();

function sampleInvoice(itemCount, overrides = {}) {
  const items = Array.from({ length: itemCount }, (_, index) => ({
    id: `item-${index + 1}`,
    serviceId: null,
    serviceName: index % 2 === 0
      ? `Facebook Ads Campaign Strategy ${index + 1}`
      : `????? ??????? ????????? ??????? ${index + 1}`,
    description: `Long mixed description ${index + 1} with Bengali text ????? ????? and enough words to wrap naturally across lines without truncation.`,
    qty: index % 3 === 0 ? 1.5 : 1,
    unitPrice: index % 3 === 0 ? 1250.75 : 750,
    amount: index % 3 === 0 ? 1876.13 : 750,
    sortOrder: index,
  }));

  return {
    id: "inv-test",
    invoiceNumber: "INV-2CB-VERIFY",
    clientId: "client-test",
    issueDate: "2026-09-17",
    issueTime: "09:42 PM",
    dueDate: "2026-09-24",
    status: "partially_paid",
    subtotal: 46006.12,
    discountType: "fixed",
    discountValue: 500,
    taxEnabled: true,
    taxRate: 5,
    taxAmount: 2275.31,
    serviceCharge: 250,
    total: 48031.43,
    paidAmount: 12000,
    dueAmount: 36031.43,
    paymentTerms: "50% advance required before campaign launch.",
    notes: "\u09ac\u09be\u0982\u09b2\u09be \u09a8\u09cb\u099f with English terms and long wrapping content.",
    isBoosting: true,
    adBudgetUsd: 100,
    marketivityRate: 150,
    isSample: false,
    createdAt: "2026-09-17T00:00:00.000Z",
    updatedAt: "2026-09-17T00:00:00.000Z",
    items,
    ...overrides,
  };
}

const client = {
  id: "client-test",
  clientCode: "CL-001",
  name: "\u09ae\u09be\u09b9\u09ae\u09c1\u09a6 \u09b9\u09be\u09b8\u09be\u09a8",
  businessName: "Marketivity Verification Client",
  phone: "+8801700000000",
  email: "client@example.com",
  address: "Rajshahi, Bangladesh \u09ac\u09be\u0982\u09b2\u09be \u09a0\u09bf\u0995\u09be\u09a8\u09be",
  facebookPage: "",
  website: "",
  notes: "",
  isSample: false,
  createdAt: "2026-09-17T00:00:00.000Z",
};

const settings = {
  agencyName: "Marketivity",
  tagline: "Think beyond marketing. Build for growth.",
  positioning: "Digital Growth Partners",
  phone: "+8801900000000",
  whatsapp: "",
  email: "hello@marketivity.com",
  address: "Rajshahi, Bangladesh",
  website: "https://marketivity.com",
  facebookPage: "",
  bkashNumber: "01700000000",
  nagadNumber: "01800000000",
  bankInfo: "Marketivity Bank Account",
  logoDataUrl: "",
  accentColor: "#F5A623",
  footerText: "Think beyond marketing. Build for growth.",
  paymentInstructions: "Please complete payment using bKash, Nagad, or bank transfer.",
  terms: "All campaigns are subject to platform policies.",
  theme: "dark",
  invoiceTheme: "classic",
  sampleLoaded: false,
};

async function extractPdf(pdfPath) {
  const script = `
import json, sys
from pypdf import PdfReader
reader = PdfReader(sys.argv[1])
text = "\\\\n".join(page.extract_text() or "" for page in reader.pages)
print(json.dumps({"pages": len(reader.pages), "text": text}, ensure_ascii=True))
`;
  const { stdout } = await execFileAsync("python", ["-c", script, pdfPath], { encoding: "utf8", maxBuffer: 1024 * 1024 * 8 });
  return JSON.parse(stdout);
}

test("React invoice PDF renders selectable Bengali/Taka text and paginates long invoices", { timeout: 60000 }, async () => {
  const server = await createServer({ root, logLevel: "error", server: { middlewareMode: true }, appType: "custom" });
  const outDir = path.join(root, "artifacts", "pdf-tests");
  const pdfPath = path.join(outDir, "invoice-2cb-verification.pdf");

  try {
    await mkdir(outDir, { recursive: true });
    await rm(pdfPath, { force: true });

    const fontModule = await server.ssrLoadModule("/src/components/documents/pdf/invoice-pdf-fonts.ts");
    fontModule.registerInvoicePdfFonts(path.join(root, "public", "fonts", "TiroBangla-Regular.ttf"));

    const module = await server.ssrLoadModule("/src/components/documents/pdf/InvoicePdfDocument.tsx");
    const invoice = sampleInvoice(55);
    await renderToFile(
      React.createElement(module.InvoicePdfDocument, { invoice, client, items: invoice.items, settings }),
      pdfPath,
    );

    const extracted = await extractPdf(pdfPath);
    assert.ok(extracted.pages > 1, `expected a multi-page PDF, got ${extracted.pages}`);
    assert.match(extracted.text, /INV-2CB-VERIFY/);
    assert.match(extracted.text, /Marketivity Verification Client/);
    assert.match(extracted.text, /Grand total/i);
    assert.ok(extracted.text.includes("\u09f3"), "expected Taka symbol in extracted PDF text");
    assert.ok(/[\u0980-\u09ff]/.test(extracted.text), "expected Bengali text in extracted PDF text");
    assert.match(extracted.text, /Page 1 of/);
  } finally {
    await server.close();
  }
});






