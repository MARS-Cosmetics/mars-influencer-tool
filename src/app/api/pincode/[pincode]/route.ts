import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ pincode: string }> }
) {
  try {
    const { pincode } = await props.params;

    if (!/^[1-9][0-9]{5}$/.test(pincode)) {
      return NextResponse.json(
        { error: "Invalid pincode format" },
        { status: 400 }
      );
    }

    const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
    const data = await res.json();

    if (!data?.[0]?.PostOffice?.length) {
      return NextResponse.json(
        { error: "Pincode not found" },
        { status: 404 }
      );
    }

    const postOffices = data[0].PostOffice;
    const first = postOffices[0];

    return NextResponse.json({
      pincode,
      city: first.District,
      state: first.State,
      country: "India",
      postOffices: postOffices.map(
        (po: { Name: string; BranchType: string }) => ({
          name: po.Name,
          type: po.BranchType,
        })
      ),
    });
  } catch (error) {
    console.error("Pincode lookup failed:", error);
    return NextResponse.json(
      { error: "Pincode lookup failed" },
      { status: 500 }
    );
  }
}
