import { createFileRoute } from "@tanstack/react-router";
import { Database } from "lucide-react";
import { AdminSoon } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/system")({
  head: () => ({ meta: [{ title: "Datenquellen & Zugriff — Admin · matchfoundr" }] }),
  component: () => (
    <AdminSoon
      icon={Database}
      title="Datenquellen & Zugriff"
      text="Konnektor-Status, Rollenverwaltung und MCP-Zugriffe kommen im nächsten Schritt."
    />
  ),
});
