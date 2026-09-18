import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { formatCsv } from "./csv";
import { getClientStatement, listClients } from "./clients";
import { listInvoices, type InvoiceFilters } from "./invoices";
import { listPayments } from "./payments";
import { requirePermission } from "./authz";
import { getSql } from "@/lib/db";
import { getAgencyOwnerId } from "./workspace";
import { STATUS_LABEL } from "@/lib/types";

export const exportClientsCsv = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    requirePermission(context.user, "view_clients");
    const clients = await listClients({ data: { includeArchived: true } });
    
    const rows = [
      ["Client Code", "Name", "Company", "Email", "Phone", "Address", "Status", "Created Date"],
      ...clients.map((c) => [
        c.clientCode,
        c.name,
        c.businessName,
        c.email,
        c.phone,
        c.address,
        c.isArchived ? "Archived" : "Active",
        c.createdAt,
      ]),
    ];
    
    return formatCsv(rows);
  });

export const exportInvoicesCsv = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((filters: InvoiceFilters) => filters)
  .handler(async ({ data: filters, context }) => {
    requirePermission(context.user, "view_invoices");
    const invoices = await listInvoices({ data: filters });
    
    const rows = [
      ["Invoice Number", "Client", "Issue Date", "Due Date", "Subtotal", "Discount", "Tax", "Service Charge", "Advertising Cost", "Grand Total", "Paid", "Due", "Status"],
      ...invoices.map((i) => [
        i.invoiceNumber,
        i.businessName || i.clientName,
        i.issueDate,
        i.dueDate || "",
        i.subtotal,
        i.discountValue,
        i.taxAmount,
        i.serviceCharge,
        i.adBudgetUsd || 0,
        i.total,
        i.paidAmount,
        i.dueAmount,
        STATUS_LABEL[i.status],
      ]),
    ];

    return formatCsv(rows);
  });

export const exportPaymentsCsv = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((q?: string) => q ?? "")
  .handler(async ({ data: q, context }) => {
    requirePermission(context.user, "view_payments");
    const payments = await listPayments({ data: q });
    
    const rows = [
      ["Payment Reference", "Invoice Number", "Client", "Payment Date", "Amount", "Payment Method", "Status", "Void Reason", "Created Date"],
      ...payments.map((p) => [
        p.transactionId || p.receiptNumber || p.id,
        p.invoiceNumber,
        p.clientName,
        p.paymentDate,
        p.amount,
        p.method,
        p.status.toUpperCase(),
        p.voidReason || "",
        p.createdAt,
      ]),
    ];

    return formatCsv(rows);
  });

export const exportClientStatementCsv = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((clientId: string) => clientId)
  .handler(async ({ data: clientId, context }) => {
    requirePermission(context.user, "view_statements");
    const statement = await getClientStatement({ data: clientId });
    
    const rows = [
      ["Date", "Type", "Reference", "Description", "Debit", "Credit", "Running Balance", "Status"],
      ...statement.entries.map((e) => [
        e.date,
        e.type === "void_payment" ? "Void Payment" : e.type === "payment" ? "Payment" : "Invoice",
        e.reference,
        e.description,
        e.debit,
        e.credit,
        e.runningBalance,
        e.type === "void_payment" ? "VOID" : STATUS_LABEL[e.status as keyof typeof STATUS_LABEL] || e.status.toUpperCase(),
      ]),
    ];

    return formatCsv(rows);
  });

import { executeAnalytics } from "./analytics";
import type { AnalyticsData } from "@/lib/types";

export function generateAnalyticsCsvRows(analytics: AnalyticsData, data: { startDate?: string; endDate?: string }) {
  return [
    ["Date Range", data.startDate && data.endDate ? `${data.startDate} to ${data.endDate}` : "All Time"],
    ["Granularity", analytics.timeSeries.granularity.charAt(0).toUpperCase() + analytics.timeSeries.granularity.slice(1)],
    [],
    ["Analytics Summary"],
    ["Metric", "Value"],
    ["Average Invoice Value", `৳${analytics.averageInvoiceValue.toFixed(2)}`],
    ["Cash Received", `৳${analytics.cashReceived.toFixed(2)}`],
    ["Paid Rate", `${analytics.paidRate.toFixed(1)}%`],
    [],
    [`Time Series (${analytics.timeSeries.granularity.charAt(0).toUpperCase() + analytics.timeSeries.granularity.slice(1)})`],
    ["Period", "Invoiced", "Cash Received"],
    ...analytics.timeSeries.points.map((p) => [
      p.label,
      `৳${p.invoiced.toFixed(2)}`,
      `৳${p.cashReceived.toFixed(2)}`
    ]),
    [],
    ["Service Revenue"],
    ["Service", "Amount"],
    ...analytics.byService.map((s) => [
      s.name,
      `৳${s.amount.toFixed(2)}`
    ]),
    [],
    ["Invoice Status"],
    ["Status", "Count"],
    ...(Object.keys(STATUS_LABEL) as Array<keyof typeof STATUS_LABEL>).map((k) => [
      STATUS_LABEL[k],
      analytics.statusCounts[k] || 0
    ]),
    [],
    ["Payment Methods"],
    ["Method", "Amount"],
    ...analytics.paymentMethods.map((m) => [
      m.name,
      `৳${m.amount.toFixed(2)}`
    ]),
    [],
    ["Client Analytics"],
    ["Client", "Invoiced", "Cash Received", "Due", "Invoices", "Avg. Invoice"],
    ...analytics.clientBreakdown.map((c) => [
      c.clientName,
      `৳${c.invoiced.toFixed(2)}`,
      `৳${c.cashReceived.toFixed(2)}`,
      `৳${c.due.toFixed(2)}`,
      c.invoiceCount,
      `৳${c.averageInvoiceValue.toFixed(2)}`
    ])
  ];
}

export const exportAnalyticsCsv = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((data: { startDate?: string; endDate?: string }) => data)
  .handler(async ({ data, context }) => {
    requirePermission(context.user, "export_analytics");
    const sql = await getSql();
    const ownerId = await getAgencyOwnerId(sql);
    const analytics = await executeAnalytics(ownerId, data);
    const rows = generateAnalyticsCsvRows(analytics, data);
    return formatCsv(rows);
  });
