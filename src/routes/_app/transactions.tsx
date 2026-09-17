import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/app-shell";
import { Input } from "@/components/ui/input";
import { formatLongDate } from "@/lib/dates";
import { formatTaka } from "@/lib/money";
import { listPayments } from "@/lib/server/payments";
import { downloadCsv } from "@/lib/share";
import { Button } from "@/components/ui/button";
import { PAYMENT_METHODS } from "@/lib/types";

export const Route = createFileRoute("/_app/transactions")({ component: TransactionsPage });

function TransactionsPage() {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const { data = [] } = useQuery({ queryKey: ["payments"], queryFn: () => listPayments({ data: "" }) });
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return data;
    return data.filter((p) =>
      [p.transactionId, p.invoiceNumber, p.clientName, p.receiptNumber, p.externalTxnId].join(" ").toLowerCase().includes(s),
    );
  }, [data, q]);

  return (
    <div>
      <PageHeader
        title="Transactions"
        description="Complete payment ledger"
        actions={
          <Button
            variant="outline"
            onClick={() =>
              downloadCsv("marketivity-transactions.csv", [
                ["Txn", "Invoice", "Client", "Amount", "Method", "Date", "Time", "Receipt", "Status"],
                ...rows.map((p) => [
                  p.transactionId,
                  p.invoiceNumber,
                  p.clientName,
                  p.amount,
                  p.method,
                  p.paymentDate,
                  p.paymentTime,
                  p.receiptNumber,
                  p.status === "void" ? "VOID" : p.remainingDue <= 0 ? "Cleared" : "Partial",
                ]),
              ])
            }
          >
            Export CSV
          </Button>
        }
      />
      <Input className="mb-4 max-w-md" placeholder="Search client, invoice, transaction ID" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[52rem] text-sm">
          <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Transaction ID</th>
              <th className="px-4 py-3 text-left font-medium">Invoice</th>
              <th className="px-4 py-3 text-left font-medium">Client</th>
              <th className="px-4 py-3 text-left font-medium">Amount</th>
              <th className="px-4 py-3 text-left font-medium">Method</th>
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="px-4 py-3 font-mono text-xs">{p.transactionId}</td>
                <td className="px-4 py-3">
                  <button type="button" className="hover:text-brand" onClick={() => nav({ to: "/invoices/$invoiceId", params: { invoiceId: p.invoiceId } })}>
                    {p.invoiceNumber}
                  </button>
                </td>
                <td className="px-4 py-3">{p.clientName}</td>
                <td className="px-4 py-3 tabular">
                  <span className={p.status === "void" ? "line-through text-muted-foreground" : "font-medium"}>
                    {formatTaka(p.amount)}
                  </span>
                  {p.status === "void" && p.voidReason && (
                    <span className="block text-[11px] text-destructive/80 font-normal">
                      {p.voidReason}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">{PAYMENT_METHODS.find((m) => m.id === p.method)?.label}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatLongDate(p.paymentDate)} · {p.paymentTime}
                </td>
                <td className="px-4 py-3">
                  {p.status === "void" ? (
                    <span className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-bold text-destructive">
                      VOID
                    </span>
                  ) : p.remainingDue <= 0 ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      Cleared
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                      Partial
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
