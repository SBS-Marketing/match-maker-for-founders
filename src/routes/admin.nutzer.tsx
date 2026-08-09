import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { AdminSoon } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/nutzer")({
  head: () => ({ meta: [{ title: "Nutzer & Profile — Admin · matchfoundr" }] }),
  component: () => (
    <AdminSoon
      icon={Users}
      title="Nutzer & Profile"
      text="Profil-Liste, Rollenvergabe und Token-Kontingente kommen im nächsten Schritt."
    />
  ),
});
