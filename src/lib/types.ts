export type InvoiceStatus = "unpaid" | "partially_paid" | "paid" | "overdue" | "void";
export type PaymentStatus = "active" | "void";
export type DiscountType = "none" | "fixed" | "percent";
export type PaymentMethod = "cash" | "bkash" | "nagad" | "bank" | "card" | "other";
export type SerialKind = "invoice" | "receipt" | "client" | "transaction";
export type PaymentTermsPreset =
  | "before_campaign"
  | "advance_50"
  | "full_payment"
  | "due_7"
  | "custom";

export const PAYMENT_METHODS: { id: PaymentMethod; label: string }[] = [
  { id: "cash", label: "Cash" },
  { id: "bkash", label: "bKash" },
  { id: "nagad", label: "Nagad" },
  { id: "bank", label: "Bank Transfer" },
  { id: "card", label: "Card" },
  { id: "other", label: "Other" },
];

export const PAYMENT_TERMS: { id: PaymentTermsPreset; label: string }[] = [
  { id: "before_campaign", label: "Payment required before campaign starts" },
  { id: "advance_50", label: "50% advance required" },
  { id: "full_payment", label: "Full payment required" },
  { id: "due_7", label: "Payment due within 7 days" },
  { id: "custom", label: "Custom terms" },
];

export const STATUS_LABEL: Record<InvoiceStatus, string> = {
  unpaid: "Unpaid",
  partially_paid: "Partially Paid",
  paid: "Paid",
  overdue: "Overdue",
  void: "Void",
};

export type Client = {
  id: string;
  clientCode: string;
  name: string;
  businessName: string;
  phone: string;
  email: string;
  address: string;
  facebookPage: string;
  website: string;
  notes: string;
  isSample: boolean;
  isArchived?: boolean;
  createdAt: string;
};

export type Service = {
  id: string;
  name: string;
  description: string;
  defaultRate: number;
  isBoosting: boolean;
  usdRate: number | null;
  isSample: boolean;
};

export type InvoiceItem = {
  id: string;
  serviceId: string | null;
  serviceName: string;
  description: string;
  qty: number;
  unitPrice: number;
  amount: number;
  sortOrder: number;
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  clientId: string;
  issueDate: string;
  issueTime: string;
  dueDate: string | null;
  status: InvoiceStatus;
  subtotal: number;
  discountType: DiscountType;
  discountValue: number;
  taxEnabled: boolean;
  taxRate: number;
  taxAmount: number;
  serviceCharge: number;
  cashOutCharge: number;
  total: number;
  paidAmount: number;
  dueAmount: number;
  paymentTerms: string;
  notes: string;
  isBoosting: boolean;
  adBudgetUsd: number | null;
  marketivityRate: number | null;
  isSample: boolean;
  createdAt: string;
  updatedAt: string;
  client?: Client;
  items?: InvoiceItem[];
};

export type InvoiceListRow = Invoice & {
  clientName: string;
  businessName: string;
};

export type Payment = {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  transactionId: string;
  receiptNumber: string;
  amount: number;
  method: PaymentMethod;
  paymentDate: string;
  paymentTime: string;
  externalTxnId: string;
  notes: string;
  previousDue: number;
  remainingDue: number;
  status: PaymentStatus;
  voidedAt: string | null;
  voidReason: string;
  createdAt: string;
};

export type Settings = {
  agencyName: string;
  tagline: string;
  positioning: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  website: string;
  facebookPage: string;
  bkashNumber: string;
  nagadNumber: string;
  bankInfo: string;
  logoDataUrl: string;
  accentColor: string;
  footerText: string;
  paymentInstructions: string;
  terms: string;
  theme: "dark" | "light";
  invoiceTheme: string;
  sampleLoaded: boolean;
};

export type DashboardStats = {
  totalRevenue: number;
  totalPaid: number;
  totalDue: number;
  totalInvoices: number;
  monthRevenue: number;
  pendingPayments: number;
  prevMonthRevenue: number;
  paidCount: number;
  unpaidCount: number;
  partialCount: number;
  overdueCount: number;
  voidCount: number;
};

export type AnalyticsData = {
  today: number;
  week: number;
  month: number;
  year: number;
  
  // Advanced KPIs
  averageInvoiceValue: number;
  cashReceived: number;
  paidRate: number; // percentage

  statusCounts: Record<InvoiceStatus, number>;
  
  // Kept for backward compatibility
  monthly: { month: string; revenue: number; paid: number }[];
  
  byService: { name: string; amount: number }[];
  
  paymentMethods: { name: string; amount: number }[];
  
  timeSeries: {
    granularity: "daily" | "weekly" | "monthly";
    points: {
      label: string;
      invoiced: number;
      cashReceived: number;
    }[];
  };

  clientBreakdown: {
    clientId: string;
    clientName: string;
    invoiced: number;
    cashReceived: number;
    due: number;
    invoiceCount: number;
    averageInvoiceValue: number;
  }[];
};

export type AuditEvent = {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  details: string;
  createdAt: string;
};

export type SearchHit = {
  kind: "client" | "invoice" | "receipt" | "transaction";
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

export type ClientProfile = {
  client: Client;
  totalInvoices: number;
  totalBilled: number;
  totalPaid: number;
  totalDue: number;
  invoices: InvoiceListRow[];
  payments: Payment[];
};

export type InvoiceDraftItem = {
  key: string;
  serviceId: string | null;
  serviceName: string;
  description: string;
  qty: number;
  unitPrice: number;
};

export type InvoiceDraft = {
  clientId: string;
  issueDate: string;
  issueTime: string;
  dueDate: string;
  items: InvoiceDraftItem[];
  discountType: DiscountType;
  discountValue: number;
  taxEnabled: boolean;
  taxRate: number;
  serviceCharge: number;
  cashOutCharge: number;
  paymentTerms: string;
  notes: string;
  isBoosting: boolean;
  adBudgetUsd: number;
  marketivityRate: number;
  initialPayment?: {
    amount: number;
    method: PaymentMethod;
    externalTxnId: string;
    notes: string;
  } | null;
};

export const DEFAULT_SETTINGS: Settings = {
  agencyName: "Marketivity",
  tagline: "Think beyond marketing. Build for growth.",
  positioning: "Digital Growth Partners",
  phone: "",
  whatsapp: "",
  email: "hello@marketivity.com",
  address: "Rajshahi, Bangladesh",
  website: "https://marketivity.com",
  facebookPage: "",
  bkashNumber: "",
  nagadNumber: "",
  bankInfo: "",
  logoDataUrl: "",
  accentColor: "#F5A623",
  footerText: "Think beyond marketing. Build for growth.",
  paymentInstructions:
    "Please complete payment using bKash, Nagad, or bank transfer. Campaign work begins after payment confirmation.",
  terms: "All campaigns are subject to platform policies. Advertising spend is non-refundable once delivered to Meta/Google.",
  theme: "dark",
  invoiceTheme: "classic",
  sampleLoaded: false,
};

export type StatementEntry = {
  date: string;
  type: "invoice" | "payment" | "void_payment";
  reference: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
  status: InvoiceStatus | PaymentStatus;
  paymentMethod?: PaymentMethod;
  relatedInvoiceId?: string;
  relatedPaymentId?: string;
};

export type ClientStatement = {
  client: Client;
  entries: StatementEntry[];
  totalInvoiced: number;
  totalPaid: number;
  currentDue: number;
  invoiceCount: number;
  paymentCount: number;
};
