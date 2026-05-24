import { createFileRoute } from "@tanstack/react-router";
import { PartnerIndex } from "@/components/PartnerIndex";

export const Route = createFileRoute("/mentoren/")({
  head: () => ({ meta: [{ title: "Mentoren & Advisor — matchfoundr" }] }),
  component: () => <PartnerIndex service="mentor" title="Mentoren" accent="mit Kontext" />,
});
