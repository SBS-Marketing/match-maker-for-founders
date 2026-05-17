import { createFileRoute } from "@tanstack/react-router";
import { ServiceSkeleton } from "@/components/ServiceSkeleton";
export const Route = createFileRoute("/steuer")({
  head: () => ({ meta: [{ title: "Steuer & Buchhaltung — matchfoundr" }] }),
  component: () => <ServiceSkeleton id="tax" />,
});
