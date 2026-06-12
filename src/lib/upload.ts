// ─────────────────────────────────────────────────────────────
// Bild-Upload: eingeloggt → Supabase Storage (Bucket "media",
// Ordner = User-ID), Demo/offline → DataURL (im localStorage des
// jeweiligen Features gespeichert, max ~1.5 MB).
// ─────────────────────────────────────────────────────────────

import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type UploadAuth = { session: Session | null; user: User | null; isDemo: boolean };

const MAX_DEMO_BYTES = 1.5 * 1024 * 1024;
const MAX_CLOUD_BYTES = 8 * 1024 * 1024;

export async function uploadImage(file: File, auth: UploadAuth): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Bitte ein Bild auswählen (PNG, JPG, WebP …).");
  }

  const canUseCloud = Boolean(auth.session && auth.user && !auth.isDemo);

  if (!canUseCloud) {
    if (file.size > MAX_DEMO_BYTES) {
      throw new Error("Im Demo-Modus max. 1,5 MB — melde dich an für größere Bilder.");
    }
    return await fileToDataUrl(file);
  }

  if (file.size > MAX_CLOUD_BYTES) {
    throw new Error("Bild ist größer als 8 MB — bitte verkleinern.");
  }

  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${auth.user!.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("media").upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error(`Upload fehlgeschlagen: ${error.message}`);
  const { data } = supabase.storage.from("media").getPublicUrl(path);
  return data.publicUrl;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Bild konnte nicht gelesen werden."));
    reader.readAsDataURL(file);
  });
}
