import { prisma } from "@/lib/db";
import { renderPoHtml, type PoHtmlData } from "./html";

/**
 * Load a stored Purchase Order and convert it into the HTML data shape.
 * Pure read — no mutations. Returns null if not found.
 */
export async function loadPoHtmlData(
  poId: string,
): Promise<PoHtmlData | null> {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    include: {
      collaboration: { select: { paymentTermId: true } },
    },
  });
  if (!po) return null;

  return {
    poNumber: po.poNumber,
    poDate: po.poDate,
    paymentTerm: null,
    expectedDeliveryDate: null,
    vendor: {
      code: po.vendorCodeSnapshot,
      name: po.vendorNameSnapshot,
      pan: po.vendorPanSnapshot,
      gstin: po.vendorGstinSnapshot,
      address: po.vendorAddressSnapshot,
      state: po.vendorStateSnapshot,
      pincode: po.vendorPincodeSnapshot,
      phone: po.vendorPhoneSnapshot,
    },
    lineItem: {
      description: po.lineItemDescription,
      hsnCode: po.hsnCode,
      quantity: po.quantity,
      basePrice: Number(po.basePrice),
      taxRatePct: Number(po.taxRate),
      taxAmount: Number(po.totalTax),
      taxableAmount: Number(po.taxableAmount),
    },
    totals: {
      taxableAmount: Number(po.taxableAmount),
      igst: Number(po.igstAmount),
      cgst: Number(po.cgstAmount),
      sgst: Number(po.sgstAmount),
      roundOff: Number(po.roundOff),
      grandTotal: Number(po.grandTotal),
    },
    comments: "PROFESSIONAL SERVICES",
  };
}

export async function loadPoHtml(poId: string): Promise<string | null> {
  const data = await loadPoHtmlData(poId);
  if (!data) return null;
  return renderPoHtml(data);
}
