import { createFileRoute } from "@tanstack/react-router";
import { PartnerIndex } from "@/components/PartnerIndex";

export const Route = createFileRoute("/kapital/")({
  head: () => ({ meta: [{ title: "Kapital & Investoren — matchfoundr" }] }),
  component: () => <PartnerIndex service="capital" title="Kapitalzugang" accent="sortiert" />,
});
