import { createFileRoute, notFound } from "@tanstack/react-router";
import { PartnerDetail } from "@/components/PartnerDetail";
import { PARTNERS } from "@/data/partners";

export const Route = createFileRoute("/kapital/$slug")({
  loader: ({ params }) => {
    const partner = PARTNERS.find((item) => item.service === "capital" && item.slug === params.slug);
    if (!partner) throw notFound();
    return { partner };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.partner.name} — matchfoundr` }],
  }),
  component: PartnerRoute,
});

function PartnerRoute() {
  const { partner } = Route.useLoaderData();
  return <PartnerDetail partner={partner} />;
}
