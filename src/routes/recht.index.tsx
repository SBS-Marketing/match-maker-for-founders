import { createFileRoute } from "@tanstack/react-router";
import { PartnerIndex } from "@/components/PartnerIndex";

export const Route = createFileRoute("/recht/")({
  head: () => ({ meta: [{ title: "Recht & Verträge — matchfoundr" }] }),
  component: () => (
    <PartnerIndex service="legal" title="Rechtspartner" accent="ohne Stundensatz-Roulette" />
  ),
});
