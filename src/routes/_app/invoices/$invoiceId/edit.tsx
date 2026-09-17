import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { emptyDraft, InvoiceEditor } from "@/components/invoices/invoice-editor";
import { PageHeader } from "@/components/layout/app-shell";
import { listClients } from "@/lib/server/clients";
import { getInvoice, updateInvoice } from "@/lib/server/invoices";
import { listServices } from "@/lib/server/services";
import { getSettings } from "@/lib/server/settings";
import type { InvoiceDraft } from "@/lib/types";
import { uid } from "@/lib/utils";

export const Route = createFileRoute("/_app/invoices/$invoiceId/edit")({ component: EditInvoice });

function EditInvoice() {
  const { invoiceId } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["invoice", invoiceId], queryFn: () => getInvoice({ data: invoiceId }) });
  const { data: clients = [], refetch } = useQuery({ queryKey: ["clients"], queryFn: () => listClients() });
  const { data: services = [] } = useQuery({ queryKey: ["services"], queryFn: () => listServices() });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => getSettings() });
  const [draft, setDraft] = useState<InvoiceDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);

  useEffect(() => {
    if (!data) return;
    const inv = data.invoice;
    setDraft({
      clientId: inv.clientId,
      issueDate: inv.issueDate,
      issueTime: inv.issueTime,
      dueDate: inv.dueDate || emptyDraft("").dueDate,
      items: (inv.items ?? []).map((it) => ({
        key: uid(),
        serviceId: it.serviceId,
        serviceName: it.serviceName,
        description: it.description,
        qty: it.qty,
        unitPrice: it.unitPrice,
      })),
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
  }, [data]);

  if (!data || !draft || !settings) return <div className="h-64 animate-pulse rounded-2xl bg-muted" />;

  return (
    <div>
      <PageHeader title={`Edit ${data.invoice.invoiceNumber}`} />
      <InvoiceEditor
        draft={draft}
        onChange={setDraft}
        clients={clients}
        services={services}
        settings={settings}
        invoiceNumber={data.invoice.invoiceNumber}
        paidAmount={data.invoice.paidAmount}
        saving={saving}
        onCreateClient={() => setClientOpen(true)}
        onSave={async () => {
          setSaving(true);
          try {
            await updateInvoice({ data: { ...draft, id: invoiceId } });
            toast.success("Invoice updated");
            qc.invalidateQueries();
            nav({ to: "/invoices/$invoiceId", params: { invoiceId } });
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not update invoice");
          } finally {
            setSaving(false);
          }
        }}
      />
      <ClientFormDialog
        open={clientOpen}
        onOpenChange={setClientOpen}
        onSaved={(c) => {
          refetch();
          setDraft((d) => (d ? { ...d, clientId: c.id } : d));
        }}
      />
    </div>
  );
}
