import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  validatePhone,
  validateEmail,
  validatePAN,
  validateGST,
  validatePincode,
  validateIFSC,
  validateBankAccount,
  validateAadhar,
  validateUPI,
} from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // --- Server-side validation ---
    const errors: Record<string, string> = {};

    if (!body.agencyName?.trim()) errors.agencyName = "Agency name is required";
    if (!body.businessType?.trim()) errors.businessType = "Business type is required";
    if (!body.contactPerson?.trim()) errors.contactPerson = "Contact person is required";

    if (!body.email?.trim()) {
      errors.email = "Email is required";
    } else if (!validateEmail(body.email)) {
      errors.email = "Invalid email";
    }

    if (!body.phone?.trim()) {
      errors.phone = "Phone is required";
    } else if (!validatePhone(body.phone)) {
      errors.phone = "Invalid phone number";
    }

    if (!body.addressLine1?.trim()) errors.addressLine1 = "Address is required";
    if (!body.city?.trim()) errors.city = "City is required";
    if (!body.state?.trim()) errors.state = "State is required";

    if (!body.pincode?.trim()) {
      errors.pincode = "Pincode is required";
    } else if (!validatePincode(body.pincode)) {
      errors.pincode = "Invalid pincode";
    }

    if (!body.panNumber?.trim()) {
      errors.panNumber = "PAN is required";
    } else if (!validatePAN(body.panNumber)) {
      errors.panNumber = "Invalid PAN format";
    }

    if (!body.gstNumber?.trim()) {
      errors.gstNumber = "GST is required";
    } else if (!validateGST(body.gstNumber)) {
      errors.gstNumber = "Invalid GST format";
    }

    if (!body.bankName?.trim()) errors.bankName = "Bank name is required";
    if (!body.accountHolderName?.trim()) errors.accountHolderName = "Account holder name is required";

    if (!body.accountNumber?.trim()) {
      errors.accountNumber = "Account number is required";
    } else if (!validateBankAccount(body.accountNumber)) {
      errors.accountNumber = "Invalid account number";
    }

    if (!body.confirmAccountNumber?.trim()) {
      errors.confirmAccountNumber = "Confirm account number is required";
    } else if (body.accountNumber !== body.confirmAccountNumber) {
      errors.confirmAccountNumber = "Account numbers do not match";
    }

    if (!body.ifscCode?.trim()) {
      errors.ifscCode = "IFSC code is required";
    } else if (!validateIFSC(body.ifscCode)) {
      errors.ifscCode = "Invalid IFSC format";
    }

    if (!body.directorName?.trim()) errors.directorName = "Director name is required";

    // Optional field validations
    if (body.directorAadhar && !validateAadhar(body.directorAadhar)) {
      errors.directorAadhar = "Invalid Aadhar number";
    }
    if (body.directorPan && !validatePAN(body.directorPan)) {
      errors.directorPan = "Invalid PAN format";
    }
    if (body.upiId && !validateUPI(body.upiId)) {
      errors.upiId = "Invalid UPI ID format";
    }
    if (body.commissionRate) {
      const rate = parseFloat(body.commissionRate);
      if (isNaN(rate) || rate < 0 || rate > 100) {
        errors.commissionRate = "Commission rate must be 0-100";
      }
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { error: "Validation failed", details: errors },
        { status: 400 }
      );
    }

    // --- Map years in business string to integer ---
    let yearsInBusiness: number | null = null;
    if (body.yearsInBusiness) {
      const map: Record<string, number> = {
        "Less than 1 year": 0,
        "1-3 years": 2,
        "3-5 years": 4,
        "5-10 years": 7,
        "10+ years": 10,
      };
      yearsInBusiness = map[body.yearsInBusiness] ?? null;
    }

    // --- Build address string ---
    const addressParts = [body.addressLine1, body.addressLine2]
      .filter(Boolean)
      .join(", ");

    // --- Build notes for fields not in the schema ---
    const notesSections: string[] = [];

    if (body.designation) notesSections.push(`Designation: ${body.designation}`);
    if (body.accountHolderName) notesSections.push(`Account Holder: ${body.accountHolderName}`);
    if (body.accountType) notesSections.push(`Account Type: ${body.accountType}`);
    if (body.upiId) notesSections.push(`UPI ID: ${body.upiId}`);
    if (body.directorPan) notesSections.push(`Director PAN: ${body.directorPan}`);
    if (body.udyamNumber) notesSections.push(`Udyam Registration: ${body.udyamNumber}`);
    if (body.portfolioDescription) notesSections.push(`Portfolio: ${body.portfolioDescription}`);
    if (body.referralSource) notesSections.push(`Referral Source: ${body.referralSource}`);
    if (body.additionalNotes) notesSections.push(`Notes: ${body.additionalNotes}`);

    const notes = notesSections.length > 0
      ? `[Onboarding Submission]\n${notesSections.join("\n")}`
      : null;

    // --- Create agency record ---
    const agency = await prisma.agency.create({
      data: {
        name: body.agencyName.trim(),
        contactPerson: body.contactPerson.trim(),
        email: body.email.trim().toLowerCase(),
        phone: body.phone.trim(),
        website: body.website?.trim() || null,
        address: addressParts,
        city: body.city.trim(),
        state: body.state,
        pincode: body.pincode.trim(),
        panNumber: body.panNumber.trim().toUpperCase(),
        gstNumber: body.gstNumber.trim().toUpperCase(),
        businessType: body.businessType,
        yearsInBusiness,
        annualTurnover: body.annualTurnover || null,
        directorName: body.directorName.trim(),
        directorAadhar: body.directorAadhar?.trim() || null,
        bankName: body.bankName.trim(),
        bankAccountNumber: body.accountNumber.trim(),
        bankIfsc: body.ifscCode.trim().toUpperCase(),
        bankAccountType: body.accountType || null,
        commissionPct: body.commissionRate
          ? parseFloat(body.commissionRate)
          : null,
        notes,
        isActive: false, // pending approval
      },
    });

    // --- Create activity log ---
    await prisma.activityLog.create({
      data: {
        entityType: "agency",
        entityId: agency.id,
        action: "onboarding_submitted",
        description: `Agency onboarding form submitted: ${agency.name}`,
      },
    });

    return NextResponse.json(
      { message: "Application submitted successfully", id: agency.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Agency onboarding error:", error);
    return NextResponse.json(
      { error: "Failed to submit application. Please try again." },
      { status: 500 }
    );
  }
}
