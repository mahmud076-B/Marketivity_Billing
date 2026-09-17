import React from "react";
import { renderToFile } from "@react-pdf/renderer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import * as pdfParse from "pdf-parse";
const parsePdf = (pdfParse as any).default || pdfParse;
import { InvoicePdfDocument } from "../src/components/documents/pdf/InvoicePdfDocument";
import { registerInvoicePdfFonts } from "../src/components/documents/pdf/invoice-pdf-fonts";
import type { Invoice, Client, InvoiceItem, Settings } from "../src/lib/types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

registerInvoicePdfFonts(path.resolve(__dirname, "../public/fonts/TiroBangla-Regular.ttf"));

const mockSettings: Settings = {
  agencyName: "Marketivity",
  positioning: "Digital Growth Partners",
  tagline: "Think beyond marketing. Build for growth.",
  phone: "+8801234567890",
  email: "hello@marketivity.com",
  address: "Dhaka, Bangladesh",
  website: "www.marketivity.com",
  footerText: "Think beyond marketing.",
  bkashNumber: "01700000000",
  whatsapp: "",
  facebookPage: "",
  nagadNumber: "",
  bankInfo: "",
  logoDataUrl: "",
  accentColor: "#F5A623",
  terms: "",
  theme: "dark",
  invoiceTheme: "classic",
  paymentInstructions: "",
  sampleLoaded: false
};

const mockClient: Client = {
  id: "client_1",
  clientCode: "C001",
  name: "Mahmud Hasan",
  businessName: "Hasan Corp",
  email: "mahmud@example.com",
  phone: "01800000000",
  address: "Gulshan",
  website: "",
  facebookPage: "",
  notes: "",
  isSample: false,
  createdAt: "2023-01-01T00:00:00Z",
};

const mockInvoice: Invoice = {
  id: "inv_1",
  clientId: "client_1",
  invoiceNumber: "INV-2023-0001",
  issueDate: "2023-10-01",
  issueTime: "10:00 AM",
  dueDate: "2023-10-15",
  status: "void",
  subtotal: 5000,
  discountType: "none",
  discountValue: 0,
  taxEnabled: true,
  taxRate: 5,
  taxAmount: 250,
  serviceCharge: 100,
  cashOutCharge: 0,
  total: 5350,
  paidAmount: 0,
  dueAmount: 5350,
  paymentTerms: "Due on receipt",
  notes: "Thanks for your business",
  isBoosting: false,
  adBudgetUsd: null,
  marketivityRate: null,
  isSample: false,
  createdAt: "2023-10-01T10:00:00Z",
  updatedAt: "2023-10-01T10:00:00Z",
};

const mockItems: InvoiceItem[] = [
  {
    id: "item_1",
    serviceName: "Digital Marketing",
    description: "Monthly retainer",
    qty: 1,
    unitPrice: 5000,
    amount: 5000,
    sortOrder: 0,
    serviceId: null
  },
];

async function runTest() {
  const outputPath = path.resolve(__dirname, "../void-test-output.pdf");

  try {
    console.log("Generating VOID invoice PDF...");
    await renderToFile(
      <InvoicePdfDocument
        invoice={mockInvoice}
        client={mockClient}
        items={mockItems}
        settings={mockSettings}
      />,
      outputPath
    );
    console.log("PDF generated at:", outputPath);

    console.log("Extracting text from PDF...");
    const dataBuffer = fs.readFileSync(outputPath);
    const data = await parsePdf(dataBuffer);
    const text = data.text;

    const checks = [
      { name: "Contains VOID", match: text.includes("VOID") },
      { name: "Contains Invoice Number", match: text.includes("INV-2023-0001") },
      { name: "Contains Client Name", match: text.includes("Mahmud Hasan") },
      { name: "Contains Client Business", match: text.includes("Hasan Corp") },
      { name: "Contains Service Name", match: text.includes("Digital Marketing") },
      { name: "Contains Total Amount", match: text.includes("5,350") },
      { name: "Contains Paid Amount", match: text.includes("1,000") },
      { name: "Contains Due Amount", match: text.includes("4,350") },
    ];

    let allPass = true;
    for (const check of checks) {
      if (check.match) {
        console.log(`✅ [PASS] ${check.name}`);
      } else {
        console.log(`❌ [FAIL] ${check.name}`);
        allPass = false;
      }
    }

    if (allPass) {
      console.log("\\nAll checks passed successfully.");
      process.exit(0);
    } else {
      console.error("\\nSome checks failed. See above.");
      process.exit(1);
    }
  } catch (err) {
    console.error("Test failed with error:", err);
    process.exit(1);
  }
}

runTest();
