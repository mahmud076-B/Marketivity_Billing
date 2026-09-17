import type { Sql } from "@/lib/db";
import type { SerialKind } from "@/lib/types";

const PREFIX: Record<SerialKind, string> = {
  invoice: "MKT-INV",
  receipt: "MKT-RCP",
  client: "MKT-CL",
  transaction: "MKT-TXN",
};

export async function nextSerial(
  sql: Sql,
  userId: string,
  kind: SerialKind,
  year: number,
): Promise<string> {
  const rows = await sql<{ last_number: number }>`
    insert into serials (user_id, kind, year, last_number)
    values (${userId}, ${kind}, ${year}, 1)
    on conflict (user_id, kind, year)
    do update set last_number = serials.last_number + 1
    returning last_number
  `;
  const n = Number(rows[0]?.last_number ?? 1);
  return `${PREFIX[kind]}-${year}-${String(n).padStart(4, "0")}`;
}
