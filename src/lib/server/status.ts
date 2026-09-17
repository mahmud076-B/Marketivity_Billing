import { dhakaIsoDate } from "@/lib/dates";
import type { Sql } from "@/lib/db";

export async function refreshOverdue(sql: Sql, userId: string) {
  const today = dhakaIsoDate();
  await sql`
    update invoices
    set status = 'overdue', updated_at = now()
    where user_id = ${userId}
      and status in ('unpaid', 'partially_paid')
      and due_date is not null
      and due_date < ${today}
  `;
}
