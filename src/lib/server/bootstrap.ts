import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { addDaysIso, dhakaIsoDate, dhakaYear, formatTimeDhaka } from "@/lib/dates";
import { computeTotals, deriveStatus, dueOf, lineAmount } from "@/lib/calculations";
import { DEFAULT_SETTINGS } from "@/lib/types";
import { uid } from "@/lib/utils";
import { logAudit } from "./audit";
import { mapSettings } from "./map";
import { nextSerial } from "./serial";
import { getAgencyOwnerId } from "./workspace";

const CATALOG = [
  { name: "Facebook Ads", rate: 8000, desc: "Facebook advertising setup, targeting and campaign management." },
  { name: "Meta Boosting", rate: 150, desc: "Meta advertising service including management, advertising cost and applicable charges.", boosting: true, usd: 150 },
  { name: "Performance Marketing", rate: 15000, desc: "Full-funnel performance campaigns across Meta and Google." },
  { name: "Social Media Management", rate: 12000, desc: "Monthly page management, posting calendar and community handling." },
  { name: "AI Video", rate: 4500, desc: "AI-assisted product and brand video production." },
  { name: "Product Video", rate: 8000, desc: "Product showcase video for ads and storefronts." },
  { name: "UGC Video", rate: 3500, desc: "User-generated-style creative for paid social." },
  { name: "Content Creation", rate: 5000, desc: "Creative content packages for organic and paid use." },
  { name: "Brand Strategy", rate: 25000, desc: "Positioning, messaging and brand growth workshop." },
  { name: "Creative Design", rate: 3000, desc: "Ad creatives, page covers and campaign visuals." },
  { name: "Ad Campaign Setup", rate: 2500, desc: "Campaign structure, pixels and conversion tracking." },
  { name: "Marketing Consultation", rate: 4000, desc: "One-hour growth consultation with actionable plan." },
  { name: "Custom Service", rate: 0, desc: "Any other Marketivity digital service." },
];

export const bootstrapWorkspace = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const userId = await getAgencyOwnerId(sql);
    const existing = await sql`select user_id, sample_loaded from settings where user_id = ${userId}`;
    if (existing.length === 0) {
      await sql`
        insert into settings (
          user_id, agency_name, tagline, positioning, phone, whatsapp, email, address,
          website, facebook_page, bkash_number, nagad_number, bank_info, logo_data_url,
          accent_color, footer_text, payment_instructions, terms, theme, invoice_theme, sample_loaded
        ) values (
          ${userId}, ${DEFAULT_SETTINGS.agencyName}, ${DEFAULT_SETTINGS.tagline},
          ${DEFAULT_SETTINGS.positioning}, ${DEFAULT_SETTINGS.phone}, ${DEFAULT_SETTINGS.whatsapp},
          ${DEFAULT_SETTINGS.email}, ${DEFAULT_SETTINGS.address}, ${DEFAULT_SETTINGS.website},
          ${DEFAULT_SETTINGS.facebookPage}, ${DEFAULT_SETTINGS.bkashNumber}, ${DEFAULT_SETTINGS.nagadNumber},
          ${DEFAULT_SETTINGS.bankInfo}, ${DEFAULT_SETTINGS.logoDataUrl}, ${DEFAULT_SETTINGS.accentColor},
          ${DEFAULT_SETTINGS.footerText}, ${DEFAULT_SETTINGS.paymentInstructions}, ${DEFAULT_SETTINGS.terms},
          ${DEFAULT_SETTINGS.theme}, ${DEFAULT_SETTINGS.invoiceTheme}, ${false}
        )
      `;
    }

    // const svcCount = await sql<{ c: number }>`select count(*)::int as c from services where user_id = ${userId}`;
    // if ((svcCount[0]?.c ?? 0) === 0) {
    //   for (const svc of CATALOG) {
    //     await sql`
    //       insert into services (id, user_id, name, description, default_rate, is_boosting, usd_rate, is_sample)
    //       values (
    //         ${uid()}, ${userId}, ${svc.name}, ${svc.desc}, ${svc.rate},
    //         ${Boolean(svc.boosting)}, ${svc.usd ?? null}, ${true}
    //       )
    //     `;
    //   }
    // }

    const settingsRows = await sql`select * from settings where user_id = ${userId}`;
    const settings = mapSettings(settingsRows[0]);
    if (settings.sampleLoaded) return { settings, seeded: false };

    // Never seed demo data in production. Mark as loaded so it doesn't trigger again.
    await sql`update settings set sample_loaded = true where user_id = ${userId}`;
    return { settings: { ...settings, sampleLoaded: true }, seeded: false };
  });

async function seedSample(
  sql: Awaited<ReturnType<typeof getSql>>,
  userId: string,
  actorUserId: string,
) {
  const year = dhakaYear();
  const today = dhakaIsoDate();
  const time = formatTimeDhaka();

  const clients = [
    {
      name: "Nusrat Rahman",
      business: "ABC Fashion",
      phone: "01711-445566",
      email: "hello@abcfashion.bd",
      address: "Gulshan 2, Dhaka",
      fb: "facebook.com/abcfashionbd",
      web: "https://abcfashion.bd",
      notes: "Demo client — ready-to-wear boutique. Prefers Meta ads + UGC.",
    },
    {
      name: "Karim Hossain",
      business: "Rajshahi Food Corner",
      phone: "01819-223344",
      email: "rajshahifood@gmail.com",
      address: "Shaheb Bazar, Rajshahi",
      fb: "facebook.com/rajshahifoodcorner",
      web: "",
      notes: "Demo client — restaurant. Regular boosting campaigns.",
    },
    {
      name: "Mahiya Chowdhury",
      business: "Urban Wear BD",
      phone: "01612-778899",
      email: "studio@urbanwearbd.com",
      address: "GEC Circle, Chattogram",
      fb: "facebook.com/urbanwearbd",
      web: "https://urbanwearbd.com",
      notes: "Demo client — streetwear. Heavy video content.",
    },
    {
      name: "Arif Khan",
      business: "TechNova Bangladesh",
      phone: "01552-334455",
      email: "arif@technovabd.com",
      address: "Banani, Dhaka",
      fb: "facebook.com/technovabd",
      web: "https://technovabd.com",
      notes: "Demo client — SaaS startup. Brand + performance retainers.",
    },
  ];

  const created: { id: string; business: string }[] = [];
  for (const c of clients) {
    const id = uid();
    const code = await nextSerial(sql, userId, "client", year);
    await sql`
      insert into clients (
        id, user_id, client_code, name, business_name, phone, email, address,
        facebook_page, website, notes, is_sample
      ) values (
        ${id}, ${userId}, ${code}, ${c.name}, ${c.business}, ${c.phone}, ${c.email},
        ${c.address}, ${c.fb}, ${c.web}, ${c.notes}, ${true}
      )
    `;
    created.push({ id, business: c.business });
  }

  const abc = created[0]!;
  const food = created[1]!;
  const urban = created[2]!;
  const tech = created[3]!;

  type SeedInv = {
    client: { id: string };
    date: string;
    due: string;
    paid: number;
    terms: string;
    notes: string;
    boosting?: { usd: number; rate: number };
    charge?: number;
    tax?: number;
    discount?: { type: "percent" | "fixed"; value: number };
    items: { name: string; desc: string; qty: number; price: number }[];
    method?: "bkash" | "nagad" | "bank" | "cash";
  };

  const seeds: SeedInv[] = [
    {
      client: abc,
      date: addDaysIso(today, -18),
      due: addDaysIso(today, -11),
      paid: 15000,
      terms: "Full payment required",
      notes: "7-day Meta ads management for Eid lookbook.",
      items: [{ name: "Meta Ads Management", desc: "7 Day Campaign", qty: 1, price: 15000 }],
      method: "bkash",
    },
    {
      client: food,
      date: addDaysIso(today, -6),
      due: addDaysIso(today, 1),
      paid: 2000,
      terms: "50% advance required",
      notes: "Weekend boosting for iftar menu.",
      boosting: { usd: 20, rate: 150 },
      charge: 500,
      items: [{ name: "Ad Campaign Setup", desc: "Pixel + campaign structure", qty: 1, price: 0 }],
      method: "nagad",
    },
    {
      client: urban,
      date: addDaysIso(today, -2),
      due: addDaysIso(today, 5),
      paid: 0,
      terms: "Payment required before campaign starts",
      notes: "Please send preferred product images before campaign setup.",
      items: [
        { name: "UGC Video", desc: "3 short-form pieces", qty: 3, price: 3500 },
        { name: "Product Video", desc: "Hero showcase, 30s", qty: 1, price: 8000 },
      ],
    },
    {
      client: tech,
      date: addDaysIso(today, -40),
      due: addDaysIso(today, -33),
      paid: 45000,
      terms: "Full payment required",
      notes: "Brand strategy sprint + messaging workshop.",
      items: [{ name: "Brand Strategy", desc: "Positioning workshop", qty: 1, price: 45000 }],
      method: "bank",
    },
    {
      client: abc,
      date: addDaysIso(today, -25),
      due: addDaysIso(today, -10),
      paid: 0,
      terms: "Payment due within 7 days",
      notes: "August social media retainer. Follow-up pending.",
      items: [{ name: "Social Media Management", desc: "Monthly retainer", qty: 1, price: 12000 }],
    },
  ];

  for (const inv of seeds) {
    const items = inv.items.filter((it) => it.price > 0 || it.name);
    const totals = computeTotals({
      items: items.map((it) => ({ qty: it.qty, unitPrice: it.price })),
      discountType: inv.discount?.type ?? "none",
      discountValue: inv.discount?.value ?? 0,
      taxEnabled: Boolean(inv.tax),
      taxRate: inv.tax ?? 0,
      serviceCharge: inv.charge ?? 0,
      cashOutCharge: 0,
      isBoosting: Boolean(inv.boosting),
      adBudgetUsd: inv.boosting?.usd,
      marketivityRate: inv.boosting?.rate,
    });
    const paid = inv.paid;
    const dueAmt = dueOf(totals.total, paid);
    const status = deriveStatus(totals.total, paid, inv.due, today);
    const id = uid();
    const number = await nextSerial(sql, userId, "invoice", year);
    await sql`
      insert into invoices (
        id, user_id, invoice_number, client_id, issue_date, issue_time, due_date, status,
        subtotal, discount_type, discount_value, tax_enabled, tax_rate, tax_amount, service_charge,
        total, paid_amount, due_amount, payment_terms, notes, is_boosting, ad_budget_usd,
        marketivity_rate, is_sample
      ) values (
        ${id}, ${userId}, ${number}, ${inv.client.id}, ${inv.date}, ${time}, ${inv.due}, ${status},
        ${totals.subtotal}, ${inv.discount?.type ?? "none"}, ${inv.discount?.value ?? 0},
        ${Boolean(inv.tax)}, ${inv.tax ?? 0}, ${totals.taxAmount}, ${totals.serviceCharge},
        ${totals.total}, ${paid}, ${dueAmt}, ${inv.terms}, ${inv.notes},
        ${Boolean(inv.boosting)}, ${inv.boosting?.usd ?? null}, ${inv.boosting?.rate ?? null}, ${true}
      )
    `;
    let order = 0;
    if (inv.boosting) {
      await sql`
        insert into invoice_items (id, invoice_id, user_id, service_id, service_name, description, qty, unit_price, amount, sort_order)
        values (
          ${uid()}, ${id}, ${userId}, ${null}, ${"Meta Boosting"},
          ${`Advertising budget ${inv.boosting.usd} USD × ৳${inv.boosting.rate}`},
          ${inv.boosting.usd}, ${inv.boosting.rate}, ${totals.advertisingCost}, ${order++}
        )
      `;
    }
    for (const it of items) {
      if (inv.boosting && it.price === 0) continue;
      const amt = lineAmount(it.qty, it.price);
      await sql`
        insert into invoice_items (id, invoice_id, user_id, service_id, service_name, description, qty, unit_price, amount, sort_order)
        values (${uid()}, ${id}, ${userId}, ${null}, ${it.name}, ${it.desc}, ${it.qty}, ${it.price}, ${amt}, ${order++})
      `;
    }
    await logAudit(sql, actorUserId, "invoice", id, "invoice.created", `${number} (sample)`);
    if (paid > 0) {
      const txn = await nextSerial(sql, userId, "transaction", year);
      const rcp = await nextSerial(sql, userId, "receipt", year);
      await sql`
        insert into payments (
          id, user_id, invoice_id, transaction_id, receipt_number, amount, method,
          payment_date, payment_time, external_txn_id, notes, previous_due, remaining_due
        ) values (
          ${uid()}, ${userId}, ${id}, ${txn}, ${rcp}, ${paid}, ${inv.method ?? "cash"},
          ${inv.date}, ${time}, ${""}, ${"Sample payment"}, ${totals.total}, ${dueAmt}
        )
      `;
      await logAudit(sql, actorUserId, "payment", id, "payment.recorded", txn);
      await logAudit(sql, actorUserId, "receipt", id, "receipt.generated", rcp);
    }
  }
}

