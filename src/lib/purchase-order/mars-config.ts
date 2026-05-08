/**
 * Mars Cosmetics legal-entity details used on every Purchase Order.
 *
 * Pulled from env vars so they're swappable without code changes — useful
 * when a future entity (different brand or new GSTIN) needs PO printing.
 *
 * Defaults match the sample PO provided.
 */

export const MARS_LEGAL = {
  name: process.env.MARS_LEGAL_NAME ?? "MARS COSMETICS PRIVATE LIMITED",
  pan: process.env.MARS_PAN ?? "AAFCI7689K",
  gstin: process.env.MARS_GSTIN ?? "07AAFCI7689K1ZT",
  addressLine1:
    process.env.MARS_ADDRESS_LINE_1 ??
    "Khasra No. 32/5/6/26 , 31/10, Village Bakoli Near Sunrise Farmhouse Delhi",
  addressLine2: process.env.MARS_ADDRESS_LINE_2 ?? "Delhi-110036, INDIA",
  shortAddress:
    process.env.MARS_SHORT_ADDRESS ??
    "Khasra No. 32/5/6/26,31/10Village Bakoli Near Sunrise Farmhouse, Delhi-110036",
  phone: process.env.MARS_PHONE ?? "",
  email: process.env.MARS_EMAIL ?? "accounts@marscosmetics.in",
} as const;
