"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Send, Check, X, RotateCcw, Lock, Unlock } from "lucide-react";

interface ProposalRow {
  id: string;
  submittedAt: string;
  proposedAmount: number | null;
  proposedGstPct: number | null;
  proposedDueDate: string | null;
  proposedTerms: string | null;
  influencerResponse: string | null;
  status: string;
  reviewedAt: string | null;
  counterAmount: number | null;
  counterGstPct: number | null;
  counterDueDate: string | null;
  reviewNotes: string | null;
  submitter: { id: string; name: string } | null;
  reviewer: { id: string; name: string } | null;
}

interface Props {
  collaborationId: string;
  proposals: ProposalRow[];
  isAdminOrManager: boolean;
  isAssignee: boolean;
  assigneeName: string;
  currentUserId: string;
  dealLockedAt: string | null;
  dealLockedByName: string | null;
}

function statusBadgeClass(status: string) {
  const m: Record<string, string> = {
    pending_review: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    counter_offered: "bg-orange-100 text-orange-800",
    accepted_by_influencer: "bg-blue-100 text-blue-800",
    superseded: "bg-gray-100 text-gray-600",
  };
  return m[status] ?? "bg-gray-100 text-gray-700";
}

function statusLabel(s: string) {
  return s.replace(/_/g, " ");
}

function formatINR(n: number | null) {
  if (n == null) return "—";
  return `₹${n.toLocaleString("en-IN")}`;
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function ProposalsPanel({
  collaborationId,
  proposals,
  isAdminOrManager,
  isAssignee,
  assigneeName,
  currentUserId,
  dealLockedAt,
  dealLockedByName,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  // Handler proposal form (only shown if not locked + no pending one open)
  const [pAmount, setPAmount] = useState("");
  const [pGst, setPGst] = useState("");
  const [pDue, setPDue] = useState("");
  const [pTerms, setPTerms] = useState("");

  // Admin review form per-proposal
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [counterAmount, setCounterAmount] = useState<Record<string, string>>({});
  const [counterDue, setCounterDue] = useState<Record<string, string>>({});

  // Handler "report back from influencer" inline
  const [infResp, setInfResp] = useState<Record<string, string>>({});

  const hasOpenProposal = proposals.some(
    (p) => p.status === "pending_review" || p.status === "counter_offered",
  );
  const acceptedExists = proposals.some(
    (p) => p.status === "accepted_by_influencer",
  );

  async function call(
    url: string,
    method: "POST" | "PUT" | "PATCH",
    body?: unknown,
  ) {
    setBusy(true);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      // Read body as text first so we can still surface the message even when
      // the server returned non-JSON (HTML error page, empty body, etc).
      const raw = await res.text();
      let parsed: unknown = null;
      try {
        parsed = raw ? JSON.parse(raw) : null;
      } catch {
        // not JSON
      }
      if (!res.ok) {
        const errorMsg =
          (parsed as { error?: string } | null)?.error ||
          `Request failed (${res.status})${raw ? `: ${raw.slice(0, 200)}` : ""}`;
        console.error("[proposals] API error", { url, method, status: res.status, body: parsed ?? raw });
        toast.error(errorMsg);
        return null;
      }
      router.refresh();
      return parsed;
    } catch (e) {
      console.error("[proposals] Network/fetch error", { url, method, error: e });
      toast.error(e instanceof Error ? e.message : "Network error — check console");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function submitProposal() {
    if (!pAmount) {
      toast.error("Proposed amount is required");
      return;
    }
    const r = await call(
      `/api/collaborations/${collaborationId}/proposals`,
      "POST",
      {
        proposedAmount: pAmount,
        proposedGstPct: pGst,
        proposedDueDate: pDue,
        proposedTerms: pTerms,
      },
    );
    if (r) {
      toast.success("Proposal submitted for manager review");
      setPAmount("");
      setPGst("");
      setPDue("");
      setPTerms("");
    }
  }

  async function review(
    proposalId: string,
    action: "approve" | "reject" | "counter",
  ) {
    const r = await call(
      `/api/collaborations/${collaborationId}/proposals/${proposalId}`,
      "PUT",
      {
        action,
        counterAmount: action === "counter" ? counterAmount[proposalId] : undefined,
        counterDueDate: action === "counter" ? counterDue[proposalId] : undefined,
        reviewNotes: adminNotes[proposalId] || undefined,
      },
    );
    if (r) toast.success(`Proposal ${action}d`);
  }

  async function reportInfluencerAccepted(proposalId: string) {
    const r = await call(
      `/api/collaborations/${collaborationId}/proposals/${proposalId}`,
      "PATCH",
      {
        action: "accepted_by_influencer",
        influencerResponse: infResp[proposalId] || undefined,
      },
    );
    if (r) toast.success("Marked accepted by influencer");
  }

  async function lockDeal() {
    const r = await call(
      `/api/collaborations/${collaborationId}/lock-deal`,
      "POST",
    );
    if (r) toast.success("Deal locked. Admin notified via activity log.");
  }

  return (
    <div className="space-y-6">
      {/* Deal lock status */}
      <Card
        className={
          dealLockedAt
            ? "border-emerald-200 bg-emerald-50/50"
            : "border-gray-200"
        }
      >
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              {dealLockedAt ? (
                <Lock className="h-4 w-4 text-emerald-600" />
              ) : (
                <Unlock className="h-4 w-4 text-gray-500" />
              )}
              {dealLockedAt ? "Deal Locked" : "Deal Status"}
            </span>
            {!dealLockedAt && acceptedExists && isAssignee && (
              <Button size="sm" onClick={lockDeal} disabled={busy}>
                <Lock className="mr-2 h-4 w-4" />
                Lock deal (notify admin)
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dealLockedAt ? (
            <p className="text-sm text-emerald-800">
              Locked on {formatDate(dealLockedAt)}{" "}
              {dealLockedByName ? `by ${dealLockedByName}` : ""}. Collab terms
              now mirror the accepted proposal.
            </p>
          ) : acceptedExists ? (
            <p className="text-sm text-gray-700">
              Influencer has accepted a proposal. Click the lock button to
              freeze terms and notify admin.
            </p>
          ) : (
            <p className="text-sm text-gray-600">
              No accepted proposal yet. Submit a proposal, get it approved by
              admin, take it to the influencer, then mark it accepted.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Non-assignee notice — explains why no submit/lock controls show */}
      {!isAssignee && !dealLockedAt && (
        <Card className="border-amber-200 bg-amber-50/40">
          <CardContent className="pt-6 text-sm text-amber-900">
            Only{" "}
            <span className="font-semibold">{assigneeName || "the assigned handler"}</span>{" "}
            can submit proposals, mark influencer acceptance, or lock this
            deal. {isAdminOrManager
              ? "You can still review proposals submitted by the handler below."
              : "You can view the negotiation history but cannot act on it."}
          </CardContent>
        </Card>
      )}

      {/* Submit new proposal — hidden once deal locked or while an open
          proposal is awaiting review, and hidden entirely for non-assignees */}
      {isAssignee && !dealLockedAt && !hasOpenProposal && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="h-4 w-4" />
              Submit proposal to manager
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pAmount">Proposed amount (₹) *</Label>
              <Input
                id="pAmount"
                type="number"
                min={0}
                value={pAmount}
                onChange={(e) => setPAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pGst">GST %</Label>
              <Input
                id="pGst"
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={pGst}
                onChange={(e) => setPGst(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pDue">Need-by date</Label>
              <Input
                id="pDue"
                type="date"
                value={pDue}
                onChange={(e) => setPDue(e.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="pTerms">Context / notes for manager</Label>
              <textarea
                id="pTerms"
                rows={3}
                value={pTerms}
                onChange={(e) => setPTerms(e.target.value)}
                placeholder="Influencer wants X for Y reason. Negotiation context, alternatives discussed, etc."
                className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button onClick={submitProposal} disabled={busy}>
                Submit for review
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Proposal history newest-first */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Negotiation history ({proposals.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {proposals.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No proposals yet. Submit one to start the manager review loop.
            </p>
          )}
          {proposals.map((p) => (
            <div
              key={p.id}
              className="rounded-lg border bg-white p-4 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge className={statusBadgeClass(p.status)}>
                    {statusLabel(p.status)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Submitted by {p.submitter?.name ?? "—"} on{" "}
                    {formatDate(p.submittedAt)}
                  </span>
                </div>
                {p.reviewedAt && (
                  <span className="text-xs text-muted-foreground">
                    Reviewed by {p.reviewer?.name ?? "—"} on{" "}
                    {formatDate(p.reviewedAt)}
                  </span>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Proposed</p>
                  <p className="font-medium">{formatINR(p.proposedAmount)}</p>
                  {p.proposedGstPct != null && (
                    <p className="text-xs text-gray-500">
                      GST {Number(p.proposedGstPct)}%
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500">Need-by</p>
                  <p className="font-medium">{formatDate(p.proposedDueDate)}</p>
                </div>
                {(p.counterAmount != null || p.counterDueDate) && (
                  <div className="rounded-md bg-orange-50 px-2 py-1">
                    <p className="text-xs text-orange-700">
                      Admin counter-offer
                    </p>
                    <p className="text-sm font-medium text-orange-800">
                      {formatINR(p.counterAmount)} · {formatDate(p.counterDueDate)}
                    </p>
                  </div>
                )}
              </div>

              {p.proposedTerms && (
                <div className="rounded-md bg-gray-50 px-3 py-2 text-sm">
                  <p className="text-xs font-medium text-gray-600 mb-1">
                    Handler notes
                  </p>
                  <p className="whitespace-pre-wrap text-gray-800">
                    {p.proposedTerms}
                  </p>
                </div>
              )}
              {p.reviewNotes && (
                <div className="rounded-md bg-blue-50 px-3 py-2 text-sm">
                  <p className="text-xs font-medium text-blue-700 mb-1">
                    Manager notes
                  </p>
                  <p className="whitespace-pre-wrap text-blue-900">
                    {p.reviewNotes}
                  </p>
                </div>
              )}
              {p.influencerResponse && (
                <div className="rounded-md bg-purple-50 px-3 py-2 text-sm">
                  <p className="text-xs font-medium text-purple-700 mb-1">
                    Influencer response
                  </p>
                  <p className="whitespace-pre-wrap text-purple-900">
                    {p.influencerResponse}
                  </p>
                </div>
              )}

              {/* Admin actions on pending — hidden if this user submitted the
                  proposal themselves (no self-approval) */}
              {isAdminOrManager &&
                p.status === "pending_review" &&
                p.submitter?.id !== currentUserId &&
                !dealLockedAt && (
                  <div className="border-t pt-3 space-y-2">
                    <p className="text-xs font-semibold text-gray-700">
                      Manager action
                    </p>
                    <div className="grid gap-2 md:grid-cols-2">
                      <Input
                        type="number"
                        placeholder="Counter amount (optional)"
                        value={counterAmount[p.id] ?? ""}
                        onChange={(e) =>
                          setCounterAmount((v) => ({
                            ...v,
                            [p.id]: e.target.value,
                          }))
                        }
                      />
                      <Input
                        type="date"
                        placeholder="Counter date"
                        value={counterDue[p.id] ?? ""}
                        onChange={(e) =>
                          setCounterDue((v) => ({
                            ...v,
                            [p.id]: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <textarea
                      rows={2}
                      placeholder='Note for handler: "do this", reasoning, what to ask…'
                      value={adminNotes[p.id] ?? ""}
                      onChange={(e) =>
                        setAdminNotes((v) => ({
                          ...v,
                          [p.id]: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => review(p.id, "approve")}
                        disabled={busy}
                      >
                        <Check className="mr-1 h-4 w-4" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => review(p.id, "counter")}
                        disabled={busy || !counterAmount[p.id]}
                      >
                        <RotateCcw className="mr-1 h-4 w-4" /> Send counter-offer
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => review(p.id, "reject")}
                        disabled={busy}
                      >
                        <X className="mr-1 h-4 w-4" /> Reject
                      </Button>
                    </div>
                  </div>
                )}

              {/* Handler (= assignee) reports back after taking approved/
                  countered proposal to the influencer. Admins/managers don't
                  see this even if they're somehow assignee, since they
                  shouldn't act in handler capacity. */}
              {isAssignee &&
                !isAdminOrManager &&
                (p.status === "approved" || p.status === "counter_offered") &&
                !dealLockedAt && (
                  <div className="border-t pt-3 space-y-2">
                    <p className="text-xs font-semibold text-gray-700">
                      Handler action — report back
                    </p>
                    <textarea
                      rows={2}
                      placeholder="What did the influencer say?"
                      value={infResp[p.id] ?? ""}
                      onChange={(e) =>
                        setInfResp((v) => ({ ...v, [p.id]: e.target.value }))
                      }
                      className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    />
                    <Button
                      size="sm"
                      onClick={() => reportInfluencerAccepted(p.id)}
                      disabled={busy}
                    >
                      Influencer accepted
                    </Button>
                  </div>
                )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
