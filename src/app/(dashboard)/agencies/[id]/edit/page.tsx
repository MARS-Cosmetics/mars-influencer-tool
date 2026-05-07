"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  INDIAN_STATES,
  BUSINESS_TYPES,
  ANNUAL_TURNOVER_RANGES,
  BANK_ACCOUNT_TYPES,
} from "@/lib/constants";
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

const EMPTY_FORM = {
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
  isActive: true as boolean,
};

type FormState = typeof EMPTY_FORM;

export default function EditAgencyPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/agencies/${id}`);
        if (!res.ok) throw new Error("Failed to load agency");
        const a = await res.json();
        if (cancelled) return;

        const str = (v: unknown): string => (v == null ? "" : String(v));
        setForm({
          name: str(a.name),
          businessType: str(a.businessType),
          contactPerson: str(a.contactPerson),
          email: str(a.email),
          phone: str(a.phone),
          website: str(a.website),
          address: str(a.address),
          city: str(a.city),
          state: str(a.state),
          pincode: str(a.pincode),
          gstNumber: str(a.gstNumber),
          panNumber: str(a.panNumber),
          commissionPct: str(a.commissionPct),
          yearsInBusiness: str(a.yearsInBusiness),
          annualTurnover: str(a.annualTurnover),
          directorName: str(a.directorName),
          directorAadhar: str(a.directorAadhar),
          bankName: str(a.bankName),
          bankAccountNumber: str(a.bankAccountNumber),
          bankIfsc: str(a.bankIfsc),
          bankBranch: str(a.bankBranch),
          bankAccountType: str(a.bankAccountType),
          notes: str(a.notes),
          isActive: Boolean(a.isActive),
        });
      } catch {
        toast.error("Failed to load agency");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const { name, value, type } = e.target as HTMLInputElement;
    const v: string | boolean =
      type === "checkbox" ? (e.target as HTMLInputElement).checked : value;
    setForm((prev) => ({ ...prev, [name]: v }));
    if (errors[name]) {
      setErrors((p) => {
        const n = { ...p };
        delete n[name];
        return n;
      });
    }
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Agency name is required.";
    if (form.email && !validateEmail(form.email)) e.email = "Invalid email.";
    if (form.phone && !validatePhone(form.phone)) e.phone = "Invalid phone.";
    if (form.pincode && !validatePincode(form.pincode)) e.pincode = "Invalid pincode.";
    if (form.panNumber && !validatePAN(form.panNumber)) e.panNumber = "Invalid PAN. Format: ABCDE1234F";
    if (form.gstNumber && !validateGST(form.gstNumber)) e.gstNumber = "Invalid GST number.";
    if (form.directorAadhar && !validateAadhar(form.directorAadhar)) e.directorAadhar = "Invalid Aadhar.";
    if (form.bankIfsc && !validateIFSC(form.bankIfsc)) e.bankIfsc = "Invalid IFSC.";
    if (form.bankAccountNumber && !validateBankAccount(form.bankAccountNumber))
      e.bankAccountNumber = "Invalid account number.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) {
      toast.error("Please fix the validation errors");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/agencies/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update agency");
      }
      toast.success("Agency updated");
      router.push(`/agencies/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update agency");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href={`/agencies/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Edit Agency</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Agency Name *</Label>
                <Input id="name" name="name" value={form.name} onChange={handleChange} required />
                {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessType">Business Type</Label>
                <select id="businessType" name="businessType" value={form.businessType} onChange={handleChange} className={selectClass}>
                  <option value="">Select Business Type</option>
                  {BUSINESS_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPerson">Contact Person</Label>
                <Input id="contactPerson" name="contactPerson" value={form.contactPerson} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} />
                {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" value={form.phone} onChange={handleChange} />
                {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" name="website" value={form.website} onChange={handleChange} placeholder="https://" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="commissionPct">Default Commission %</Label>
                <Input id="commissionPct" name="commissionPct" type="number" step="0.01" min="0" max="100" value={form.commissionPct} onChange={handleChange} />
              </div>
              <div className="space-y-2 flex items-end">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} className="rounded" />
                  Active (visible in lists)
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea id="address" name="address" value={form.address} onChange={handleChange} rows={2} />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>State</Label>
                <SearchableSelect
                  options={INDIAN_STATES.map((s) => ({ value: s, label: s }))}
                  value={form.state}
                  onChange={(v) => setForm((p) => ({ ...p, state: v, city: "" }))}
                  placeholder="Select State..."
                  searchPlaceholder="Search state..."
                  emptyMessage="No state found."
                />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <SearchableSelect
                  options={getCitiesForState(form.state).map((c) => ({ value: c, label: c }))}
                  value={form.city}
                  onChange={(v) => setForm((p) => ({ ...p, city: v }))}
                  placeholder={form.state ? "Select City..." : "Select state first"}
                  searchPlaceholder="Search city..."
                  emptyMessage={form.state ? "City not in list." : "Please select a state first."}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pincode">Pincode</Label>
                <Input id="pincode" name="pincode" value={form.pincode} onChange={handleChange} maxLength={6} />
                {errors.pincode && <p className="text-xs text-red-500">{errors.pincode}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Business Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="yearsInBusiness">Years in Business</Label>
                <Input id="yearsInBusiness" name="yearsInBusiness" type="number" min="0" max="100" value={form.yearsInBusiness} onChange={handleChange} />
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
                <Input id="directorName" name="directorName" value={form.directorName} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="directorAadhar">Director / Partner Aadhar</Label>
                <Input id="directorAadhar" name="directorAadhar" value={form.directorAadhar} onChange={handleChange} maxLength={14} />
                {errors.directorAadhar && <p className="text-xs text-red-500">{errors.directorAadhar}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>KYC & Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="panNumber">PAN Number</Label>
                <Input id="panNumber" name="panNumber" value={form.panNumber} onChange={handleChange} className="uppercase" placeholder="ABCDE1234F" />
                {errors.panNumber && <p className="text-xs text-red-500">{errors.panNumber}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="gstNumber">GST Number</Label>
                <Input id="gstNumber" name="gstNumber" value={form.gstNumber} onChange={handleChange} className="uppercase" />
                {errors.gstNumber && <p className="text-xs text-red-500">{errors.gstNumber}</p>}
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Document files (Aadhar, PAN, GST, Udyam, Roster) are managed on the agency detail page.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bank Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name</Label>
                <Input id="bankName" name="bankName" value={form.bankName} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankAccountNumber">Account Number</Label>
                <Input id="bankAccountNumber" name="bankAccountNumber" value={form.bankAccountNumber} onChange={handleChange} />
                {errors.bankAccountNumber && <p className="text-xs text-red-500">{errors.bankAccountNumber}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankIfsc">IFSC Code</Label>
                <Input id="bankIfsc" name="bankIfsc" value={form.bankIfsc} onChange={handleChange} className="uppercase" />
                {errors.bankIfsc && <p className="text-xs text-red-500">{errors.bankIfsc}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankBranch">Branch</Label>
                <Input id="bankBranch" name="bankBranch" value={form.bankBranch} onChange={handleChange} />
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

        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea name="notes" value={form.notes} onChange={handleChange} rows={3} />
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin mr-2" />}
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          <Link href={`/agencies/${id}`}>
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
