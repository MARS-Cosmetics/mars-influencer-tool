import { DiscoverForm } from "@/features/discovery/components/DiscoverForm";

export const metadata = {
  title: "Discover Influencers",
};

export default function DiscoverPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <h1 className="text-2xl font-semibold">Discover influencers</h1>
      <DiscoverForm />
    </div>
  );
}
