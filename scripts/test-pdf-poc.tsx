import React from "react";
import { renderToFile, Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Register font for node environment
Font.register({
  family: "TiroBangla",
  src: path.resolve(__dirname, "../public/fonts/TiroBangla-Regular.ttf"),
});

const styles = StyleSheet.create({
  page: { padding: 30, fontFamily: "TiroBangla" },
  heading: { fontSize: 24, marginBottom: 20 },
  paragraph: { fontSize: 12, marginBottom: 10, lineHeight: 1.5 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#ccc", paddingVertical: 8 },
  cellLabel: { width: "40%", fontSize: 12 },
  cellValue: { width: "60%", fontSize: 12 },
  footer: { position: "absolute", bottom: 30, left: 30, right: 30, textAlign: "center", fontSize: 10, color: "#888" },
});

const InvoicePdfProof = () => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.heading}>Proof of Concept / প্রমাণ</Text>
      <Text style={styles.paragraph}>English: Marketivity, Digital Marketing</Text>
      <Text style={styles.paragraph}>Bengali: বাংলাদেশ, ডিজিটাল মার্কেটিং, মাহমুদ হাসান</Text>
      <Text style={styles.paragraph}>Currency: ৳ 1,250.00</Text>
      <Text style={styles.paragraph}>Mixed: Facebook Ads – ৳ 750</Text>

      <View style={{ marginTop: 20 }}>
        <View style={styles.row}>
          <Text style={styles.cellLabel}>Service</Text>
          <Text style={styles.cellValue}>Description</Text>
        </View>
        {Array.from({ length: 40 }).map((_, i) => (
          <View style={styles.row} key={i}>
            <Text style={styles.cellLabel}>ডিজিটাল মার্কেটিং Service {i + 1}</Text>
            <Text style={styles.cellValue}>
              A very long description that should wrap properly over multiple lines testing whether the PDF renderer handles text wrapping correctly for long Bengali and English text combinations without truncating. এটি একটি খুব দীর্ঘ বিবরণ যা একাধিক লাইনে সঠিকভাবে মোড়ানো উচিত।
            </Text>
          </View>
        ))}
      </View>

      <Text style={styles.footer} fixed>
        Page Footer - Marketivity - ৳ 100
      </Text>
    </Page>
  </Document>
);

async function runTest() {
  const outputPath = path.resolve(__dirname, "../poc-output.pdf");
  try {
    await renderToFile(<InvoicePdfProof />, outputPath);
    console.log(`POC PDF successfully generated at: ${outputPath}`);
  } catch (error) {
    console.error("Failed to generate PDF:", error);
    process.exit(1);
  }
}

runTest();
