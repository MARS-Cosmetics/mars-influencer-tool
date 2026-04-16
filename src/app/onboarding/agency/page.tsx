"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Building2, MapPin, Scale, Landmark, UserCheck, MessageSquare, CheckCircle2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUpload } from "@/components/file-upload";
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
import {
  INDIAN_STATES,
  BUSINESS_TYPES,
  ANNUAL_TURNOVER_RANGES,
  BANK_ACCOUNT_TYPES,
} from "@/lib/constants";
import { getCitiesForState } from "@/lib/indian-cities";
import { SearchableSelect } from "@/components/searchable-select";

const selectClass =
  "flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const YEARS_IN_BUSINESS_OPTIONS = [
  "Less than 1 year",
  "1-3 years",
  "3-5 years",
  "5-10 years",
  "10+ years",
];

const REFERRAL_SOURCES = [
  "Instagram",
  "LinkedIn",
  "Referral",
  "Website",
  "Email",
  "Event",
  "Other",
];

interface FormData {
  // Agency Info
  agencyName: string;
  businessType: string;
  contactPerson: string;
  designation: string;
  email: string;
  phone: string;
  website: string;
  // Address
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  // Legal
  panNumber: string;
  panDocUrl: string;
  gstNumber: string;
  gstDocUrl: string;
  udyamNumber: string;
  udyamDocUrl: string;
  yearsInBusiness: string;
  annualTurnover: string;
  // Bank
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  confirmAccountNumber: string;
  ifscCode: string;
  accountType: string;
  upiId: string;
  // Director
  directorName: string;
  directorAadhar: string;
  directorAadharDocUrl: string;
  directorPan: string;
  // Additional
  portfolioDescription: string;
  commissionRate: string;
  referralSource: string;
  additionalNotes: string;
}

interface FormErrors {
  [key: string]: string;
}

const initialFormData: FormData = {
  agencyName: "",
  businessType: "",
  contactPerson: "",
  designation: "",
  email: "",
  phone: "",
  website: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  pincode: "",
  panNumber: "",
  panDocUrl: "",
  gstNumber: "",
  gstDocUrl: "",
  udyamNumber: "",
  udyamDocUrl: "",
  yearsInBusiness: "",
  annualTurnover: "",
  bankName: "",
  accountHolderName: "",
  accountNumber: "",
  confirmAccountNumber: "",
  ifscCode: "",
  accountType: "",
  upiId: "",
  directorName: "",
  directorAadhar: "",
  directorAadharDocUrl: "",
  directorPan: "",
  portfolioDescription: "",
  commissionRate: "",
  referralSource: "",
  additionalNotes: "",
};

function RequiredMark() {
  return <span className="text-red-600 ml-0.5">*</span>;
}

export default function AgencyOnboardingPage() {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function updateField(field: keyof FormData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function validate(): FormErrors {
    const errs: FormErrors = {};

    // Agency Info
    if (!formData.agencyName.trim()) errs.agencyName = "Agency name is required";
    if (!formData.businessType) errs.businessType = "Business type is required";
    if (!formData.contactPerson.trim()) errs.contactPerson = "Contact person name is required";
    if (!formData.email.trim()) {
      errs.email = "Email is required";
    } else if (!validateEmail(formData.email)) {
      errs.email = "Invalid email address";
    }
    if (!formData.phone.trim()) {
      errs.phone = "Phone number is required";
    } else if (!validatePhone(formData.phone)) {
      errs.phone = "Invalid phone number";
    }

    // Address
    if (!formData.addressLine1.trim()) errs.addressLine1 = "Address is required";
    if (!formData.city.trim()) errs.city = "City is required";
    if (!formData.state) errs.state = "State is required";
    if (!formData.pincode.trim()) {
      errs.pincode = "Pincode is required";
    } else if (!validatePincode(formData.pincode)) {
      errs.pincode = "Invalid pincode (6 digits)";
    }

    // Legal
    if (!formData.panNumber.trim()) {
      errs.panNumber = "PAN number is required";
    } else if (!validatePAN(formData.panNumber)) {
      errs.panNumber = "Invalid PAN format (e.g., ABCDE1234F)";
    }
    if (!formData.panDocUrl) {
      errs.panDocUrl = "PAN card document upload is required";
    }
    if (!formData.gstNumber.trim()) {
      errs.gstNumber = "GST number is required";
    } else if (!validateGST(formData.gstNumber)) {
      errs.gstNumber = "Invalid GST format";
    }
    if (!formData.gstDocUrl) {
      errs.gstDocUrl = "GST certificate upload is required";
    }

    // Bank
    if (!formData.bankName.trim()) errs.bankName = "Bank name is required";
    if (!formData.accountHolderName.trim()) errs.accountHolderName = "Account holder name is required";
    if (!formData.accountNumber.trim()) {
      errs.accountNumber = "Account number is required";
    } else if (!validateBankAccount(formData.accountNumber)) {
      errs.accountNumber = "Invalid account number (9-18 digits)";
    }
    if (!formData.confirmAccountNumber.trim()) {
      errs.confirmAccountNumber = "Please confirm account number";
    } else if (formData.accountNumber !== formData.confirmAccountNumber) {
      errs.confirmAccountNumber = "Account numbers do not match";
    }
    if (!formData.ifscCode.trim()) {
      errs.ifscCode = "IFSC code is required";
    } else if (!validateIFSC(formData.ifscCode)) {
      errs.ifscCode = "Invalid IFSC format (e.g., SBIN0001234)";
    }

    // Director
    if (!formData.directorName.trim()) errs.directorName = "Director/Partner name is required";
    if (!formData.directorAadhar.trim()) {
      errs.directorAadhar = "Director/Partner Aadhar number is required";
    } else if (!validateAadhar(formData.directorAadhar)) {
      errs.directorAadhar = "Invalid Aadhar number (12 digits)";
    }
    if (!formData.directorAadharDocUrl) {
      errs.directorAadharDocUrl = "Director/Partner Aadhar document upload is required";
    }
    if (formData.directorPan && !validatePAN(formData.directorPan)) {
      errs.directorPan = "Invalid PAN format";
    }

    // Optional validations
    if (formData.upiId && !validateUPI(formData.upiId)) {
      errs.upiId = "Invalid UPI ID format (e.g., name@bank)";
    }
    if (formData.commissionRate) {
      const rate = parseFloat(formData.commissionRate);
      if (isNaN(rate) || rate < 0 || rate > 100) {
        errs.commissionRate = "Commission rate must be between 0 and 100";
      }
    }

    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error("Please fix the errors before submitting.");
      // Scroll to first error
      const firstErrorField = Object.keys(validationErrors)[0];
      const el = document.querySelector(`[data-field="${firstErrorField}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/onboarding/agency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Submission failed");
      }

      setSubmitted(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-lg w-full text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <Image
            src="/logo-mars-black.png"
            alt="MARS Cosmetics"
            width={120}
            height={32}
            className="mx-auto h-8 w-auto"
          />
          <h1 className="text-2xl font-bold text-gray-900">
            Thank You!
          </h1>
          <p className="text-gray-600 leading-relaxed">
            Your application has been submitted successfully. Our team will
            review your details and get back to you within{" "}
            <strong>3-5 business days</strong>.
          </p>
          <p className="text-sm text-gray-500">
            If you have any questions, reach out to us at{" "}
            <a
              href="mailto:partnerships@marscosmetics.in"
              className="text-[#A6192E] underline"
            >
              partnerships@marscosmetics.in
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <Image
            src="/logo-mars-black.png"
            alt="MARS Cosmetics"
            width={120}
            height={32}
            className="mx-auto h-8 w-auto"
          />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Agency Partner Onboarding
          </h1>
          <p className="text-gray-600 max-w-xl mx-auto">
            Welcome! Please fill in your agency details to get started as a
            MARS Cosmetics partner.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Agency Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="w-5 h-5 text-[#A6192E]" />
                Agency Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2" data-field="agencyName">
                <Label htmlFor="agencyName">
                  Agency Name <RequiredMark />
                </Label>
                <Input
                  id="agencyName"
                  value={formData.agencyName}
                  onChange={(e) => updateField("agencyName", e.target.value)}
                  placeholder="Enter agency name"
                />
                {errors.agencyName && (
                  <p className="text-red-600 text-xs mt-1">{errors.agencyName}</p>
                )}
              </div>

              <div data-field="businessType">
                <Label htmlFor="businessType">
                  Type of Business <RequiredMark />
                </Label>
                <select
                  id="businessType"
                  className={selectClass}
                  value={formData.businessType}
                  onChange={(e) => updateField("businessType", e.target.value)}
                >
                  <option value="">Select business type</option>
                  {BUSINESS_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {errors.businessType && (
                  <p className="text-red-600 text-xs mt-1">{errors.businessType}</p>
                )}
              </div>

              <div data-field="contactPerson">
                <Label htmlFor="contactPerson">
                  Contact Person Name <RequiredMark />
                </Label>
                <Input
                  id="contactPerson"
                  value={formData.contactPerson}
                  onChange={(e) => updateField("contactPerson", e.target.value)}
                  placeholder="Full name"
                />
                {errors.contactPerson && (
                  <p className="text-red-600 text-xs mt-1">{errors.contactPerson}</p>
                )}
              </div>

              <div data-field="designation">
                <Label htmlFor="designation">Designation</Label>
                <Input
                  id="designation"
                  value={formData.designation}
                  onChange={(e) => updateField("designation", e.target.value)}
                  placeholder="e.g., CEO, Manager"
                />
              </div>

              <div data-field="email">
                <Label htmlFor="email">
                  Email <RequiredMark />
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="agency@example.com"
                />
                {errors.email && (
                  <p className="text-red-600 text-xs mt-1">{errors.email}</p>
                )}
              </div>

              <div data-field="phone">
                <Label htmlFor="phone">
                  Phone <RequiredMark />
                </Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="+91 98765 43210"
                />
                {errors.phone && (
                  <p className="text-red-600 text-xs mt-1">{errors.phone}</p>
                )}
              </div>

              <div className="sm:col-span-2" data-field="website">
                <Label htmlFor="website">Website URL</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => updateField("website", e.target.value)}
                  placeholder="https://www.example.com"
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="w-5 h-5 text-[#A6192E]" />
                Address
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2" data-field="addressLine1">
                <Label htmlFor="addressLine1">
                  Address Line 1 <RequiredMark />
                </Label>
                <Input
                  id="addressLine1"
                  value={formData.addressLine1}
                  onChange={(e) => updateField("addressLine1", e.target.value)}
                  placeholder="Building, street"
                />
                {errors.addressLine1 && (
                  <p className="text-red-600 text-xs mt-1">{errors.addressLine1}</p>
                )}
              </div>

              <div className="sm:col-span-2" data-field="addressLine2">
                <Label htmlFor="addressLine2">Address Line 2</Label>
                <Input
                  id="addressLine2"
                  value={formData.addressLine2}
                  onChange={(e) => updateField("addressLine2", e.target.value)}
                  placeholder="Area, landmark"
                />
              </div>

              <div data-field="state">
                <Label htmlFor="state">
                  State <RequiredMark />
                </Label>
                <SearchableSelect
                  options={INDIAN_STATES.map((s) => ({ value: s, label: s }))}
                  value={formData.state}
                  onChange={(v) => {
                    setFormData((prev) => ({ ...prev, state: v, city: "" }));
                    if (errors.state) {
                      setErrors((prev) => { const next = { ...prev }; delete next.state; return next; });
                    }
                  }}
                  placeholder="Select State..."
                  searchPlaceholder="Search state..."
                  emptyMessage="No state found."
                />
                {errors.state && (
                  <p className="text-red-600 text-xs mt-1">{errors.state}</p>
                )}
              </div>

              <div data-field="city">
                <Label htmlFor="city">
                  City <RequiredMark />
                </Label>
                <SearchableSelect
                  options={getCitiesForState(formData.state).map((c) => ({ value: c, label: c }))}
                  value={formData.city}
                  onChange={(v) => {
                    updateField("city", v);
                  }}
                  placeholder={formData.state ? "Select City..." : "Select state first"}
                  searchPlaceholder="Search city..."
                  emptyMessage={formData.state ? "City not in list." : "Please select a state first."}
                />
                {errors.city && (
                  <p className="text-red-600 text-xs mt-1">{errors.city}</p>
                )}
              </div>

              <div data-field="pincode">
                <Label htmlFor="pincode">
                  Pincode <RequiredMark />
                </Label>
                <Input
                  id="pincode"
                  value={formData.pincode}
                  onChange={(e) => updateField("pincode", e.target.value)}
                  placeholder="110001"
                  maxLength={6}
                />
                {errors.pincode && (
                  <p className="text-red-600 text-xs mt-1">{errors.pincode}</p>
                )}
              </div>

              <div data-field="country">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value="India"
                  disabled
                  className="bg-gray-50"
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Legal & Financial */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Scale className="w-5 h-5 text-[#A6192E]" />
                Legal &amp; Financial
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div data-field="panNumber">
                <Label htmlFor="panNumber">
                  PAN Number <RequiredMark />
                </Label>
                <Input
                  id="panNumber"
                  value={formData.panNumber}
                  onChange={(e) =>
                    updateField("panNumber", e.target.value.toUpperCase())
                  }
                  placeholder="ABCDE1234F"
                  maxLength={10}
                />
                {errors.panNumber && (
                  <p className="text-red-600 text-xs mt-1">{errors.panNumber}</p>
                )}
              </div>

              <div data-field="panDocUrl" className="sm:col-span-2">
                <FileUpload
                  label="PAN Card Upload"
                  required
                  folder="agency-documents/pan"
                  accept=".pdf,.jpg,.jpeg,.png"
                  value={formData.panDocUrl}
                  onChange={(url) => updateField("panDocUrl", url || "")}
                  error={errors.panDocUrl}
                />
              </div>

              <div data-field="gstNumber">
                <Label htmlFor="gstNumber">
                  GST Number <RequiredMark />
                </Label>
                <Input
                  id="gstNumber"
                  value={formData.gstNumber}
                  onChange={(e) =>
                    updateField("gstNumber", e.target.value.toUpperCase())
                  }
                  placeholder="22ABCDE1234F1Z5"
                  maxLength={15}
                />
                {errors.gstNumber && (
                  <p className="text-red-600 text-xs mt-1">{errors.gstNumber}</p>
                )}
              </div>

              <div data-field="gstDocUrl" className="sm:col-span-2">
                <FileUpload
                  label="GST Certificate Upload"
                  required
                  folder="agency-documents/gst"
                  accept=".pdf,.jpg,.jpeg,.png"
                  value={formData.gstDocUrl}
                  onChange={(url) => updateField("gstDocUrl", url || "")}
                  error={errors.gstDocUrl}
                />
              </div>

              <div data-field="udyamNumber">
                <Label htmlFor="udyamNumber">Udyam Registration Number</Label>
                <Input
                  id="udyamNumber"
                  value={formData.udyamNumber}
                  onChange={(e) => updateField("udyamNumber", e.target.value)}
                  placeholder="UDYAM-XX-00-0000000"
                />
              </div>

              <div data-field="udyamDocUrl" className="sm:col-span-2">
                <FileUpload
                  label="Udyam Certificate Upload (Optional)"
                  folder="agency-documents/udyam"
                  accept=".pdf,.jpg,.jpeg,.png"
                  value={formData.udyamDocUrl}
                  onChange={(url) => updateField("udyamDocUrl", url || "")}
                />
              </div>

              <div data-field="yearsInBusiness">
                <Label htmlFor="yearsInBusiness">Years in Business</Label>
                <select
                  id="yearsInBusiness"
                  className={selectClass}
                  value={formData.yearsInBusiness}
                  onChange={(e) => updateField("yearsInBusiness", e.target.value)}
                >
                  <option value="">Select</option>
                  {YEARS_IN_BUSINESS_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>

              <div data-field="annualTurnover">
                <Label htmlFor="annualTurnover">Annual Turnover</Label>
                <select
                  id="annualTurnover"
                  className={selectClass}
                  value={formData.annualTurnover}
                  onChange={(e) => updateField("annualTurnover", e.target.value)}
                >
                  <option value="">Select range</option>
                  {ANNUAL_TURNOVER_RANGES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Bank Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Landmark className="w-5 h-5 text-[#A6192E]" />
                Bank Details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div data-field="bankName">
                <Label htmlFor="bankName">
                  Bank Name <RequiredMark />
                </Label>
                <Input
                  id="bankName"
                  value={formData.bankName}
                  onChange={(e) => updateField("bankName", e.target.value)}
                  placeholder="e.g., State Bank of India"
                />
                {errors.bankName && (
                  <p className="text-red-600 text-xs mt-1">{errors.bankName}</p>
                )}
              </div>

              <div data-field="accountHolderName">
                <Label htmlFor="accountHolderName">
                  Account Holder Name <RequiredMark />
                </Label>
                <Input
                  id="accountHolderName"
                  value={formData.accountHolderName}
                  onChange={(e) => updateField("accountHolderName", e.target.value)}
                  placeholder="As per bank records"
                />
                {errors.accountHolderName && (
                  <p className="text-red-600 text-xs mt-1">{errors.accountHolderName}</p>
                )}
              </div>

              <div data-field="accountNumber">
                <Label htmlFor="accountNumber">
                  Account Number <RequiredMark />
                </Label>
                <Input
                  id="accountNumber"
                  value={formData.accountNumber}
                  onChange={(e) => updateField("accountNumber", e.target.value)}
                  placeholder="Account number"
                />
                {errors.accountNumber && (
                  <p className="text-red-600 text-xs mt-1">{errors.accountNumber}</p>
                )}
              </div>

              <div data-field="confirmAccountNumber">
                <Label htmlFor="confirmAccountNumber">
                  Confirm Account Number <RequiredMark />
                </Label>
                <Input
                  id="confirmAccountNumber"
                  value={formData.confirmAccountNumber}
                  onChange={(e) =>
                    updateField("confirmAccountNumber", e.target.value)
                  }
                  placeholder="Re-enter account number"
                />
                {errors.confirmAccountNumber && (
                  <p className="text-red-600 text-xs mt-1">
                    {errors.confirmAccountNumber}
                  </p>
                )}
              </div>

              <div data-field="ifscCode">
                <Label htmlFor="ifscCode">
                  IFSC Code <RequiredMark />
                </Label>
                <Input
                  id="ifscCode"
                  value={formData.ifscCode}
                  onChange={(e) =>
                    updateField("ifscCode", e.target.value.toUpperCase())
                  }
                  placeholder="SBIN0001234"
                  maxLength={11}
                />
                {errors.ifscCode && (
                  <p className="text-red-600 text-xs mt-1">{errors.ifscCode}</p>
                )}
              </div>

              <div data-field="accountType">
                <Label htmlFor="accountType">Account Type</Label>
                <select
                  id="accountType"
                  className={selectClass}
                  value={formData.accountType}
                  onChange={(e) => updateField("accountType", e.target.value)}
                >
                  <option value="">Select type</option>
                  {BANK_ACCOUNT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2" data-field="upiId">
                <Label htmlFor="upiId">UPI ID</Label>
                <Input
                  id="upiId"
                  value={formData.upiId}
                  onChange={(e) => updateField("upiId", e.target.value)}
                  placeholder="name@bankcode"
                />
                {errors.upiId && (
                  <p className="text-red-600 text-xs mt-1">{errors.upiId}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Section 5: Director/Partner Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserCheck className="w-5 h-5 text-[#A6192E]" />
                Director / Partner Details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2" data-field="directorName">
                <Label htmlFor="directorName">
                  Director / Partner Name <RequiredMark />
                </Label>
                <Input
                  id="directorName"
                  value={formData.directorName}
                  onChange={(e) => updateField("directorName", e.target.value)}
                  placeholder="Full legal name"
                />
                {errors.directorName && (
                  <p className="text-red-600 text-xs mt-1">{errors.directorName}</p>
                )}
              </div>

              <div data-field="directorAadhar">
                <Label htmlFor="directorAadhar">
                  Director / Partner Aadhar Number <RequiredMark />
                </Label>
                <Input
                  id="directorAadhar"
                  value={formData.directorAadhar}
                  onChange={(e) => updateField("directorAadhar", e.target.value)}
                  placeholder="12-digit Aadhar number"
                  maxLength={14}
                />
                {errors.directorAadhar && (
                  <p className="text-red-600 text-xs mt-1">{errors.directorAadhar}</p>
                )}
              </div>

              <div data-field="directorAadharDocUrl" className="sm:col-span-2">
                <FileUpload
                  label="Director / Partner Aadhar Upload"
                  required
                  folder="agency-documents/aadhar"
                  accept=".pdf,.jpg,.jpeg,.png"
                  value={formData.directorAadharDocUrl}
                  onChange={(url) => updateField("directorAadharDocUrl", url || "")}
                  error={errors.directorAadharDocUrl}
                />
              </div>

              <div data-field="directorPan">
                <Label htmlFor="directorPan">Director / Partner PAN</Label>
                <Input
                  id="directorPan"
                  value={formData.directorPan}
                  onChange={(e) =>
                    updateField("directorPan", e.target.value.toUpperCase())
                  }
                  placeholder="ABCDE1234F"
                  maxLength={10}
                />
                {errors.directorPan && (
                  <p className="text-red-600 text-xs mt-1">{errors.directorPan}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Section 6: Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="w-5 h-5 text-[#A6192E]" />
                Additional Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2" data-field="portfolioDescription">
                <Label htmlFor="portfolioDescription">
                  Agency Roster / Portfolio Description
                </Label>
                <textarea
                  id="portfolioDescription"
                  className="flex min-h-[80px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  value={formData.portfolioDescription}
                  onChange={(e) =>
                    updateField("portfolioDescription", e.target.value)
                  }
                  placeholder="Describe your agency's roster, specializations, and past collaborations"
                  rows={4}
                />
              </div>

              <div data-field="commissionRate">
                <Label htmlFor="commissionRate">
                  Commission Rate Expectation (%)
                </Label>
                <Input
                  id="commissionRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={formData.commissionRate}
                  onChange={(e) => updateField("commissionRate", e.target.value)}
                  placeholder="e.g., 15"
                />
                {errors.commissionRate && (
                  <p className="text-red-600 text-xs mt-1">{errors.commissionRate}</p>
                )}
              </div>

              <div data-field="referralSource">
                <Label htmlFor="referralSource">
                  How did you hear about MARS?
                </Label>
                <select
                  id="referralSource"
                  className={selectClass}
                  value={formData.referralSource}
                  onChange={(e) => updateField("referralSource", e.target.value)}
                >
                  <option value="">Select</option>
                  {REFERRAL_SOURCES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2" data-field="additionalNotes">
                <Label htmlFor="additionalNotes">Additional Notes</Label>
                <textarea
                  id="additionalNotes"
                  className="flex min-h-[80px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  value={formData.additionalNotes}
                  onChange={(e) =>
                    updateField("additionalNotes", e.target.value)
                  }
                  placeholder="Any additional information you'd like to share"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="text-center space-y-4 pb-8">
            <Button
              type="submit"
              disabled={submitting}
              className="bg-[#A6192E] hover:bg-[#8a1526] text-white px-12 py-2.5 text-base rounded-lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Application"
              )}
            </Button>
            <p className="text-xs text-gray-500">
              By submitting, you agree to MARS Cosmetics&apos; terms and
              conditions.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
