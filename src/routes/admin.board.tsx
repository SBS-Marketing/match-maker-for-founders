import { createFileRoute } from "@tanstack/react-router";
import { Kanban } from "lucide-react";
import { AdminSoon } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/board")({
  head: () => ({ meta: [{ title: "Team-Board — Admin · matchfoundr" }] }),
  component: () => (
    <AdminSoon
      icon={Kanban}
      title="Team-Board"
      text="Das Kanban-Board für admin_tasks kommt im nächsten Schritt."
    />
  ),
});
