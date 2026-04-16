"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload, FileCheck, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { INDIAN_STATES, BUSINESS_TYPES, ANNUAL_TURNOVER_RANGES, BANK_ACCOUNT_TYPES } from "@/lib/constants";
import { getCitiesForState } from "@/lib/indian-cities";
import { SearchableSelect } from "@/components/searchable-select";
import {
  validatePhone,
  validateEmail,
  validatePAN,
  validateGST,
  validateIFSC,
  validateAadhar,
  validateBankAccount,
  validatePincode,
} from "@/lib/validations";

const selectClass =
  "flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type FileUpload = {
  url: string;
  filename: string;
  uploading: boolean;
};

export default function NewAgencyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    name: "",
    businessType: "",
    contactPerson: "",
    email: "",
    phone: "",
    website: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    gstNumber: "",
    panNumber: "",
    commissionPct: "",
    yearsInBusiness: "",
    annualTurnover: "",
    directorName: "",
    directorAadhar: "",
    bankName: "",
    bankAccountNumber: "",
    bankIfsc: "",
    bankBranch: "",
    bankAccountType: "",
    notes: "",
  });

  const [files, setFiles] = useState<Record<string, FileUpload>>({
    panDocumentUrl: { url: "", filename: "", uploading: false },
    gstDocumentUrl: { url: "", filename: "", uploading: false },
    udhyamCertificateUrl: { url: "", filename: "", uploading: false },
    agencyRosterUrl: { url: "", filename: "", uploading: false },
    aadharDocumentUrl: { url: "", filename: "", uploading: false },
  });

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  }

  async function handleFileUpload(field: string, file: File) {
    setFiles((prev) => ({
      ...prev,
      [field]: { ...prev[field], uploading: true },
    }));

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "agencies");

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      const data = await res.json();
      setFiles((prev) => ({
        ...prev,
        [field]: { url: data.url, filename: data.filename, uploading: false },
      }));
      toast.success(`${file.name} uploaded successfully`);
    } catch (err) {
      setFiles((prev) => ({
        ...prev,
        [field]: { url: "", filename: "", uploading: false },
      }));
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
  }

  function removeFile(field: string) {
    setFiles((prev) => ({
      ...prev,
      [field]: { url: "", filename: "", uploading: false },
    }));
    if (fileInputRefs.current[field]) {
      fileInputRefs.current[field]!.value = "";
    }
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) newErrors.name = "Agency name is required.";
    if (!form.businessType) newErrors.businessType = "Business type is required.";
    if (!form.panNumber.trim()) newErrors.panNumber = "PAN is mandatory.";
    else if (!validatePAN(form.panNumber)) newErrors.panNumber = "Invalid PAN. Format: ABCDE1234F";
    if (!form.gstNumber.trim()) newErrors.gstNumber = "GST is mandatory.";
    else if (!validateGST(form.gstNumber)) newErrors.gstNumber = "Invalid GST number.";
    if (form.email && !validateEmail(form.email)) newErrors.email = "Invalid email address.";
    if (form.phone && !validatePhone(form.phone)) newErrors.phone = "Invalid phone number.";
    if (form.pincode && !validatePincode(form.pincode)) newErrors.pincode = "Invalid pincode.";
    if (form.directorAadhar && !validateAadhar(form.directorAadhar))
      newErrors.directorAadhar = "Invalid Aadhar. Must be 12 digits.";
    if (form.bankIfsc && !validateIFSC(form.bankIfsc))
      newErrors.bankIfsc = "Invalid IFSC code. Format: ABCD0123456";
    if (form.bankAccountNumber && !validateBankAccount(form.bankAccountNumber))
      newErrors.bankAccountNumber = "Invalid account number. Must be 9-18 digits.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) {
      toast.error("Please fix the validation errors.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        panDocumentUrl: files.panDocumentUrl.url || null,
        gstDocumentUrl: files.gstDocumentUrl.url || null,
        udhyamCertificateUrl: files.udhyamCertificateUrl.url || null,
        agencyRosterUrl: files.agencyRosterUrl.url || null,
        aadharDocumentUrl: files.aadharDocumentUrl.url || null,
      };

      const res = await fetch("/api/agencies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to create agency");
      toast.success("Agency created successfully!");
      router.push("/agencies");
    } catch {
      toast.error("Failed to create agency.");
    } finally {
      setLoading(false);
    }
  }

  function FileUploadField({
    field,
    label,
    required = false,
  }: {
    field: string;
    label: string;
    required?: boolean;
  }) {
    const fileState = files[field];
    return (
      <div className="space-y-2">
        <Label>
          {label} {required && "*"}
        </Label>
        {fileState.url ? (
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
            <FileCheck className="h-4 w-4 text-green-600" />
            <span className="flex-1 truncate text-sm text-green-700">
              {fileState.filename}
            </span>
            <button
              type="button"
              onClick={() => removeFile(field)}
              className="text-red-500 hover:text-red-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={(el) => { fileInputRefs.current[field] = el; }}
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(field, file);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={fileState.uploading}
              onClick={() => fileInputRefs.current[field]?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              {fileState.uploading ? "Uploading..." : "Upload"}
            </Button>
            <span className="text-xs text-muted-foreground">PDF, JPG, PNG (max 10MB)</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/agencies">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">New Agency</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Details */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Agency Name *</Label>
                <Input id="name" name="name" value={form.name} onChange={handleChange} placeholder="Enter agency name" required />
                {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessType">Type of Business *</Label>
                <select id="businessType" name="businessType" value={form.businessType} onChange={handleChange} className={selectClass}>
                  <option value="">Select Business Type</option>
                  {BUSINESS_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {errors.businessType && <p className="text-xs text-red-500">{errors.businessType}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPerson">Contact Person</Label>
                <Input id="contactPerson" name="contactPerson" value={form.contactPerson} onChange={handleChange} placeholder="Enter contact person name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="Enter email" />
                {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" value={form.phone} onChange={handleChange} placeholder="Enter phone number" />
                {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" name="website" value={form.website} onChange={handleChange} placeholder="https://" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="commissionPct">Default Commission %</Label>
                <Input id="commissionPct" name="commissionPct" type="number" step="0.01" min="0" max="100" value={form.commissionPct} onChange={handleChange} placeholder="e.g. 15.00" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea id="address" name="address" value={form.address} onChange={handleChange} placeholder="Enter full address" rows={2} />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <SearchableSelect
                  options={INDIAN_STATES.map((s) => ({ value: s, label: s }))}
                  value={form.state}
                  onChange={(v) => {
                    setForm((prev) => ({ ...prev, state: v, city: "" }));
                  }}
                  placeholder="Select State..."
                  searchPlaceholder="Search state..."
                  emptyMessage="No state found."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <SearchableSelect
                  options={getCitiesForState(form.state).map((c) => ({ value: c, label: c }))}
                  value={form.city}
                  onChange={(v) => setForm((prev) => ({ ...prev, city: v }))}
                  placeholder={form.state ? "Select City..." : "Select state first"}
                  searchPlaceholder="Search city..."
                  emptyMessage={form.state ? "City not in list." : "Please select a state first."}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pincode">Pincode</Label>
                <Input id="pincode" name="pincode" value={form.pincode} onChange={handleChange} placeholder="6 digits" maxLength={6} />
                {errors.pincode && <p className="text-xs text-red-500">{errors.pincode}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business Information */}
        <Card>
          <CardHeader>
            <CardTitle>Business Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="yearsInBusiness">Years in Business</Label>
                <Input id="yearsInBusiness" name="yearsInBusiness" type="number" min="0" max="100" value={form.yearsInBusiness} onChange={handleChange} placeholder="e.g. 5" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="annualTurnover">Annual Turnover</Label>
                <select id="annualTurnover" name="annualTurnover" value={form.annualTurnover} onChange={handleChange} className={selectClass}>
                  <option value="">Select Range</option>
                  {ANNUAL_TURNOVER_RANGES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="directorName">Director / Partner Name</Label>
                <Input id="directorName" name="directorName" value={form.directorName} onChange={handleChange} placeholder="Full name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="directorAadhar">Director / Partner Aadhar Number</Label>
                <Input id="directorAadhar" name="directorAadhar" value={form.directorAadhar} onChange={handleChange} placeholder="12 digit Aadhar number" maxLength={14} />
                {errors.directorAadhar && <p className="text-xs text-red-500">{errors.directorAadhar}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KYC & Compliance */}
        <Card>
          <CardHeader>
            <CardTitle>KYC & Compliance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="panNumber">PAN Number *</Label>
                <Input id="panNumber" name="panNumber" value={form.panNumber} onChange={handleChange} placeholder="ABCDE1234F" className="uppercase" required />
                {errors.panNumber && <p className="text-xs text-red-500">{errors.panNumber}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="gstNumber">GST Number *</Label>
                <Input id="gstNumber" name="gstNumber" value={form.gstNumber} onChange={handleChange} placeholder="22AAAAA0000A1Z5" className="uppercase" required />
                {errors.gstNumber && <p className="text-xs text-red-500">{errors.gstNumber}</p>}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <FileUploadField field="panDocumentUrl" label="PAN Document" />
              <FileUploadField field="gstDocumentUrl" label="GST Certificate" />
              <FileUploadField field="udhyamCertificateUrl" label="Udhyam Certificate" />
              <FileUploadField field="aadharDocumentUrl" label="Director/Partner Aadhar" />
              <FileUploadField field="agencyRosterUrl" label="Agency Roster File" />
            </div>
          </CardContent>
        </Card>

        {/* Bank Details */}
        <Card>
          <CardHeader>
            <CardTitle>Bank Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name</Label>
                <Input id="bankName" name="bankName" value={form.bankName} onChange={handleChange} placeholder="e.g. HDFC Bank" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankAccountNumber">Account Number</Label>
                <Input id="bankAccountNumber" name="bankAccountNumber" value={form.bankAccountNumber} onChange={handleChange} placeholder="9-18 digit account number" />
                {errors.bankAccountNumber && <p className="text-xs text-red-500">{errors.bankAccountNumber}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankIfsc">IFSC Code</Label>
                <Input id="bankIfsc" name="bankIfsc" value={form.bankIfsc} onChange={handleChange} placeholder="e.g. HDFC0001234" className="uppercase" />
                {errors.bankIfsc && <p className="text-xs text-red-500">{errors.bankIfsc}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankBranch">Branch</Label>
                <Input id="bankBranch" name="bankBranch" value={form.bankBranch} onChange={handleChange} placeholder="Branch name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankAccountType">Account Type</Label>
                <select id="bankAccountType" name="bankAccountType" value={form.bankAccountType} onChange={handleChange} className={selectClass}>
                  <option value="">Select Type</option>
                  {BANK_ACCOUNT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea id="notes" name="notes" value={form.notes} onChange={handleChange} placeholder="Additional notes about this agency" rows={3} />
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-4">
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Agency"}
          </Button>
          <Link href="/agencies">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
