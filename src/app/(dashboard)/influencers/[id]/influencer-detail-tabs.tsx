"use client";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export function InfluencerDetailTabs({
  overviewContent,
  collaborationsContent,
  prParcelsContent,
  assetsContent,
  paymentsContent,
}: {
  overviewContent: React.ReactNode;
  collaborationsContent: React.ReactNode;
  prParcelsContent: React.ReactNode;
  assetsContent: React.ReactNode;
  paymentsContent: React.ReactNode;
}) {
  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="collaborations">Collaborations</TabsTrigger>
        <TabsTrigger value="pr-parcels">PR Parcels</TabsTrigger>
        <TabsTrigger value="assets">Assets</TabsTrigger>
        <TabsTrigger value="payments">Payments</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">{overviewContent}</TabsContent>
      <TabsContent value="collaborations">{collaborationsContent}</TabsContent>
      <TabsContent value="pr-parcels">{prParcelsContent}</TabsContent>
      <TabsContent value="assets">{assetsContent}</TabsContent>
      <TabsContent value="payments">{paymentsContent}</TabsContent>
    </Tabs>
  );
}
