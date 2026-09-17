import type { Sql } from "@/lib/db";
import { uid } from "@/lib/utils";

export async function logAudit(
  sql: Sql,
  userId: string,
  entityType: string,
  entityId: string,
  action: string,
  details = "",
) {
  await sql`
    insert into audit_log (id, user_id, entity_type, entity_id, action, details)
    values (${uid()}, ${userId}, ${entityType}, ${entityId}, ${action}, ${details})
  `;
}
