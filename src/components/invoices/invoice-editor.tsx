import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { InvoicePaper } from "@/components/documents/invoice-paper";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { computeTotals, deriveStatus, dueOf, lineAmount } from "@/lib/calculations";
import { addDaysIso, dhakaIsoDate } from "@/lib/dates";
import { formatTaka, parseMoney } from "@/lib/money";
import {
  PAYMENT_METHODS,
  PAYMENT_TERMS,
  type Client,
  type DiscountType,
  type InvoiceDraft,
  type PaymentMethod,
  type Service,
  type Settings,
} from "@/lib/types";
import { uid } from "@/lib/utils";

export function emptyDraft(numberHint: string, clientId = ""): InvoiceDraft {
  const today = dhakaIsoDate();
  return {
    clientId,
    issueDate: today,
    issueTime: new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Dhaka",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date()),
    dueDate: addDaysIso(today, 7),
    items: [{ key: uid(), serviceId: null, serviceName: "", description: "", qty: 1, unitPrice: 0 }],
    discountType: "none",
    discountValue: 0,
    taxEnabled: false,
    taxRate: 0,
    serviceCharge: 0,
    cashOutCharge: 0,
    paymentTerms: PAYMENT_TERMS[0]!.label,
    notes: "",
    isBoosting: false,
    adBudgetUsd: 0,
    marketivityRate: 150,
    initialPayment: null,
  };
}

export function InvoiceEditor({
  draft,
  onChange,
  clients,
  services,
  settings,
  invoiceNumber,
  paidAmount = 0,
  onSave,
  saving,
  onCreateClient,
}: {
  draft: InvoiceDraft;
  onChange: (d: InvoiceDraft) => void;
  clients: Client[];
  services: Service[];
  settings: Settings;
  invoiceNumber: string;
  paidAmount?: number;
  onSave: () => void;
  saving: boolean;
  onCreateClient: () => void;
}) {
  const [collectPayment, setCollectPayment] = useState(Boolean(draft.initialPayment));
  const set = (patch: Partial<InvoiceDraft>) => onChange({ ...draft, ...patch });

  const totals = useMemo(
    () =>
      computeTotals({
        items: draft.items,
        discountType: draft.discountType,
        discountValue: draft.discountValue,
        taxEnabled: draft.taxEnabled,
        taxRate: draft.taxRate,
        serviceCharge: draft.serviceCharge,
        cashOutCharge: draft.cashOutCharge,
        isBoosting: draft.isBoosting,
        adBudgetUsd: draft.adBudgetUsd,
        marketivityRate: draft.marketivityRate,
      }),
    [draft],
  );

  const client = clients.find((c) => c.id === draft.clientId);
  const paid = paidAmount || parseMoney(draft.initialPayment?.amount ?? 0);
  const due = dueOf(totals.total, paid);
  const status = deriveStatus(totals.total, paid, draft.dueDate || null, dhakaIsoDate());

  const paperItems = [
    ...(draft.isBoosting && totals.advertisingCost
      ? [
          {
            serviceName: "Meta Boosting",
            description: `Advertising budget $${draft.adBudgetUsd} × ৳${draft.marketivityRate}/USD`,
            qty: draft.adBudgetUsd,
            unitPrice: draft.marketivityRate,
            amount: totals.advertisingCost,
          },
        ]
      : []),
    ...draft.items
      .filter((i) => i.serviceName.trim())
      .map((i) => ({
        serviceName: i.serviceName,
        description: i.description,
        qty: i.qty,
        unitPrice: i.unitPrice,
        amount: lineAmount(i.qty, i.unitPrice),
      })),
  ];

  function pickService(key: string, serviceId: string) {
    const svc = services.find((s) => s.id === serviceId);
    onChange({
      ...draft,
      items: draft.items.map((it) =>
        it.key === key
          ? {
              ...it,
              serviceId: svc?.id ?? null,
              serviceName: svc?.name === "Custom Service" ? it.serviceName : svc?.name || it.serviceName,
              description: it.description || svc?.description || "",
              unitPrice: svc && svc.name !== "Custom Service" ? svc.defaultRate : it.unitPrice,
            }
          : it,
      ),
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,28rem)]">
      <div className="space-y-5">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-base font-semibold">Invoice</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Field label="Invoice number">
              <Input value={invoiceNumber} readOnly className="bg-muted/50" />
            </Field>
            <Field label="Date">
              <Input type="date" value={draft.issueDate} onChange={(e) => set({ issueDate: e.target.value })} />
            </Field>
            <Field label="Time (Dhaka)">
              <Input value={draft.issueTime} onChange={(e) => set({ issueTime: e.target.value })} />
            </Field>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-base font-semibold">Client</h2>
            <Button size="sm" variant="outline" onClick={onCreateClient}>
              <Plus /> New client
            </Button>
          </div>
          <div className="mt-4 grid gap-3">
            <Field label="Select client">
              <NativeSelect value={draft.clientId} onChange={(e) => set({ clientId: e.target.value })}>
                <option value="">Search / select a client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.businessName || c.name} · {c.phone || c.clientCode}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            {client && (
              <p className="text-sm text-muted-foreground">
                {client.name}
                {client.phone ? ` · ${client.phone}` : ""}
                {client.email ? ` · ${client.email}` : ""}
              </p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-base font-semibold">Boosting campaign</h2>
            <Switch
              checked={draft.isBoosting}
              onCheckedChange={(v) => set({ isBoosting: v, marketivityRate: draft.marketivityRate || 150 })}
            />
          </div>
          {draft.isBoosting && (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Field label="Ad budget (USD)">
                <Input
                  type="number"
                  min={0}
                  value={draft.adBudgetUsd || ""}
                  onChange={(e) => set({ adBudgetUsd: Number(e.target.value) || 0 })}
                />
              </Field>
              <Field label="Rate ৳ / USD">
                <Input
                  type="number"
                  min={0}
                  value={draft.marketivityRate || ""}
                  onChange={(e) => set({ marketivityRate: Number(e.target.value) || 0 })}
                />
              </Field>
              <Field label="Advertising cost">
                <Input readOnly className="bg-muted/50" value={formatTaka(totals.advertisingCost)} />
              </Field>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">Services</h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                set({
                  items: [
                    ...draft.items,
                    { key: uid(), serviceId: null, serviceName: "", description: "", qty: 1, unitPrice: 0 },
                  ],
                })
              }
            >
              <Plus /> Add service
            </Button>
          </div>
          <div className="mt-4 space-y-3">
            {draft.items.map((item) => (
              <div key={item.key} className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-[1.2fr_1fr_4.5rem_7rem_7rem_auto]">
                <NativeSelect
                  value={item.serviceId ?? ""}
                  onChange={(e) => {
                    if (e.target.value) pickService(item.key, e.target.value);
                  }}
                >
                  <option value="">Service</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </NativeSelect>
                <Input
                  placeholder="Name / custom"
                  value={item.serviceName}
                  onChange={(e) =>
                    set({ items: draft.items.map((it) => (it.key === item.key ? { ...it, serviceName: e.target.value } : it)) })
                  }
                />
                <Input
                  type="number"
                  min={0}
                  value={item.qty}
                  onChange={(e) =>
                    set({
                      items: draft.items.map((it) =>
                        it.key === item.key ? { ...it, qty: Number(e.target.value) || 0 } : it,
                      ),
                    })
                  }
                />
                <Input
                  type="number"
                  min={0}
                  value={item.unitPrice || ""}
                  placeholder="৳"
                  onChange={(e) =>
                    set({
                      items: draft.items.map((it) =>
                        it.key === item.key ? { ...it, unitPrice: Number(e.target.value) || 0 } : it,
                      ),
                    })
                  }
                />
                <div className="flex h-10 items-center justify-end text-sm tabular text-muted-foreground">
                  {formatTaka(lineAmount(item.qty, item.unitPrice))}
                </div>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => set({ items: draft.items.filter((it) => it.key !== item.key) })}
                >
                  <Trash2 />
                </Button>
                <Input
                  className="sm:col-span-6"
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) =>
                    set({
                      items: draft.items.map((it) =>
                        it.key === item.key ? { ...it, description: e.target.value } : it,
                      ),
                    })
                  }
                />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-base font-semibold">Totals</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Discount type">
              <NativeSelect
                value={draft.discountType}
                onChange={(e) => set({ discountType: e.target.value as DiscountType })}
              >
                <option value="none">None</option>
                <option value="fixed">Fixed (৳)</option>
                <option value="percent">Percentage (%)</option>
              </NativeSelect>
            </Field>
            <Field label="Discount value">
              <Input
                type="number"
                min={0}
                disabled={draft.discountType === "none"}
                value={draft.discountValue || ""}
                onChange={(e) => set({ discountValue: Number(e.target.value) || 0 })}
              />
            </Field>
            <div className="flex items-center justify-between rounded-[10px] border border-border px-3">
              <Label>VAT / Tax</Label>
              <Switch checked={draft.taxEnabled} onCheckedChange={(v) => set({ taxEnabled: v, taxRate: v ? draft.taxRate || 5 : 0 })} />
            </div>
            <Field label="Tax rate %">
              <Input
                type="number"
                min={0}
                disabled={!draft.taxEnabled}
                value={draft.taxRate || ""}
                onChange={(e) => set({ taxRate: Number(e.target.value) || 0 })}
              />
            </Field>
            <Field label="Service charge (৳)">
              <Input
                type="number"
                min={0}
                value={draft.serviceCharge || ""}
                onChange={(e) => set({ serviceCharge: Number(e.target.value) || 0 })}
              />
            </Field>
            <Field label="Cash out charge (৳)">
              <Input
                type="number"
                min={0}
                value={draft.cashOutCharge || ""}
                onChange={(e) => set({ cashOutCharge: Number(e.target.value) || 0 })}
              />
            </Field>
            <Field label="Due date">
              <Input type="date" value={draft.dueDate} onChange={(e) => set({ dueDate: e.target.value })} />
            </Field>
          </div>
          <dl className="mt-4 space-y-1 text-sm">
            <Row k="Subtotal" v={formatTaka(totals.subtotal)} />
            <Row k="Grand total" v={formatTaka(totals.total)} strong />
            <Row k="Paid" v={formatTaka(paid)} />
            <Row k="Due" v={formatTaka(due)} />
          </dl>
        </section>

        {paidAmount === 0 && (
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold">Payment already received?</h2>
              <Switch
                checked={collectPayment}
                onCheckedChange={(v) => {
                  setCollectPayment(v);
                  set({
                    initialPayment: v
                      ? { amount: totals.total, method: "bkash", externalTxnId: "", notes: "" }
                      : null,
                  });
                }}
              />
            </div>
            {collectPayment && draft.initialPayment && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label="Amount">
                  <Input
                    type="number"
                    value={draft.initialPayment.amount || ""}
                    onChange={(e) =>
                      set({
                        initialPayment: {
                          ...draft.initialPayment!,
                          amount: Number(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </Field>
                <Field label="Method">
                  <NativeSelect
                    value={draft.initialPayment.method}
                    onChange={(e) =>
                      set({
                        initialPayment: {
                          ...draft.initialPayment!,
                          method: e.target.value as PaymentMethod,
                        },
                      })
                    }
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label="Transaction ID">
                  <Input
                    value={draft.initialPayment.externalTxnId}
                    onChange={(e) =>
                      set({
                        initialPayment: { ...draft.initialPayment!, externalTxnId: e.target.value },
                      })
                    }
                  />
                </Field>
              </div>
            )}
          </section>
        )}

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-base font-semibold">Notes & terms</h2>
          <div className="mt-4 grid gap-3">
            <Field label="Payment terms">
              <NativeSelect
                value={PAYMENT_TERMS.some((t) => t.label === draft.paymentTerms) ? draft.paymentTerms : "custom"}
                onChange={(e) => {
                  if (e.target.value === "custom") set({ paymentTerms: draft.paymentTerms });
                  else set({ paymentTerms: e.target.value });
                }}
              >
                {PAYMENT_TERMS.map((t) => (
                  <option key={t.id} value={t.id === "custom" ? "custom" : t.label}>
                    {t.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Custom terms / notes">
              <Textarea
                rows={3}
                value={draft.notes}
                onChange={(e) => set({ notes: e.target.value })}
                placeholder="Campaign work will begin after payment confirmation."
              />
            </Field>
          </div>
        </section>

        <div className="flex flex-wrap gap-2 pb-8">
          <Button variant="brand" size="lg" disabled={saving} onClick={onSave}>
            {saving ? "Saving…" : "Save invoice"}
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              if (!draft.clientId) toast.error("Please select a client.");
            }}
          >
            Preview on the right
          </Button>
        </div>
      </div>

      <aside className="xl:sticky xl:top-20">
        <InvoicePaper
          settings={settings}
          client={client}
          invoice={{
            invoiceNumber,
            issueDate: draft.issueDate,
            issueTime: draft.issueTime,
            dueDate: draft.dueDate,
            status,
            items: paperItems,
            discountType: draft.discountType,
            discountValue: draft.discountValue,
            taxEnabled: draft.taxEnabled,
            taxRate: draft.taxRate,
            taxAmount: totals.taxAmount,
            serviceCharge: totals.serviceCharge,
            cashOutCharge: totals.cashOutCharge,
            subtotal: totals.subtotal,
            total: totals.total,
            paidAmount: paid,
            dueAmount: due,
            paymentTerms: draft.paymentTerms,
            notes: draft.notes,
            isBoosting: draft.isBoosting,
            adBudgetUsd: draft.adBudgetUsd,
            marketivityRate: draft.marketivityRate,
          }}
        />
      </aside>
    </div>
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

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "font-semibold" : "text-muted-foreground"}`}>
      <dt>{k}</dt>
      <dd className="tabular">{v}</dd>
    </div>
  );
}
