import { createFileRoute } from "@tanstack/react-router";
import { PartnerIndex } from "@/components/PartnerIndex";

export const Route = createFileRoute("/growth/")({
  head: () => ({ meta: [{ title: "Growth & GTM — matchfoundr" }] }),
  component: () => <PartnerIndex service="growth" title="Growth-Partner" accent="einsatzbereit" />,
});
