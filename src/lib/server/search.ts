import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import type { SearchHit } from "@/lib/types";
import { getAgencyOwnerId } from "./workspace";

export const globalSearch = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((q: string) => q)
  .handler(async ({ context, data: raw }): Promise<SearchHit[]> => {
    const q = raw.trim().toLowerCase();
    if (q.length < 1) return [];
    const sql = await getSql();
    const ownerId = await getAgencyOwnerId(sql);
    const like = `%${q}%`;
    const hits: SearchHit[] = [];
    const clients = await sql`
      select id, name, business_name, phone, client_code
      from clients
      where user_id = ${ownerId}
        and (
          lower(name) like ${like}
          or lower(business_name) like ${like}
          or lower(phone) like ${like}
          or lower(client_code) like ${like}
          or lower(email) like ${like}
        )
      limit 6
    `;
    for (const c of clients) {
      hits.push({
        kind: "client",
        id: String(c.id),
        title: String(c.business_name || c.name),
        subtitle: `${c.client_code} · ${c.phone || c.name}`,
        href: `/clients/${c.id}`,
      });
    }
    const invoices = await sql`
      select i.id, i.invoice_number, c.name as client_name
      from invoices i join clients c on c.id = i.client_id
      where i.user_id = ${ownerId} and lower(i.invoice_number) like ${like}
      limit 6
    `;
    for (const i of invoices) {
      hits.push({
        kind: "invoice",
        id: String(i.id),
        title: String(i.invoice_number),
        subtitle: String(i.client_name),
        href: `/invoices/${i.id}`,
      });
    }
    const pays = await sql`
      select p.id, p.receipt_number, p.transaction_id, c.name as client_name
      from payments p
      join invoices i on i.id = p.invoice_id
      join clients c on c.id = i.client_id
      where p.user_id = ${ownerId}
        and (lower(p.receipt_number) like ${like} or lower(p.transaction_id) like ${like} or lower(p.external_txn_id) like ${like})
      limit 6
    `;
    for (const p of pays) {
      hits.push({
        kind: "receipt",
        id: String(p.id),
        title: String(p.receipt_number),
        subtitle: `${p.transaction_id} · ${p.client_name}`,
        href: `/receipts/${p.id}`,
      });
    }
    return hits.slice(0, 12);
  });
