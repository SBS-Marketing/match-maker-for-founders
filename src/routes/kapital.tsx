import { createFileRoute } from "@tanstack/react-router";
import { ServiceSkeleton } from "@/components/ServiceSkeleton";
export const Route = createFileRoute("/kapital")({
  head: () => ({ meta: [{ title: "Kapital & Investoren — matchfoundr" }] }),
  component: () => <ServiceSkeleton id="capital" />,
});
