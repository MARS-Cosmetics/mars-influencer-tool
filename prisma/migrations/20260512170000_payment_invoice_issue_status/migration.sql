-- Add 'invoice_issue' status to PaymentStatus so the weekly payment Excel
-- workflow can flag payments held up by invoice problems before they're paid.

ALTER TYPE "PaymentStatus" ADD VALUE 'invoice_issue';
