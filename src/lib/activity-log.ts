/**
 * Centralized activity logging.
 *
 * Design principles:
 * - Fire-and-forget: callers should NOT await this if they want zero latency
 *   impact. The helper catches its own errors so the user request always succeeds
 *   even if the audit write fails.
 * - One INSERT per call, no joins, no transactions. ~3-10ms on Neon.
 * - Tiered retention is enforced at cleanup time, not write time.
 *   Financial / KYC entities (payments, invoices, contracts, documents) are
 *   kept for 1 year; everything else 7 days.
 */

import { prisma } from "@/lib/db";

export type EntityType =
  | "agency"
  | "influencer"
  | "collaboration"
  | "campaign"
  | "payment"
  | "invoice"
  | "contract"
  | "content_idea"
  | "pr_parcel"
  | "document"
  | "user"
  | "auth"
  | "asset"
  | "suggestion"
  | "discovery_bookmark";

export type Action =
  | "created"
  | "updated"
  | "deleted"
  | "restored"
  | "status_change"
  | "field_update"
  | "approved"
  | "rejected"
  | "revoked"
  | "promoted"
  | "login"
  | "login_failed"
  | "logout"
  | "password_change"
  | "exported"
  | "imported";

export interface LogActivityOpts {
  userId: string | null;
  entity: EntityType;
  entityId: string;
  action: Action;
  field?: string;
  oldValue?: string | number | boolean | null;
  newValue?: string | number | boolean | null;
  description?: string;
  changes?: Record<string, unknown>;
}

/**
 * Log an activity. Always returns a Promise that resolves; never rejects.
 * Callers can await (~3-10ms) or fire-and-forget — your choice based on
 * whether you need the log to land before responding.
 *
 * Errors are swallowed (after console.error) — audit failures should NEVER
 * break a user request.
 */
export function logActivity(opts: LogActivityOpts): Promise<void> {
  return prisma.activityLog
    .create({
      data: {
        userId: opts.userId ?? null,
        entityType: opts.entity,
        entityId: opts.entityId,
        action: opts.action,
        field: opts.field ?? null,
        oldValue: stringifyValue(opts.oldValue),
        newValue: stringifyValue(opts.newValue),
        description: opts.description ?? null,
        changes: (opts.changes as object | undefined) ?? undefined,
      },
    })
    .then(() => undefined)
    .catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[activity-log] write failed (entity=${opts.entity}, action=${opts.action}):`, msg);
    });
}

/**
 * Convenience helper for "thing X created Y" events.
 */
export function logCreate(
  userId: string | null,
  entity: EntityType,
  entityId: string,
  description?: string,
): Promise<void> {
  return logActivity({ userId, entity, entityId, action: "created", description });
}

/**
 * Convenience helper for soft-delete events.
 */
export function logDelete(
  userId: string | null,
  entity: EntityType,
  entityId: string,
  description?: string,
): Promise<void> {
  return logActivity({ userId, entity, entityId, action: "deleted", description });
}

/**
 * Diff two objects and write one row per changed field. Useful for PUT
 * handlers — call this BEFORE the update with the previous row, after with
 * the new row.
 *
 * @param trackFields  Whitelist of fields to consider; everything else is ignored.
 */
export async function logFieldDiffs(
  userId: string | null,
  entity: EntityType,
  entityId: string,
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown>,
  trackFields: string[],
): Promise<void> {
  if (!before) return;
  const writes: Promise<void>[] = [];
  for (const field of trackFields) {
    const oldVal = before[field];
    const newVal = after[field];
    if (String(oldVal ?? "") === String(newVal ?? "")) continue;
    writes.push(
      logActivity({
        userId,
        entity,
        entityId,
        action: field === "status" ? "status_change" : "field_update",
        field,
        oldValue: oldVal as string | number | boolean | null,
        newValue: newVal as string | number | boolean | null,
        description: `${field} changed`,
      }),
    );
  }
  await Promise.all(writes);
}

/**
 * Login outcome logging. Action is "login" on success, "login_failed" otherwise.
 * `entityId` is the user id on success or the email hash on failure (so we
 * have a per-actor count without storing raw emails as ids).
 */
export function logLogin(userId: string, success: boolean, description?: string): Promise<void> {
  return logActivity({
    userId,
    entity: "auth",
    entityId: userId,
    action: success ? "login" : "login_failed",
    description,
  });
}

// ----------------------------------------------------------------------------
// internal
// ----------------------------------------------------------------------------

function stringifyValue(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v.length > 1000 ? v.slice(0, 1000) + "…" : v;
  return String(v);
}
