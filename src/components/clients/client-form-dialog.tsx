import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/input";
import { createClient, updateClient, type ClientInput } from "@/lib/server/clients";
import type { Client } from "@/lib/types";

const empty: ClientInput = {
  name: "",
  businessName: "",
  phone: "",
  email: "",
  address: "",
  facebookPage: "",
  website: "",
  notes: "",
};

export function ClientFormDialog({
  open,
  onOpenChange,
  client,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  client?: Client | null;
  onSaved?: (c: Client) => void;
}) {
  const [form, setForm] = useState<ClientInput>(empty);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        client
          ? {
              name: client.name,
              businessName: client.businessName,
              phone: client.phone,
              email: client.email,
              address: client.address,
              facebookPage: client.facebookPage,
              website: client.website,
              notes: client.notes,
            }
          : empty,
      );
    }
  }, [open, client]);

  function set<K extends keyof ClientInput>(key: K, value: ClientInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    if (!form.name.trim()) {
      toast.error("Please enter client name.");
      return;
    }
    setBusy(true);
    try {
      const saved = client
        ? await updateClient({ data: { id: client.id, ...form } })
        : await createClient({ data: form });
      toast.success(client ? "Client updated" : "Client added");
      onOpenChange(false);
      onSaved?.(saved);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save client");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{client ? "Edit client" : "New client"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Client name">
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field label="Business / company">
              <Input value={form.businessName} onChange={(e) => set("businessName", e.target.value)} />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </Field>
          </div>
          <Field label="Address">
            <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Facebook page">
              <Input value={form.facebookPage} onChange={(e) => set("facebookPage", e.target.value)} />
            </Field>
            <Field label="Website">
              <Input value={form.website} onChange={(e) => set("website", e.target.value)} />
            </Field>
          </div>
          <Field label="Notes">
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button variant="brand" disabled={busy} onClick={save}>
              {busy ? "Saving…" : "Save client"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </label>
  );
}
