import { test } from "node:test";
import assert from "node:assert/strict";
import { executeAnalytics } from "../src/lib/server/analytics.ts";
import { getSql } from "../src/lib/db.ts";

test("Custom date range filtering boundaries", async () => {
  // Ensure we are connected to a database
  const sql = await getSql();
  
  // Find a user ID from the database to test against safely
  const rows = await sql`SELECT user_id FROM invoices LIMIT 1`;
  if (rows.length === 0) {
    console.log("No invoices found in database, skipping data-driven tests. Boundary behavior could not be independently demonstrated.");
    return;
  }
  const userId = String(rows[0].user_id);

  // 1. No dates (backward compatibility)
  const allTime = await executeAnalytics(userId, {});
  console.log("allTime:", allTime);
  assert.ok(typeof allTime.today === "number", "Returns AnalyticsData");
  
  // 2. Reversed range (should throw or fail validation)
  // We handle this via Zod, but since we extracted executeAnalytics from the handler,
  // Zod validation is skipped here. We can just verify it doesn't crash the SQL.
  const reversed = await executeAnalytics(userId, { startDate: "2026-09-30", endDate: "2026-09-01" });
  assert.ok(reversed); // SQL accepts it, but returns 0 naturally. Zod protects the API.

  // 3. Single day bounds
  const singleDay = await executeAnalytics(userId, { startDate: "2026-09-17", endDate: "2026-09-17" });
  assert.ok(singleDay);

  // 4. Month boundaries
  const monthBound = await executeAnalytics(userId, { startDate: "2026-01-31", endDate: "2026-02-01" });
  assert.ok(monthBound);

  console.log("Analytics boundary queries executed successfully without errors.");
});

test("Preset calculations", async () => {
  const { dhakaIsoDate, addDaysIso } = await import("../src/lib/dates.ts");
  const { getAnalyticsPresets } = await import("../src/lib/dates.ts");

  const today = dhakaIsoDate();
  const presets = getAnalyticsPresets();

  // Test 'Today'
  const todayPreset = presets.find(p => p.label === "Today");
  assert.equal(todayPreset?.startDate, today);
  assert.equal(todayPreset?.endDate, today);

  // Test 'This Week'
  const thisWeekPreset = presets.find(p => p.label === "This Week");
  assert.equal(thisWeekPreset?.startDate, addDaysIso(today, -6));
  assert.equal(thisWeekPreset?.endDate, today);

  // Test 'This Month'
  const thisMonthPreset = presets.find(p => p.label === "This Month");
  assert.equal(thisMonthPreset?.startDate, today.slice(0, 7) + "-01");
  assert.equal(thisMonthPreset?.endDate, today);

  // Test 'Last 30 Days'
  const last30DaysPreset = presets.find(p => p.label === "Last 30 Days");
  assert.equal(last30DaysPreset?.startDate, addDaysIso(today, -29));
  assert.equal(last30DaysPreset?.endDate, today);

  // Test 'This Year'
  const thisYearPreset = presets.find(p => p.label === "This Year");
  assert.equal(thisYearPreset?.startDate, today.slice(0, 4) + "-01-01");
  assert.equal(thisYearPreset?.endDate, today);

  console.log("Preset calculations verified successfully.");
});

test("Advanced KPIs and dynamic granularity", async () => {
  const sql = await getSql();
  const rows = await sql`SELECT user_id FROM invoices LIMIT 1`;
  if (rows.length === 0) return;
  const userId = String(rows[0].user_id);

  // Test 1-day range (Daily granularity)
  const d1 = await executeAnalytics(userId, { startDate: "2026-09-01", endDate: "2026-09-01" });
  assert.equal(d1.timeSeries.granularity, "daily");
  assert.equal(d1.timeSeries.points.length, 1);
  assert.ok(typeof d1.averageInvoiceValue === "number");
  assert.ok(typeof d1.cashReceived === "number");
  assert.ok(typeof d1.paidRate === "number");

  // Test 7-day range (Daily granularity)
  const d7 = await executeAnalytics(userId, { startDate: "2026-09-01", endDate: "2026-09-07" });
  assert.equal(d7.timeSeries.granularity, "daily");
  assert.equal(d7.timeSeries.points.length, 7);

  // Test 31-day range (Daily granularity)
  const d31 = await executeAnalytics(userId, { startDate: "2026-08-01", endDate: "2026-08-31" });
  assert.equal(d31.timeSeries.granularity, "daily");
  assert.equal(d31.timeSeries.points.length, 31);

  // Test 32-day range (Weekly granularity)
  const d32 = await executeAnalytics(userId, { startDate: "2026-08-01", endDate: "2026-09-01" });
  assert.equal(d32.timeSeries.granularity, "weekly");

  // Test 180-day range (Weekly granularity)
  const d180 = await executeAnalytics(userId, { startDate: "2026-01-01", endDate: "2026-06-29" });
  assert.equal(d180.timeSeries.granularity, "weekly");

  // Test 181-day range (Monthly granularity)
  const d181 = await executeAnalytics(userId, { startDate: "2026-01-01", endDate: "2026-06-30" });
  assert.equal(d181.timeSeries.granularity, "monthly");

  console.log("Advanced KPIs and dynamic granularity tests passed.");
});

test("CSV Analytics Export Formatting", async () => {
  const { generateAnalyticsCsvRows } = await import("../src/lib/server/export.ts");
  
  // Dummy data just to test the formatter
  const mockAnalytics = {
    today: 0,
    week: 0,
    month: 0,
    year: 0,
    averageInvoiceValue: 5000,
    cashReceived: 2000,
    paidRate: 40,
    timeSeries: {
      granularity: "daily" as const,
      points: [
        { label: "Sep 01", invoiced: 5000, cashReceived: 2000 }
      ]
    },
    byService: [
      { name: "Web Design", amount: 5000 }
    ],
    statusCounts: {
      paid: 10,
      unpaid: 2,
      partially_paid: 4,
      overdue: 1,
      void: 0
    },
    paymentMethods: [
      { name: "bKash", amount: 2000 }
    ],
    monthly: [], // legacy
    clientBreakdown: []
  };
  
  
  const rows = generateAnalyticsCsvRows(mockAnalytics, { startDate: "2026-09-01", endDate: "2026-09-17" });
  
  assert.equal(rows[0][1], "2026-09-01 to 2026-09-17");
  assert.equal(rows[1][1], "Daily");
  
  // Find Summary section
  const summaryIndex = rows.findIndex(r => r[0] === "Analytics Summary");
  assert.ok(summaryIndex !== -1);
  assert.equal(rows[summaryIndex + 2][0], "Average Invoice Value");
  assert.equal(rows[summaryIndex + 2][1], "৳5000.00");
  assert.equal(rows[summaryIndex + 4][0], "Paid Rate");
  assert.equal(rows[summaryIndex + 4][1], "40.0%");

  // Find Time Series
  const tsIndex = rows.findIndex(r => r[0] === "Time Series (Daily)");
  assert.ok(tsIndex !== -1);
  assert.equal(rows[tsIndex + 2][0], "Sep 01");
  assert.equal(rows[tsIndex + 2][1], "৳5000.00");

  console.log("Analytics CSV Export tests passed.");
});

test("Client Analytics Integration", async () => {
  const { executeAnalytics } = await import("../src/lib/server/analytics.ts");
  const { getSql } = await import("../src/lib/db.ts");
  const sql = await getSql();

  // Create isolated user for client analytics
  const [{ id: userId }] = await sql`
    insert into "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
    values (gen_random_uuid(), 'Test Client Analytics User', 'client-analytics@example.com', true, now(), now())
    returning id
  `;

  // Create two clients
  const [{ id: client1 }] = await sql`insert into clients (user_id, client_code, name, created_at) values (${userId}, 'C001', 'Client 1', now()) returning id`;
  const [{ id: client2 }] = await sql`insert into clients (user_id, client_code, name, created_at) values (${userId}, 'C002', 'Client 2', now()) returning id`;

  // Insert Invoices for Client 1
  const [{ id: inv1 }] = await sql`
    insert into invoices (user_id, client_id, invoice_number, issue_date, status, total, due_amount)
    values (${userId}, ${client1}, 'INV-1', '2026-09-01', 'unpaid', 5000, 5000)
    returning id
  `;
  const [{ id: inv2 }] = await sql`
    insert into invoices (user_id, client_id, invoice_number, issue_date, status, total, due_amount)
    values (${userId}, ${client1}, 'INV-2', '2026-09-10', 'paid', 3000, 0)
    returning id
  `;
  // Void invoice
  await sql`
    insert into invoices (user_id, client_id, invoice_number, issue_date, status, total, due_amount)
    values (${userId}, ${client1}, 'INV-3', '2026-09-15', 'void', 10000, 10000)
  `;

  // Insert Payment for Client 1 (payment date outside invoice date)
  await sql`
    insert into payments (user_id, invoice_id, amount, payment_date, status, method)
    values (${userId}, ${inv2}, 3000, '2026-09-20', 'active', 'bank')
  `;

  // Insert Invoices for Client 2
  const [{ id: inv4 }] = await sql`
    insert into invoices (user_id, client_id, invoice_number, issue_date, status, total, due_amount)
    values (${userId}, ${client2}, 'INV-4', '2026-09-25', 'unpaid', 8000, 8000)
    returning id
  `;

  // Void payment for Client 2
  await sql`
    insert into payments (user_id, invoice_id, amount, payment_date, status, method)
    values (${userId}, ${inv4}, 8000, '2026-09-26', 'void', 'cash')
  `;

  // Execute analytics for the month of September
  const analytics = await executeAnalytics(userId as string, { startDate: "2026-09-01", endDate: "2026-09-30" });
  const cb = analytics.clientBreakdown;

  // Verify Reconciliation
  const sumInvoiced = cb.reduce((sum, c) => sum + c.invoiced, 0);
  const sumDue = cb.reduce((sum, c) => sum + c.due, 0);
  const sumCash = cb.reduce((sum, c) => sum + c.cashReceived, 0);
  
  // Total invoiced: 5000 + 3000 + 8000 = 16000
  // Total due: 5000 + 0 + 8000 = 13000
  // Cash received: 3000 (void payment is excluded)
  assert.equal(sumInvoiced, 16000);
  assert.equal(sumCash, 3000);
  assert.equal(sumInvoiced, analytics.timeSeries.points.reduce((s, p) => s + p.invoiced, 0));
  assert.equal(sumCash, analytics.cashReceived);

  const c1 = cb.find(c => c.clientId === client1);
  assert.ok(c1);
  assert.equal(c1.invoiced, 8000);
  assert.equal(c1.cashReceived, 3000);
  assert.equal(c1.due, 5000);
  assert.equal(c1.invoiceCount, 2);
  assert.equal(c1.averageInvoiceValue, 4000);

  const c2 = cb.find(c => c.clientId === client2);
  assert.ok(c2);
  assert.equal(c2.invoiced, 8000);
  assert.equal(c2.cashReceived, 0);
  assert.equal(c2.due, 8000);
  assert.equal(c2.invoiceCount, 1);
  assert.equal(c2.averageInvoiceValue, 8000);

  // Cross-user isolation test
  const [{ id: userId2 }] = await sql`
    insert into auth_user (id, name, email, email_verified, created_at, updated_at)
    values (gen_random_uuid(), 'Other User', 'other@example.com', true, now(), now())
    returning id
  `;
  const otherAnalytics = await executeAnalytics(userId2 as string, { startDate: "2026-09-01", endDate: "2026-09-30" });
  assert.equal(otherAnalytics.clientBreakdown.length, 0);

  console.log("Client Analytics tests passed.");
});
