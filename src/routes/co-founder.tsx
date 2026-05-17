import { createFileRoute, redirect } from "@tanstack/react-router";

// Co-Founder bleibt eigene Seite; Funktionalität lebt auf /discover (Match-Engine, Filter, Chats).
export const Route = createFileRoute("/co-founder")({
  head: () => ({
    meta: [
      { title: "Co-Founder finden — matchfoundr" },
      { name: "description", content: "Der Mensch, mit dem du baust. Vom Co-Pilot vorgefiltert." },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/discover" });
  },
});
