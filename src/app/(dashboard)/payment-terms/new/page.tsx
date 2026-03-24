"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

const selectClass =
  "flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const TRIGGER_OPTIONS = [
  { value: "on_confirmation", label: "On Confirmation" },
  { value: "on_content_submission", label: "On Content Submission" },
  { value: "on_content_approval", label: "On Content Approval" },
  { value: "on_publication", label: "On Publication" },
  { value: "on_completion", label: "On Completion" },
  { value: "net_15", label: "Net 15" },
  { value: "net_30", label: "Net 30" },
  { value: "net_45", label: "Net 45" },
  { value: "custom", label: "Custom" },
];

interface Installment {
  percentage: number;
  trigger: string;
  label: string;
}

export default function NewPaymentTermPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [installments, setInstallments] = useState<Installment[]>([
    { percentage: 100, trigger: "on_confirmation", label: "Full Payment" },
  ]);

  const totalPercentage = installments.reduce(
    (sum, inst) => sum + (Number(inst.percentage) || 0),
    0
  );

  function addInstallment() {
    setInstallments((prev) => [
      ...prev,
      { percentage: 0, trigger: "on_confirmation", label: "" },
    ]);
  }

  function removeInstallment(index: number) {
    setInstallments((prev) => prev.filter((_, i) => i !== index));
  }

  function updateInstallment(
    index: number,
    field: keyof Installment,
    value: string | number
  ) {
    setInstallments((prev) =>
      prev.map((inst, i) =>
        i === index ? { ...inst, [field]: value } : inst
      )
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    if (installments.length === 0) {
      toast.error("At least one installment is required");
      return;
    }

    if (totalPercentage !== 100) {
      toast.error(
        `Installment percentages must sum to 100% (currently ${totalPercentage}%)`
      );
      return;
    }

    for (const inst of installments) {
      if (!inst.label.trim()) {
        toast.error("All installments must have a label");
        return;
      }
      if (inst.percentage < 1 || inst.percentage > 100) {
        toast.error("Each installment percentage must be between 1 and 100");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/payment-terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          installments,
          isDefault,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create payment term");
      }

      toast.success("Payment term created successfully");
      router.push("/payment-terms");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create payment term"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/payment-terms">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">New Payment Term</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='e.g. "50-50 Split", "Net 30"'
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the payment term..."
                rows={2}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="isDefault" className="cursor-pointer">
                Set as Default
              </Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Installments</CardTitle>
              <div className="flex items-center gap-3">
                <span
                  className={`text-sm font-medium ${
                    totalPercentage === 100
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  Total: {totalPercentage}%
                  {totalPercentage !== 100 && " (must be 100%)"}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addInstallment}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add Installment
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {installments.length === 0 ? (
              <p className="text-center text-gray-500 py-4">
                No installments added. Click &quot;Add Installment&quot; to get
                started.
              </p>
            ) : (
              installments.map((inst, index) => (
                <div
                  key={index}
                  className="flex items-end gap-3 rounded-lg border p-4"
                >
                  <div className="space-y-2 w-24">
                    <Label>Percentage</Label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={inst.percentage}
                      onChange={(e) =>
                        updateInstallment(
                          index,
                          "percentage",
                          parseInt(e.target.value) || 0
                        )
                      }
                      placeholder="%"
                    />
                  </div>

                  <div className="space-y-2 flex-1">
                    <Label>Trigger</Label>
                    <select
                      value={inst.trigger}
                      onChange={(e) =>
                        updateInstallment(index, "trigger", e.target.value)
                      }
                      className={selectClass}
                    >
                      {TRIGGER_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2 flex-1">
                    <Label>Label</Label>
                    <Input
                      value={inst.label}
                      onChange={(e) =>
                        updateInstallment(index, "label", e.target.value)
                      }
                      placeholder='e.g. "Advance", "Final Payment"'
                    />
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeInstallment(index)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Link href="/payment-terms">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Create Payment Term
          </Button>
        </div>
      </form>
    </div>
  );
}
