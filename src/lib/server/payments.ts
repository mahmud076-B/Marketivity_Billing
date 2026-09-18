import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { deriveStatus, dueOf } from "@/lib/calculations";
import { dhakaIsoDate, dhakaYear, nowDhaka } from "@/lib/dates";
import { getSql } from "@/lib/db";
import { parseMoney } from "@/lib/money";
import type { PaymentMethod } from "@/lib/types";
import { uid } from "@/lib/utils";
import { logAudit } from "./audit";
import { requirePermission } from "./authz";
import { mapClient, mapInvoice, mapItem, mapPayment } from "./map";
import { nextSerial } from "./serial";
import { getAgencyOwnerId } from "./workspace";

export type RecordPaymentInput = {
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  paymentDate?: string;
  paymentTime?: string;
  externalTxnId?: string;
  notes?: string;
  allowOverpay?: boolean;
};

export const listPayments = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((q: string = "") => q)
  .handler(async ({ context, data: q }) => {
    requirePermission(context.user, "view_payments");
    const sql = await getSql();
    const ownerId = await getAgencyOwnerId(sql);
    const rows = await sql`
      select p.*, i.invoice_number, i.client_id, coalesce(c.name, 'Client') as client_name
      from payments p
      join invoices i on i.id = p.invoice_id
      left join clients c on c.id = i.client_id
      where p.user_id = ${ownerId}
      order by p.created_at desc
    `;
    let list = rows.map((r) => mapPayment(r));
    const query = q.trim().toLowerCase();
    if (query) {
      list = list.filter(
        (p) =>
          p.clientName.toLowerCase().includes(query) ||
          p.invoiceNumber.toLowerCase().includes(query) ||
          p.transactionId.toLowerCase().includes(query) ||
          p.receiptNumber.toLowerCase().includes(query) ||
          p.externalTxnId.toLowerCase().includes(query),
      );
    }
    return list;
  });

export const getPayment = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => {
    requirePermission(context.user, "view_payments");
    const sql = await getSql();
    const ownerId = await getAgencyOwnerId(sql);
    const rows = await sql`
      select p.*, i.invoice_number, i.client_id, coalesce(c.name, 'Client') as client_name
      from payments p
      join invoices i on i.id = p.invoice_id
      left join clients c on c.id = i.client_id
      where p.id = ${id} and p.user_id = ${ownerId}
    `;
    if (!rows[0]) throw new Error("Receipt not found.");
    const payment = mapPayment(rows[0]);
    const invRows = await sql`select * from invoices where id = ${payment.invoiceId} and user_id = ${ownerId}`;
    const clientRows = await sql`select * from clients where id = ${payment.clientId} and user_id = ${ownerId}`;
    const items = await sql`select * from invoice_items where invoice_id = ${payment.invoiceId} order by sort_order`;
    return {
      payment,
      invoice: invRows[0] ? { ...mapInvoice(invRows[0]), items: items.map((r) => mapItem(r)), client: clientRows[0] ? mapClient(clientRows[0]) : undefined } : null,
      client: clientRows[0] ? mapClient(clientRows[0]) : null,
    };
  });

export const recordPayment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: RecordPaymentInput) => input)
  .handler(async ({ context, data }) => {
    requirePermission(context.user, "create_payments");
    const amount = parseMoney(data.amount);
    if (amount <= 0) throw new Error("Please enter a valid amount.");
    const sql = await getSql();
    const ownerId = await getAgencyOwnerId(sql);
    const rows = await sql`select * from invoices where id = ${data.invoiceId} and user_id = ${ownerId}`;
    if (!rows[0]) throw new Error("Invoice not found.");
    const invoice = mapInvoice(rows[0]);
    if (invoice.status === "void") throw new Error("Cannot record payment on a voided invoice.");
    const previousDue = invoice.dueAmount;
    if (amount > previousDue + 0.001 && !data.allowOverpay) {
      return { needsOverpayConfirm: true as const, previousDue, total: invoice.total, paid: invoice.paidAmount };
    }
    const remaining = Math.max(0, previousDue - amount);
    const now = nowDhaka();
    const id = uid();
    const txn = await nextSerial(sql, ownerId, "transaction", now.year);
    const rcp = await nextSerial(sql, ownerId, "receipt", now.year);

    return await sql.transaction(async (tx) => {
      await tx`
        insert into payments (
          id, user_id, invoice_id, transaction_id, receipt_number, amount, method,
          payment_date, payment_time, external_txn_id, notes, previous_due, remaining_due,
          status, voided_at, void_reason
        ) values (
          ${id}, ${ownerId}, ${invoice.id}, ${txn}, ${rcp}, ${amount}, ${data.method},
          ${data.paymentDate || now.isoDate}, ${data.paymentTime || now.time},
          ${(data.externalTxnId ?? "").trim()}, ${(data.notes ?? "").trim()}, ${previousDue}, ${remaining},
          ${"active"}, ${null}, ${""}
        )
      `;

      // Recalculate invoice based on all active payments
      const activeRows = await tx<{ amount: number }>`
        select amount from payments
        where invoice_id = ${invoice.id} and user_id = ${ownerId} and status = 'active'
      `;
      const recalculatedPaid = parseMoney(activeRows.reduce((sum, r) => sum + Number(r.amount), 0));
      const recalculatedDue = dueOf(invoice.total, recalculatedPaid);
      const recalculatedStatus = deriveStatus(invoice.total, recalculatedPaid, invoice.dueDate, dhakaIsoDate());

      await tx`
        update invoices set
          paid_amount = ${recalculatedPaid},
          due_amount = ${recalculatedDue},
          status = ${recalculatedStatus},
          updated_at = now()
        where id = ${invoice.id} and user_id = ${ownerId}
      `;

      await logAudit(tx, context.userId, "payment", invoice.id, "payment.recorded", txn);
      await logAudit(tx, context.userId, "receipt", invoice.id, "receipt.generated", rcp);
      if (recalculatedStatus === "paid") {
        await logAudit(tx, context.userId, "invoice", invoice.id, "invoice.marked_paid", invoice.invoiceNumber);
      }
      return {
        needsOverpayConfirm: false as const,
        paymentId: id,
        receiptNumber: rcp,
        transactionId: txn,
        status: recalculatedStatus,
      };
    });
  });

export const voidPayment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { paymentId: string; reason?: string }) => input)
  .handler(async ({ context, data }) => {
    requirePermission(context.user, "void_payments");
    const sql = await getSql();
    const ownerId = await getAgencyOwnerId(sql);
    const rows = await sql`
      select p.*, i.total, i.invoice_number, i.due_date
      from payments p
      join invoices i on i.id = p.invoice_id
      where p.id = ${data.paymentId} and p.user_id = ${ownerId}
    `;
    if (!rows[0]) throw new Error("Payment not found.");
    if (String(rows[0].status) === "void") throw new Error("Payment is already voided.");

    const reason = (data.reason ?? "").trim() || "Payment voided by user";
    const invoiceId = String(rows[0].invoice_id);

    return await sql.transaction(async (tx) => {
      // Mark payment as void
      await tx`
        update payments set
          status = 'void',
          voided_at = now(),
          void_reason = ${reason}
        where id = ${data.paymentId} and user_id = ${ownerId}
      `;

      // Recalculate invoice totals based on ACTIVE payments only
      const activeRows = await tx<{ amount: number }>`
        select amount from payments
        where invoice_id = ${invoiceId} and user_id = ${ownerId} and status = 'active'
      `;
      const newPaid = parseMoney(activeRows.reduce((sum, r) => sum + Number(r.amount), 0));
      const total = parseMoney(rows[0].total);
      const newDue = dueOf(total, newPaid);
      const today = dhakaIsoDate();
      const newStatus = deriveStatus(
        total,
        newPaid,
        rows[0].due_date ? String(rows[0].due_date).slice(0, 10) : null,
        today,
      );

      await tx`
        update invoices set
          paid_amount = ${newPaid},
          due_amount = ${newDue},
          status = ${newStatus},
          updated_at = now()
        where id = ${invoiceId} and user_id = ${ownerId}
      `;

      await logAudit(
        tx,
        context.userId,
        "payment",
        data.paymentId,
        "payment.voided",
        `Voided receipt ${rows[0].receipt_number} (amount: ${rows[0].amount}) for invoice ${rows[0].invoice_number}. Reason: ${reason}`,
      );

      return {
        ok: true,
        paymentId: data.paymentId,
        invoiceId,
        receiptNumber: String(rows[0].receipt_number),
        newPaid,
        newDue,
        newStatus,
      };
    });
  });
