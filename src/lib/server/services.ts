import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { uid } from "@/lib/utils";
import { requirePermission } from "./authz";
import { mapService } from "./map";
import { getAgencyOwnerId } from "./workspace";

export type ServiceInput = {
  name: string;
  description?: string;
  defaultRate: number;
  isBoosting?: boolean;
  usdRate?: number | null;
};

function clean(input: ServiceInput) {
  const name = input.name.trim();
  if (!name) throw new Error("Please enter a service name.");
  const defaultRate = Number(input.defaultRate) || 0;
  if (defaultRate < 0) throw new Error("Please enter a valid amount.");
  return {
    name,
    description: (input.description ?? "").trim(),
    defaultRate,
    isBoosting: Boolean(input.isBoosting),
    usdRate: input.isBoosting ? Number(input.usdRate) || 150 : null,
  };
}

export const listServices = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    requirePermission(context.user, "manage_catalog");
    const sql = await getSql();
    const ownerId = await getAgencyOwnerId(sql);
    const rows = await sql`select * from services where user_id = ${ownerId} order by name asc`;
    return rows.map((r) => mapService(r));
  });

export const createService = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: ServiceInput) => clean(input))
  .handler(async ({ context, data }) => {
    requirePermission(context.user, "manage_catalog");
    const sql = await getSql();
    const ownerId = await getAgencyOwnerId(sql);
    const id = uid();
    await sql`
      insert into services (id, user_id, name, description, default_rate, is_boosting, usd_rate, is_sample)
      values (${id}, ${ownerId}, ${data.name}, ${data.description}, ${data.defaultRate}, ${data.isBoosting}, ${data.usdRate}, ${false})
    `;
    const rows = await sql`select * from services where id = ${id}`;
    return mapService(rows[0]!);
  });

export const updateService = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: ServiceInput & { id: string }) => ({ id: input.id, ...clean(input) }))
  .handler(async ({ context, data }) => {
    requirePermission(context.user, "manage_catalog");
    const sql = await getSql();
    const ownerId = await getAgencyOwnerId(sql);
    const rows = await sql`
      update services set
        name = ${data.name},
        description = ${data.description},
        default_rate = ${data.defaultRate},
        is_boosting = ${data.isBoosting},
        usd_rate = ${data.usdRate}
      where id = ${data.id} and user_id = ${ownerId}
      returning *
    `;
    if (!rows[0]) throw new Error("Service not found.");
    return mapService(rows[0]);
  });

export const deleteService = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => {
    requirePermission(context.user, "manage_catalog");
    const sql = await getSql();
    const ownerId = await getAgencyOwnerId(sql);
    await sql`delete from services where id = ${id} and user_id = ${ownerId}`;
    return { ok: true };
  });
