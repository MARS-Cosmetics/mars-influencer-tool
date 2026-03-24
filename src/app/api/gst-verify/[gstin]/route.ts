import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ gstin: string }> }
) {
  try {
    const { gstin } = await props.params;

    if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/.test(gstin.toUpperCase())) {
      return NextResponse.json(
        { error: "Invalid GSTIN format", valid: false },
        { status: 400 }
      );
    }

    // Use the free GST verification API
    const res = await fetch(
      `https://sheet.gstincheck.co.in/check/${gstin.toUpperCase()}`
    );
    const data = await res.json();

    if (data?.flag === true && data?.data) {
      return NextResponse.json({
        valid: true,
        gstin: data.data.gstin,
        legalName: data.data.lgnm,
        tradeName: data.data.tradeNam,
        status: data.data.sts,
        type: data.data.dty,
        address: data.data.pradr?.adr,
        state: data.data.pradr?.addr?.stcd,
      });
    }

    return NextResponse.json({
      valid: false,
      error: "GSTIN not found or invalid",
    });
  } catch (error) {
    console.error("GST verification failed:", error);
    // If API is unavailable, do format-only validation
    return NextResponse.json({
      valid: null,
      message: "GST API unavailable. Format validated only.",
    });
  }
}
