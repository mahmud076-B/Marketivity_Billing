import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { requirePermission } from "./authz";
import { getAgencyOwnerId } from "./workspace";

export const exportBackup = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    requirePermission(context.user, "export_backup");
    const sql = await getSql();
    const userId = await getAgencyOwnerId(sql);
    const [settings, clients, services, invoices, items, payments, serials, audit] = await Promise.all([
      sql`select * from settings where user_id = ${userId}`,
      sql`select * from clients where user_id = ${userId}`,
      sql`select * from services where user_id = ${userId}`,
      sql`select * from invoices where user_id = ${userId}`,
      sql`select * from invoice_items where user_id = ${userId}`,
      sql`select * from payments where user_id = ${userId}`,
      sql`select * from serials where user_id = ${userId}`,
      sql`select * from audit_log where user_id = ${userId} order by created_at desc limit 500`,
    ]);
    const payload = {
      version: 1 as const,
      exportedAt: new Date().toISOString(),
      settings: (settings[0] ?? null) as Record<string, string | number | boolean | null> | null,
      clients: clients as Array<Record<string, string | number | boolean | null>>,
      services: services as Array<Record<string, string | number | boolean | null>>,
      invoices: invoices as Array<Record<string, string | number | boolean | null>>,
      items: items as Array<Record<string, string | number | boolean | null>>,
      payments: payments as Array<Record<string, string | number | boolean | null>>,
      serials: serials as Array<Record<string, string | number | boolean | null>>,
      audit: audit as Array<Record<string, string | number | boolean | null>>,
    };
    return payload;
  });

type BackupPayload = {
  version?: number;
  exportedAt?: string;
  settings?: Record<string, unknown> | null;
  clients?: Record<string, unknown>[];
  services?: Record<string, unknown>[];
  invoices?: Record<string, unknown>[];
  items?: Record<string, unknown>[];
  payments?: Record<string, unknown>[];
  serials?: Record<string, unknown>[];
};

export function validateBackupPayload(data: unknown): asserts data is BackupPayload {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Invalid backup file: Payload must be a JSON object.");
  }
  const payload = data as BackupPayload;
  if (payload.version !== undefined && (typeof payload.version !== "number" || payload.version < 1)) {
    throw new Error("Invalid backup file: Unsupported backup version.");
  }

  // Validate clients
  if (payload.clients !== undefined) {
    if (!Array.isArray(payload.clients)) throw new Error("Invalid backup file: 'clients' must be an array.");
    for (let i = 0; i < payload.clients.length; i++) {
      const c = payload.clients[i];
      if (!c || typeof c !== "object") throw new Error(`Invalid backup file: Client at index ${i} is invalid.`);
      if (!c.id || typeof c.id !== "string") throw new Error(`Invalid backup file: Client at index ${i} is missing an ID.`);
      if (!c.name || typeof c.name !== "string") throw new Error(`Invalid backup file: Client '${c.id}' is missing a name.`);
    }
  }

  // Validate services
  if (payload.services !== undefined) {
    if (!Array.isArray(payload.services)) throw new Error("Invalid backup file: 'services' must be an array.");
    for (let i = 0; i < payload.services.length; i++) {
      const s = payload.services[i];
      if (!s || typeof s !== "object") throw new Error(`Invalid backup file: Service at index ${i} is invalid.`);
      if (!s.id || typeof s.id !== "string") throw new Error(`Invalid backup file: Service at index ${i} is missing an ID.`);
      if (!s.name || typeof s.name !== "string") throw new Error(`Invalid backup file: Service '${s.id}' is missing a name.`);
    }
  }

  // Validate invoices
  const invoiceIds = new Set<string>();
  if (payload.invoices !== undefined) {
    if (!Array.isArray(payload.invoices)) throw new Error("Invalid backup file: 'invoices' must be an array.");
    for (let i = 0; i < payload.invoices.length; i++) {
      const inv = payload.invoices[i];
      if (!inv || typeof inv !== "object") throw new Error(`Invalid backup file: Invoice at index ${i} is invalid.`);
      if (!inv.id || typeof inv.id !== "string") throw new Error(`Invalid backup file: Invoice at index ${i} is missing an ID.`);
      if (!inv.invoice_number) throw new Error(`Invalid backup file: Invoice '${inv.id}' is missing invoice_number.`);
      if (!inv.client_id) throw new Error(`Invalid backup file: Invoice '${inv.invoice_number}' is missing client_id.`);
      if (!inv.issue_date) throw new Error(`Invalid backup file: Invoice '${inv.invoice_number}' is missing issue_date.`);
      invoiceIds.add(String(inv.id));
    }
  }

  // Validate items
  if (payload.items !== undefined) {
    if (!Array.isArray(payload.items)) throw new Error("Invalid backup file: 'items' must be an array.");
    for (let i = 0; i < payload.items.length; i++) {
      const it = payload.items[i];
      if (!it || typeof it !== "object") throw new Error(`Invalid backup file: Item at index ${i} is invalid.`);
      if (!it.id) throw new Error(`Invalid backup file: Item at index ${i} is missing an ID.`);
      if (!it.invoice_id) throw new Error(`Invalid backup file: Item '${it.id}' is missing invoice_id.`);
      if (invoiceIds.size > 0 && !invoiceIds.has(String(it.invoice_id))) {
        throw new Error(`Invalid backup file: Item references non-existent invoice '${it.invoice_id}'.`);
      }
    }
  }

  // Validate payments
  if (payload.payments !== undefined) {
    if (!Array.isArray(payload.payments)) throw new Error("Invalid backup file: 'payments' must be an array.");
    for (let i = 0; i < payload.payments.length; i++) {
      const p = payload.payments[i];
      if (!p || typeof p !== "object") throw new Error(`Invalid backup file: Payment at index ${i} is invalid.`);
      if (!p.id) throw new Error(`Invalid backup file: Payment at index ${i} is missing an ID.`);
      if (!p.invoice_id) throw new Error(`Invalid backup file: Payment '${p.id}' is missing invoice_id.`);
      if (invoiceIds.size > 0 && !invoiceIds.has(String(p.invoice_id))) {
        throw new Error(`Invalid backup file: Payment references non-existent invoice '${p.invoice_id}'.`);
      }
      if (p.amount == null || isNaN(Number(p.amount))) {
        throw new Error(`Invalid backup file: Payment '${p.id}' has invalid amount.`);
      }
    }
  }

  // Validate serials
  if (payload.serials !== undefined) {
    if (!Array.isArray(payload.serials)) throw new Error("Invalid backup file: 'serials' must be an array.");
    for (let i = 0; i < payload.serials.length; i++) {
      const s = payload.serials[i];
      if (!s || typeof s !== "object") throw new Error(`Invalid backup file: Serial at index ${i} is invalid.`);
      if (!s.kind || !s.year || s.last_number == null) {
        throw new Error(`Invalid backup file: Serial at index ${i} is malformed.`);
      }
    }
  }
}

export const importBackup = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    validateBackupPayload(input);
    return input;
  })
  .handler(async ({ context, data }) => {
    requirePermission(context.user, "import_backup");
    const sql = await getSql();
    const userId = await getAgencyOwnerId(sql);

    return await sql.transaction(async (tx) => {
      // Step 1: Clean slate for user inside transaction
      await tx`delete from payments where user_id = ${userId}`;
      await tx`delete from invoice_items where user_id = ${userId}`;
      await tx`delete from invoices where user_id = ${userId}`;
      await tx`delete from clients where user_id = ${userId}`;
      await tx`delete from services where user_id = ${userId}`;
      await tx`delete from serials where user_id = ${userId}`;

      // Step 2: Insert settings
      if (data.settings) {
        const s = data.settings;
        await tx`
          insert into settings (
            user_id, agency_name, tagline, positioning, phone, whatsapp, email, address,
            website, facebook_page, bkash_number, nagad_number, bank_info, logo_data_url,
            accent_color, footer_text, payment_instructions, terms, theme, invoice_theme, sample_loaded
          ) values (
            ${userId}, ${String(s.agency_name ?? "Marketivity")}, ${String(s.tagline ?? "")},
            ${String(s.positioning ?? "")}, ${String(s.phone ?? "")}, ${String(s.whatsapp ?? "")},
            ${String(s.email ?? "")}, ${String(s.address ?? "")}, ${String(s.website ?? "")},
            ${String(s.facebook_page ?? "")}, ${String(s.bkash_number ?? "")}, ${String(s.nagad_number ?? "")},
            ${String(s.bank_info ?? "")}, ${String(s.logo_data_url ?? "")}, ${String(s.accent_color ?? "#F5A623")},
            ${String(s.footer_text ?? "")}, ${String(s.payment_instructions ?? "")}, ${String(s.terms ?? "")},
            ${String(s.theme ?? "dark")}, ${String(s.invoice_theme ?? "classic")}, ${Boolean(s.sample_loaded)}
          )
          on conflict (user_id) do update set
            agency_name = excluded.agency_name, tagline = excluded.tagline, positioning = excluded.positioning,
            phone = excluded.phone, whatsapp = excluded.whatsapp, email = excluded.email, address = excluded.address,
            website = excluded.website, facebook_page = excluded.facebook_page, bkash_number = excluded.bkash_number,
            nagad_number = excluded.nagad_number, bank_info = excluded.bank_info, logo_data_url = excluded.logo_data_url,
            accent_color = excluded.accent_color, footer_text = excluded.footer_text,
            payment_instructions = excluded.payment_instructions, terms = excluded.terms, theme = excluded.theme,
            invoice_theme = excluded.invoice_theme, sample_loaded = excluded.sample_loaded, updated_at = now()
        `;
      }

      // Step 3: Insert clients
      for (const c of data.clients ?? []) {
        await tx`
          insert into clients (id, user_id, client_code, name, business_name, phone, email, address, facebook_page, website, notes, is_sample, is_archived)
          values (
            ${String(c.id)}, ${userId}, ${String(c.client_code)}, ${String(c.name)}, ${String(c.business_name ?? "")},
            ${String(c.phone ?? "")}, ${String(c.email ?? "")}, ${String(c.address ?? "")}, ${String(c.facebook_page ?? "")},
            ${String(c.website ?? "")}, ${String(c.notes ?? "")}, ${Boolean(c.is_sample)}, ${Boolean(c.is_archived)}
          )
        `;
      }

      // Step 4: Insert services
      for (const s of data.services ?? []) {
        await tx`
          insert into services (id, user_id, name, description, default_rate, is_boosting, usd_rate, is_sample)
          values (
            ${String(s.id)}, ${userId}, ${String(s.name)}, ${String(s.description ?? "")}, ${Number(s.default_rate) || 0},
            ${Boolean(s.is_boosting)}, ${s.usd_rate != null ? Number(s.usd_rate) : null}, ${Boolean(s.is_sample)}
          )
        `;
      }

      // Step 5: Insert invoices
      for (const i of data.invoices ?? []) {
        await tx`
          insert into invoices (
            id, user_id, invoice_number, client_id, issue_date, issue_time, due_date, status,
            subtotal, discount_type, discount_value, tax_enabled, tax_rate, tax_amount, service_charge,
            total, paid_amount, due_amount, payment_terms, notes, is_boosting, ad_budget_usd, marketivity_rate, is_sample
          ) values (
            ${String(i.id)}, ${userId}, ${String(i.invoice_number)}, ${String(i.client_id)}, ${String(i.issue_date).slice(0, 10)},
            ${String(i.issue_time)}, ${i.due_date ? String(i.due_date).slice(0, 10) : null}, ${String(i.status)},
            ${Number(i.subtotal) || 0}, ${String(i.discount_type ?? "none")}, ${Number(i.discount_value) || 0}, ${Boolean(i.tax_enabled)},
            ${Number(i.tax_rate) || 0}, ${Number(i.tax_amount) || 0}, ${Number(i.service_charge) || 0}, ${Number(i.total) || 0}, ${Number(i.paid_amount) || 0},
            ${Number(i.due_amount) || 0}, ${String(i.payment_terms ?? "")}, ${String(i.notes ?? "")}, ${Boolean(i.is_boosting)},
            ${i.ad_budget_usd != null ? Number(i.ad_budget_usd) : null}, ${i.marketivity_rate != null ? Number(i.marketivity_rate) : null}, ${Boolean(i.is_sample)}
          )
        `;
      }

      // Step 6: Insert items
      for (const it of data.items ?? []) {
        await tx`
          insert into invoice_items (id, invoice_id, user_id, service_id, service_name, description, qty, unit_price, amount, sort_order)
          values (
            ${String(it.id)}, ${String(it.invoice_id)}, ${userId}, ${it.service_id ? String(it.service_id) : null},
            ${String(it.service_name)}, ${String(it.description ?? "")}, ${Number(it.qty) || 1}, ${Number(it.unit_price) || 0},
            ${Number(it.amount) || 0}, ${Number(it.sort_order ?? 0)}
          )
        `;
      }

      // Step 7: Insert payments (including status, voided_at, void_reason)
      for (const p of data.payments ?? []) {
        await tx`
          insert into payments (
            id, user_id, invoice_id, transaction_id, receipt_number, amount, method,
            payment_date, payment_time, external_txn_id, notes, previous_due, remaining_due,
            status, voided_at, void_reason
          ) values (
            ${String(p.id)}, ${userId}, ${String(p.invoice_id)}, ${String(p.transaction_id)}, ${String(p.receipt_number)},
            ${Number(p.amount) || 0}, ${String(p.method)}, ${String(p.payment_date).slice(0, 10)}, ${String(p.payment_time)},
            ${String(p.external_txn_id ?? "")}, ${String(p.notes ?? "")}, ${Number(p.previous_due) || 0}, ${Number(p.remaining_due) || 0},
            ${String(p.status || "active")}, ${p.voided_at ? String(p.voided_at) : null}, ${String(p.void_reason ?? "")}
          )
        `;
      }

      // Step 8: Insert serials
      for (const s of data.serials ?? []) {
        await tx`
          insert into serials (user_id, kind, year, last_number)
          values (${userId}, ${String(s.kind)}, ${Number(s.year)}, ${Number(s.last_number)})
          on conflict (user_id, kind, year) do update set last_number = excluded.last_number
        `;
      }

      // Step 9: Audit log inside transaction
      await tx`
        insert into audit_log (id, user_id, entity_type, entity_id, action, details)
        values (
          ${(await import("@/lib/utils")).uid()}, ${userId}, ${"backup"}, ${"system"},
          ${"backup.imported"}, ${`Imported ${data.invoices?.length ?? 0} invoices, ${data.payments?.length ?? 0} payments, ${data.clients?.length ?? 0} clients`}
        )
      `;

      return { ok: true };
    });
  });
