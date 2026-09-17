import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { PageHeader } from "@/components/layout/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatLongDate } from "@/lib/dates";
import { formatTaka } from "@/lib/money";
import { downloadCsvString } from "@/lib/share";
import { deleteClient, getClient, getClientStatement } from "@/lib/server/clients";
import { exportClientStatementCsv } from "@/lib/server/export";
import { initials } from "@/lib/utils";

export const Route = createFileRoute("/_app/clients/$clientId")({ component: ClientProfile });

function ClientProfile() {
  const { clientId } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [edit, setEdit] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["client", clientId],
    queryFn: () => getClient({ data: clientId }),
  });

  const { data: statement, isLoading: isStatementLoading } = useQuery({
    queryKey: ["client-statement", clientId],
    queryFn: () => getClientStatement({ data: clientId }),
  });

  if (isLoading || !data) return <div className="h-64 animate-pulse rounded-2xl bg-muted" />;
  const { client } = data;

  return (
    <div>
      <PageHeader
        title={client.businessName || client.name}
        description={client.clientCode}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEdit(true)}>
              Edit
            </Button>
            <Button variant="brand" onClick={() => nav({ to: "/invoices/new", search: { clientId } })}>
              Create invoice
            </Button>
          </div>
        }
      />
      <div className="mb-6 flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
        <div className="grid size-14 place-items-center rounded-2xl bg-secondary font-display text-lg font-semibold text-brand">
          {initials(client.businessName || client.name)}
        </div>
        <div className="text-sm text-muted-foreground">
          <div className="text-foreground">{client.name}</div>
          <div>{[client.phone, client.email, client.address].filter(Boolean).join(" · ")}</div>
          {client.notes && <div className="mt-1 max-w-xl">{client.notes}</div>}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="statement">Statement</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="mb-8 grid gap-3 sm:grid-cols-4">
            <Mini label="Invoices" value={String(data.totalInvoices)} />
            <Mini label="Billed" value={formatTaka(data.totalBilled)} />
            <Mini label="Paid" value={formatTaka(data.totalPaid)} />
            <Mini label="Due" value={formatTaka(data.totalDue)} />
          </div>
          <h2 className="font-display text-lg font-semibold">Invoice history</h2>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Invoice</th>
                  <th className="px-4 py-2 text-left font-medium">Date</th>
                  <th className="px-4 py-2 text-left font-medium">Amount</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.invoices.map((inv) => (
                  <tr key={inv.id} className="border-t border-border">
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        className="hover:text-brand"
                        onClick={() => nav({ to: "/invoices/$invoiceId", params: { invoiceId: inv.id } })}
                      >
                        {inv.invoiceNumber}
                      </button>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{formatLongDate(inv.issueDate)}</td>
                    <td className="px-4 py-2 tabular">{formatTaka(inv.total)}</td>
                    <td className="px-4 py-2">
                      <StatusBadge status={inv.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h2 className="mt-8 font-display text-lg font-semibold">Payment history</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {data.payments.length === 0 && <li className="text-muted-foreground">No payments yet.</li>}
            {data.payments.map((p) => (
              <li key={p.id} className="flex justify-between rounded-xl border border-border px-4 py-3">
                <span>
                  <span className="font-medium">{p.receiptNumber}</span>
                  {p.status === "void" && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive uppercase">
                      VOID
                    </span>
                  )}
                  <span className="block text-xs text-muted-foreground">{p.invoiceNumber}</span>
                  {p.status === "void" && p.voidReason && (
                    <span className="block text-[11px] text-destructive/80">Reason: {p.voidReason}</span>
                  )}
                </span>
                <span className={`tabular ${p.status === "void" ? "line-through text-muted-foreground" : ""}`}>
                  {formatTaka(p.amount)}
                </span>
              </li>
            ))}
          </ul>
        </TabsContent>

        <TabsContent value="statement">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Financial Statement</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const csvStr = await exportClientStatementCsv({ data: clientId });
                downloadCsvString(`statement-${client.clientCode}.csv`, csvStr);
              }}
            >
              Export Statement
            </Button>
          </div>
          
          {isStatementLoading || !statement ? (
            <div className="h-64 animate-pulse rounded-2xl bg-muted" />
          ) : (
            <>
              <div className="mb-8 grid gap-3 sm:grid-cols-3">
                <Mini label="Total Invoiced" value={formatTaka(statement.totalInvoiced)} />
                <Mini label="Total Paid" value={formatTaka(statement.totalPaid)} />
                <Mini label="Current Due" value={formatTaka(statement.currentDue)} />
              </div>

              {statement.entries.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No financial activity found for this client.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-border">
                  <table className="w-full min-w-[50rem] text-sm">
                    <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium">Date</th>
                        <th className="px-4 py-2 text-left font-medium">Type</th>
                        <th className="px-4 py-2 text-left font-medium">Reference</th>
                        <th className="px-4 py-2 text-left font-medium">Description</th>
                        <th className="px-4 py-2 text-right font-medium">Debit</th>
                        <th className="px-4 py-2 text-right font-medium">Credit</th>
                        <th className="px-4 py-2 text-right font-medium">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statement.entries.map((entry, i) => (
                        <tr key={i} className="border-t border-border hover:bg-secondary/20">
                          <td className="px-4 py-3 text-muted-foreground">{formatLongDate(entry.date)}</td>
                          <td className="px-4 py-3">
                            <span className="capitalize">{entry.type.replace("_", " ")}</span>
                            {entry.type === "void_payment" && (
                              <span className="ml-2 inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive uppercase">
                                VOID
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-medium">
                            {entry.type === "invoice" ? (
                              <button
                                type="button"
                                className="hover:text-brand"
                                onClick={() => nav({ to: "/invoices/$invoiceId", params: { invoiceId: entry.relatedInvoiceId! } })}
                              >
                                {entry.reference}
                              </button>
                            ) : (
                              entry.reference
                            )}
                          </td>
                          <td className="px-4 py-3">{entry.description}</td>
                          <td className="px-4 py-3 text-right tabular text-muted-foreground">
                            {entry.debit > 0 ? formatTaka(entry.debit) : "-"}
                          </td>
                          <td className={`px-4 py-3 text-right tabular ${entry.type === "void_payment" ? "line-through text-muted-foreground/50" : "text-muted-foreground"}`}>
                            {entry.credit > 0 ? formatTaka(entry.credit) : "-"}
                          </td>
                          <td className="px-4 py-3 text-right font-medium tabular">
                            {formatTaka(entry.runningBalance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      <Button
        className="mt-8"
        variant="ghost"
        onClick={async () => {
          if (!confirm("Delete or archive this client? Clients with active invoices cannot be deleted.")) return;
          try {
            const res = await deleteClient({ data: clientId });
            if (res.archived) {
              toast.success("Client archived (preserved historical voided invoices)");
            } else {
              toast.success("Client deleted");
            }
            qc.invalidateQueries();
            nav({ to: "/clients" });
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not delete client");
          }
        }}
      >
        Delete client
      </Button>
      <ClientFormDialog open={edit} onOpenChange={setEdit} client={client} onSaved={() => qc.invalidateQueries()} />
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
