import { createFileRoute } from "@tanstack/react-router";
import { ServiceSkeleton } from "@/components/ServiceSkeleton";
export const Route = createFileRoute("/talent")({
  head: () => ({ meta: [{ title: "Talent & Hires — matchfoundr" }] }),
  component: () => <ServiceSkeleton id="talent" />,
});
