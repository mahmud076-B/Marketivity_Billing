import type { Sql } from "@/lib/db";

/**
 * This application has one agency workspace. The oldest admin identity is the
 * stable owner key for shared business rows; the authenticated user remains
 * separate for RBAC and audit attribution.
 */
export async function getAgencyOwnerId(sql: Sql): Promise<string> {
  const rows = await sql<{ id: string }>`
    select id
    from "user"
    where role = 'admin' and status = 'active'
    order by "createdAt" asc, id asc
    limit 1
  `;
  if (!rows[0]?.id) {
    throw new Error("No active agency administrator is configured.");
  }
  return String(rows[0].id);
}
