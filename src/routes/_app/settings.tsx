import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { applyTheme, PageHeader } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { exportBackup, importBackup } from "@/lib/server/backup";
import { clearSampleData } from "@/lib/server/settings";
import { getSettings, saveSettings } from "@/lib/server/settings";
import { downloadJson } from "@/lib/share";
import type { Settings } from "@/lib/types";

export const Route = createFileRoute("/_app/settings")({ component: SettingsPage });

function SettingsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["settings"], queryFn: () => getSettings() });
  const [form, setForm] = useState<Settings | null>(null);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  if (!form) return <div className="h-64 animate-pulse rounded-2xl bg-muted" />;

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="Settings" description="Business profile used on every invoice and receipt" />
      <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display font-semibold">Business profile</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Agency name">
            <Input value={form.agencyName} onChange={(e) => set("agencyName", e.target.value)} />
          </Field>
          <Field label="Positioning">
            <Input value={form.positioning} onChange={(e) => set("positioning", e.target.value)} />
          </Field>
          <Field label="Tagline" className="sm:col-span-2">
            <Input value={form.tagline} onChange={(e) => set("tagline", e.target.value)} />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <Field label="WhatsApp">
            <Input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} />
          </Field>
          <Field label="Email">
            <Input value={form.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="Website">
            <Input value={form.website} onChange={(e) => set("website", e.target.value)} />
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
          </Field>
          <Field label="Facebook page" className="sm:col-span-2">
            <Input value={form.facebookPage} onChange={(e) => set("facebookPage", e.target.value)} />
          </Field>
        </div>
      </section>

      <section className="mt-5 space-y-3 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display font-semibold">Payment information</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="bKash">
            <Input value={form.bkashNumber} onChange={(e) => set("bkashNumber", e.target.value)} />
          </Field>
          <Field label="Nagad">
            <Input value={form.nagadNumber} onChange={(e) => set("nagadNumber", e.target.value)} />
          </Field>
          <Field label="Bank information" className="sm:col-span-2">
            <Textarea rows={2} value={form.bankInfo} onChange={(e) => set("bankInfo", e.target.value)} />
          </Field>
          <Field label="Payment instructions" className="sm:col-span-2">
            <Textarea rows={3} value={form.paymentInstructions} onChange={(e) => set("paymentInstructions", e.target.value)} />
          </Field>
          <Field label="Terms & conditions" className="sm:col-span-2">
            <Textarea rows={3} value={form.terms} onChange={(e) => set("terms", e.target.value)} />
          </Field>
          <Field label="Footer text" className="sm:col-span-2">
            <Input value={form.footerText} onChange={(e) => set("footerText", e.target.value)} />
          </Field>
          <Field label="Accent color">
            <Input value={form.accentColor} onChange={(e) => set("accentColor", e.target.value)} />
          </Field>
          <Field label="Theme">
            <NativeSelect
              value={form.theme}
              onChange={(e) => {
                const theme = e.target.value as "dark" | "light";
                set("theme", theme);
                applyTheme(theme);
              }}
            >
              <option value="dark">Dark (default)</option>
              <option value="light">Light</option>
            </NativeSelect>
          </Field>
        </div>
        <Button
          variant="brand"
          onClick={async () => {
            await saveSettings({ data: form });
            toast.success("Settings saved");
            qc.invalidateQueries({ queryKey: ["settings"] });
          }}
        >
          Save profile
        </Button>
      </section>

      <section className="mt-5 space-y-3 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display font-semibold">Backup & sample data</h2>
        <p className="text-sm text-muted-foreground">
          Export a full JSON backup, restore one, or remove the demo clients and invoices marked as sample.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              const data = await exportBackup();
              downloadJson(`marketivity-backup-${new Date().toISOString().slice(0, 10)}.json`, data);
            }}
          >
            Backup data
          </Button>
          <label className="inline-flex h-10 cursor-pointer items-center rounded-[10px] border border-border px-4 text-sm">
            Import backup
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (!confirm("Import will replace your current Marketivity data for this account. Continue?")) return;
                try {
                  const parsed = JSON.parse(await file.text());
                  await importBackup({ data: parsed });
                  toast.success("Backup restored");
                  qc.invalidateQueries();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Import failed");
                }
              }}
            />
          </label>
          <Button
            variant="ghost"
            onClick={async () => {
              if (!confirm("Remove sample/demo clients, invoices and catalog items?")) return;
              await clearSampleData();
              toast.success("Sample data removed");
              qc.invalidateQueries();
            }}
          >
            Remove sample data
          </Button>
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`grid gap-1.5 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
    </label>
  );
}
