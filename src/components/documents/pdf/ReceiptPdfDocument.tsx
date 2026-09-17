import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatLongDate } from "@/lib/dates";
import { formatTaka, parseMoney } from "@/lib/money";
import { PAYMENT_METHODS, type Client, type Invoice, type Payment, type Settings } from "@/lib/types";
import { INVOICE_PDF_FONT_FAMILY, registerInvoicePdfFonts } from "./invoice-pdf-fonts";

const colors = {
  ink: "#1A1424",
  muted: "#6B6278",
  line: "#E6DFD4",
  soft: "#F7F1E8",
  night: "#0B0714",
  cream: "#F4EFE6",
  lilac: "#C4B8D4",
  orange: "#F5A623",
  purple: "#7B2FBE",
  redBg: "#FEE2E2",
  redText: "#991B1B",
  grayBg: "#E5E7EB",
  grayText: "#4B5563",
  voidBorder: "rgba(220, 38, 38, 0.6)",
  voidText: "rgba(220, 38, 38, 0.6)",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 100,
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
    height: 86,
    paddingHorizontal: 36,
    paddingTop: 24,
    backgroundColor: colors.night,
    color: colors.cream,
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
    color: colors.lilac,
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
  },
  documentTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  documentTitle: {
    fontSize: 22,
    fontWeight: "bold",
  },
  voidBadge: {
    backgroundColor: colors.redText,
    color: "#FFFFFF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    fontSize: 8,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  receiptNumber: {
    marginTop: 2,
    color: "#E8D5A3",
    fontSize: 10,
  },
  headerMeta: {
    marginTop: 2,
    color: colors.lilac,
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
  watermarkContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: -1,
  },
  watermarkText: {
    color: colors.voidText,
    fontSize: 64,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 4,
    transform: "rotate(-25deg)",
    borderWidth: 6,
    borderColor: colors.voidBorder,
    borderRadius: 16,
    paddingHorizontal: 40,
    paddingVertical: 12,
  },
  grid: {
    marginTop: 10,
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    marginBottom: 8,
  },
  label: {
    width: 100,
    fontSize: 8,
    fontWeight: "bold",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  value: {
    flex: 1,
    fontSize: 10,
    fontWeight: "bold",
    color: colors.ink,
  },
  valueVoid: {
    textDecoration: "line-through",
    color: colors.muted,
  },
  voidBox: {
    marginTop: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "rgba(220, 38, 38, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(220, 38, 38, 0.3)",
    alignItems: "center",
  },
  voidBoxTitle: {
    color: colors.redText,
    fontSize: 10,
    fontWeight: "bold",
  },
  voidBoxReason: {
    marginTop: 4,
    color: "rgba(153, 27, 27, 0.9)",
    fontSize: 9,
  },
  successBox: {
    marginTop: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.soft,
    alignItems: "center",
  },
  successBoxText: {
    color: colors.purple,
    fontSize: 10,
  },
  notes: {
    marginTop: 8,
    fontSize: 10,
    color: colors.muted,
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
    justifyContent: "center",
    fontSize: 8,
  },
  footerAccent: {
    color: colors.orange,
  },
});

type Props = {
  payment: Payment;
  invoice: Invoice;
  client?: Client | null;
  settings: Settings;
};

function clean(value?: string | null) {
  return value?.trim() || "";
}

function Header({ payment, settings, isVoid }: Pick<Props, "payment" | "settings"> & { isVoid: boolean }) {
  return (
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
          <View style={styles.documentTitleRow}>
            <Text style={styles.documentTitle}>RECEIPT</Text>
            {isVoid ? <Text style={styles.voidBadge}>VOID</Text> : null}
          </View>
          <Text style={styles.receiptNumber}>{payment.receiptNumber}</Text>
          <Text style={styles.headerMeta}>
            {formatLongDate(payment.paymentDate)} - {payment.paymentTime}
          </Text>
        </View>
      </View>
      <View style={styles.headerStripe} />
    </View>
  );
}

export function ReceiptPdfDocument(props: Props) {
  registerInvoicePdfFonts();
  const { payment, invoice, client, settings } = props;
  const isVoid = payment.status === "void";
  const method = PAYMENT_METHODS.find((m) => m.id === payment.method)?.label ?? payment.method;

  const rows: { label: string; value: string; isAmount?: boolean }[] = [
    { label: "Received from", value: clean(client?.businessName) || clean(client?.name) || "—" },
    { label: "Client", value: clean(client?.name) || "—" },
    { label: "Invoice", value: invoice.invoiceNumber },
    { label: "Amount received", value: formatTaka(payment.amount), isAmount: true },
    { label: "Method", value: method },
    { label: "Transaction ID", value: payment.transactionId },
  ];

  if (payment.externalTxnId) {
    rows.push({ label: "Reference", value: payment.externalTxnId });
  }

  rows.push({ label: "Previous due", value: formatTaka(payment.previousDue) });
  rows.push({ label: "Remaining due", value: formatTaka(payment.remainingDue) });
  rows.push({ label: "Status", value: isVoid ? "VOIDED (REVERSED)" : payment.remainingDue <= 0 ? "PAID" : "PARTIALLY PAID" });

  if (isVoid) {
    rows.push({ label: "Void reason", value: payment.voidReason || "Voided by user" });
    rows.push({ label: "Voided at", value: payment.voidedAt ? formatLongDate(payment.voidedAt.slice(0, 10)) : "—" });
  }

  return (
    <Document title={`${payment.receiptNumber} - Receipt`} author={settings.agencyName || "Marketivity"}>
      <Page size="A4" style={styles.page}>
        <Header payment={payment} settings={settings} isVoid={isVoid} />
        
        {isVoid ? (
          <View fixed style={styles.watermarkContainer}>
            <Text style={styles.watermarkText}>VOID</Text>
          </View>
        ) : null}

        <View style={styles.grid}>
          {rows.map((row) => (
            <View key={row.label} style={styles.row} wrap={false}>
              <Text style={styles.label}>{row.label}</Text>
              <Text style={[styles.value, isVoid && row.isAmount ? styles.valueVoid : undefined]}>
                {row.value}
              </Text>
            </View>
          ))}
        </View>

        {isVoid ? (
          <View style={styles.voidBox} wrap={false}>
            <Text style={styles.voidBoxTitle}>THIS RECEIPT HAS BEEN VOIDED AND REVERSED.</Text>
            {payment.voidReason ? (
              <Text style={styles.voidBoxReason}>Reason: {payment.voidReason}</Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.successBox} wrap={false}>
            <Text style={styles.successBoxText}>Payment received successfully. Thank you for choosing Marketivity.</Text>
          </View>
        )}

        {payment.notes ? (
          <Text style={styles.notes} wrap={false}>Note: {payment.notes}</Text>
        ) : null}

        <View fixed style={styles.footer}>
          <Text style={styles.footerAccent}>{settings.footerText || "Think beyond marketing. Build for growth."}</Text>
        </View>
      </Page>
    </Document>
  );
}
