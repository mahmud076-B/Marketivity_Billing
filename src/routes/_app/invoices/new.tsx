import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { emptyDraft, InvoiceEditor } from "@/components/invoices/invoice-editor";
import { PageHeader } from "@/components/layout/app-shell";
import { listClients } from "@/lib/server/clients";
import { createInvoice, getInvoice, previewNextInvoiceNumber } from "@/lib/server/invoices";
import { listServices } from "@/lib/server/services";
import { getSettings } from "@/lib/server/settings";
import type { InvoiceDraft } from "@/lib/types";
import { uid } from "@/lib/utils";

type Search = { clientId?: string; duplicate?: string };

export const Route = createFileRoute("/_app/invoices/new")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    clientId: typeof s.clientId === "string" ? s.clientId : undefined,
    duplicate: typeof s.duplicate === "string" ? s.duplicate : undefined,
  }),
  component: NewInvoicePage,
});

function NewInvoicePage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { clientId, duplicate } = Route.useSearch();
  const { data: clients = [], refetch: refetchClients } = useQuery({ queryKey: ["clients"], queryFn: () => listClients() });
  const { data: services = [] } = useQuery({ queryKey: ["services"], queryFn: () => listServices() });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => getSettings() });
  const { data: nextNumber = "MKT-INV-····" } = useQuery({
    queryKey: ["next-invoice"],
    queryFn: () => previewNextInvoiceNumber(),
  });
  const [draft, setDraft] = useState<InvoiceDraft>(() => emptyDraft(nextNumber, clientId ?? ""));
  const [saving, setSaving] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);

  useEffect(() => {
    if (clientId) setDraft((d) => ({ ...d, clientId }));
  }, [clientId]);

  useEffect(() => {
    if (!duplicate) return;
    getInvoice({ data: duplicate }).then((full) => {
      const inv = full.invoice;
      setDraft({
        clientId: inv.clientId,
        issueDate: emptyDraft("").issueDate,
        issueTime: emptyDraft("").issueTime,
        dueDate: emptyDraft("").dueDate,
        items:
          (inv.items ?? []).map((it) => ({
            key: uid(),
            serviceId: it.serviceId,
            serviceName: it.serviceName,
            description: it.description,
            qty: it.qty,
            unitPrice: it.unitPrice,
          })) || emptyDraft("").items,
        discountType: inv.discountType,
        discountValue: inv.discountValue,
        taxEnabled: inv.taxEnabled,
        taxRate: inv.taxRate,
        serviceCharge: inv.serviceCharge,
        cashOutCharge: inv.cashOutCharge ?? 0,
        paymentTerms: inv.paymentTerms,
        notes: inv.notes,
        isBoosting: inv.isBoosting,
        adBudgetUsd: inv.adBudgetUsd ?? 0,
        marketivityRate: inv.marketivityRate ?? 150,
        initialPayment: null,
      });
    });
  }, [duplicate]);

  async function save() {
    if (!draft.clientId) {
      toast.error("Please select a client.");
      return;
    }
    setSaving(true);
    try {
      const created = await createInvoice({ data: draft });
      toast.success("Invoice created successfully");
      qc.invalidateQueries();
      nav({ to: "/invoices/$invoiceId", params: { invoiceId: created.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save invoice");
    } finally {
      setSaving(false);
    }
  }

  if (!settings) return null;

  return (
    <div>
      <PageHeader title="Create invoice" description="Client, services, amounts — everything else is automatic." />
      <InvoiceEditor
        draft={draft}
        onChange={setDraft}
        clients={clients}
        services={services}
        settings={settings}
        invoiceNumber={nextNumber}
        saving={saving}
        onSave={save}
        onCreateClient={() => setClientOpen(true)}
      />
      <ClientFormDialog
        open={clientOpen}
        onOpenChange={setClientOpen}
        onSaved={(c) => {
          refetchClients();
          setDraft((d) => ({ ...d, clientId: c.id }));
        }}
      />
    </div>
  );
}
