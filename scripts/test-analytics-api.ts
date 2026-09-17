import { test } from "node:test";
import assert from "node:assert/strict";
import { getAnalytics } from "../src/lib/server/analytics.ts";

test("getAnalytics function exists", async () => {
  assert.ok(getAnalytics, "getAnalytics should be exported");
  console.log("typeof getAnalytics:", typeof getAnalytics);
});
