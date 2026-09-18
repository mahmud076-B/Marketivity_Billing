import assert from "node:assert/strict";
import test from "node:test";
import type { Sql } from "@/lib/db";
import { getAgencyOwnerId } from "./workspace.ts";

function fakeSql(rows: Array<{ id: string }>): Sql {
  const sql = (async () => rows) as unknown as Sql;
  sql.query = async <T>() => rows as T[];
  sql.transaction = async (fn) => fn(sql);
  return sql;
}

test("shared business scope resolves to the active agency admin", async () => {
  assert.equal(await getAgencyOwnerId(fakeSql([{ id: "admin-owner" }])), "admin-owner");
});

test("shared scope fails closed when no active admin exists", async () => {
  await assert.rejects(
    () => getAgencyOwnerId(fakeSql([])),
    /No active agency administrator is configured/,
  );
});