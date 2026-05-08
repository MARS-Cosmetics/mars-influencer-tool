/**
 * GST tax split helper.
 *
 * Indian GST rules:
 *  - Same-state transaction → CGST + SGST (each half the tax rate)
 *  - Different-state transaction → IGST (full tax rate, single line)
 *
 * The first 2 digits of a GSTIN are the state code (e.g. "07" = Delhi,
 * "06" = Haryana). Mars's GSTIN starts with 07.
 */

export interface TaxSplit {
  taxableAmount: number;
  totalTax: number;
  igstAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  grandTotal: number;
  /** Whether the transaction was treated as inter-state (IGST) or intra-state (CGST+SGST). */
  isInterState: boolean;
}

function stateCodeFromGstin(gstin: string | null | undefined): string | null {
  if (!gstin) return null;
  const code = gstin.slice(0, 2);
  return /^\d{2}$/.test(code) ? code : null;
}

/**
 * Compute the GST split. If we can't resolve the vendor's state code, fall
 * back to inter-state (IGST) — that's the safer default because it matches
 * the most-restrictive case for a Delhi seller buying from anywhere else.
 */
export function computeGstSplit(args: {
  basePrice: number;
  taxRatePct: number; // e.g. 18
  marsGstin: string;
  vendorGstin: string | null | undefined;
}): TaxSplit {
  const { basePrice, taxRatePct } = args;

  const round2 = (n: number) => Math.round(n * 100) / 100;
  const taxableAmount = round2(basePrice);
  const totalTax = round2((basePrice * taxRatePct) / 100);

  const marsState = stateCodeFromGstin(args.marsGstin);
  const vendorState = stateCodeFromGstin(args.vendorGstin);

  const isInterState =
    !marsState ||
    !vendorState ||
    marsState !== vendorState;

  let igstAmount = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  if (isInterState) {
    igstAmount = totalTax;
  } else {
    // Half-and-half. Round each side individually so they sum to totalTax
    // even when totalTax is odd-paise.
    cgstAmount = round2(totalTax / 2);
    sgstAmount = round2(totalTax - cgstAmount);
  }

  const grandTotal = round2(taxableAmount + totalTax);
  return {
    taxableAmount,
    totalTax,
    igstAmount,
    cgstAmount,
    sgstAmount,
    grandTotal,
    isInterState,
  };
}
