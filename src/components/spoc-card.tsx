import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserCircle2, Building2, Mail, Phone, MessageSquare, ExternalLink } from "lucide-react";

/**
 * SPOC = Single Point of Contact.
 *
 * Three groups, rendered only when at least one field is present:
 *   1. Internal SPOC — the team member who manages this influencer org-side
 *      (the ownership-lock holder, falls back to the original creator).
 *   2. Influencer direct contact — email / phone / WhatsApp from the
 *      influencer record itself.
 *   3. Agency contact — only when the influencer is agency-managed.
 *
 * Designed as a server-friendly pure render. Caller passes whatever it has;
 * missing fields collapse silently rather than rendering empty rows.
 */

export interface SpocInternal {
  /** Current owner — primary internal contact. */
  owner?: { id: string; name: string; email: string } | null;
  /** Original creator, in case it differs from owner (post-reassign). */
  creator?: { id: string; name: string; email: string } | null;
  ownedAt?: string | Date | null;
}

export interface SpocInfluencer {
  name: string;
  email?: string | null;
  phone?: string | null;
  whatsappNumber?: string | null;
}

export interface SpocAgency {
  id?: string | null;
  name?: string | null;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  commissionPct?: number | string | null;
  /** "self" | "agency" — when "self", agency is treated as inactive even if id set. */
  managedBy?: string | null;
}

interface Props {
  internal?: SpocInternal | null;
  influencer?: SpocInfluencer | null;
  agency?: SpocAgency | null;
  /** Hide the internal block (e.g. for non-admin users). */
  hideInternal?: boolean;
}

function Row({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  href?: string;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-3 py-1 text-sm">
      <span className="flex items-center gap-1.5 text-muted-foreground shrink-0">
        {icon}
        {label}
      </span>
      <span className="text-right">
        {href ? (
          <a
            href={href}
            className="hover:underline inline-flex items-center gap-1"
          >
            {value}
            <ExternalLink className="h-3 w-3 opacity-60" />
          </a>
        ) : (
          value
        )}
      </span>
    </div>
  );
}

export function SpocCard({
  internal,
  influencer,
  agency,
  hideInternal = false,
}: Props) {
  const showInternal =
    !hideInternal && (internal?.owner || internal?.creator);
  const showInfluencer =
    influencer && (influencer.email || influencer.phone || influencer.whatsappNumber);
  const isAgencyManaged =
    agency && agency.managedBy === "agency" && (agency.name || agency.id);
  const showAgency =
    isAgencyManaged &&
    (agency.name ||
      agency.contactPerson ||
      agency.email ||
      agency.phone ||
      agency.commissionPct != null);

  if (!showInternal && !showInfluencer && !showAgency) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCircle2 className="h-5 w-5" />
          Points of contact
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {showInternal && (
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Internal SPOC
            </div>
            {internal?.owner ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{internal.owner.name}</span>
                  {internal.ownedAt && (
                    <span className="text-xs text-muted-foreground">
                      since{" "}
                      {new Date(internal.ownedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </div>
                <Row
                  icon={<Mail className="h-3 w-3" />}
                  label="Email"
                  value={internal.owner.email}
                  href={`mailto:${internal.owner.email}`}
                />
                {internal.creator &&
                  internal.creator.id !== internal.owner.id && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Originally onboarded by {internal.creator.name}
                    </p>
                  )}
              </>
            ) : internal?.creator ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{internal.creator.name}</span>
                  <Badge
                    variant="outline"
                    className="border-amber-300 bg-amber-50 text-[10px] text-amber-900"
                  >
                    Unassigned
                  </Badge>
                </div>
                <Row
                  icon={<Mail className="h-3 w-3" />}
                  label="Email"
                  value={internal.creator.email}
                  href={`mailto:${internal.creator.email}`}
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  No active SPOC assigned. Anyone can claim this influencer.
                </p>
              </>
            ) : null}
          </div>
        )}

        {showInfluencer && (
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Influencer direct
            </div>
            <div className="text-sm font-medium">{influencer.name}</div>
            <Row
              icon={<Mail className="h-3 w-3" />}
              label="Email"
              value={influencer.email}
              href={influencer.email ? `mailto:${influencer.email}` : undefined}
            />
            <Row
              icon={<Phone className="h-3 w-3" />}
              label="Phone"
              value={influencer.phone}
              href={influencer.phone ? `tel:${influencer.phone}` : undefined}
            />
            <Row
              icon={<MessageSquare className="h-3 w-3" />}
              label="WhatsApp"
              value={influencer.whatsappNumber}
              href={
                influencer.whatsappNumber
                  ? `https://wa.me/${influencer.whatsappNumber.replace(/\D/g, "")}`
                  : undefined
              }
            />
          </div>
        )}

        {showAgency && (
          <div>
            <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Building2 className="h-3 w-3" />
              Agency contact
            </div>
            <div className="text-sm font-medium">
              {agency.id ? (
                <a
                  href={`/agencies/${agency.id}`}
                  className="hover:underline inline-flex items-center gap-1"
                >
                  {agency.name ?? "Agency"}
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </a>
              ) : (
                (agency.name ?? "Agency")
              )}
            </div>
            <Row
              icon={<UserCircle2 className="h-3 w-3" />}
              label="POC"
              value={agency.contactPerson}
            />
            <Row
              icon={<Mail className="h-3 w-3" />}
              label="Email"
              value={agency.email}
              href={agency.email ? `mailto:${agency.email}` : undefined}
            />
            <Row
              icon={<Phone className="h-3 w-3" />}
              label="Phone"
              value={agency.phone}
              href={agency.phone ? `tel:${agency.phone}` : undefined}
            />
            {agency.commissionPct != null && (
              <Row
                icon={<span className="inline-block w-3" />}
                label="Commission"
                value={`${Number(agency.commissionPct).toFixed(2)}%`}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
