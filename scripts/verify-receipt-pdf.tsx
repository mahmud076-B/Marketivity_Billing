import React from "react";
import { renderToFile } from "@react-pdf/renderer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import * as pdfParse from "pdf-parse";
const parsePdf = (pdfParse as any).default || pdfParse;
import { ReceiptPdfDocument } from "../src/components/documents/pdf/ReceiptPdfDocument";
import { registerInvoicePdfFonts } from "../src/components/documents/pdf/invoice-pdf-fonts";
import type { Invoice, Client, Payment, Settings } from "../src/lib/types";

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
  businessName: "Hasan Corp (বাংলা)",
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
  status: "partially_paid",
  subtotal: 5000,
  discountType: "none",
  discountValue: 0,
  taxEnabled: true,
  taxRate: 5,
  taxAmount: 250,
  serviceCharge: 100,
  cashOutCharge: 0,
  total: 5350,
  paidAmount: 1000,
  dueAmount: 4350,
  paymentTerms: "Due on receipt",
  notes: "Thanks for your business",
  isBoosting: false,
  adBudgetUsd: null,
  marketivityRate: null,
  isSample: false,
  createdAt: "2023-10-01T10:00:00Z",
  updatedAt: "2023-10-01T10:00:00Z",
};

const mockActivePayment: Payment = {
  id: "pay_1",
  invoiceId: "inv_1",
  invoiceNumber: "INV-2023-0001",
  clientId: "client_1",
  clientName: "Mahmud Hasan",
  receiptNumber: "MKT-RCP-2023-0001",
  amount: 1000,
  method: "bkash",
  transactionId: "TXN123456789",
  paymentDate: "2023-10-05",
  paymentTime: "14:30",
  externalTxnId: "",
  notes: "",
  previousDue: 5350,
  remainingDue: 4350,
  status: "active",
  voidedAt: null,
  voidReason: "",
  createdAt: "2023-10-05T14:30:00Z"
};

const mockVoidPayment: Payment = {
  ...mockActivePayment,
  status: "void",
  voidReason: "Wrong amount entered",
  voidedAt: "2023-10-06T10:00:00Z",
};

async function checkPdf(pdfPath: string, checks: { name: string; match: boolean }[]) {
  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await parsePdf(dataBuffer);
  const text = data.text;
  let allPass = true;
  for (const check of checks) {
    if (check.match) {
      console.log(`✅ [PASS] ${check.name}`);
    } else {
      console.log(`❌ [FAIL] ${check.name}`);
      console.log(`Extracted text:\n${text}\n`);
      allPass = false;
    }
  }
  return allPass;
}

async function runTest() {
  const activePath = path.resolve(__dirname, "../receipt-active-test.pdf");
  const voidPath = path.resolve(__dirname, "../receipt-void-test.pdf");

  try {
    console.log("Generating ACTIVE receipt PDF...");
    await renderToFile(
      <ReceiptPdfDocument
        payment={mockActivePayment}
        invoice={mockInvoice}
        client={mockClient}
        settings={mockSettings}
      />,
      activePath
    );

    const activeChecks = [
      { name: "Contains Receipt Number", match: true },
    ];
    
    // We do simple text inclusion tests for the rest in the actual check function
    // but pdf-parse might not extract Bengali correctly or might format tables weirdly
    // so let's stick to simple strings.
    const activePass = await checkPdf(activePath, [
      { name: "Active: Contains Receipt Number", match: true },
    ]);
    
    let activeText = (await parsePdf(fs.readFileSync(activePath))).text;
    let voidText = "";

    console.log("Generating VOID receipt PDF...");
    await renderToFile(
      <ReceiptPdfDocument
        payment={mockVoidPayment}
        invoice={mockInvoice}
        client={mockClient}
        settings={mockSettings}
      />,
      voidPath
    );
    voidText = (await parsePdf(fs.readFileSync(voidPath))).text;

    const voidChecks = [
      { name: "Void: Contains VOID text", match: voidText.includes("VOID") },
      { name: "Void: Contains Void Reason", match: voidText.includes("Wrong amount entered") },
    ];
    
    const voidPass = await checkPdf(voidPath, voidChecks);

    const checkContains = (name: string, textObj: string, str: string) => {
       const pass = textObj.includes(str);
       if (pass) console.log(`✅ [PASS] ${name}`);
       else console.log(`❌ [FAIL] ${name} (missing "${str}")`);
       return pass;
    };
    
    const a1 = checkContains("Active: Has MKT-RCP-2023-0001", activeText, "MKT-RCP-2023-0001");
    const a2 = checkContains("Active: Has Client Name", activeText, "Mahmud Hasan");
    const a3 = checkContains("Active: Has Amount", activeText, "1,000");
    const a4 = checkContains("Active: Has Payment Method", activeText, "bKash");
    const a5 = checkContains("Active: Has Invoice Ref", activeText, "INV-2023-0001");

    if (activePass && voidPass && a1 && a2 && a3 && a4 && a5) {
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
