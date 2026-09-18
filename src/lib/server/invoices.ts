import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { computeTotals, deriveStatus, dueOf, lineAmount } from "@/lib/calculations";
import { dhakaIsoDate, dhakaYear, nowDhaka } from "@/lib/dates";
import { getSql } from "@/lib/db";
import { parseMoney } from "@/lib/money";
import type { DiscountType, Invoice, InvoiceDraft, InvoiceListRow, InvoiceStatus, PaymentMethod } from "@/lib/types";
import { uid } from "@/lib/utils";
import { logAudit } from "./audit";
import { requirePermission } from "./authz";
import { mapClient, mapInvoice, mapInvoiceRow, mapItem, mapPayment } from "./map";
import { nextSerial } from "./serial";
import { refreshOverdue } from "./status";
import { getAgencyOwnerId } from "./workspace";

export type InvoiceFilters = {
  status?: InvoiceStatus | "all";
  q?: string;
  clientId?: string;
  from?: string;
  to?: string;
  minAmount?: number;
  maxAmount?: number;
};

function draftItems(draft: InvoiceDraft) {
  return draft.items
    .filter((it) => it.serviceName.trim())
    .map((it, i) => ({
      ...it,
      serviceName: it.serviceName.trim(),
      description: it.description.trim(),
      qty: Number(it.qty) || 0,
      unitPrice: parseMoney(it.unitPrice),
      sortOrder: i,
      amount: lineAmount(Number(it.qty) || 0, parseMoney(it.unitPrice)),
    }));
}

function totalsOf(draft: InvoiceDraft) {
  return computeTotals({
    items: draftItems(draft),
    discountType: draft.discountType,
    discountValue: parseMoney(draft.discountValue),
    taxEnabled: draft.taxEnabled,
    taxRate: parseMoney(draft.taxRate),
    serviceCharge: parseMoney(draft.serviceCharge),
    cashOutCharge: parseMoney(draft.cashOutCharge),
    isBoosting: draft.isBoosting,
    adBudgetUsd: parseMoney(draft.adBudgetUsd),
    marketivityRate: parseMoney(draft.marketivityRate) || 150,
  });
}

async function insertItems(
  sql: Awaited<ReturnType<typeof getSql>>,
  userId: string,
  invoiceId: string,
  draft: InvoiceDraft,
  advertisingCost: number,
) {
  let order = 0;
  if (draft.isBoosting && advertisingCost > 0) {
    const usd = parseMoney(draft.adBudgetUsd);
    const rate = parseMoney(draft.marketivityRate) || 150;
    await sql`
      insert into invoice_items (id, invoice_id, user_id, service_id, service_name, description, qty, unit_price, amount, sort_order)
      values (
        ${uid()}, ${invoiceId}, ${userId}, ${null}, ${"Meta Boosting"},
        ${`Advertising budget $${usd} × ৳${rate} / USD`},
        ${usd}, ${rate}, ${advertisingCost}, ${order++}
      )
    `;
  }
  for (const it of draftItems(draft)) {
    await sql`
      insert into invoice_items (id, invoice_id, user_id, service_id, service_name, description, qty, unit_price, amount, sort_order)
      values (
        ${uid()}, ${invoiceId}, ${userId}, ${it.serviceId}, ${it.serviceName}, ${it.description},
        ${it.qty}, ${it.unitPrice}, ${it.amount}, ${order++}
      )
    `;
  }
}

export const listInvoices = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: InvoiceFilters = {}) => input)
  .handler(async ({ context, data }): Promise<InvoiceListRow[]> => {
    requirePermission(context.user, "view_invoices");
    const sql = await getSql();
    const ownerId = await getAgencyOwnerId(sql);
    await refreshOverdue(sql, ownerId);
    const rows = await sql`
      select i.*, coalesce(c.name, 'Client') as client_name, coalesce(c.business_name, '') as business_name
      from invoices i
      left join clients c on c.id = i.client_id
      where i.user_id = ${ownerId}
      order by i.created_at desc
    `;
    let list = rows.map((r) => mapInvoiceRow(r));
    const status = data.status && data.status !== "all" ? data.status : null;
    if (status) list = list.filter((i) => i.status === status);
    if (data.clientId) list = list.filter((i) => i.clientId === data.clientId);
    if (data.from) list = list.filter((i) => i.issueDate >= data.from!);
    if (data.to) list = list.filter((i) => i.issueDate <= data.to!);
    if (data.minAmount != null) list = list.filter((i) => i.total >= data.minAmount!);
    if (data.maxAmount != null) list = list.filter((i) => i.total <= data.maxAmount!);
    const q = data.q?.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (i) =>
          i.invoiceNumber.toLowerCase().includes(q) ||
          i.clientName.toLowerCase().includes(q) ||
          i.businessName.toLowerCase().includes(q),
      );
    }
    return list;
  });

export const getInvoice = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => {
    requirePermission(context.user, "view_invoices");
    const sql = await getSql();
    const ownerId = await getAgencyOwnerId(sql);
    await refreshOverdue(sql, ownerId);
    const rows = await sql`
      select i.*, coalesce(c.name, 'Client') as client_name, coalesce(c.business_name, '') as business_name
      from invoices i
      left join clients c on c.id = i.client_id
      where i.id = ${id} and i.user_id = ${ownerId}
    `;
    if (!rows[0]) throw new Error("Invoice not found.");
    const invoice = mapInvoice(rows[0]);
    const clientRows = await sql`select * from clients where id = ${invoice.clientId} and user_id = ${ownerId}`;
    const items = await sql`select * from invoice_items where invoice_id = ${id} and user_id = ${ownerId} order by sort_order`;
    const payments = await sql`
      select p.*, i.invoice_number, i.client_id, coalesce(c.name, 'Client') as client_name
      from payments p
      join invoices i on i.id = p.invoice_id
      left join clients c on c.id = i.client_id
      where p.invoice_id = ${id} and p.user_id = ${ownerId}
      order by p.created_at asc
    `;
    const audit = await sql`
      select id, entity_type, entity_id, action, details, created_at
      from audit_log
      where entity_id = ${id}
      order by created_at desc
      limit 40
    `;
    return {
      invoice: { ...invoice, items: items.map((r) => mapItem(r)), client: clientRows[0] ? mapClient(clientRows[0]) : undefined },
      payments: payments.map((r) => mapPayment(r)),
      audit: audit.map((r) => ({
        id: String(r.id),
        entityType: String(r.entity_type),
        entityId: String(r.entity_id),
        action: String(r.action),
        details: String(r.details ?? ""),
        createdAt: String(r.created_at),
      })),
    };
  });

export const previewNextInvoiceNumber = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    requirePermission(context.user, "create_invoices");
    const sql = await getSql();
    const ownerId = await getAgencyOwnerId(sql);
    const year = dhakaYear();
    const rows = await sql<{ last_number: number }>`
      select last_number from serials where user_id = ${ownerId} and kind = 'invoice' and year = ${year}
    `;
    const next = Number(rows[0]?.last_number ?? 0) + 1;
    return `MKT-INV-${year}-${String(next).padStart(4, "0")}`;
  });

export const createInvoice = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: InvoiceDraft) => input)
  .handler(async ({ context, data }): Promise<Invoice> => {
    requirePermission(context.user, "create_invoices");
    if (!data.clientId) throw new Error("Please select a client.");
    const items = draftItems(data);
    if (!data.isBoosting && items.length === 0) throw new Error("Please add at least one service.");
    const totals = totalsOf(data);
    if (totals.total < 0) throw new Error("Please enter a valid amount.");
    const sql = await getSql();
    const ownerId = await getAgencyOwnerId(sql);
    const now = nowDhaka();
    const id = uid();
    const number = await nextSerial(sql, ownerId, "invoice", now.year);
    const issueDate = data.issueDate || now.isoDate;
    const issueTime = data.issueTime || now.time;
    const paid = parseMoney(data.initialPayment?.amount ?? 0);
    if (paid < 0) throw new Error("Please enter a valid amount.");
    const dueAmt = dueOf(totals.total, paid);
    const status = deriveStatus(totals.total, paid, data.dueDate || null, now.isoDate);

    await sql`
      insert into invoices (
        id, user_id, invoice_number, client_id, issue_date, issue_time, due_date, status,
        subtotal, discount_type, discount_value, tax_enabled, tax_rate, tax_amount, service_charge, cash_out_charge,
        total, paid_amount, due_amount, payment_terms, notes, is_boosting, ad_budget_usd,
        marketivity_rate, is_sample
      ) values (
        ${id}, ${ownerId}, ${number}, ${data.clientId}, ${issueDate}, ${issueTime},
        ${data.dueDate || null}, ${status},
        ${totals.subtotal}, ${data.discountType}, ${parseMoney(data.discountValue)},
        ${data.taxEnabled}, ${parseMoney(data.taxRate)}, ${totals.taxAmount}, ${totals.serviceCharge}, ${totals.cashOutCharge},
        ${totals.total}, ${paid}, ${dueAmt}, ${data.paymentTerms.trim()}, ${data.notes.trim()},
        ${data.isBoosting}, ${data.isBoosting ? parseMoney(data.adBudgetUsd) : null},
        ${data.isBoosting ? parseMoney(data.marketivityRate) || 150 : null}, ${false}
      )
    `;
    await insertItems(sql, ownerId, id, data, totals.advertisingCost);
    await logAudit(sql, context.userId, "invoice", id, "invoice.created", number);

    if (paid > 0 && data.initialPayment) {
      const txn = await nextSerial(sql, ownerId, "transaction", now.year);
      const rcp = await nextSerial(sql, ownerId, "receipt", now.year);
      const method: PaymentMethod = data.initialPayment.method;
      await sql`
        insert into payments (
          id, user_id, invoice_id, transaction_id, receipt_number, amount, method,
          payment_date, payment_time, external_txn_id, notes, previous_due, remaining_due,
          status, voided_at, void_reason
        ) values (
          ${uid()}, ${ownerId}, ${id}, ${txn}, ${rcp}, ${paid}, ${method},
          ${issueDate}, ${issueTime}, ${data.initialPayment.externalTxnId.trim()},
          ${data.initialPayment.notes.trim()}, ${totals.total}, ${dueAmt},
          ${"active"}, ${null}, ${""}
        )
      `;
      await logAudit(sql, context.userId, "payment", id, "payment.recorded", txn);
      await logAudit(sql, context.userId, "receipt", id, "receipt.generated", rcp);
      if (status === "paid") {
        await logAudit(sql, context.userId, "invoice", id, "invoice.marked_paid", number);
      }
    }

    const rows = await sql`select * from invoices where id = ${id}`;
    return mapInvoice(rows[0]!);
  });

export const updateInvoice = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: InvoiceDraft & { id: string }) => input)
  .handler(async ({ context, data }) => {
    requirePermission(context.user, "update_invoices");
    const sql = await getSql();
    const ownerId = await getAgencyOwnerId(sql);
    const existing = await sql`select * from invoices where id = ${data.id} and user_id = ${ownerId}`;
    if (!existing[0]) throw new Error("Invoice not found.");
    if (String(existing[0].status) === "void") throw new Error("Voided invoices cannot be edited.");
    if (!data.clientId) throw new Error("Please select a client.");
    const items = draftItems(data);
    if (!data.isBoosting && items.length === 0) throw new Error("Please add at least one service.");
    const totals = totalsOf(data);
    const paid = parseMoney(existing[0].paid_amount);
    const today = dhakaIsoDate();
    const dueAmt = dueOf(totals.total, paid);
    const status = deriveStatus(totals.total, paid, data.dueDate || null, today);

    await sql`
      update invoices set
        client_id = ${data.clientId},
        issue_date = ${data.issueDate},
        issue_time = ${data.issueTime},
        due_date = ${data.dueDate || null},
        status = ${status},
        subtotal = ${totals.subtotal},
        discount_type = ${data.discountType},
        discount_value = ${parseMoney(data.discountValue)},
        tax_enabled = ${data.taxEnabled},
        tax_rate = ${parseMoney(data.taxRate)},
        tax_amount = ${totals.taxAmount},
        service_charge = ${totals.serviceCharge},
        cash_out_charge = ${totals.cashOutCharge},
        total = ${totals.total},
        due_amount = ${dueAmt},
        payment_terms = ${data.paymentTerms.trim()},
        notes = ${data.notes.trim()},
        is_boosting = ${data.isBoosting},
        ad_budget_usd = ${data.isBoosting ? parseMoney(data.adBudgetUsd) : null},
        marketivity_rate = ${data.isBoosting ? parseMoney(data.marketivityRate) || 150 : null},
        updated_at = now()
      where id = ${data.id} and user_id = ${ownerId}
    `;
    await sql`delete from invoice_items where invoice_id = ${data.id} and user_id = ${ownerId}`;
    await insertItems(sql, ownerId, data.id, data, totals.advertisingCost);
    await logAudit(sql, context.userId, "invoice", data.id, "invoice.edited", String(existing[0].invoice_number));
    const rows = await sql`select * from invoices where id = ${data.id}`;
    return mapInvoice(rows[0]!);
  });

export const duplicateInvoice = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => {
    requirePermission(context.user, "duplicate_invoices");
    const sql = await getSql();
    const ownerId = await getAgencyOwnerId(sql);
    const existing = await sql`select * from invoices where id = ${id} and user_id = ${ownerId}`;
    if (!existing[0]) throw new Error("Invoice not found.");
    const src = mapInvoice(existing[0]);
    const items = await sql`select * from invoice_items where invoice_id = ${id} order by sort_order`;
    const now = nowDhaka();
    const newId = uid();
    const number = await nextSerial(sql, ownerId, "invoice", now.year);
    await sql`
      insert into invoices (
        id, user_id, invoice_number, client_id, issue_date, issue_time, due_date, status,
        subtotal, discount_type, discount_value, tax_enabled, tax_rate, tax_amount, service_charge, cash_out_charge,
        total, paid_amount, due_amount, payment_terms, notes, is_boosting, ad_budget_usd,
        marketivity_rate, is_sample
      ) values (
        ${newId}, ${ownerId}, ${number}, ${src.clientId}, ${now.isoDate}, ${now.time},
        ${src.dueDate}, ${"unpaid"},
        ${src.subtotal}, ${src.discountType}, ${src.discountValue}, ${src.taxEnabled}, ${src.taxRate},
        ${src.taxAmount}, ${src.serviceCharge}, ${src.cashOutCharge}, ${src.total}, ${0}, ${src.total}, ${src.paymentTerms},
        ${src.notes}, ${src.isBoosting}, ${src.adBudgetUsd}, ${src.marketivityRate}, ${false}
      )
    `;
    for (const row of items) {
      const it = mapItem(row);
      await sql`
        insert into invoice_items (id, invoice_id, user_id, service_id, service_name, description, qty, unit_price, amount, sort_order)
        values (${uid()}, ${newId}, ${ownerId}, ${it.serviceId}, ${it.serviceName}, ${it.description}, ${it.qty}, ${it.unitPrice}, ${it.amount}, ${it.sortOrder})
      `;
    }
    await logAudit(sql, context.userId, "invoice", newId, "invoice.created", `${number} (duplicate of ${src.invoiceNumber})`);
    return { id: newId, invoiceNumber: number };
  });

export const voidInvoice = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => {
    requirePermission(context.user, "void_invoices");
    const sql = await getSql();
    const ownerId = await getAgencyOwnerId(sql);
    const rows = await sql`
      update invoices set status = 'void', updated_at = now()
      where id = ${id} and user_id = ${ownerId} and status != 'void'
      returning invoice_number
    `;
    if (!rows[0]) throw new Error("Invoice not found.");
    await logAudit(sql, context.userId, "invoice", id, "invoice.voided", String(rows[0].invoice_number));
    return { ok: true };
  });

export const deleteInvoice = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => {
    requirePermission(context.user, "void_invoices");
    const sql = await getSql();
    const ownerId = await getAgencyOwnerId(sql);
    const rows = await sql`select invoice_number, status from invoices where id = ${id} and user_id = ${ownerId}`;
    if (!rows[0]) throw new Error("Invoice not found.");

    const payCount = await sql<{ count: number }>`
      select count(*)::int as count from payments where invoice_id = ${id} and user_id = ${ownerId}
    `;
    if (Number(payCount[0]?.count ?? 0) > 0) {
      throw new Error(
        "This invoice has payment history and cannot be permanently deleted. Please void the invoice to preserve the financial record.",
      );
    }

    await sql.transaction(async (tx) => {
      await logAudit(tx, context.userId, "invoice", id, "invoice.deleted", String(rows[0].invoice_number));
      await tx`delete from invoice_items where invoice_id = ${id} and user_id = ${ownerId}`;
      await tx`delete from invoices where id = ${id} and user_id = ${ownerId}`;
    });
    return { ok: true };
  });

export type { DiscountType };
