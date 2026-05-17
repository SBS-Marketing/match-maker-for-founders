import { createFileRoute } from "@tanstack/react-router";
import { ServiceSkeleton } from "@/components/ServiceSkeleton";
export const Route = createFileRoute("/mentoren")({
  head: () => ({ meta: [{ title: "Mentoren & Advisor — matchfoundr" }] }),
  component: () => <ServiceSkeleton id="mentor" />,
});
