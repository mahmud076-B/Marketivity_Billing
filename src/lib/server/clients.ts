import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { dhakaYear } from "@/lib/dates";
import { getSql } from "@/lib/db";
import { uid } from "@/lib/utils";
import { logAudit } from "./audit";
import { requirePermission } from "./authz";
import { mapClient, mapInvoiceRow, mapPayment, n } from "./map";
import { nextSerial } from "./serial";
import type { Client, ClientProfile, ClientStatement, StatementEntry } from "@/lib/types";

export type ClientInput = {
  name: string;
  businessName?: string;
  phone?: string;
  email?: string;
  address?: string;
  facebookPage?: string;
  website?: string;
  notes?: string;
};

function clean(input: ClientInput) {
  const name = input.name.trim();
  if (!name) throw new Error("Please enter client name.");
  return {
    name,
    businessName: (input.businessName ?? "").trim(),
    phone: (input.phone ?? "").trim(),
    email: (input.email ?? "").trim(),
    address: (input.address ?? "").trim(),
    facebookPage: (input.facebookPage ?? "").trim(),
    website: (input.website ?? "").trim(),
    notes: (input.notes ?? "").trim(),
  };
}

export const listClients = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input?: { includeArchived?: boolean }) => input ?? {})
  .handler(async ({ context, data }) => {
    requirePermission(context.user, "view_clients");
    const sql = await getSql();
    const rows = data?.includeArchived
      ? await sql`select * from clients where user_id = ${context.userId} order by created_at desc`
      : await sql`select * from clients where user_id = ${context.userId} and is_archived = false order by created_at desc`;
    return rows.map((r) => mapClient(r));
  });

export const getClient = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }): Promise<ClientProfile> => {
    requirePermission(context.user, "view_clients");
    const sql = await getSql();
    const rows = await sql`select * from clients where id = ${id} and user_id = ${context.userId}`;
    const client = rows[0] ? mapClient(rows[0]) : null;
    if (!client) throw new Error("Client not found.");
    const invoices = await sql`
      select i.*, coalesce(c.name, 'Client') as client_name, coalesce(c.business_name, '') as business_name
      from invoices i
      left join clients c on c.id = i.client_id
      where i.user_id = ${context.userId} and i.client_id = ${id}
      order by i.issue_date desc, i.created_at desc
    `;
    const payments = await sql`
      select p.*, i.invoice_number, i.client_id, coalesce(c.name, 'Client') as client_name
      from payments p
      join invoices i on i.id = p.invoice_id
      left join clients c on c.id = i.client_id
      where p.user_id = ${context.userId} and i.client_id = ${id}
      order by p.payment_date desc, p.created_at desc
    `;
    const active = invoices.filter((r) => String(r.status) !== "void");
    const totalBilled = active.reduce((a, r) => a + n(r.total), 0);
    const totalPaid = active.reduce((a, r) => a + n(r.paid_amount), 0);
    return {
      client,
      totalInvoices: active.length,
      totalBilled,
      totalPaid,
      totalDue: Math.max(0, totalBilled - totalPaid),
      invoices: invoices.map((r) => mapInvoiceRow(r)),
      payments: payments.map((r) => mapPayment(r)),
    };
  });

export const createClient = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: ClientInput) => clean(input))
  .handler(async ({ context, data }) => {
    requirePermission(context.user, "create_clients");
    const sql = await getSql();
    const id = uid();
    const code = await nextSerial(sql, context.userId, "client", dhakaYear());
    await sql`
      insert into clients (
        id, user_id, client_code, name, business_name, phone, email, address,
        facebook_page, website, notes, is_sample
      ) values (
        ${id}, ${context.userId}, ${code}, ${data.name}, ${data.businessName}, ${data.phone},
        ${data.email}, ${data.address}, ${data.facebookPage}, ${data.website}, ${data.notes}, ${false}
      )
    `;
    await logAudit(sql, context.userId, "client", id, "client.created", code);
    const rows = await sql`select * from clients where id = ${id}`;
    return mapClient(rows[0]!);
  });

export const updateClient = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: ClientInput & { id: string }) => ({ id: input.id, ...clean(input) }))
  .handler(async ({ context, data }) => {
    requirePermission(context.user, "update_clients");
    const sql = await getSql();
    const rows = await sql`
      update clients set
        name = ${data.name},
        business_name = ${data.businessName},
        phone = ${data.phone},
        email = ${data.email},
        address = ${data.address},
        facebook_page = ${data.facebookPage},
        website = ${data.website},
        notes = ${data.notes}
      where id = ${data.id} and user_id = ${context.userId}
      returning *
    `;
    if (!rows[0]) throw new Error("Client not found.");
    return mapClient(rows[0]);
  });

export const deleteClient = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => {
    requirePermission(context.user, "update_clients");
    const sql = await getSql();
    const clientRows = await sql`select name, client_code from clients where id = ${id} and user_id = ${context.userId}`;
    if (!clientRows[0]) throw new Error("Client not found.");

    const activeInvoices = await sql<{ c: number }>`
      select count(*)::int as c from invoices where client_id = ${id} and user_id = ${context.userId} and status != 'void'
    `;
    if ((activeInvoices[0]?.c ?? 0) > 0) {
      throw new Error("This client has active invoices and cannot be deleted. Please void or settle active invoices first.");
    }

    const totalInvoices = await sql<{ c: number }>`
      select count(*)::int as c from invoices where client_id = ${id} and user_id = ${context.userId}
    `;
    if ((totalInvoices[0]?.c ?? 0) > 0) {
      // Archive client to preserve invoice integrity for voided invoices
      await sql`update clients set is_archived = true, updated_at = now() where id = ${id} and user_id = ${context.userId}`;
      await logAudit(sql, context.userId, "client", id, "client.archived", String(clientRows[0].client_code));
      return { ok: true, archived: true };
    }

    await logAudit(sql, context.userId, "client", id, "client.deleted", String(clientRows[0].client_code));
    await sql`delete from clients where id = ${id} and user_id = ${context.userId}`;
    return { ok: true, archived: false };
  });

export type { Client };

export const getClientStatement = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }): Promise<ClientStatement> => {
    requirePermission(context.user, "view_statements");
    const sql = await getSql();
    const rows = await sql`select * from clients where id = ${id} and user_id = ${context.userId}`;
    const client = rows[0] ? mapClient(rows[0]) : null;
    if (!client) throw new Error("Client not found.");

    const invoicesRows = await sql`
      select i.*, coalesce(c.name, 'Client') as client_name, coalesce(c.business_name, '') as business_name
      from invoices i
      left join clients c on c.id = i.client_id
      where i.user_id = ${context.userId} and i.client_id = ${id}
    `;
    const paymentsRows = await sql`
      select p.*, i.invoice_number, i.client_id, coalesce(c.name, 'Client') as client_name
      from payments p
      join invoices i on i.id = p.invoice_id
      left join clients c on c.id = i.client_id
      where p.user_id = ${context.userId} and i.client_id = ${id}
    `;

    const invoices = invoicesRows.map((r) => mapInvoiceRow(r));
    const payments = paymentsRows.map((r) => mapPayment(r));

    type RawEntry = {
      date: string;
      createdAt: string;
      type: "invoice" | "payment";
      invoice?: typeof invoices[0];
      payment?: typeof payments[0];
    };

    const rawEntries: RawEntry[] = [];

    let invoiceCount = 0;
    let paymentCount = 0;
    let totalInvoiced = 0;
    let totalPaid = 0;

    for (const inv of invoices) {
      invoiceCount++;
      if (inv.status !== "void") {
        totalInvoiced += n(inv.total);
      }
      rawEntries.push({
        date: String(inv.issueDate),
        createdAt: String(inv.createdAt),
        type: "invoice",
        invoice: inv,
      });
    }

    for (const pay of payments) {
      paymentCount++;
      if (pay.status !== "void") {
        totalPaid += n(pay.amount);
      }
      rawEntries.push({
        date: String(pay.paymentDate),
        createdAt: String(pay.createdAt),
        type: "payment",
        payment: pay,
      });
    }

    // Sort chronologically
    // Primary: date ASC
    // Secondary: type (invoice before payment if same date)
    // Tertiary: created_at ASC
    rawEntries.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.type !== b.type) return a.type === "invoice" ? -1 : 1;
      return a.createdAt.localeCompare(b.createdAt);
    });

    const entries: StatementEntry[] = [];
    let runningBalance = 0;

    for (const raw of rawEntries) {
      if (raw.type === "invoice" && raw.invoice) {
        const inv = raw.invoice;
        const debit = inv.status === "void" ? 0 : n(inv.total);
        runningBalance += debit;
        
        entries.push({
          date: inv.issueDate,
          type: "invoice",
          reference: inv.invoiceNumber,
          description: inv.status === "void" ? "Invoice (Void)" : "Invoice",
          debit,
          credit: 0,
          runningBalance,
          status: inv.status,
          relatedInvoiceId: inv.id,
        });
      } else if (raw.type === "payment" && raw.payment) {
        const pay = raw.payment;
        const credit = pay.status === "void" ? 0 : n(pay.amount);
        runningBalance -= credit;

        entries.push({
          date: pay.paymentDate,
          type: pay.status === "void" ? "void_payment" : "payment",
          reference: pay.receiptNumber || pay.transactionId,
          description: pay.status === "void" ? `Payment (Void) - ${pay.invoiceNumber}` : `Payment - ${pay.invoiceNumber}`,
          debit: 0,
          credit: n(pay.amount), // Amount remains visible for historical context even if void
          runningBalance,
          status: pay.status,
          paymentMethod: pay.method,
          relatedPaymentId: pay.id,
          relatedInvoiceId: pay.invoiceId,
        });
      }
    }

    return {
      client,
      entries,
      totalInvoiced,
      totalPaid,
      currentDue: Math.max(0, totalInvoiced - totalPaid),
      invoiceCount,
      paymentCount,
    };
  });
