import { createFileRoute } from "@tanstack/react-router";
import { PartnerIndex } from "@/components/PartnerIndex";

export const Route = createFileRoute("/steuer/")({
  head: () => ({ meta: [{ title: "Steuer & Buchhaltung — matchfoundr" }] }),
  component: () => <PartnerIndex service="tax" title="Steuerpartner" accent="vorgefiltert" />,
});
