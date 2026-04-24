import { DiscoverForm } from "@/features/discovery/components/DiscoverForm";

export const metadata = {
  title: "Discover Influencers",
};

export default function DiscoverPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Discover influencers</h1>
        <p className="text-sm text-muted-foreground">
          Pick a campaign, set quick filters, and describe your ideal creator in
          plain English. We use AI to translate that into an Influenzer.ai
          search and surface matches.
        </p>
      </div>

      <DiscoverForm />
    </div>
  );
}
