import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL, type InvoiceStatus } from "@/lib/types";

const variant: Record<InvoiceStatus, "paid" | "partial" | "unpaid" | "overdue" | "void"> = {
  paid: "paid",
  partially_paid: "partial",
  unpaid: "unpaid",
  overdue: "overdue",
  void: "void",
};

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  return <Badge variant={variant[status]}>{STATUS_LABEL[status]}</Badge>;
}
