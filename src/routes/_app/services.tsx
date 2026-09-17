import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatTaka } from "@/lib/money";
import { createService, deleteService, listServices, updateService } from "@/lib/server/services";
import type { Service } from "@/lib/types";

export const Route = createFileRoute("/_app/services")({ component: ServicesPage });

function ServicesPage() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["services"], queryFn: () => listServices() });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rate, setRate] = useState("");
  const [boosting, setBoosting] = useState(false);
  const [usdRate, setUsdRate] = useState("150");

  function start(svc?: Service) {
    setEditing(svc ?? null);
    setName(svc?.name ?? "");
    setDescription(svc?.description ?? "");
    setRate(svc ? String(svc.defaultRate) : "");
    setBoosting(svc?.isBoosting ?? false);
    setUsdRate(String(svc?.usdRate ?? 150));
    setOpen(true);
  }

  async function save() {
    if (!name.trim()) {
      toast.error("Please enter a service name.");
      return;
    }
    const payload = {
      name,
      description,
      defaultRate: Number(rate) || 0,
      isBoosting: boosting,
      usdRate: boosting ? Number(usdRate) || 150 : null,
    };
    try {
      if (editing) await updateService({ data: { id: editing.id, ...payload } });
      else await createService({ data: payload });
      toast.success("Service saved");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["services"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    }
  }

  return (
    <div>
      <PageHeader
        title="Services"
        description="Default catalog — rates stay editable on each invoice"
        actions={
          <Button variant="brand" onClick={() => start()}>
            <Plus /> Add service
          </Button>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {data.map((s) => (
          <div key={s.id} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold">{s.name}</div>
                {s.isBoosting && <div className="text-[10px] uppercase tracking-wide text-brand">Boosting</div>}
              </div>
              <div className="text-sm tabular text-muted-foreground">
                {s.isBoosting ? `৳${s.usdRate ?? 150}/USD` : formatTaka(s.defaultRate)}
              </div>
            </div>
            <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{s.description}</p>
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => start(s)}>
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  if (!confirm("Remove this service from the catalog?")) return;
                  await deleteService({ data: s.id });
                  qc.invalidateQueries({ queryKey: ["services"] });
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit service" : "New service"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <label className="grid gap-1.5">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="grid gap-1.5">
              <Label>Default rate (৳)</Label>
              <Input type="number" value={rate} onChange={(e) => setRate(e.target.value)} />
            </label>
            <div className="flex items-center justify-between rounded-[10px] border border-border px-3 py-2">
              <Label>Boosting / USD rate</Label>
              <Switch checked={boosting} onCheckedChange={setBoosting} />
            </div>
            {boosting && (
              <label className="grid gap-1.5">
                <Label>৳ per USD</Label>
                <Input type="number" value={usdRate} onChange={(e) => setUsdRate(e.target.value)} />
              </label>
            )}
            <label className="grid gap-1.5">
              <Label>Description</Label>
              <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>
            <Button variant="brand" onClick={save}>
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
