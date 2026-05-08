"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Loader2, Search, UserCircle2 } from "lucide-react";
import Link from "next/link";
import { validatePhone, validateEmail, validatePAN, validateGST, validatePincode, validateIFSC, validateUPI, validateInstagramHandle } from "@/lib/validations";
import { INDIAN_STATES, CONTENT_LANGUAGES, INFLUENCER_CATEGORIES, CONTENT_NICHES } from "@/lib/constants";
import { SearchableSelect, SearchableSelectOption } from "@/components/searchable-select";

type InfluencerData = Record<string, unknown>;

const selectClass = "flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export default function EditInfluencerPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin =
    (session?.user as { role?: string } | undefined)?.role === "admin";
  const id = params.id as string;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingCultureX, setIsFetchingCultureX] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<Record<string, string>>({});
  const [ownership, setOwnership] = useState<{
    owner: { id: string; name: string; email: string } | null;
    creator: { id: string; name: string; email: string } | null;
    ownedAt: string | null;
    createdAt: string | null;
  }>({ owner: null, creator: null, ownedAt: null, createdAt: null });
  const [agencies, setAgencies] = useState<SearchableSelectOption[]>([]);
  const [gstVerification, setGstVerification] = useState<{ status: "idle" | "loading" | "success" | "error"; message: string }>({ status: "idle", message: "" });

  // Fetch agencies
  useEffect(() => {
    fetch("/api/agencies")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAgencies(
            data.map((a: { id: string; name: string; contactPerson?: string }) => ({
              value: a.id,
              label: a.name,
              sublabel: a.contactPerson || undefined,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  // Load influencer data
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/influencers/${id}`);
        if (!res.ok) throw new Error("Failed to load influencer");
        const json: InfluencerData = await res.json();

        const toStr = (key: string): string => {
          const v = json[key];
          if (v == null) return "";
          if (Array.isArray(v)) return v.join(", ");
          if (v instanceof Date) return v.toISOString().split("T")[0];
          if (typeof v === "object") return "";
          return String(v);
        };

        const dateStr = (key: string): string => {
          const v = json[key];
          if (!v) return "";
          return new Date(v as string).toISOString().split("T")[0];
        };

        const formData: Record<string, string> = {
          name: toStr("name"),
          email: toStr("email"),
          phone: toStr("phone"),
          whatsappNumber: toStr("whatsappNumber"),
          dateOfBirth: dateStr("dateOfBirth"),
          gender: toStr("gender"),
          bio: toStr("bio"),
          instagramHandle: toStr("instagramHandle"),
          youtubeHandle: toStr("youtubeHandle"),
          twitterHandle: toStr("twitterHandle"),
          tiktokHandle: toStr("tiktokHandle"),
          linkedinUrl: toStr("linkedinUrl"),
          blogUrl: toStr("blogUrl"),
          addressLine1: toStr("addressLine1"),
          addressLine2: toStr("addressLine2"),
          city: toStr("city"),
          state: toStr("state"),
          pincode: toStr("pincode"),
          country: toStr("country") || "India",
          tier: toStr("tier"),
          primaryLanguage: toStr("primaryLanguage"),
          categories: toStr("categories"),
          contentNiches: toStr("contentNiches"),
          languages: toStr("languages"),
          panNumber: toStr("panNumber"),
          gstin: toStr("gstin"),
          bankAccountName: toStr("bankAccountName"),
          bankAccountNumber: toStr("bankAccountNumber"),
          bankIfscCode: toStr("bankIfscCode"),
          bankName: toStr("bankName"),
          upiId: toStr("upiId"),
          paymentPreference: toStr("paymentPreference") || "bank_transfer",
          rateInstagramReel: toStr("rateInstagramReel"),
          rateInstagramStory: toStr("rateInstagramStory"),
          rateInstagramPost: toStr("rateInstagramPost"),
          rateYoutubeVideo: toStr("rateYoutubeVideo"),
          rateYoutubeShort: toStr("rateYoutubeShort"),
          rateBlogPost: toStr("rateBlogPost"),
          rateTwitterPost: toStr("rateTwitterPost"),
          rateCurrency: toStr("rateCurrency") || "INR",
          rateNotes: toStr("rateNotes"),
          source: toStr("source"),
          status: toStr("status") || "discovered",
          referredBy: toStr("referredBy"),
          managedBy: toStr("agencyId") ? "agency" : "self",
          agencyId: toStr("agencyId"),
          tags: toStr("tags"),
          internalNotes: toStr("internalNotes"),
          igFollowerCount: toStr("igFollowerCount"),
          igFollowingCount: toStr("igFollowingCount"),
          igPostCount: toStr("igPostCount"),
          igEngagementRate: toStr("igEngagementRate"),
          igAvgLikes: toStr("igAvgLikes"),
          igAvgComments: toStr("igAvgComments"),
          igAvgReelViews: toStr("igAvgReelViews"),
          igAvgStoryViews: toStr("igAvgStoryViews"),
          igMedianReelViews: toStr("igMedianReelViews"),
          igCredibilityScore: toStr("igCredibilityScore"),
          igAudienceMalePct: toStr("igAudienceMalePct"),
          igAudienceFemalePct: toStr("igAudienceFemalePct"),
          igAudienceTopAgeRange: toStr("igAudienceTopAgeRange"),
        };

        setForm(formData);

        // Capture ownership info for the banner.
        const owner = json.owner as
          | { id: string; name: string; email: string }
          | null
          | undefined;
        const creator = json.creator as
          | { id: string; name: string; email: string }
          | null
          | undefined;
        setOwnership({
          owner: owner ?? null,
          creator: creator ?? null,
          ownedAt: (json.ownedAt as string) ?? null,
          createdAt: (json.createdAt as string) ?? null,
        });
      } catch {
        toast.error("Failed to load influencer");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [id]);

  // Pincode auto-fill
  useEffect(() => {
    if (form.pincode?.length === 6 && validatePincode(form.pincode)) {
      fetch(`/api/pincode/${form.pincode}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.city) setForm((prev) => ({ ...prev, city: data.city, state: data.state }));
        })
        .catch(() => {});
    }
  }, [form.pincode]);

  function updateForm(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    updateForm(e.target.name, e.target.value);
  }

  function handleLanguageToggle(lang: string) {
    const current = form.languages ? form.languages.split(",").map((s) => s.trim()).filter(Boolean) : [];
    const updated = current.includes(lang)
      ? current.filter((l) => l !== lang)
      : [...current, lang];
    updateForm("languages", updated.join(", "));
  }

  async function fetchFromCultureX() {
    const handle = form.instagramHandle?.trim();
    if (!handle) {
      toast.error("Enter Instagram handle first");
      return;
    }
    setIsFetchingCultureX(true);
    try {
      const res = await fetch(`/api/culturex/${encodeURIComponent(handle)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data?.source === "creatorx_error") {
          toast.error(data.error || "Influenzer fetch failed");
        } else {
          toast.error(data?.error || "Failed to fetch profile");
        }
        return;
      }
      if (!data.found) {
        toast.error("Profile not found");
        return;
      }
      setForm((prev) => ({
        ...prev,
        igFollowerCount: String(data.igFollowerCount ?? ""),
        igFollowingCount: String(data.igFollowingCount ?? ""),
        igPostCount: String(data.igPostCount ?? ""),
        igEngagementRate: String(data.igEngagementRate ?? ""),
        igAvgLikes: String(data.igAvgLikes ?? ""),
        igAvgComments: String(data.igAvgComments ?? ""),
        igAvgReelViews: String(data.igAvgReelViews ?? ""),
        igAvgStoryViews: String(data.igAvgStoryViews ?? ""),
        igMedianReelViews: String(data.igMedianReelViews ?? ""),
        igCredibilityScore: String(data.igCredibilityScore ?? ""),
        igAudienceMalePct: String(data.igAudienceMalePct ?? ""),
        igAudienceFemalePct: String(data.igAudienceFemalePct ?? ""),
        igAudienceTopAgeRange: String(data.igAudienceTopAgeRange ?? ""),
        categories: data.categories ? data.categories.join(", ") : prev.categories,
        tier: data.tier || prev.tier,
        bio: prev.bio || data.bio || "",
      }));
      if (data.source === "instagram_fallback") {
        toast.info("Fetched from Instagram public profile — only basic counts filled");
      } else if (data.source === "cached") {
        toast.success("Already synced in last 24h — using cached data");
      } else if (data.source === "creatorx") {
        toast.success("Profile fetched from Influenzer");
      } else {
        toast.success("Profile fetched");
      }
    } catch {
      toast.error("Failed to fetch profile");
    } finally {
      setIsFetchingCultureX(false);
    }
  }

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {};

    if (form.phone && !validatePhone(form.phone)) newErrors.phone = "Invalid Indian phone number";
    if (form.email && !validateEmail(form.email)) newErrors.email = "Invalid email address";
    if (form.instagramHandle && !validateInstagramHandle(form.instagramHandle)) newErrors.instagramHandle = "Invalid Instagram handle";
    if (form.panNumber && !validatePAN(form.panNumber)) newErrors.panNumber = "Invalid PAN format (e.g., ABCDE1234F)";
    if (form.gstin && !validateGST(form.gstin)) newErrors.gstin = "Invalid GST format";
    if (form.pincode && !validatePincode(form.pincode)) newErrors.pincode = "Invalid pincode (6 digits)";
    if (form.bankIfscCode && !validateIFSC(form.bankIfscCode)) newErrors.bankIfscCode = "Invalid IFSC code";
    if (form.upiId && !validateUPI(form.upiId)) newErrors.upiId = "Invalid UPI ID";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function verifyGST() {
    if (!form.gstin) return;
    if (!validateGST(form.gstin)) {
      setErrors((prev) => ({ ...prev, gstin: "Invalid GST format" }));
      return;
    }
    setGstVerification({ status: "loading", message: "" });
    try {
      const res = await fetch(`/api/gst-verify/${form.gstin}`);
      const data = await res.json();
      if (res.ok && data.companyName) {
        setGstVerification({ status: "success", message: `Verified: ${data.companyName} (${data.status || "Active"})` });
      } else {
        setGstVerification({ status: "error", message: data.error || "Could not verify GST" });
      }
    } catch {
      setGstVerification({ status: "error", message: "GST verification failed" });
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Please fix the validation errors");
      return;
    }
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/influencers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update influencer");
      }

      toast.success("Influencer updated successfully");
      router.push(`/influencers/${id}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update influencer"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!Object.keys(form).length) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Influencer not found.
      </div>
    );
  }

  const selectedLanguages = form.languages ? form.languages.split(",").map((s) => s.trim()).filter(Boolean) : [];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href={`/influencers/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Edit Influencer
          </h1>
          <p className="text-sm text-muted-foreground">
            Update details for {form.name}.
          </p>
        </div>
      </div>

      {isAdmin && (ownership.owner || ownership.creator) && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 p-3 text-sm">
          <UserCircle2 className="h-5 w-5 text-muted-foreground" />
          {ownership.owner ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-muted-foreground">Onboarded by</span>
              <span className="font-medium">{ownership.owner.name}</span>
              <span className="text-xs text-muted-foreground">
                {ownership.owner.email}
              </span>
              {ownership.ownedAt && (
                <span className="text-xs text-muted-foreground">
                  · since {new Date(ownership.ownedAt).toLocaleDateString()}
                </span>
              )}
              {ownership.creator &&
                ownership.creator.id !== ownership.owner.id && (
                  <span className="text-xs text-muted-foreground">
                    · originally created by {ownership.creator.name}
                  </span>
                )}
            </div>
          ) : ownership.creator ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-muted-foreground">Originally added by</span>
              <span className="font-medium">{ownership.creator.name}</span>
              <span className="text-xs text-muted-foreground">
                {ownership.creator.email}
              </span>
              <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-900">
                Unassigned — anyone can claim
              </span>
            </div>
          ) : null}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Profile */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Profile</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" name="name" required value={form.name} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleInputChange}
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" value={form.phone} onChange={handleInputChange} />
              {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
              <Input
                id="whatsappNumber"
                name="whatsappNumber"
                value={form.whatsappNumber}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                name="dateOfBirth"
                type="date"
                value={form.dateOfBirth}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <select
                id="gender"
                name="gender"
                value={form.gender}
                onChange={handleInputChange}
                className={selectClass}
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="non_binary">Non-binary</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" name="bio" value={form.bio} onChange={handleInputChange} />
            </div>
          </CardContent>
        </Card>

        {/* Social Handles */}
        <Card>
          <CardHeader>
            <CardTitle>Social Handles</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="instagramHandle">Instagram Handle</Label>
              <div className="flex gap-2">
                <Input
                  id="instagramHandle"
                  name="instagramHandle"
                  value={form.instagramHandle}
                  onChange={handleInputChange}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={fetchFromCultureX}
                  disabled={isFetchingCultureX}
                  title="Fetch profile data from Influenzer"
                >
                  {isFetchingCultureX ? <Loader2 className="size-4 animate-spin" /> : <><Search className="size-4 mr-1" /> Fetch</>}
                </Button>
              </div>
              {errors.instagramHandle && <p className="text-xs text-red-500 mt-1">{errors.instagramHandle}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="youtubeHandle">YouTube Handle</Label>
              <Input
                id="youtubeHandle"
                name="youtubeHandle"
                value={form.youtubeHandle}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="twitterHandle">Twitter Handle</Label>
              <Input
                id="twitterHandle"
                name="twitterHandle"
                value={form.twitterHandle}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tiktokHandle">TikTok Handle</Label>
              <Input
                id="tiktokHandle"
                name="tiktokHandle"
                value={form.tiktokHandle}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
              <Input
                id="linkedinUrl"
                name="linkedinUrl"
                value={form.linkedinUrl}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="blogUrl">Blog URL</Label>
              <Input
                id="blogUrl"
                name="blogUrl"
                value={form.blogUrl}
                onChange={handleInputChange}
              />
            </div>
          </CardContent>
        </Card>

        {/* Instagram Metrics — auto-fetched from Influenzer, manually editable as fallback */}
        <Card>
          <CardHeader>
            <CardTitle>Instagram Metrics</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Auto-filled by the &quot;Fetch&quot; button above (data from Influenzer). Avg likes, avg comments, story views, and credibility score aren&apos;t in the Influenzer response — fill those manually if you have them.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              <div className="space-y-1">
                <Label htmlFor="igFollowerCount" className="text-xs text-muted-foreground">Followers</Label>
                <Input
                  id="igFollowerCount"
                  name="igFollowerCount"
                  type="number"
                  min="0"
                  value={form.igFollowerCount}
                  onChange={handleInputChange}
                  placeholder="e.g. 50000"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="igFollowingCount" className="text-xs text-muted-foreground">Following</Label>
                <Input
                  id="igFollowingCount"
                  name="igFollowingCount"
                  type="number"
                  min="0"
                  value={form.igFollowingCount}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="igPostCount" className="text-xs text-muted-foreground">Posts</Label>
                <Input
                  id="igPostCount"
                  name="igPostCount"
                  type="number"
                  min="0"
                  value={form.igPostCount}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="igEngagementRate" className="text-xs text-muted-foreground">Engagement Rate (%)</Label>
                <Input
                  id="igEngagementRate"
                  name="igEngagementRate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.igEngagementRate}
                  onChange={handleInputChange}
                  placeholder="e.g. 3.50"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="igAvgLikes" className="text-xs text-muted-foreground">Avg Likes</Label>
                <Input
                  id="igAvgLikes"
                  name="igAvgLikes"
                  type="number"
                  min="0"
                  value={form.igAvgLikes}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="igAvgComments" className="text-xs text-muted-foreground">Avg Comments</Label>
                <Input
                  id="igAvgComments"
                  name="igAvgComments"
                  type="number"
                  min="0"
                  value={form.igAvgComments}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="igAvgReelViews" className="text-xs text-muted-foreground">Avg Reel Views</Label>
                <Input
                  id="igAvgReelViews"
                  name="igAvgReelViews"
                  type="number"
                  min="0"
                  value={form.igAvgReelViews}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="igAvgStoryViews" className="text-xs text-muted-foreground">Avg Story Views</Label>
                <Input
                  id="igAvgStoryViews"
                  name="igAvgStoryViews"
                  type="number"
                  min="0"
                  value={form.igAvgStoryViews}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="igMedianReelViews" className="text-xs text-muted-foreground">Median Reel Views</Label>
                <Input
                  id="igMedianReelViews"
                  name="igMedianReelViews"
                  type="number"
                  min="0"
                  value={form.igMedianReelViews}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="igCredibilityScore" className="text-xs text-muted-foreground">Credibility Score</Label>
                <Input
                  id="igCredibilityScore"
                  name="igCredibilityScore"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.igCredibilityScore}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="igAudienceMalePct" className="text-xs text-muted-foreground">Audience Male (%)</Label>
                <Input
                  id="igAudienceMalePct"
                  name="igAudienceMalePct"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={form.igAudienceMalePct}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="igAudienceFemalePct" className="text-xs text-muted-foreground">Audience Female (%)</Label>
                <Input
                  id="igAudienceFemalePct"
                  name="igAudienceFemalePct"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={form.igAudienceFemalePct}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="igAudienceTopAgeRange" className="text-xs text-muted-foreground">Top Age Range</Label>
                <Input
                  id="igAudienceTopAgeRange"
                  name="igAudienceTopAgeRange"
                  value={form.igAudienceTopAgeRange}
                  onChange={handleInputChange}
                  placeholder="e.g. 25-34"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="addressLine1">Address Line 1</Label>
              <Input
                id="addressLine1"
                name="addressLine1"
                value={form.addressLine1}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="addressLine2">Address Line 2</Label>
              <Input
                id="addressLine2"
                name="addressLine2"
                value={form.addressLine2}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pincode">Pincode</Label>
              <Input
                id="pincode"
                name="pincode"
                value={form.pincode}
                onChange={handleInputChange}
              />
              {errors.pincode && <p className="text-xs text-red-500 mt-1">{errors.pincode}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" value={form.city} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <select
                id="state"
                name="state"
                value={form.state}
                onChange={handleInputChange}
                className={selectClass}
              >
                <option value="">Select state</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                name="country"
                value={form.country}
                onChange={handleInputChange}
              />
            </div>
          </CardContent>
        </Card>

        {/* Tier & Category */}
        <Card>
          <CardHeader>
            <CardTitle>Tier & Category</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tier">Tier</Label>
              <select
                id="tier"
                name="tier"
                value={form.tier}
                onChange={handleInputChange}
                className={selectClass}
              >
                <option value="">Select tier</option>
                <option value="nano">Nano</option>
                <option value="micro">Micro</option>
                <option value="mid">Mid</option>
                <option value="macro">Macro</option>
                <option value="mega">Mega</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="primaryLanguage">Primary Language</Label>
              <select
                id="primaryLanguage"
                name="primaryLanguage"
                value={form.primaryLanguage}
                onChange={handleInputChange}
                className={selectClass}
              >
                <option value="">Select language</option>
                {CONTENT_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>{lang.charAt(0).toUpperCase() + lang.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Categories</Label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-1">
                {INFLUENCER_CATEGORIES.map((cat) => {
                  const selected = form.categories.split(",").map(s => s.trim()).filter(Boolean);
                  return (
                    <label key={cat} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected.includes(cat)}
                        onChange={() => {
                          const current = form.categories.split(",").map(s => s.trim()).filter(Boolean);
                          const updated = current.includes(cat)
                            ? current.filter(c => c !== cat)
                            : [...current, cat];
                          setForm(prev => ({ ...prev, categories: updated.join(", ") }));
                        }}
                        className="rounded border-input"
                      />
                      {cat}
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Content Niches</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                {CONTENT_NICHES.map((niche) => {
                  const selected = form.contentNiches.split(",").map(s => s.trim()).filter(Boolean);
                  return (
                    <label key={niche} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected.includes(niche)}
                        onChange={() => {
                          const current = form.contentNiches.split(",").map(s => s.trim()).filter(Boolean);
                          const updated = current.includes(niche)
                            ? current.filter(n => n !== niche)
                            : [...current, niche];
                          setForm(prev => ({ ...prev, contentNiches: updated.join(", ") }));
                        }}
                        className="rounded border-input"
                      />
                      {niche}
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Languages</Label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-1">
                {CONTENT_LANGUAGES.map((lang) => (
                  <label key={lang} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedLanguages.includes(lang)}
                      onChange={() => handleLanguageToggle(lang)}
                      className="rounded border-input"
                    />
                    {lang.charAt(0).toUpperCase() + lang.slice(1)}
                  </label>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Details */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="panNumber">PAN Number</Label>
              <Input
                id="panNumber"
                name="panNumber"
                value={form.panNumber}
                onChange={handleInputChange}
              />
              {errors.panNumber && <p className="text-xs text-red-500 mt-1">{errors.panNumber}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="gstin">GSTIN</Label>
              <div className="flex gap-2">
                <Input id="gstin" name="gstin" placeholder="GST number" value={form.gstin} onChange={handleInputChange} className="flex-1" />
                <Button type="button" variant="outline" size="sm" onClick={verifyGST} disabled={!form.gstin || gstVerification.status === "loading"}>
                  {gstVerification.status === "loading" ? <Loader2 className="size-4 animate-spin" /> : "Verify"}
                </Button>
              </div>
              {errors.gstin && <p className="text-xs text-red-500 mt-1">{errors.gstin}</p>}
              {gstVerification.status === "success" && <p className="text-xs text-green-600 mt-1">{gstVerification.message}</p>}
              {gstVerification.status === "error" && <p className="text-xs text-red-500 mt-1">{gstVerification.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankAccountName">Bank Account Name</Label>
              <Input
                id="bankAccountName"
                name="bankAccountName"
                value={form.bankAccountName}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankAccountNumber">Bank Account Number</Label>
              <Input
                id="bankAccountNumber"
                name="bankAccountNumber"
                value={form.bankAccountNumber}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankIfscCode">IFSC Code</Label>
              <Input
                id="bankIfscCode"
                name="bankIfscCode"
                value={form.bankIfscCode}
                onChange={handleInputChange}
              />
              {errors.bankIfscCode && <p className="text-xs text-red-500 mt-1">{errors.bankIfscCode}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankName">Bank Name</Label>
              <Input
                id="bankName"
                name="bankName"
                value={form.bankName}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="upiId">UPI ID</Label>
              <Input id="upiId" name="upiId" value={form.upiId} onChange={handleInputChange} />
              {errors.upiId && <p className="text-xs text-red-500 mt-1">{errors.upiId}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentPreference">Payment Preference</Label>
              <select
                id="paymentPreference"
                name="paymentPreference"
                value={form.paymentPreference}
                onChange={handleInputChange}
                className={selectClass}
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="upi">UPI</option>
                <option value="other">Other</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Rate Card */}
        <Card>
          <CardHeader>
            <CardTitle>Rate Card</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="rateInstagramReel">Instagram Reel</Label>
              <Input
                id="rateInstagramReel"
                name="rateInstagramReel"
                type="number"
                step="0.01"
                value={form.rateInstagramReel}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rateInstagramStory">Instagram Story</Label>
              <Input
                id="rateInstagramStory"
                name="rateInstagramStory"
                type="number"
                step="0.01"
                value={form.rateInstagramStory}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rateInstagramPost">Instagram Post</Label>
              <Input
                id="rateInstagramPost"
                name="rateInstagramPost"
                type="number"
                step="0.01"
                value={form.rateInstagramPost}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rateYoutubeVideo">YouTube Video</Label>
              <Input
                id="rateYoutubeVideo"
                name="rateYoutubeVideo"
                type="number"
                step="0.01"
                value={form.rateYoutubeVideo}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rateYoutubeShort">YouTube Short</Label>
              <Input
                id="rateYoutubeShort"
                name="rateYoutubeShort"
                type="number"
                step="0.01"
                value={form.rateYoutubeShort}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rateBlogPost">Blog Post</Label>
              <Input
                id="rateBlogPost"
                name="rateBlogPost"
                type="number"
                step="0.01"
                value={form.rateBlogPost}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rateTwitterPost">Twitter Post</Label>
              <Input
                id="rateTwitterPost"
                name="rateTwitterPost"
                type="number"
                step="0.01"
                value={form.rateTwitterPost}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rateCurrency">Currency</Label>
              <Input
                id="rateCurrency"
                name="rateCurrency"
                value={form.rateCurrency}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-3">
              <Label htmlFor="rateNotes">Rate Notes</Label>
              <Textarea
                id="rateNotes"
                name="rateNotes"
                value={form.rateNotes}
                onChange={handleInputChange}
              />
            </div>
          </CardContent>
        </Card>

        {/* Onboarding */}
        <Card>
          <CardHeader>
            <CardTitle>Onboarding</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <select
                id="source"
                name="source"
                value={form.source}
                onChange={handleInputChange}
                className={selectClass}
              >
                <option value="">Select source</option>
                <option value="google_form">Google Form</option>
                <option value="instagram_dm">Instagram DM</option>
                <option value="email">Email</option>
                <option value="manual_discovery">Manual Discovery</option>
                <option value="inbound">Inbound</option>
                <option value="referral">Referral</option>
                <option value="agency">Agency</option>
                <option value="event">Event</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                name="status"
                value={form.status}
                onChange={handleInputChange}
                className={selectClass}
              >
                <option value="discovered">Discovered</option>
                <option value="contacted">Contacted</option>
                <option value="form_submitted">Form Submitted</option>
                <option value="demographics_verified">
                  Demographics Verified
                </option>
                <option value="onboarded">Onboarded</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="blacklisted">Blacklisted</option>
                <option value="do_not_contact">Do Not Contact</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="referredBy">Referred By</Label>
              <Input
                id="referredBy"
                name="referredBy"
                value={form.referredBy}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label>Managed By</Label>
              <div className="flex items-center gap-4 mt-1">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="managedBy"
                    value="self"
                    checked={form.managedBy === "self"}
                    onChange={handleInputChange}
                  />
                  Self
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="managedBy"
                    value="agency"
                    checked={form.managedBy === "agency"}
                    onChange={handleInputChange}
                  />
                  Agency
                </label>
              </div>
            </div>
            {form.managedBy === "agency" && (
              <div className="space-y-2 sm:col-span-2">
                <Label>Agency</Label>
                <SearchableSelect
                  options={agencies}
                  value={form.agencyId}
                  onChange={(value) => updateForm("agencyId", value)}
                  placeholder="Select agency..."
                  searchPlaceholder="Search agencies..."
                  emptyMessage="No agencies found."
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tags & Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Tags & Notes</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                name="tags"
                value={form.tags}
                onChange={handleInputChange}
                placeholder="vegan, cruelty-free, luxury (comma-separated)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="internalNotes">Internal Notes</Label>
              <Textarea
                id="internalNotes"
                name="internalNotes"
                value={form.internalNotes}
                onChange={handleInputChange}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
          <Link href={`/influencers/${id}`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
