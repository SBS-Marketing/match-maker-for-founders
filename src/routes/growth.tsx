import { createFileRoute } from "@tanstack/react-router";
import { ServiceSkeleton } from "@/components/ServiceSkeleton";
export const Route = createFileRoute("/growth")({
  head: () => ({ meta: [{ title: "Growth & GTM — matchfoundr" }] }),
  component: () => <ServiceSkeleton id="growth" />,
});
