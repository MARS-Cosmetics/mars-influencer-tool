import { MARS_LEGAL } from "./mars-config";

/**
 * Render an HTML document for a Purchase Order.
 *
 * Layout mirrors the Mars-Cosmetics sample PO:
 *   - Top header with company logo block + name/PAN/GSTIN
 *   - Vendor + PO meta two-column block
 *   - Bill-to / Ship-to two-column block
 *   - Single-row line item table with HSN/SAC + tax columns
 *   - Tax summary right-aligned (Taxable, IGST/CGST/SGST, Round Off, Grand Total)
 *   - Amount in words + comments
 *   - Terms & conditions
 *   - Authorized signature block
 *
 * Inline CSS so puppeteer doesn't need network fetches. A4 portrait, ~12pt
 * body. Uses table layout for the line items so column widths stay aligned.
 */

export interface PoHtmlData {
  poNumber: string;
  poDate: Date | string;
  paymentTerm?: string | null;
  expectedDeliveryDate?: Date | string | null;
  vendor: {
    code: string;
    name: string;
    pan: string | null;
    gstin: string | null;
    address: string | null;
    state: string | null;
    pincode: string | null;
    phone: string | null;
  };
  lineItem: {
    description: string;
    hsnCode: string;
    quantity: number;
    basePrice: number;
    taxRatePct: number;
    taxAmount: number;
    taxableAmount: number;
  };
  totals: {
    taxableAmount: number;
    igst: number;
    cgst: number;
    sgst: number;
    roundOff: number;
    grandTotal: number;
  };
  comments?: string;
}

function fmt(n: number): string {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function dateStr(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

const ones = [
  "",
  "ONE",
  "TWO",
  "THREE",
  "FOUR",
  "FIVE",
  "SIX",
  "SEVEN",
  "EIGHT",
  "NINE",
  "TEN",
  "ELEVEN",
  "TWELVE",
  "THIRTEEN",
  "FOURTEEN",
  "FIFTEEN",
  "SIXTEEN",
  "SEVENTEEN",
  "EIGHTEEN",
  "NINETEEN",
];
const tens = [
  "",
  "",
  "TWENTY",
  "THIRTY",
  "FORTY",
  "FIFTY",
  "SIXTY",
  "SEVENTY",
  "EIGHTY",
  "NINETY",
];

function chunkInWords(num: number): string {
  if (num === 0) return "";
  if (num < 20) return ones[num];
  if (num < 100) {
    const t = Math.floor(num / 10);
    const o = num % 10;
    return tens[t] + (o ? " " + ones[o] : "");
  }
  const h = Math.floor(num / 100);
  const r = num % 100;
  return ones[h] + " HUNDRED" + (r ? " " + chunkInWords(r) : "");
}

/** Indian numbering: lakh / crore. Whole rupees only — paise rounded. */
export function rupeesInWords(amount: number): string {
  const whole = Math.round(amount);
  if (whole === 0) return "ZERO ONLY";

  const crore = Math.floor(whole / 10_000_000);
  const lakh = Math.floor((whole % 10_000_000) / 100_000);
  const thousand = Math.floor((whole % 100_000) / 1_000);
  const remainder = whole % 1_000;

  const parts: string[] = [];
  if (crore) parts.push(chunkInWords(crore) + " CRORE");
  if (lakh) parts.push(chunkInWords(lakh) + " LAKH");
  if (thousand) parts.push(chunkInWords(thousand) + " THOUSAND");
  if (remainder) parts.push(chunkInWords(remainder));
  return parts.join(" ") + " ONLY";
}

export function renderPoHtml(data: PoHtmlData): string {
  const v = data.vendor;
  const li = data.lineItem;
  const t = data.totals;

  const vendorAddressLines = [
    v.address,
    [v.state, v.pincode].filter(Boolean).join("-"),
  ].filter((s): s is string => Boolean(s));

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escape(data.poNumber)}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10.5pt; color: #111; margin: 0; padding: 0; }
  table { border-collapse: collapse; width: 100%; }
  td, th { border: 1px solid #333; padding: 6px 8px; vertical-align: top; }
  .no-border td, .no-border th { border: 0; padding: 2px 6px; }
  .center { text-align: center; }
  .right { text-align: right; }
  .bold { font-weight: 700; }
  .small { font-size: 9pt; }
  .tabular { font-variant-numeric: tabular-nums; }

  .header { padding: 10px; border: 1px solid #333; }
  .header .company-row { display: flex; align-items: stretch; }
  .header .logo-cell {
    width: 110px; min-height: 70px; border: 1px solid #333;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; letter-spacing: 1px; font-size: 14pt;
    margin-right: 10px;
  }
  .header .meta { flex: 1; text-align: center; }
  .header .meta .name { font-weight: 700; font-size: 12pt; }
  .title { background: #f0f0f0; font-weight: 700; padding: 6px 8px; text-align: center; border: 1px solid #333; border-top: 0; font-size: 11pt; }

  .vendor-grid { width: 100%; border-collapse: collapse; }
  .vendor-grid td { border: 1px solid #333; padding: 6px 8px; }
  .label { font-weight: 600; width: 110px; }

  .addr-grid { width: 100%; border-collapse: collapse; margin-top: 0; }
  .addr-grid th { background: #f0f0f0; text-align: center; }
  .addr-grid td.addr-cell { min-height: 90px; vertical-align: top; }

  .lineitems { margin-top: 0; }
  .lineitems th { background: #f0f0f0; font-size: 9.5pt; }
  .lineitems td { font-size: 9.5pt; }

  .totals tr td { border: 1px solid #333; padding: 6px 8px; }
  .totals .label-cell { text-align: right; font-weight: 600; }

  .footer-block { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 18mm; }
  .signature-box { text-align: center; min-width: 220px; }
  .signature-line { border-bottom: 1px dashed #555; height: 28px; margin-bottom: 4px; }

  .terms { font-size: 9pt; }
  .terms ol { margin: 4px 0 0 18px; padding: 0; }
  .terms li { margin: 2px 0; }
</style>
</head>
<body>

<div class="header">
  <div class="company-row">
    <div class="logo-cell">⊙MARS</div>
    <div class="meta">
      <div class="name">${escape(MARS_LEGAL.name)}</div>
      <div class="small">${escape(MARS_LEGAL.shortAddress)}</div>
      <div class="small">Phone :${escape(MARS_LEGAL.phone)}, Email : ${escape(MARS_LEGAL.email)}</div>
      <div class="small bold">PAN No.: ${escape(MARS_LEGAL.pan)} &nbsp; GSTIN : ${escape(MARS_LEGAL.gstin)}</div>
    </div>
  </div>
</div>
<div class="title">PURCHASE ORDER</div>

<table class="vendor-grid">
  <tr>
    <td class="label">Vendor Code</td>
    <td>: ${escape(v.code)}</td>
    <td class="label">PO Order No.</td>
    <td>: ${escape(data.poNumber)}</td>
  </tr>
  <tr>
    <td class="label">Vendor Name</td>
    <td>: ${escape(v.name)}</td>
    <td class="label">PO Date</td>
    <td>: ${escape(dateStr(data.poDate))}</td>
  </tr>
  <tr>
    <td class="label">Vendor Address</td>
    <td>: ${escape(v.address ?? "")}</td>
    <td class="label">Payment Term</td>
    <td>: ${escape(data.paymentTerm ?? "")}</td>
  </tr>
  <tr>
    <td class="label"></td>
    <td>${vendorAddressLines.length > 1 ? escape(vendorAddressLines[1]) : ""}</td>
    <td class="label">Expected Delivery Date</td>
    <td>: ${data.expectedDeliveryDate ? escape(dateStr(data.expectedDeliveryDate)) : ""}</td>
  </tr>
  <tr>
    <td class="label">Vendor PAN No.</td>
    <td>: ${escape(v.pan ?? "")}</td>
    <td colspan="2"></td>
  </tr>
  <tr>
    <td class="label">Vendor GSTIN</td>
    <td>: ${escape(v.gstin ?? "")}</td>
    <td colspan="2"></td>
  </tr>
  <tr>
    <td class="label">Contact Person</td>
    <td>:</td>
    <td colspan="2"></td>
  </tr>
  <tr>
    <td class="label">Contact No.</td>
    <td>: ${escape(v.phone ?? "")}</td>
    <td colspan="2"></td>
  </tr>
</table>

<table class="addr-grid">
  <tr>
    <th colspan="2">BILLING ADDRESS</th>
    <th colspan="2">SHIPPING ADDRESS</th>
  </tr>
  <tr>
    <td colspan="2" class="addr-cell">
      <div class="bold">${escape(MARS_LEGAL.name)}</div>
      <div>${escape(MARS_LEGAL.addressLine1)}</div>
      <div>${escape(MARS_LEGAL.addressLine2)}</div>
      <div>Contact No.:</div>
      <div class="bold">GSTIN: ${escape(MARS_LEGAL.gstin)}</div>
    </td>
    <td colspan="2" class="addr-cell">
      <div class="bold">${escape(MARS_LEGAL.name)}</div>
      <div>${escape(MARS_LEGAL.addressLine1)}</div>
      <div>${escape(MARS_LEGAL.addressLine2)}</div>
      <div>Contact No:</div>
      <div class="bold">GSTIN: ${escape(MARS_LEGAL.gstin)}</div>
    </td>
  </tr>
</table>

<table class="lineitems">
  <thead>
    <tr>
      <th>SKU Image</th>
      <th>SKU</th>
      <th>Product Name</th>
      <th>EAN/UPC</th>
      <th>MRP</th>
      <th>HSN/SAC</th>
      <th>Quantity</th>
      <th>UOM</th>
      <th>Tax Rate</th>
      <th>Base Price</th>
      <th>Tax Amount</th>
      <th>Taxable Amount</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>&nbsp;</td>
      <td>46005040</td>
      <td>${escape(li.description)}</td>
      <td></td>
      <td class="right">0</td>
      <td class="right">${escape(li.hsnCode)}</td>
      <td class="right">${li.quantity}</td>
      <td></td>
      <td class="right">${li.taxRatePct}</td>
      <td class="right tabular">${fmt(li.basePrice)}</td>
      <td class="right tabular">${fmt(li.taxAmount)}</td>
      <td class="right tabular">${fmt(li.taxableAmount)}</td>
    </tr>
    <tr>
      <td colspan="6" class="right bold">Total</td>
      <td class="right bold">${li.quantity}</td>
      <td colspan="3"></td>
      <td class="right bold tabular">${fmt(li.taxAmount)}</td>
      <td class="right bold tabular">${fmt(li.taxableAmount)}</td>
    </tr>
  </tbody>
</table>

<table class="totals">
  <tr>
    <td class="label-cell" style="width:80%">Taxable Amount</td>
    <td class="right tabular">${fmt(t.taxableAmount)}</td>
  </tr>
  <tr>
    <td class="label-cell">IGST</td>
    <td class="right tabular">${fmt(t.igst)}</td>
  </tr>
  <tr>
    <td class="label-cell">CGST</td>
    <td class="right tabular">${fmt(t.cgst)}</td>
  </tr>
  <tr>
    <td class="label-cell">SGST</td>
    <td class="right tabular">${fmt(t.sgst)}</td>
  </tr>
  <tr>
    <td class="label-cell">Round Off</td>
    <td class="right tabular">${fmt(t.roundOff)}</td>
  </tr>
  <tr>
    <td class="label-cell bold" style="background:#f0f0f0">Grand total</td>
    <td class="right bold tabular" style="background:#f0f0f0">${Math.round(t.grandTotal).toLocaleString("en-IN")}</td>
  </tr>
</table>

<table class="no-border" style="margin-top:8px">
  <tr>
    <td><span class="bold">Amount in Words :</span> ${escape(rupeesInWords(t.grandTotal))}</td>
  </tr>
  <tr>
    <td><span class="bold">Comments :-</span> ${escape(data.comments ?? "PROFESSIONAL SERVICES")}</td>
  </tr>
</table>

<div class="terms" style="margin-top:10px">
  <div class="bold">Terms &amp; Conditions :-</div>
  <ol>
    <li>PO copy to be attached to the invoice.</li>
    <li>Delivery timings - 9.30 AM to 4:30 PM. Monday to Saturday except holiday.</li>
    <li>Please ensure that the right HSN code is mentioned in the invoice and appropriate tax is charged as per law.</li>
    <li>Consignment should have two photocopies of each invoice (Original And Duplicate).</li>
    <li>Stock must be segregated as per invoices and their boxes.</li>
  </ol>
</div>

<div class="footer-block">
  <div></div>
  <div class="signature-box">
    <div class="bold">FOR ${escape(MARS_LEGAL.name)}</div>
    <div class="signature-line"></div>
    <div>Authorized Signatory</div>
  </div>
</div>

</body>
</html>`;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
