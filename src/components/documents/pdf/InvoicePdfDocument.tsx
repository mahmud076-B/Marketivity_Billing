import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatLongDate } from "@/lib/dates";
import { formatTaka, formatUsd, parseMoney, roundMoney } from "@/lib/money";
import { STATUS_LABEL, type Client, type Invoice, type InvoiceItem, type Settings } from "@/lib/types";
import { INVOICE_PDF_FONT_FAMILY, registerInvoicePdfFonts } from "./invoice-pdf-fonts";


const colors = {
  ink: "#1A1424",
  muted: "#6B6278",
  line: "#E6DFD4",
  soft: "#FFF0F5",
  night: "#0B0714",
  cream: "#F4EFE6",
  lilac: "#C4B8D4",
  orange: "#F5A623",
  purple: "#7B2FBE",
  greenBg: "#DCFCE7",
  greenText: "#166534",
  amberBg: "#FEF3C7",
  amberText: "#92400E",
  redBg: "#FEE2E2",
  redText: "#991B1B",
  grayBg: "#E5E7EB",
  grayText: "#4B5563",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 140,
    paddingRight: 36,
    paddingBottom: 56,
    paddingLeft: 36,
    fontFamily: INVOICE_PDF_FONT_FAMILY,
    color: colors.ink,
    fontSize: 9,
    lineHeight: 1.35,
    backgroundColor: "#FFFFFF",
  },
  fixedHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 98,
    paddingHorizontal: 36,
    paddingTop: 12,
    backgroundColor: colors.soft,
    color: colors.ink,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 24,
  },
  brandSide: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    paddingRight: 20,
  },
  logo: {
    width: 38,
    height: 38,
    objectFit: "contain",
    borderRadius: 8,
  },
  logoFallback: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: colors.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  logoFallbackText: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.night,
  },
  agencyName: {
    fontSize: 15,
    fontWeight: "bold",
    letterSpacing: 0.7,
  },
  positioning: {
    marginTop: 2,
    fontSize: 8,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 1.3,
  },
  tagline: {
    marginTop: 3,
    fontSize: 8,
    color: colors.orange,
  },
  documentSide: {
    width: 190,
    alignItems: "flex-end",
    justifyContent: "flex-start",
  },
  documentTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 8,
    marginTop: -4,
  },
  invoiceNumber: {
    color: colors.muted,
    fontSize: 10,
    marginBottom: 4,
  },
  headerMeta: {
    color: colors.muted,
    fontSize: 8,
  },
  headerStripe: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor: colors.orange,
  },
  headerStripePurple: {
    width: 120,
    height: 3,
    backgroundColor: colors.purple,
  },
  fixedColumnHeader: {
    position: "absolute",
    top: 108,
    left: 36,
    right: 36,
    height: 24,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: colors.soft,
    flexDirection: "row",
    alignItems: "center",
  },
  repeatedMeta: {
    position: "absolute",
    top: 102,
    right: 36,
    color: colors.muted,
    fontSize: 7,
  },
  sectionRow: {
    flexDirection: "row",
    gap: 28,
    marginBottom: 18,
  },
  sectionCol: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.purple,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  name: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 3,
  },
  mutedLine: {
    color: colors.muted,
    fontSize: 9,
    marginBottom: 1.5,
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 7.5,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  voidBanner: {
    marginBottom: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: colors.redText,
    backgroundColor: colors.redBg,
    textAlign: "center",
    color: colors.redText,
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 2,
  },
  boostBox: {
    marginBottom: 14,
    padding: 11,
    borderRadius: 8,
    backgroundColor: colors.soft,
  },
  boostTitle: {
    fontWeight: "bold",
    marginBottom: 3,
    color: colors.ink,
  },
  table: {
    marginTop: 2,
    marginBottom: 18,
  },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: colors.soft,
    color: colors.muted,
    fontSize: 7.5,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  indexCol: { width: 24 },
  serviceCol: { flex: 1.35, paddingRight: 8 },
  descCol: { flex: 1.65, paddingRight: 8 },
  qtyCol: { width: 34, textAlign: "right" },
  moneyCol: { width: 70, textAlign: "right" },
  serviceName: {
    fontWeight: "bold",
  },
  description: {
    color: colors.muted,
  },
  afterTable: {
    flexDirection: "row",
    gap: 28,
    alignItems: "flex-start",
  },
  leftAfterTable: {
    flex: 1,
  },
  totalsBox: {
    width: 230,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
    marginBottom: 5,
    color: colors.muted,
  },
  totalLabel: {
    flex: 1,
  },
  totalValue: {
    width: 96,
    textAlign: "right",
  },
  totalStrong: {
    color: colors.ink,
    fontWeight: "bold",
    fontSize: 10,
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  dueRow: {
    color: colors.purple,
    fontWeight: "bold",
  },
  block: {
    marginBottom: 13,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 32,
    paddingHorizontal: 36,
    backgroundColor: colors.night,
    color: colors.lilac,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    fontSize: 8,
  },
  footerAccent: {
    color: colors.orange,
  },
  pageNumber: {
    position: "absolute",
    right: 36,
    bottom: 38,
    color: colors.muted,
    fontSize: 8,
  },
});

type Props = {
  invoice: Invoice;
  client?: Client | null;
  items: InvoiceItem[];
  settings: Settings;
};

function statusStyle(status: Invoice["status"]) {
  if (status === "paid") return { backgroundColor: colors.greenBg, color: colors.greenText };
  if (status === "partially_paid") return { backgroundColor: colors.amberBg, color: colors.amberText };
  if (status === "overdue") return { backgroundColor: colors.redBg, color: colors.redText };
  if (status === "void") return { backgroundColor: colors.grayBg, color: colors.grayText };
  return { backgroundColor: colors.grayBg, color: colors.ink };
}

function clean(value?: string | null) {
  return value?.trim() || "";
}

function Header({ invoice, settings }: Pick<Props, "invoice" | "settings">) {
  return (
    <>
      <View fixed style={styles.fixedHeader}>
        <View style={styles.headerRow}>
          <View style={styles.brandSide}>
            {settings.logoDataUrl ? (
              <Image src={settings.logoDataUrl} style={styles.logo} />
            ) : (
              <Image src="/Marketivity_Exact_Logo_Web_Assets/Marketivity_logo_exact_transparent.png" style={styles.logo} />
            )}
            <View>
              <Text style={styles.agencyName}>{(settings.agencyName || "MARKETIVITY").toUpperCase()}</Text>
              <Text style={styles.positioning}>{settings.positioning || "Digital Growth Partners"}</Text>
              <Text style={styles.tagline}>{settings.tagline || "Think beyond marketing. Build for growth."}</Text>
            </View>
          </View>
          <View style={styles.documentSide}>
            <Text style={styles.documentTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
            <Text style={styles.headerMeta}>
              {formatLongDate(invoice.issueDate)} - {invoice.issueTime}
            </Text>
          </View>
        </View>
        <View style={styles.headerStripe}>
          <View style={styles.headerStripePurple} />
        </View>
      </View>
      <View fixed style={styles.fixedColumnHeader}>
        <Text style={styles.indexCol}>#</Text>
        <Text style={styles.serviceCol}>Service</Text>
        <Text style={styles.descCol}>Description</Text>
        <Text style={styles.qtyCol}>Qty</Text>
        <Text style={styles.moneyCol}>Unit Price</Text>
        <Text style={styles.moneyCol}>Amount</Text>
      </View>
      <Text fixed style={styles.repeatedMeta}>
        {invoice.invoiceNumber}
      </Text>
    </>
  );
}

function ContactSections({ invoice, client, settings }: Props) {
  const clientName = clean(client?.businessName) || clean(client?.name) || "Client";
  const clientLines = [
    client?.businessName ? clean(client.name) : "",
    clean(client?.phone),
    clean(client?.email),
    clean(client?.address),
  ].filter(Boolean);
  const businessLines = [
    clean(settings.phone),
    clean(settings.email),
    clean(settings.website),
    clean(settings.address),
  ].filter(Boolean);

  return (
    <View style={styles.sectionRow}>
      <View style={styles.sectionCol}>
        <Text style={styles.eyebrow}>Bill to</Text>
        <Text style={styles.name}>{clientName}</Text>
        {clientLines.map((line) => (
          <Text key={line} style={styles.mutedLine}>{line}</Text>
        ))}
      </View>
      <View style={styles.sectionCol}>
        <Text style={styles.eyebrow}>From</Text>
        <Text style={styles.name}>{settings.agencyName || "Marketivity"}</Text>
        {businessLines.map((line) => (
          <Text key={line} style={styles.mutedLine}>{line}</Text>
        ))}
        {invoice.dueDate ? (
          <Text style={[styles.mutedLine, { marginTop: 6 }]}>Due {formatLongDate(invoice.dueDate)}</Text>
        ) : null}
        <Text style={[styles.badge, statusStyle(invoice.status), { marginTop: 7 }]}>
          {STATUS_LABEL[invoice.status]}
        </Text>
      </View>
    </View>
  );
}

function TableHeader() {
  return (
    <View style={styles.tableHeader} wrap={false}>
      <Text style={styles.indexCol}>#</Text>
      <Text style={styles.serviceCol}>Service</Text>
      <Text style={styles.descCol}>Description</Text>
      <Text style={styles.qtyCol}>Qty</Text>
      <Text style={styles.moneyCol}>Unit Price</Text>
      <Text style={styles.moneyCol}>Amount</Text>
    </View>
  );
}

function LineItems({ items }: { items: InvoiceItem[] }) {
  return (
    <View style={styles.table}>
      <TableHeader />
      {items.length === 0 ? (
        <View style={styles.tableRow}>
          <Text style={styles.description}>Services will appear here.</Text>
        </View>
      ) : (
        items.map((item, index) => (
          <View key={item.id || `${item.serviceName}-${index}`} style={styles.tableRow} wrap={false}>
            <Text style={styles.indexCol}>{index + 1}</Text>
            <Text style={[styles.serviceCol, styles.serviceName]}>{item.serviceName || "Service"}</Text>
            <Text style={[styles.descCol, styles.description]}>{item.description || "-"}</Text>
            <Text style={styles.qtyCol}>{item.qty}</Text>
            <Text style={styles.moneyCol}>{formatTaka(item.unitPrice)}</Text>
            <Text style={[styles.moneyCol, styles.serviceName]}>{formatTaka(item.amount)}</Text>
          </View>
        ))
      )}
    </View>
  );
}

function discountAmount(invoice: Invoice) {
  if (invoice.discountType === "none" || parseMoney(invoice.discountValue) <= 0) return 0;
  const storedDelta = roundMoney(
    parseMoney(invoice.subtotal) + parseMoney(invoice.taxAmount) + parseMoney(invoice.serviceCharge) - parseMoney(invoice.total),
  );
  return Math.max(0, storedDelta);
}

function Summary({ invoice, settings }: Pick<Props, "invoice" | "settings">) {
  const discount = discountAmount(invoice);
  const paymentLines = [
    settings.bkashNumber && `bKash ${settings.bkashNumber}`,
    settings.nagadNumber && `Nagad ${settings.nagadNumber}`,
    settings.bankInfo,
    settings.paymentInstructions,
  ].filter(Boolean) as string[];
  const notes = [invoice.paymentTerms, invoice.notes].map(clean).filter(Boolean).join("\n");

  return (
    <View style={styles.afterTable} wrap={false}>
      <View style={styles.leftAfterTable}>
        <View style={styles.block}>
          <Text style={styles.eyebrow}>Payment information</Text>
          {(paymentLines.length ? paymentLines : ["Contact Marketivity for payment details."]).map((line) => (
            <Text key={line} style={styles.mutedLine}>{line}</Text>
          ))}
        </View>
        {notes ? (
          <View style={styles.block}>
            <Text style={styles.eyebrow}>Notes / terms</Text>
            <Text style={styles.mutedLine}>{notes}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.totalsBox}>
        <TotalRow label="Subtotal" value={formatTaka(invoice.subtotal)} />
        {invoice.isBoosting ? <TotalRow label="Advertising cost" value="Included in subtotal" /> : null}
        {discount > 0 ? (
          <TotalRow
            label={`Discount${invoice.discountType === "percent" ? ` (${invoice.discountValue}%)` : ""}`}
            value={`-${formatTaka(discount)}`}
          />
        ) : null}
        {invoice.taxEnabled ? <TotalRow label={`VAT / Tax (${invoice.taxRate}%)`} value={formatTaka(invoice.taxAmount)} /> : null}
        {parseMoney(invoice.serviceCharge) > 0 ? (
          <TotalRow label="Service charge" value={formatTaka(invoice.serviceCharge)} />
        ) : null}
        {parseMoney(invoice.cashOutCharge) > 0 ? (
          <TotalRow label="Cash out charge" value={formatTaka(invoice.cashOutCharge)} />
        ) : null}
        <TotalRow label="Grand total" value={formatTaka(invoice.total)} strong />
        <TotalRow label="Total paid" value={formatTaka(invoice.paidAmount)} />
        <TotalRow label="Total due" value={formatTaka(invoice.dueAmount)} due />
      </View>
    </View>
  );
}

function TotalRow({ label, value, strong, due }: { label: string; value: string; strong?: boolean; due?: boolean }) {
  return (
    <View style={[styles.totalRow, strong ? styles.totalStrong : undefined, due ? styles.dueRow : undefined]}>
      <Text style={styles.totalLabel}>{label}</Text>
      <Text style={styles.totalValue}>{value}</Text>
    </View>
  );
}

function BoostingDetails({ invoice }: Pick<Props, "invoice">) {
  if (!invoice.isBoosting) return null;

  return (
    <View style={styles.boostBox}>
      <Text style={styles.boostTitle}>Meta Ads / Boosting</Text>
      <Text style={styles.mutedLine}>
        {invoice.adBudgetUsd ? `USD budget ${formatUsd(invoice.adBudgetUsd)}` : "USD budget recorded"}
        {invoice.marketivityRate ? ` - Marketivity rate ${formatTaka(invoice.marketivityRate)} / USD` : ""}
      </Text>
      <Text style={styles.mutedLine}>Advertising cost is included in the stored invoice subtotal.</Text>
    </View>
  );
}

function Footer({ settings }: Pick<Props, "settings">) {
  return (
    <>
      <View fixed style={styles.footer}>
        <Text style={styles.footerAccent}>{settings.footerText || "Think beyond marketing. Build for growth."}</Text>
        <Text>{[settings.phone, settings.email].filter(Boolean).join(" - ") || settings.website || "Marketivity"}</Text>
      </View>
      <Text
        fixed
        style={styles.pageNumber}
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
      />
    </>
  );
}

export function InvoicePdfDocument(props: Props) {
  registerInvoicePdfFonts();
  const { invoice, items, settings } = props;

  return (
    <Document title={`${invoice.invoiceNumber} - Invoice`} author={settings.agencyName || "Marketivity"}>
      <Page size="A4" style={styles.page}>
        <Header invoice={invoice} settings={settings} />
        <Footer settings={settings} />
        {invoice.status === "void" ? <Text style={styles.voidBanner}>VOID</Text> : null}
        <ContactSections {...props} />
        <BoostingDetails invoice={invoice} />
        <LineItems items={items} />
        <Summary invoice={invoice} settings={settings} />
      </Page>
    </Document>
  );
}
