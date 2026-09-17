import { Font } from "@react-pdf/renderer";

export const INVOICE_PDF_FONT_FAMILY = "TiroBangla";

let registeredFontSrc: string | null = null;

export function registerInvoicePdfFonts(fontSrc = "/fonts/TiroBangla-Regular.ttf") {
  if (registeredFontSrc) return;

  Font.register({
    family: INVOICE_PDF_FONT_FAMILY,
    fonts: [
      { src: fontSrc, fontWeight: "normal" },
      { src: fontSrc, fontWeight: "bold" },
    ],
  });

  registeredFontSrc = fontSrc;
}
