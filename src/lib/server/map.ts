import { parseMoney } from "@/lib/money";
import type {
  Client,
  Invoice,
  InvoiceItem,
  InvoiceListRow,
  InvoiceStatus,
  Payment,
  PaymentMethod,
  Service,
  Settings,
  DiscountType,
} from "@/lib/types";
import { DEFAULT_SETTINGS } from "@/lib/types";

export function n(v: unknown): number {
  return parseMoney(v);
}

export function s(v: unknown): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

export function b(v: unknown): boolean {
  return v === true || v === "t" || v === "true";
}

export function mapClient(row: Record<string, unknown>): Client {
  return {
    id: s(row.id),
    clientCode: s(row.client_code),
    name: s(row.name),
    businessName: s(row.business_name),
    phone: s(row.phone),
    email: s(row.email),
    address: s(row.address),
    facebookPage: s(row.facebook_page),
    website: s(row.website),
    notes: s(row.notes),
    isSample: b(row.is_sample),
    isArchived: b(row.is_archived),
    createdAt: s(row.created_at),
  };
}

export function mapService(row: Record<string, unknown>): Service {
  return {
    id: s(row.id),
    name: s(row.name),
    description: s(row.description),
    defaultRate: n(row.default_rate),
    isBoosting: b(row.is_boosting),
    usdRate: row.usd_rate == null ? null : n(row.usd_rate),
    isSample: b(row.is_sample),
  };
}

export function mapItem(row: Record<string, unknown>): InvoiceItem {
  return {
    id: s(row.id),
    serviceId: row.service_id ? s(row.service_id) : null,
    serviceName: s(row.service_name),
    description: s(row.description),
    qty: n(row.qty),
    unitPrice: n(row.unit_price),
    amount: n(row.amount),
    sortOrder: Number(row.sort_order ?? 0),
  };
}

export function mapInvoice(row: Record<string, unknown>): Invoice {
  return {
    id: s(row.id),
    invoiceNumber: s(row.invoice_number),
    clientId: s(row.client_id),
    issueDate: s(row.issue_date).slice(0, 10),
    issueTime: s(row.issue_time),
    dueDate: row.due_date ? s(row.due_date).slice(0, 10) : null,
    status: s(row.status) as InvoiceStatus,
    subtotal: n(row.subtotal),
    discountType: (s(row.discount_type) || "none") as DiscountType,
    discountValue: n(row.discount_value),
    taxEnabled: b(row.tax_enabled),
    taxRate: n(row.tax_rate),
    taxAmount: n(row.tax_amount),
    serviceCharge: n(row.service_charge),
    cashOutCharge: n(row.cash_out_charge),
    total: n(row.total),
    paidAmount: n(row.paid_amount),
    dueAmount: n(row.due_amount),
    paymentTerms: s(row.payment_terms),
    notes: s(row.notes),
    isBoosting: b(row.is_boosting),
    adBudgetUsd: row.ad_budget_usd == null ? null : n(row.ad_budget_usd),
    marketivityRate: row.marketivity_rate == null ? null : n(row.marketivity_rate),
    isSample: b(row.is_sample),
    createdAt: s(row.created_at),
    updatedAt: s(row.updated_at),
  };
}

export function mapInvoiceRow(row: Record<string, unknown>): InvoiceListRow {
  return {
    ...mapInvoice(row),
    clientName: s(row.client_name),
    businessName: s(row.business_name),
  };
}

export function mapPayment(row: Record<string, unknown>): Payment {
  return {
    id: s(row.id),
    invoiceId: s(row.invoice_id),
    invoiceNumber: s(row.invoice_number),
    clientId: s(row.client_id),
    clientName: s(row.client_name),
    transactionId: s(row.transaction_id),
    receiptNumber: s(row.receipt_number),
    amount: n(row.amount),
    method: s(row.method) as PaymentMethod,
    paymentDate: s(row.payment_date).slice(0, 10),
    paymentTime: s(row.payment_time),
    externalTxnId: s(row.external_txn_id),
    notes: s(row.notes),
    previousDue: n(row.previous_due),
    remainingDue: n(row.remaining_due),
    status: (s(row.status) || "active") as Payment["status"],
    voidedAt: row.voided_at ? s(row.voided_at) : null,
    voidReason: s(row.void_reason),
    createdAt: s(row.created_at),
  };
}

export function mapSettings(row: Record<string, unknown> | undefined): Settings {
  if (!row) return { ...DEFAULT_SETTINGS };
  return {
    agencyName: s(row.agency_name) || DEFAULT_SETTINGS.agencyName,
    tagline: s(row.tagline) || DEFAULT_SETTINGS.tagline,
    positioning: s(row.positioning) || DEFAULT_SETTINGS.positioning,
    phone: s(row.phone),
    whatsapp: s(row.whatsapp),
    email: s(row.email),
    address: s(row.address),
    website: s(row.website),
    facebookPage: s(row.facebook_page),
    bkashNumber: s(row.bkash_number),
    nagadNumber: s(row.nagad_number),
    bankInfo: s(row.bank_info),
    logoDataUrl: s(row.logo_data_url),
    accentColor: s(row.accent_color) || DEFAULT_SETTINGS.accentColor,
    footerText: s(row.footer_text) || DEFAULT_SETTINGS.footerText,
    paymentInstructions: s(row.payment_instructions),
    terms: s(row.terms),
    theme: s(row.theme) === "light" ? "light" : "dark",
    invoiceTheme: s(row.invoice_theme) || "classic",
    sampleLoaded: b(row.sample_loaded),
  };
}
