import { createFileRoute } from "@tanstack/react-router";
import { PartnerIndex } from "@/components/PartnerIndex";

export const Route = createFileRoute("/talent/")({
  head: () => ({ meta: [{ title: "Talent & Hires — matchfoundr" }] }),
  component: () => <PartnerIndex service="talent" title="Talent-Pipeline" accent="kuratiert" />,
});
