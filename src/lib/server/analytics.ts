import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { addDaysIso, dhakaIsoDate, dhakaYear } from "@/lib/dates";
import { getSql } from "@/lib/db";
import type { AnalyticsData, DashboardStats, InvoiceStatus } from "@/lib/types";
import { n } from "./map";
import { refreshOverdue } from "./status";
import { requirePermission } from "./authz";

function monthKey(iso: string) {
  return iso.slice(0, 7);
}

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ stats: DashboardStats; recentInvoices: { id: string; invoiceNumber: string; clientName: string; total: number; status: InvoiceStatus; issueDate: string }[]; recentPayments: { id: string; amount: number; clientName: string; method: string; paymentDate: string; receiptNumber: string }[] }> => {
    requirePermission(context.user, "view_analytics");
    const sql = await getSql();
    await refreshOverdue(sql, context.userId);
    
    const today = dhakaIsoDate();
    const month = today.slice(0, 7);
    const prev = monthKey(addDaysIso(today.slice(0, 8) + "01", -1));

    // Aggregate stats in a single query
    const statsRows = await sql`
      select 
        count(*) as total_invoices_all,
        count(*) filter (where status != 'void') as total_invoices,
        sum(total) filter (where status != 'void') as total_revenue,
        sum(paid_amount) filter (where status != 'void') as total_paid,
        sum(due_amount) filter (where status != 'void') as total_due,
        sum(total) filter (where status != 'void' and to_char(issue_date, 'YYYY-MM') = ${month}) as month_revenue,
        sum(total) filter (where status != 'void' and to_char(issue_date, 'YYYY-MM') = ${prev}) as prev_month_revenue,
        count(*) filter (where status != 'void' and status in ('unpaid', 'partially_paid', 'overdue')) as pending_payments,
        count(*) filter (where status = 'paid') as paid_count,
        count(*) filter (where status = 'unpaid') as unpaid_count,
        count(*) filter (where status = 'partially_paid') as partial_count,
        count(*) filter (where status = 'overdue') as overdue_count,
        count(*) filter (where status = 'void') as void_count
      from invoices
      where user_id = ${context.userId}
    `;
    const s = statsRows[0] || {};
    const stats: DashboardStats = {
      totalRevenue: n(s.total_revenue),
      totalPaid: n(s.total_paid),
      totalDue: n(s.total_due),
      totalInvoices: Number(s.total_invoices || 0),
      monthRevenue: n(s.month_revenue),
      pendingPayments: Number(s.pending_payments || 0),
      prevMonthRevenue: n(s.prev_month_revenue),
      paidCount: Number(s.paid_count || 0),
      unpaidCount: Number(s.unpaid_count || 0),
      partialCount: Number(s.partial_count || 0),
      overdueCount: Number(s.overdue_count || 0),
      voidCount: Number(s.void_count || 0),
    };

    const invoices = await sql`
      select i.id, i.invoice_number, coalesce(c.name, 'Client') as client_name, i.total, i.status, i.issue_date
      from invoices i
      left join clients c on c.id = i.client_id
      where i.user_id = ${context.userId}
      order by i.created_at desc
      limit 6
    `;
    const payments = await sql`
      select p.id, p.amount, coalesce(c.name, 'Client') as client_name, p.method, p.payment_date, p.receipt_number
      from payments p
      join invoices i on i.id = p.invoice_id
      left join clients c on c.id = i.client_id
      where p.user_id = ${context.userId} and p.status = 'active'
      order by p.created_at desc
      limit 6
    `;

    return {
      stats,
      recentInvoices: invoices.map((r) => ({
        id: String(r.id),
        invoiceNumber: String(r.invoice_number),
        clientName: String(r.client_name),
        total: n(r.total),
        status: r.status as InvoiceStatus,
        issueDate: String(r.issue_date).slice(0, 10),
      })),
      recentPayments: payments.map((r) => ({
        id: String(r.id),
        amount: n(r.amount),
        clientName: String(r.client_name),
        method: String(r.method),
        paymentDate: String(r.payment_date).slice(0, 10),
        receiptNumber: String(r.receipt_number),
      })),
    };
  });

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").refine((val) => {
  const date = new Date(val);
  return !isNaN(date.getTime()) && date.toISOString().startsWith(val);
}, "Impossible calendar date");

const analyticsInput = z.object({
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return data.startDate <= data.endDate;
  }
  return true;
}, { message: "startDate cannot be after endDate" });

export const getAnalytics = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(analyticsInput)
  .handler(async ({ data, context }): Promise<AnalyticsData> => {
    requirePermission(context.user, "view_analytics");
    return executeAnalytics(context.userId, data);
  });

export async function executeAnalytics(userId: string, data: z.infer<typeof analyticsInput>): Promise<AnalyticsData> {
    const sql = await getSql();
    await refreshOverdue(sql, userId);
    const today = dhakaIsoDate();
    const year = String(dhakaYear());
    const weekStart = addDaysIso(today, -6);
    const month = today.slice(0, 7);

    // 1. Top-level metrics & status counts
    const aggRows = await sql`
      select
        sum(total) filter (where status != 'void' and issue_date = ${today}::date) as today,
        sum(total) filter (where status != 'void' and issue_date >= ${weekStart}::date) as week,
        sum(total) filter (where status != 'void' and to_char(issue_date, 'YYYY-MM') = ${month}) as month,
        sum(total) filter (where status != 'void' and to_char(issue_date, 'YYYY') = ${year}) as year,
        avg(total) filter (where status != 'void') as avg_invoice,
        sum(total) filter (where status != 'void') as total_invoiced,
        sum(paid_amount) filter (where status != 'void') as total_paid,
        count(*) filter (where status = 'paid') as paid_count,
        count(*) filter (where status = 'unpaid') as unpaid_count,
        count(*) filter (where status = 'partially_paid') as partial_count,
        count(*) filter (where status = 'overdue') as overdue_count,
        count(*) filter (where status = 'void') as void_count
      from invoices
      where user_id = ${userId}
        and (${data.startDate ?? null}::date is null or issue_date >= ${data.startDate ?? null}::date)
        and (${data.endDate ?? null}::date is null or issue_date <= ${data.endDate ?? null}::date)
    `;
    const agg = aggRows[0] || {};
    const statusCounts: Record<InvoiceStatus, number> = {
      paid: Number(agg.paid_count || 0),
      unpaid: Number(agg.unpaid_count || 0),
      partially_paid: Number(agg.partial_count || 0),
      overdue: Number(agg.overdue_count || 0),
      void: Number(agg.void_count || 0),
    };

    const avgInvoiceValue = n(agg.avg_invoice);
    const totalInvoiced = n(agg.total_invoiced);
    const totalPaid = n(agg.total_paid);
    const paidRate = totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0;

    // 2. Cash Received & Payment Methods
    const paymentRows = await sql`
      select
        sum(amount) as cash_received
      from payments
      where user_id = ${userId} and status = 'active'
        and (${data.startDate ?? null}::date is null or payment_date >= ${data.startDate ?? null}::date)
        and (${data.endDate ?? null}::date is null or payment_date <= ${data.endDate ?? null}::date)
    `;
    const cashReceived = n(paymentRows[0]?.cash_received);

    const methodsRows = await sql`
      select method as name, sum(amount) as amount
      from payments
      where user_id = ${userId} and status = 'active'
        and (${data.startDate ?? null}::date is null or payment_date >= ${data.startDate ?? null}::date)
        and (${data.endDate ?? null}::date is null or payment_date <= ${data.endDate ?? null}::date)
      group by method
      order by amount desc
    `;
    const paymentMethods = methodsRows.map((r) => ({
      name: String(r.name),
      amount: n(r.amount),
    }));

    // 3. By service
    const items = await sql`
      select service_name, sum(amount) as amount
      from invoice_items
      where user_id = ${userId}
        and invoice_id in (
          select id from invoices 
          where user_id = ${userId} 
            and status != 'void'
            and (${data.startDate ?? null}::date is null or issue_date >= ${data.startDate ?? null}::date)
            and (${data.endDate ?? null}::date is null or issue_date <= ${data.endDate ?? null}::date)
        )
      group by service_name
      order by amount desc
      limit 8
    `;
    const byService = items.map((r) => ({
      name: String(r.service_name),
      amount: n(r.amount),
    }));

    // 4. Time Series Granularity Calculation
    let startD = data.startDate;
    let endD = data.endDate;
    
    let granularity: "daily" | "weekly" | "monthly" = "monthly";
    const tsPoints: { label: string; invoiced: number; cashReceived: number; _dateKey: string }[] = [];

    if (!startD || !endD) {
      // Default / No Range
      granularity = "monthly";
      const [currentYear, currentMonth] = today.split("-").map(Number);
      const sixMonthsAgoDate = new Date(Date.UTC(currentYear, currentMonth - 6, 1));
      startD = `${sixMonthsAgoDate.getUTCFullYear()}-${String(sixMonthsAgoDate.getUTCMonth() + 1).padStart(2, "0")}-01`;
      endD = today;
      
      for (let i = 5; i >= 0; i--) {
        const d = new Date(Date.UTC(currentYear, currentMonth - 1 - i, 1));
        const y = d.getUTCFullYear();
        const m = d.getUTCMonth() + 1;
        const key = `${y}-${String(m).padStart(2, "0")}`;
        const label = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
        tsPoints.push({ label, invoiced: 0, cashReceived: 0, _dateKey: key });
      }
    } else {
      const s = new Date(startD);
      const e = new Date(endD);
      const days = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      if (days <= 31) granularity = "daily";
      else if (days <= 180) granularity = "weekly";
      else granularity = "monthly";
      
      if (granularity === "daily") {
        for (let i = 0; i < days; i++) {
          const d = addDaysIso(startD, i);
          const parts = d.split("-");
          const dObj = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
          const label = dObj.toLocaleString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
          tsPoints.push({ label, invoiced: 0, cashReceived: 0, _dateKey: d });
        }
      } else if (granularity === "weekly") {
        let curr = startD;
        while (curr <= endD) {
          const parts = curr.split("-");
          const dObj = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
          // Find Monday of this week
          const day = dObj.getUTCDay();
          const diffToMonday = day === 0 ? -6 : 1 - day;
          const monday = addDaysIso(curr, diffToMonday);
          // Key for the week will be the Monday date
          if (!tsPoints.find(p => p._dateKey === monday)) {
             const mParts = monday.split("-");
             const mObj = new Date(Date.UTC(Number(mParts[0]), Number(mParts[1]) - 1, Number(mParts[2])));
             const label = mObj.toLocaleString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
             tsPoints.push({ label: `Week of ${label}`, invoiced: 0, cashReceived: 0, _dateKey: monday });
          }
          curr = addDaysIso(curr, 1);
        }
      } else if (granularity === "monthly") {
        const sParts = startD.split("-");
        const eParts = endD.split("-");
        const sYear = Number(sParts[0]), sMonth = Number(sParts[1]);
        const eYear = Number(eParts[0]), eMonth = Number(eParts[1]);
        let cYear = sYear, cMonth = sMonth;
        
        while (cYear < eYear || (cYear === eYear && cMonth <= eMonth)) {
          const key = `${cYear}-${String(cMonth).padStart(2, "0")}`;
          const dObj = new Date(Date.UTC(cYear, cMonth - 1, 1));
          const label = dObj.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
          tsPoints.push({ label, invoiced: 0, cashReceived: 0, _dateKey: key });
          
          cMonth++;
          if (cMonth > 12) {
            cMonth = 1;
            cYear++;
          }
        }
      }
    }

    // 5. Time Series DB Queries
    let invoiceGroupQuery;
    let paymentGroupQuery;

    if (granularity === "daily") {
      invoiceGroupQuery = sql`
        select issue_date::text as key, sum(total) as amount
        from invoices
        where user_id = ${userId} and status != 'void'
          and issue_date >= ${startD}::date and issue_date <= ${endD}::date
        group by issue_date
      `;
      paymentGroupQuery = sql`
        select payment_date::text as key, sum(amount) as amount
        from payments
        where user_id = ${userId} and status = 'active'
          and payment_date >= ${startD}::date and payment_date <= ${endD}::date
        group by payment_date
      `;
    } else if (granularity === "weekly") {
      invoiceGroupQuery = sql`
        select (date_trunc('week', issue_date::date))::date::text as key, sum(total) as amount
        from invoices
        where user_id = ${userId} and status != 'void'
          and issue_date >= ${startD}::date and issue_date <= ${endD}::date
        group by 1
      `;
      paymentGroupQuery = sql`
        select (date_trunc('week', payment_date::date))::date::text as key, sum(amount) as amount
        from payments
        where user_id = ${userId} and status = 'active'
          and payment_date >= ${startD}::date and payment_date <= ${endD}::date
        group by 1
      `;
    } else {
      invoiceGroupQuery = sql`
        select to_char(issue_date, 'YYYY-MM') as key, sum(total) as amount
        from invoices
        where user_id = ${userId} and status != 'void'
          and issue_date >= ${startD}::date and issue_date <= ${endD}::date
        group by 1
      `;
      paymentGroupQuery = sql`
        select to_char(payment_date, 'YYYY-MM') as key, sum(amount) as amount
        from payments
        where user_id = ${userId} and status = 'active'
          and payment_date >= ${startD}::date and payment_date <= ${endD}::date
        group by 1
      `;
    }

    const [invoiceTsRows, paymentTsRows] = await Promise.all([invoiceGroupQuery, paymentGroupQuery]);

    // Map DB rows to points
    for (const point of tsPoints) {
      const invRow = invoiceTsRows.find(r => r.key === point._dateKey);
      if (invRow) point.invoiced = n(invRow.amount);
      
      const payRow = paymentTsRows.find(r => r.key === point._dateKey);
      if (payRow) point.cashReceived = n(payRow.amount);
    }

    // 6. Client Analytics Breakdown
    const clientRows = await sql`
      with inv as (
        select client_id, sum(total) as invoiced, sum(due_amount) as due, count(*) as invoice_count
        from invoices
        where user_id = ${userId} and status != 'void'
          and (${data.startDate ?? null}::date is null or issue_date >= ${data.startDate ?? null}::date)
          and (${data.endDate ?? null}::date is null or issue_date <= ${data.endDate ?? null}::date)
        group by client_id
      ),
      pay as (
        select i.client_id, sum(p.amount) as cash_received
        from payments p
        join invoices i on p.invoice_id = i.id
        where p.user_id = ${userId} and p.status = 'active'
          and (${data.startDate ?? null}::date is null or p.payment_date >= ${data.startDate ?? null}::date)
          and (${data.endDate ?? null}::date is null or p.payment_date <= ${data.endDate ?? null}::date)
        group by i.client_id
      )
      select 
        c.id as client_id,
        c.name as client_name,
        coalesce(inv.invoiced, 0) as invoiced,
        coalesce(pay.cash_received, 0) as cash_received,
        coalesce(inv.due, 0) as due,
        coalesce(inv.invoice_count, 0) as invoice_count
      from clients c
      left join inv on c.id = inv.client_id
      left join pay on c.id = pay.client_id
      where inv.client_id is not null or pay.client_id is not null
      order by invoiced desc, cash_received desc
    `;

    const clientBreakdown = clientRows.map((r) => {
      const invoiceCount = Number(r.invoice_count);
      const invoiced = n(r.invoiced);
      return {
        clientId: String(r.client_id),
        clientName: String(r.client_name),
        invoiced,
        cashReceived: n(r.cash_received),
        due: n(r.due),
        invoiceCount,
        averageInvoiceValue: invoiceCount > 0 ? n(invoiced / invoiceCount) : 0,
      };
    });

    // 7. Legacy monthly compatibility
    const legacyMonthly = tsPoints.map(p => ({
      month: p.label,
      revenue: p.invoiced,
      paid: p.cashReceived // For backward compatibility we map cashReceived to paid in the legacy field
    }));

    return {
      today: n(agg.today),
      week: n(agg.week),
      month: n(agg.month),
      year: n(agg.year),
      averageInvoiceValue: avgInvoiceValue,
      cashReceived: cashReceived,
      paidRate: paidRate,
      statusCounts,
      monthly: legacyMonthly,
      byService,
      paymentMethods,
      timeSeries: {
        granularity,
        points: tsPoints.map(p => ({ label: p.label, invoiced: p.invoiced, cashReceived: p.cashReceived })),
      },
      clientBreakdown
    };
}
