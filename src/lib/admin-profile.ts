// Vollständigkeit eines Profils.
// Es zählen genau 8 Felder, jedes 12,5 %:
// display_name, photo_url, location, industry, skills (nicht leer),
// vision, looking_for, founder_type.

import type { ProfileFields } from "@/hooks/admin/useAdminData";

/** null = keine Profilfelder vorhanden, also keine Aussage möglich. */
export function profileCompleteness(user: ProfileFields | undefined): number | null {
  if (!user) return null;
  const filled = [
    user.display_name,
    user.photo_url,
    user.location,
    user.industry,
    user.skills && user.skills.length > 0 ? "x" : null,
    user.vision,
    user.looking_for,
    user.founder_type,
  ].filter((v) => typeof v === "string" && v.trim().length > 0).length;
  return Math.round((filled / 8) * 100);
}

