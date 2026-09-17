import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Download, Printer } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ReceiptPaper } from "@/components/documents/receipt-paper";
import { PageHeader } from "@/components/layout/app-shell";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { downloadReceiptPdf } from "@/lib/pdf/receipt-pdf";
import { getPayment, voidPayment } from "@/lib/server/payments";
import { getSettings } from "@/lib/server/settings";

export const Route = createFileRoute("/_app/receipts/$receiptId")({ component: ReceiptDetail });

function ReceiptDetail() {
  const { receiptId } = Route.useParams();
  const qc = useQueryClient();
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [isVoiding, setIsVoiding] = useState(false);
  const { data } = useQuery({ queryKey: ["payment", receiptId], queryFn: () => getPayment({ data: receiptId }) });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => getSettings() });

  if (!data || !settings || !data.invoice) return <div className="h-64 animate-pulse rounded-2xl bg-muted" />;

  const isVoid = data.payment.status === "void";

  async function handleVoid() {
    try {
      setIsVoiding(true);
      await voidPayment({
        data: {
          paymentId: receiptId,
          reason: voidReason.trim() || "Voided from receipt page",
        },
      });
      toast.success("Receipt and payment voided. Invoice balance restored.");
      setVoidOpen(false);
      setVoidReason("");
      qc.invalidateQueries();
    } catch (err: any) {
      toast.error(err?.message || "Failed to void payment");
    } finally {
      setIsVoiding(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={data.payment.receiptNumber}
        description={`Against ${data.payment.invoiceNumber}`}
        actions={
          <div className="flex items-center gap-2">
            {isVoid ? (
              <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-bold text-destructive tracking-wider uppercase">
                VOIDED
              </span>
            ) : (
              <Button variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => setVoidOpen(true)}>
                Void receipt
              </Button>
            )}
            <Button
              variant="brand"
              onClick={() =>
                downloadReceiptPdf({
                  payment: data.payment,
                  invoice: data.invoice!,
                  client: data.client,
                  settings,
                })
              }
            >
              <Download /> Download PDF
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer /> Print
            </Button>
          </div>
        }
      />
      <div className="mx-auto max-w-3xl">
        <ReceiptPaper payment={data.payment} invoice={data.invoice} client={data.client} settings={settings} />
      </div>

      <AlertDialog open={voidOpen} onOpenChange={setVoidOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void this payment receipt?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reverse the payment, mark the receipt as VOID, and restore the due amount on the invoice.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-2">
            <label className="text-xs font-medium text-muted-foreground">Reason for voiding</label>
            <Input
              className="mt-1"
              placeholder="e.g. Returned funds, payment error"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isVoiding}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isVoiding}
              onClick={handleVoid}
            >
              {isVoiding ? "Voiding..." : "Void receipt"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
