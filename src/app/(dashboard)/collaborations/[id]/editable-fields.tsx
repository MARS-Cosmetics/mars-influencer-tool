"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Check, X, Loader2 } from "lucide-react";

interface EditableFieldProps {
  collaborationId: string;
  field: string;
  value: string | number | null;
  type?: "text" | "number" | "date" | "select" | "textarea";
  options?: { value: string; label: string }[];
  label: string;
  displayFormat?: "currency" | "date" | "text";
  placeholder?: string;
}

function formatForDisplay(val: string | number | null, format?: string, placeholder?: string): string {
  if (val === null || val === undefined || val === "") return placeholder || "-";
  if (format === "currency") {
    const num = typeof val === "string" ? parseFloat(val) : Number(val);
    if (isNaN(num)) return "-";
    return `₹${num.toLocaleString("en-IN")}`;
  }
  if (format === "date") {
    try {
      return new Date(String(val)).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
      return String(val);
    }
  }
  return String(val);
}

export function EditableField({
  collaborationId,
  field,
  value,
  type = "text",
  options,
  label,
  displayFormat,
  placeholder,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value ?? ""));
  const [currentValue, setCurrentValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);

  const displayValue = formatForDisplay(currentValue, displayFormat, placeholder);

  async function handleSave() {
    // Validate date is in the future
    if (type === "date" && editValue) {
      const selected = new Date(editValue);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selected < today) {
        toast.error("Date must be today or later");
        return;
      }
    }

    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      if (type === "number") {
        payload[field] = editValue ? parseFloat(editValue) : null;
      } else {
        payload[field] = editValue || null;
      }

      const res = await fetch(`/api/collaborations/${collaborationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save");
      }

      setCurrentValue(type === "number" ? (editValue ? parseFloat(editValue) : null) : editValue || null);
      setIsEditing(false);
      toast.success(`${label} updated`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    setEditValue(String(currentValue ?? ""));
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        {type === "select" && options ? (
          <select
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ) : type === "textarea" ? (
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            rows={3}
            className="flex w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
          />
        ) : (
          <input
            ref={(el) => {
              if (el && type === "date") {
                // Auto-open the date picker calendar
                try { el.showPicker(); } catch {}
              }
            }}
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            step={type === "number" ? "0.01" : undefined}
            min={type === "date" ? new Date().toISOString().split("T")[0] : undefined}
            className={`flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 ${type === "date" ? "cursor-pointer" : ""}`}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") handleCancel();
            }}
          />
        )}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="shrink-0 rounded p-1 text-green-600 hover:bg-green-50"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        </button>
        <button
          onClick={handleCancel}
          className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-50"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <span
      className="group flex items-center gap-1.5 cursor-pointer text-sm"
      onClick={() => {
        setEditValue(String(currentValue ?? ""));
        setIsEditing(true);
      }}
    >
      <span className={currentValue ? "font-medium" : "text-gray-400"}>{displayValue}</span>
      <Pencil className="h-3 w-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
    </span>
  );
}
