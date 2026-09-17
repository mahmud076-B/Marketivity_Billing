import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatLongDate } from "@/lib/dates";
import { listClients } from "@/lib/server/clients";
import { downloadCsvString } from "@/lib/share";
import { exportClientsCsv } from "@/lib/server/export";
import { initials } from "@/lib/utils";

export const Route = createFileRoute("/_app/clients/")({ component: ClientsPage });

function ClientsPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const { data = [], isLoading } = useQuery({
    queryKey: ["clients", showArchived],
    queryFn: () => listClients({ data: { includeArchived: showArchived } }),
  });
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return data;
    return data.filter((c) =>
      [c.name, c.businessName, c.phone, c.email, c.clientCode].join(" ").toLowerCase().includes(s),
    );
  }, [data, q]);

  return (
    <div>
      <PageHeader
        title="Clients"
        description="Saved once — reused on every invoice"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                const csvStr = await exportClientsCsv();
                downloadCsvString("marketivity-clients.csv", csvStr);
              }}
            >
              Export CSV
            </Button>
            <Button variant="brand" onClick={() => setOpen(true)}>
              <Plus /> Add client
            </Button>
          </div>
        }
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search name, phone, business" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="rounded border-border"
          />
          Show archived clients
        </label>
      </div>
      {isLoading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="size-5" />}
          title="No clients yet"
          description="Add a client so the next invoice takes under a minute."
          actionLabel="Add client"
          onAction={() => setOpen(true)}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => nav({ to: "/clients/$clientId", params: { clientId: c.id } })}
              className={`rounded-2xl border border-border bg-card p-5 text-left transition-transform hover:-translate-y-0.5 ${c.isArchived ? "opacity-75 border-dashed" : ""}`}
            >
              <div className="flex items-center gap-3">
                <div className="grid size-11 place-items-center rounded-2xl bg-secondary font-display text-sm font-semibold text-brand">
                  {initials(c.businessName || c.name)}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-semibold">{c.businessName || c.name}</div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>{c.clientCode}</span>
                    {c.isArchived && (
                      <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase">
                        Archived
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-3 space-y-0.5 text-sm text-muted-foreground">
                <div>{c.name}</div>
                {c.phone && <div>{c.phone}</div>}
                <div className="text-xs">Added {formatLongDate(c.createdAt.slice(0, 10))}</div>
                {c.isSample && <div className="text-[10px] uppercase tracking-wide">Sample</div>}
              </div>
            </button>
          ))}
        </div>
      )}
      <ClientFormDialog
        open={open}
        onOpenChange={setOpen}
        onSaved={() => qc.invalidateQueries({ queryKey: ["clients"] })}
      />
    </div>
  );
}
