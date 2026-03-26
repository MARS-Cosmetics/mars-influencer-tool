"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Upload,
  Check,
  X,
  MessageSquare,
  ExternalLink,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Revision {
  id: string;
  version: number;
  contentUrl: string;
  status: string;
  feedback?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  reviewer?: { id: string; name: string } | null;
}

interface ContentReviewProps {
  assetId: string;
  currentVersion: number;
  currentContentUrl?: string;
  revisions: Revision[];
}

const statusBadgeStyles: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  revision_requested: "bg-orange-100 text-orange-800",
  rejected: "bg-red-100 text-red-800",
  in_review: "bg-purple-100 text-purple-800",
};

const statusLabels: Record<string, string> = {
  submitted: "Submitted",
  approved: "Approved",
  revision_requested: "Changes Requested",
  rejected: "Rejected",
  in_review: "In Review",
};

function formatDateTime(date: string | null | undefined): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ContentReview({
  assetId,
  currentVersion,
  currentContentUrl,
  revisions: initialRevisions,
}: ContentReviewProps) {
  const router = useRouter();
  const [revisions, setRevisions] = useState<Revision[]>(initialRevisions);
  const [newContentUrl, setNewContentUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  async function handleSubmitRevision(e: React.FormEvent) {
    e.preventDefault();
    if (!newContentUrl.trim()) {
      toast.error("Please enter a content URL");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/assets/${assetId}/revisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentUrl: newContentUrl.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to submit revision");
      }

      const data = await res.json();
      toast.success(`Revision v${data.revision.version} submitted`);
      setNewContentUrl("");
      setRevisions((prev) => [data.revision, ...prev]);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit revision");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReview(revisionId: string, status: string) {
    setPendingAction(status);
    try {
      const res = await fetch(
        `/api/assets/${assetId}/revisions/${revisionId}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            feedback: feedbackText.trim() || undefined,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to review revision");
      }

      const updated = await res.json();
      const label = statusLabels[status] || status;
      toast.success(`Revision marked as: ${label}`);

      setRevisions((prev) =>
        prev.map((r) => (r.id === revisionId ? { ...r, ...updated } : r))
      );
      setReviewingId(null);
      setFeedbackText("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to review revision");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4" />
          Content Review
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current version info */}
        <div className="rounded-lg border p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              Current Version: v{currentVersion}
            </span>
            {currentContentUrl && (
              <a
                href={currentContentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                View Content
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>

        {/* Submit new revision form */}
        <form onSubmit={handleSubmitRevision} className="space-y-3">
          <h4 className="text-sm font-medium">Submit New Version</h4>
          <div className="flex gap-2">
            <Input
              placeholder="Content URL (e.g. drive link, dropbox, etc.)"
              value={newContentUrl}
              onChange={(e) => setNewContentUrl(e.target.value)}
              disabled={isSubmitting}
              className="flex-1"
            />
            <Button type="submit" disabled={isSubmitting} size="sm">
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              {isSubmitting ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </form>

        {/* Revision history */}
        {revisions.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Revision History</h4>
            <div className="space-y-3">
              {revisions.map((rev) => (
                <div
                  key={rev.id}
                  className="relative rounded-lg border p-4 space-y-2"
                >
                  {/* Timeline dot */}
                  <div className="absolute -left-[7px] top-5 h-3 w-3 rounded-full border-2 border-white bg-gray-300" />

                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">v{rev.version}</span>
                      <Badge
                        className={
                          statusBadgeStyles[rev.status] ||
                          "bg-gray-100 text-gray-800"
                        }
                      >
                        {statusLabels[rev.status] || rev.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDateTime(rev.createdAt)}
                      </span>
                      {rev.contentUrl && (
                        <a
                          href={rev.contentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1"
                        >
                          View
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Reviewer info */}
                  {rev.reviewer && (
                    <p className="text-xs text-gray-500">
                      Reviewed by {rev.reviewer.name}
                      {rev.reviewedAt && ` on ${formatDateTime(rev.reviewedAt)}`}
                    </p>
                  )}

                  {/* Feedback */}
                  {rev.feedback && (
                    <div className="rounded bg-gray-50 p-2 text-sm text-gray-700">
                      <span className="text-xs font-medium text-gray-500">
                        Feedback:
                      </span>{" "}
                      {rev.feedback}
                    </div>
                  )}

                  {/* Review actions for submitted revisions */}
                  {rev.status === "submitted" && (
                    <div className="pt-2 space-y-2">
                      {reviewingId === rev.id ? (
                        <div className="space-y-2">
                          <Textarea
                            placeholder="Add feedback (optional)..."
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                            rows={2}
                            className="text-sm"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleReview(rev.id, "approved")}
                              disabled={!!pendingAction}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <Check className="mr-1 h-3.5 w-3.5" />
                              {pendingAction === "approved"
                                ? "Approving..."
                                : "Approve"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleReview(rev.id, "revision_requested")
                              }
                              disabled={!!pendingAction}
                              className="border-orange-300 text-orange-700 hover:bg-orange-50"
                            >
                              <MessageSquare className="mr-1 h-3.5 w-3.5" />
                              {pendingAction === "revision_requested"
                                ? "Sending..."
                                : "Request Changes"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReview(rev.id, "rejected")}
                              disabled={!!pendingAction}
                              className="border-red-300 text-red-700 hover:bg-red-50"
                            >
                              <X className="mr-1 h-3.5 w-3.5" />
                              {pendingAction === "rejected"
                                ? "Rejecting..."
                                : "Reject"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setReviewingId(null);
                                setFeedbackText("");
                              }}
                              disabled={!!pendingAction}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setReviewingId(rev.id)}
                        >
                          <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                          Review
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {revisions.length === 0 && (
          <p className="text-sm text-gray-500">
            No revisions submitted yet. Use the form above to submit the first
            version for review.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
