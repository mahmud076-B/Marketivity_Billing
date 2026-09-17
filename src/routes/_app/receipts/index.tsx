import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Receipt } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/layout/app-shell";
import { Input } from "@/components/ui/input";
import { formatLongDate } from "@/lib/dates";
import { formatTaka } from "@/lib/money";
import { listPayments } from "@/lib/server/payments";

export const Route = createFileRoute("/_app/receipts/")({ component: ReceiptsPage });

function ReceiptsPage() {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const { data = [] } = useQuery({ queryKey: ["payments"], queryFn: () => listPayments({ data: "" }) });
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return data;
    return data.filter((p) =>
      [p.receiptNumber, p.invoiceNumber, p.clientName, p.transactionId].join(" ").toLowerCase().includes(s),
    );
  }, [data, q]);

  return (
    <div>
      <PageHeader title="Receipts" description="One receipt per recorded payment" />
      <Input className="mb-4 max-w-md" placeholder="Search receipts" value={q} onChange={(e) => setQ(e.target.value)} />
      {rows.length === 0 ? (
        <EmptyState
          icon={<Receipt className="size-5" />}
          title="No receipts yet"
          description="Receipts appear automatically when you record a payment."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Receipt</th>
                <th className="px-4 py-3 text-left font-medium">Invoice</th>
                <th className="px-4 py-3 text-left font-medium">Client</th>
                <th className="px-4 py-3 text-left font-medium">Amount</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <button type="button" className="hover:text-brand" onClick={() => nav({ to: "/receipts/$receiptId", params: { receiptId: p.id } })}>
                      {p.receiptNumber}
                    </button>
                  </td>
                  <td className="px-4 py-3">{p.invoiceNumber}</td>
                  <td className="px-4 py-3">{p.clientName}</td>
                  <td className="px-4 py-3 tabular">{formatTaka(p.amount)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatLongDate(p.paymentDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
