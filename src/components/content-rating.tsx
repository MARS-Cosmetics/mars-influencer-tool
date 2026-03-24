"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const RATING_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Below Average",
  3: "Average",
  4: "Good",
  5: "Excellent",
};

const AVAILABLE_TAGS = [
  { label: "On Brand", negative: false },
  { label: "High Engagement", negative: false },
  { label: "Creative", negative: false },
  { label: "Good Aesthetics", negative: false },
  { label: "Strong CTA", negative: false },
  { label: "Authentic", negative: false },
  { label: "Trendy", negative: false },
  { label: "Professional", negative: false },
  { label: "Relatable", negative: false },
  { label: "Off Brand", negative: true },
  { label: "Low Quality", negative: true },
  { label: "Late Delivery", negative: true },
];

interface ContentRatingProps {
  assetId: string;
  currentRating?: number;
  currentTags?: string[];
  onRated?: () => void;
}

export function ContentRating({
  assetId,
  currentRating,
  currentTags = [],
  onRated,
}: ContentRatingProps) {
  const [rating, setRating] = useState<number>(currentRating || 0);
  const [hoveredStar, setHoveredStar] = useState<number>(0);
  const [selectedTags, setSelectedTags] = useState<string[]>(currentTags);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const displayRating = hoveredStar || rating;

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleSubmit() {
    if (rating < 1) {
      toast.error("Please select a rating");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/assets/${assetId}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          ratingTags: selectedTags,
          ratingNotes: notes || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit rating");
      }

      toast.success("Rating submitted successfully");
      onRated?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit rating");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Star Rating */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">
          Rating
        </label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className="focus:outline-none"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(0)}
            >
              <Star
                className={`h-7 w-7 transition-colors ${
                  star <= displayRating
                    ? "text-yellow-400 fill-yellow-400"
                    : "text-gray-300"
                }`}
              />
            </button>
          ))}
          {displayRating > 0 && (
            <span className="ml-2 text-sm text-gray-600">
              {RATING_LABELS[displayRating]}
            </span>
          )}
        </div>
      </div>

      {/* Rating Tags */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">
          Tags
        </label>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_TAGS.map((tag) => {
            const isSelected = selectedTags.includes(tag.label);
            const baseClasses =
              "rounded-full px-3 py-1 text-xs font-medium border transition-colors cursor-pointer";

            let colorClasses: string;
            if (isSelected) {
              colorClasses = tag.negative
                ? "bg-red-100 text-red-800 border-red-300"
                : "bg-green-100 text-green-800 border-green-300";
            } else {
              colorClasses = tag.negative
                ? "bg-white text-red-600 border-red-200 hover:bg-red-50"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50";
            }

            return (
              <button
                key={tag.label}
                type="button"
                className={`${baseClasses} ${colorClasses}`}
                onClick={() => toggleTag(tag.label)}
              >
                {tag.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">
          Notes (optional)
        </label>
        <Textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any additional feedback..."
        />
      </div>

      {/* Submit */}
      <Button onClick={handleSubmit} disabled={submitting || rating < 1}>
        {submitting ? "Submitting..." : "Submit Rating"}
      </Button>
    </div>
  );
}
