import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { PageHeader } from "@/components/layout/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatTaka } from "@/lib/money";
import { getAnalytics } from "@/lib/server/analytics";
import { STATUS_LABEL, type AnalyticsData } from "@/lib/types";
import { DateRangePicker } from "@/components/analytics/date-range-picker";
import { Loader2, Download } from "lucide-react";
import { downloadCsvString } from "@/lib/share";
import { exportAnalyticsCsv } from "@/lib/server/export";
import { toast } from "sonner";

const searchSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).refine(data => {
  if (data.startDate && data.endDate) {
    return data.startDate <= data.endDate;
  }
  return true;
}).catch({});

export const Route = createFileRoute("/_app/analytics")({ 
  component: AnalyticsPage,
  validateSearch: searchSchema,
});

const STATUS_COLORS: Record<string, string> = {
  paid: "#10b981", // Emerald
  unpaid: "#ef4444", // Red
  partially_paid: "#f5a623", // Amber
  overdue: "#7f1d1d", // Dark red
  void: "#6b7280", // Gray
};

const METHOD_COLORS = ["#3b82f6", "#10b981", "#f5a623", "#8b5cf6", "#ec4899", "#64748b"];

function AnalyticsPage() {
  const search = Route.useSearch();
  const [isExporting, setIsExporting] = useState(false);
  const { data, isFetching } = useQuery({ 
    queryKey: ["analytics", search], 
    queryFn: () => getAnalytics({ data: search }) 
  });
  
  if (!data) return <div className="h-64 animate-pulse rounded-2xl bg-muted" />;

  const statusData = (Object.keys(STATUS_LABEL) as Array<keyof typeof STATUS_LABEL>)
    .map(key => ({
      name: STATUS_LABEL[key],
      value: data.statusCounts[key] || 0,
      fill: STATUS_COLORS[key]
    }))
    .filter(d => d.value > 0);

  async function handleExport() {
    try {
      setIsExporting(true);
      const csvStr = await exportAnalyticsCsv({ data: { startDate: search.startDate, endDate: search.endDate } });
      const filename = search.startDate && search.endDate 
        ? `marketivity-analytics-${search.startDate}-to-${search.endDate}.csv` 
        : `marketivity-analytics-report.csv`;
      downloadCsvString(filename, csvStr);
    } catch (e) {
      toast.error("Unable to export analytics for this period.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <PageHeader title="Analytics" description="A quiet read on Marketivity revenue" />
        <div className="flex items-center gap-2">
          {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <DateRangePicker startDate={search.startDate} endDate={search.endDate} />
          <Button variant="outline" onClick={handleExport} disabled={isExporting}>
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Export CSV
          </Button>
        </div>
      </div>
      
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Mini label="Average Invoice Value" value={formatTaka(data.averageInvoiceValue)} />
        <Mini label="Cash Received" value={formatTaka(data.cashReceived)} />
        <Mini label="Paid Rate" value={`${data.paidRate.toFixed(1)}%`} />
        <Mini label="This month (Issue Date)" value={formatTaka(data.month)} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <h2 className="font-display font-semibold">Trend ({data.timeSeries.granularity})</h2>
            <div className="mt-4 h-[300px]">
              {data.timeSeries.points.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.timeSeries.points} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `৳${val/1000}k`} />
                    <Tooltip
                      contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}
                      formatter={(v) => formatTaka(Number(v))}
                    />
                    <Legend wrapperStyle={{ paddingTop: 20 }} />
                    <Bar name="Invoiced" dataKey="invoiced" fill="#F5A623" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar name="Cash Received" dataKey="cashReceived" fill="#7B2FBE" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No trend data for this period.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-5">
            <h2 className="font-display font-semibold">Invoice Status (Count)</h2>
            <div className="mt-4 h-[300px]">
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}
                      formatter={(v) => v}
                    />
                    <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No invoices in this period.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mt-6">
        <Card>
          <CardContent className="p-5">
            <h2 className="font-display font-semibold">Service Revenue</h2>
            <div className="mt-4 h-[250px]">
              {data.byService.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.byService} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                    <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `৳${val/1000}k`} />
                    <YAxis dataKey="name" type="category" stroke="var(--foreground)" fontSize={12} tickLine={false} axisLine={false} width={100} />
                    <Tooltip
                      contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}
                      formatter={(v) => formatTaka(Number(v))}
                    />
                    <Bar name="Invoiced Amount" dataKey="amount" fill="#10b981" radius={[0, 4, 4, 0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No service data for this period.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h2 className="font-display font-semibold">Payment Methods</h2>
            <div className="mt-4 h-[250px]">
              {data.paymentMethods.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.paymentMethods} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `৳${val/1000}k`} />
                    <Tooltip
                      contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}
                      formatter={(v) => formatTaka(Number(v))}
                    />
                    <Bar name="Cash Received" dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={40}>
                      {data.paymentMethods.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={METHOD_COLORS[index % METHOD_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No payment methods found for this period.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="font-display text-2xl font-semibold tracking-tight">Client Analytics</h2>
        <p className="text-muted-foreground mt-1 mb-6 text-sm">Client financial performance for the selected period.</p>
        <ClientAnalytics data={data.clientBreakdown} />
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-xl font-semibold tabular">{value}</div>
    </div>
  );
}

function ClientAnalytics({ data }: { data: AnalyticsData['clientBreakdown'] }) {
  const [sortField, setSortField] = useState<keyof AnalyticsData['clientBreakdown'][0]>('invoiced');
  const [sortDesc, setSortDesc] = useState(true);

  const activeClients = data.length;
  const totalInvoiced = data.reduce((acc, c) => acc + c.invoiced, 0);
  const totalCash = data.reduce((acc, c) => acc + c.cashReceived, 0);
  const totalDue = data.reduce((acc, c) => acc + c.due, 0);

  const sortedData = [...data].sort((a, b) => {
    const valA = a[sortField];
    const valB = b[sortField];
    if (valA < valB) return sortDesc ? 1 : -1;
    if (valA > valB) return sortDesc ? -1 : 1;
    return 0;
  });

  const handleSort = (field: keyof AnalyticsData['clientBreakdown'][0]) => {
    if (sortField === field) {
      setSortDesc(!sortDesc);
    } else {
      setSortField(field);
      setSortDesc(true);
    }
  };

  const SortIndicator = ({ field }: { field: string }) => {
    if (sortField !== field) return <span className="opacity-0 group-hover:opacity-50 ml-1">↓</span>;
    return <span className="ml-1">{sortDesc ? "↓" : "↑"}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Mini label="Active Clients" value={String(activeClients)} />
        <Mini label="Total Client Revenue" value={formatTaka(totalInvoiced)} />
        <Mini label="Total Cash Received" value={formatTaka(totalCash)} />
        <Mini label="Total Outstanding Due" value={formatTaka(totalDue)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="p-4 font-medium text-muted-foreground">Client</th>
                  <th 
                    className="p-4 font-medium text-muted-foreground text-right cursor-pointer group whitespace-nowrap"
                    onClick={() => handleSort('invoiced')}
                  >
                    Invoiced <SortIndicator field="invoiced" />
                  </th>
                  <th 
                    className="p-4 font-medium text-muted-foreground text-right cursor-pointer group whitespace-nowrap"
                    onClick={() => handleSort('cashReceived')}
                  >
                    Cash Received <SortIndicator field="cashReceived" />
                  </th>
                  <th 
                    className="p-4 font-medium text-muted-foreground text-right cursor-pointer group whitespace-nowrap"
                    onClick={() => handleSort('due')}
                  >
                    Due <SortIndicator field="due" />
                  </th>
                  <th 
                    className="p-4 font-medium text-muted-foreground text-right cursor-pointer group whitespace-nowrap"
                    onClick={() => handleSort('invoiceCount')}
                  >
                    Invoices <SortIndicator field="invoiceCount" />
                  </th>
                  <th 
                    className="p-4 font-medium text-muted-foreground text-right cursor-pointer group whitespace-nowrap"
                    onClick={() => handleSort('averageInvoiceValue')}
                  >
                    Avg. Invoice <SortIndicator field="averageInvoiceValue" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedData.length > 0 ? (
                  sortedData.map((client) => (
                    <tr key={client.clientId} className="hover:bg-muted/50 transition-colors">
                      <td className="p-4 font-medium">{client.clientName}</td>
                      <td className="p-4 text-right tabular-nums">{formatTaka(client.invoiced)}</td>
                      <td className="p-4 text-right tabular-nums text-emerald-600 dark:text-emerald-500 font-medium">{formatTaka(client.cashReceived)}</td>
                      <td className="p-4 text-right tabular-nums text-amber-600 dark:text-amber-500">{formatTaka(client.due)}</td>
                      <td className="p-4 text-right tabular-nums">{client.invoiceCount}</td>
                      <td className="p-4 text-right tabular-nums">{formatTaka(client.averageInvoiceValue)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No client activity in this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


