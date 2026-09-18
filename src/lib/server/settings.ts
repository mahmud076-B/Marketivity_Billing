import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import type { Settings } from "@/lib/types";
import { DEFAULT_SETTINGS } from "@/lib/types";
import { requirePermission } from "./authz";
import { mapSettings } from "./map";
import { getAgencyOwnerId } from "./workspace";

export const getSettings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const ownerId = await getAgencyOwnerId(sql);
    const rows = await sql`select * from settings where user_id = ${ownerId}`;
    return mapSettings(rows[0]);
  });

export const saveSettings = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: Settings) => input)
  .handler(async ({ context, data }) => {
    requirePermission(context.user, "manage_settings");
    const sql = await getSql();
    const ownerId = await getAgencyOwnerId(sql);
    const s = { ...DEFAULT_SETTINGS, ...data };
    await sql`
      insert into settings (
        user_id, agency_name, tagline, positioning, phone, whatsapp, email, address,
        website, facebook_page, bkash_number, nagad_number, bank_info, logo_data_url,
        accent_color, footer_text, payment_instructions, terms, theme, invoice_theme, sample_loaded
      ) values (
        ${ownerId}, ${s.agencyName}, ${s.tagline}, ${s.positioning}, ${s.phone}, ${s.whatsapp},
        ${s.email}, ${s.address}, ${s.website}, ${s.facebookPage}, ${s.bkashNumber}, ${s.nagadNumber},
        ${s.bankInfo}, ${s.logoDataUrl}, ${s.accentColor}, ${s.footerText}, ${s.paymentInstructions},
        ${s.terms}, ${s.theme}, ${s.invoiceTheme}, ${s.sampleLoaded}
      )
      on conflict (user_id) do update set
        agency_name = excluded.agency_name,
        tagline = excluded.tagline,
        positioning = excluded.positioning,
        phone = excluded.phone,
        whatsapp = excluded.whatsapp,
        email = excluded.email,
        address = excluded.address,
        website = excluded.website,
        facebook_page = excluded.facebook_page,
        bkash_number = excluded.bkash_number,
        nagad_number = excluded.nagad_number,
        bank_info = excluded.bank_info,
        logo_data_url = excluded.logo_data_url,
        accent_color = excluded.accent_color,
        footer_text = excluded.footer_text,
        payment_instructions = excluded.payment_instructions,
        terms = excluded.terms,
        theme = excluded.theme,
        invoice_theme = excluded.invoice_theme,
        updated_at = now()
    `;
    return s;
  });

export const clearSampleData = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    requirePermission(context.user, "manage_settings");
    const sql = await getSql();
    const uid = await getAgencyOwnerId(sql);
    await sql.transaction(async (tx) => {
      await tx`delete from payments where user_id = ${uid} and invoice_id in (select id from invoices where user_id = ${uid} and is_sample = true)`;
      await tx`delete from invoice_items where user_id = ${uid} and invoice_id in (select id from invoices where user_id = ${uid} and is_sample = true)`;
      await tx`delete from invoices where user_id = ${uid} and is_sample = true`;
      await tx`delete from clients where user_id = ${uid} and is_sample = true`;
      await tx`delete from services where user_id = ${uid} and is_sample = true`;
    });
    return { ok: true };
  });
