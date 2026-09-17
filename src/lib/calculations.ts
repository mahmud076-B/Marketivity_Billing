import { roundMoney } from "./money";
import type { DiscountType, InvoiceDraftItem, InvoiceStatus } from "./types";

export type Totals = {
  subtotal: number;
  discountAmount: number;
  taxable: number;
  taxAmount: number;
  serviceCharge: number;
  cashOutCharge: number;
  total: number;
  advertisingCost: number;
};

export function lineAmount(qty: number, unitPrice: number): number {
  return roundMoney((Number(qty) || 0) * (Number(unitPrice) || 0));
}

export function computeTotals(input: {
  items: Pick<InvoiceDraftItem, "qty" | "unitPrice">[];
  discountType: DiscountType;
  discountValue: number;
  taxEnabled: boolean;
  taxRate: number;
  serviceCharge: number;
  cashOutCharge: number;
  isBoosting?: boolean;
  adBudgetUsd?: number;
  marketivityRate?: number;
}): Totals {
  let itemsSub = 0;
  for (const item of input.items) {
    itemsSub += lineAmount(item.qty, item.unitPrice);
  }
  const advertisingCost =
    input.isBoosting
      ? roundMoney((Number(input.adBudgetUsd) || 0) * (Number(input.marketivityRate) || 0))
      : 0;
  const subtotal = roundMoney(itemsSub + advertisingCost);

  let discountAmount = 0;
  if (input.discountType === "percent") {
    discountAmount = roundMoney(subtotal * ((Number(input.discountValue) || 0) / 100));
  } else if (input.discountType === "fixed") {
    discountAmount = roundMoney(Number(input.discountValue) || 0);
  }
  if (discountAmount > subtotal) discountAmount = subtotal;

  const taxable = roundMoney(subtotal - discountAmount);
  const taxAmount = input.taxEnabled
    ? roundMoney(taxable * ((Number(input.taxRate) || 0) / 100))
    : 0;
  const serviceCharge = roundMoney(Number(input.serviceCharge) || 0);
  const cashOutCharge = roundMoney(Number(input.cashOutCharge) || 0);
  const total = roundMoney(taxable + taxAmount + serviceCharge + cashOutCharge);

  return { subtotal, discountAmount, taxable, taxAmount, serviceCharge, cashOutCharge, total, advertisingCost };
}

export function deriveStatus(total: number, paid: number, dueDate: string | null, today: string, voided = false): InvoiceStatus {
  if (voided) return "void";
  const t = roundMoney(total);
  const p = roundMoney(paid);
  if (p <= 0) {
    if (dueDate && dueDate < today) return "overdue";
    return "unpaid";
  }
  if (p + 0.001 >= t) return "paid";
  if (dueDate && dueDate < today) return "overdue";
  return "partially_paid";
}

export function dueOf(total: number, paid: number): number {
  return roundMoney(Math.max(0, roundMoney(total) - roundMoney(paid)));
}
