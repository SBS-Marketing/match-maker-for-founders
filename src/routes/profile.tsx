import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  Github,
  Globe,
  Linkedin,
  MapPin,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Twitter,
  Youtube,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AuthGate } from "@/components/AuthGate";
import { ConnectedAccounts } from "@/components/ConnectedAccounts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Route = createFileRoute("/profile")({
  component: () => (
    <AuthGate>
      <ProfilePage />
    </AuthGate>
  ),
});

const roleLabel: Record<string, string> = {
  tech: "Technical Co-Founder",
  business: "Business Co-Founder",
  product: "Product Co-Founder",
  design: "Design Co-Founder",
  other: "Co-Founder",
};
const stageLabel: Record<string, string> = {
  idea: "Idee · noch am Überlegen",
  mvp: "Prototyp baut sich",
  revenue: "Erste Umsätze",
  scaling: "Skaliert gerade",
};
const commitLabel: Record<string, string> = {
  full_time: "Vollzeit · Runway läuft",
  part_time: "Teilzeit · Übergang",
  exploring: "Sondiert · sucht Match",
};

type SocialKind = "linkedin" | "twitter" | "github" | "website" | "youtube";
type SocialLink = { id: string; kind: SocialKind; url: string };

type ProfileExtras = {
  headline: string;
  about: string;
  bannerUrl?: string;
  socials: SocialLink[];
};

const EXTRAS_KEY = "mf_profile_extras_v1";

const SOCIAL_META: Record<
  SocialKind,
  { label: string; icon: typeof Linkedin; placeholder: string }
> = {
  linkedin: { label: "LinkedIn", icon: Linkedin, placeholder: "https://linkedin.com/in/…" },
  twitter: { label: "X / Twitter", icon: Twitter, placeholder: "https://x.com/…" },
  github: { label: "GitHub", icon: Github, placeholder: "https://github.com/…" },
  website: { label: "Website", icon: Globe, placeholder: "https://…" },
  youtube: { label: "YouTube", icon: Youtube, placeholder: "https://youtube.com/@…" },
};

function readExtras(): ProfileExtras {
  const defaults: ProfileExtras = { headline: "", about: "", socials: [] };
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(EXTRAS_KEY);
    return raw ? { ...defaults, ...(JSON.parse(raw) as ProfileExtras) } : defaults;
  } catch {
    return defaults;
  }
}

function writeExtras(extras: ProfileExtras): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(EXTRAS_KEY, JSON.stringify(extras));
  } catch {
    /* localStorage kann fehlen */
  }
}

function ProfilePage() {
  const { user, isDemo } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [profile, setProfile] = useState<any>(null);
  const [extras, setExtras] = useState<ProfileExtras>(() => readExtras());
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (isDemo) {
      setProfile({ display_name: "Demo Founder", role: "product" });
      return;
    }
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data ?? { display_name: user.email }));
  }, [user, isDemo]);

  useEffect(() => {
    writeExtras(extras);
  }, [extras]);

  if (!profile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-[var(--smoke)]">
        Lade…
      </div>
    );
  }

  const name = profile.display_name || "Ohne Namen";
  const initials = (profile.display_name ?? "?").slice(0, 2).toUpperCase();
  const skills: string[] = profile.skills ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 pt-5 pb-24 sm:px-6 sm:pt-8">
      <div className="flex items-center justify-between gap-2">
        <div className="eyebrow">Profil · {name}</div>
        <div className="flex gap-2">
          <Link
            to="/onboarding"
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-[var(--ruled)] bg-[var(--surface)] px-3 text-[12.5px] font-semibold text-[var(--smoke)] hover:bg-[var(--surface-soft)] hover:text-[var(--ink)]"
          >
            Onboarding
          </Link>
          <button
            onClick={() => setEditing((v) => !v)}
            className={[
              "inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-[12.5px] font-semibold transition",
              editing
                ? "border-[var(--ember)] bg-[var(--ember-tint)] text-[var(--ember-deep)]"
                : "border-[var(--ruled)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-soft)]",
            ].join(" ")}
          >
            <Pencil className="h-3.5 w-3.5" />
            {editing ? "Fertig" : "Bearbeiten"}
          </button>
        </div>
      </div>

      {/* HERO — Cover + Avatar + Headline */}
      <section className="mt-4 overflow-hidden rounded-[22px] border border-[var(--ruled)] bg-[var(--surface)] shadow-[0_1px_2px_rgba(23,21,15,0.04),0_10px_26px_-18px_rgba(23,21,15,0.18)]">
        <div
          className="relative h-36 sm:h-44"
          style={{
            background: extras.bannerUrl
              ? `url(${extras.bannerUrl}) center/cover`
              : "var(--ember-grad)",
          }}
        >
          {editing && (
            <div className="absolute right-3 top-3">
              <BannerEditor
                value={extras.bannerUrl || ""}
                onChange={(v) => setExtras((e) => ({ ...e, bannerUrl: v || undefined }))}
              />
            </div>
          )}
        </div>

        <div className="px-5 pb-5 sm:px-7">
          <div className="-mt-12 flex flex-wrap items-end justify-between gap-4">
            <Avatar className="h-[100px] w-[100px] border-4 border-[var(--surface)] bg-[var(--surface)] ring-2 ring-[var(--ember)]/20">
              {profile.photo_url && <AvatarImage src={profile.photo_url} />}
              <AvatarFallback className="bg-[var(--ember-tint)] text-2xl font-semibold text-[var(--ember-deep)]">
                {initials}
              </AvatarFallback>
            </Avatar>
            <Link
              to="/firma"
              className="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--ember)] px-4 text-[13px] font-semibold text-white shadow-[var(--ember-glow)] hover:bg-[var(--ember-deep)]"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Firmenprofil öffnen
            </Link>
          </div>

          <div className="mt-4">
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
              {name}
            </h1>
            {editing ? (
              <input
                value={extras.headline}
                onChange={(e) => setExtras((cur) => ({ ...cur, headline: e.target.value }))}
                placeholder="Deine Headline — z.B. Product Founder · ML Background · sucht Tech Co-Founder"
                className="mt-2 w-full max-w-2xl rounded-lg border border-[var(--ruled)] bg-[var(--surface)] px-3 py-2 text-[15px] text-[var(--ink)] outline-none focus:border-[var(--ember)]"
              />
            ) : (
              <p className="mt-1.5 max-w-2xl text-[16px] leading-snug text-[var(--ink-soft)]">
                {extras.headline ||
                  (profile.role ? `Sucht · ${roleLabel[profile.role]}` : "Founder")}
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-[var(--smoke)]">
              {profile.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> {profile.location}
                </span>
              )}
              {profile.industry && <span>{profile.industry}</span>}
              {profile.stage && <span>{stageLabel[profile.stage]}</span>}
              {profile.commitment && <span>{commitLabel[profile.commitment]}</span>}
            </div>
          </div>
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {/* ABOUT */}
          <Section title="Über mich">
            {editing ? (
              <textarea
                value={extras.about}
                onChange={(e) => setExtras((cur) => ({ ...cur, about: e.target.value }))}
                rows={5}
                placeholder={
                  profile.vision ||
                  "In drei bis fünf Sätzen: was du baust, was dich antreibt, was du suchst."
                }
                className="w-full resize-y rounded-xl border border-[var(--ruled)] bg-[var(--surface)] px-3 py-2.5 text-[14px] leading-relaxed text-[var(--ink)] outline-none focus:border-[var(--ember)]"
              />
            ) : (
              <p className="whitespace-pre-line text-[14.5px] leading-relaxed text-[var(--ink)]">
                {extras.about ||
                  profile.vision ||
                  "Erzähl in drei Sätzen, was du baust und wen du suchst — der Co-Pilot zieht aus dem Plan, du verfeinerst."}
              </p>
            )}
          </Section>

          {/* SKILLS */}
          {skills.length > 0 && (
            <Section title="Skills">
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full border border-[var(--ruled)] bg-[var(--surface-soft)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--ink)]"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* LOOKING FOR */}
          {profile.looking_for && (
            <Section title="Was ich suche">
              <p className="text-[14.5px] leading-relaxed text-[var(--ink)]">
                {profile.looking_for}
              </p>
            </Section>
          )}

          {/* AKTIVITÄT (placeholder) */}
          <Section title="Aktivität">
            <div className="rounded-xl border border-dashed border-[var(--ruled)] bg-[var(--surface-soft)] p-5 text-[13px] text-[var(--smoke)]">
              Hier landen deine Plan-Fortschritte, Förderanträge und Match-Highlights. Bald
              automatisch aus deiner Plattform-Aktivität.
            </div>
          </Section>
        </div>

        {/* SIDE COLUMN — Socials + Settings */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Section title="Social Links" compact>
            <SocialEditor
              editing={editing}
              socials={extras.socials}
              onChange={(socials) => setExtras((cur) => ({ ...cur, socials }))}
            />
          </Section>

          {user && (
            <Section title="Konten & Automationen" compact>
              <ConnectedAccounts userId={user.id} />
            </Section>
          )}

          {user && <DigestPreference userId={user.id} />}

          <Section title="Onboarding-Status" compact>
            <div className="text-[13px] text-[var(--smoke)]">
              {profile.onboarded_at ? (
                <span className="text-[var(--ink)]">Onboarding abgeschlossen.</span>
              ) : (
                <>
                  Schließe das Onboarding ab, damit Matching und Co-Pilot präziser werden.
                  <Link
                    to="/onboarding"
                    className="ml-1 font-semibold text-[var(--ember-deep)] hover:underline"
                  >
                    Jetzt fortsetzen →
                  </Link>
                </>
              )}
            </div>
          </Section>
        </aside>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  compact,
}: {
  title: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <section
      className={[
        "rounded-[18px] border border-[var(--ruled)] bg-[var(--surface)]",
        compact ? "p-4" : "p-5 sm:p-6",
      ].join(" ")}
    >
      <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--smoke)]">
        {title}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function BannerEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white/85 px-3 text-[11.5px] font-semibold text-[var(--ink)] backdrop-blur hover:bg-white"
      >
        <Pencil className="h-3 w-3" /> Cover bearbeiten
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-lg bg-white p-1.5 shadow-md">
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Bild-URL (leer = Ember-Verlauf)"
        className="h-7 w-60 rounded-md border border-[var(--ruled)] px-2 text-[12px] outline-none focus:border-[var(--ember)]"
      />
      <button
        onClick={() => {
          onChange(draft.trim());
          setOpen(false);
        }}
        className="h-7 rounded-md bg-[var(--ember)] px-2.5 text-[11.5px] font-semibold text-white hover:bg-[var(--ember-deep)]"
      >
        Übernehmen
      </button>
      <button
        onClick={() => setOpen(false)}
        className="h-7 rounded-md px-2.5 text-[11.5px] font-semibold text-[var(--smoke)] hover:text-[var(--ink)]"
      >
        Abbrechen
      </button>
    </div>
  );
}

function SocialEditor({
  editing,
  socials,
  onChange,
}: {
  editing: boolean;
  socials: SocialLink[];
  onChange: (socials: SocialLink[]) => void;
}) {
  function add(kind: SocialKind) {
    onChange([
      ...socials,
      { id: Math.random().toString(36).slice(2, 10) + Date.now().toString(36), kind, url: "" },
    ]);
  }

  if (!editing) {
    const valid = socials.filter((s) => s.url.trim());
    if (valid.length === 0) {
      return (
        <div className="text-[12.5px] text-[var(--smoke)]">
          Noch keine Links — klick „Bearbeiten" oben, um LinkedIn, X, GitHub & Co. zu ergänzen.
        </div>
      );
    }
    return (
      <div className="space-y-2">
        {valid.map((social) => {
          const Meta = SOCIAL_META[social.kind];
          const Icon = Meta.icon;
          return (
            <a
              key={social.id}
              href={social.url}
              target="_blank"
              rel="noopener"
              className="flex items-center justify-between gap-2 rounded-lg border border-[var(--ruled)] bg-[var(--surface-soft)] px-3 py-2 text-[13px] font-medium text-[var(--ink)] hover:bg-[var(--ember-tint)] hover:text-[var(--ember-deep)]"
            >
              <span className="inline-flex items-center gap-2 truncate">
                <Icon className="h-4 w-4 shrink-0 text-[var(--ember-deep)]" />
                {Meta.label}
              </span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[var(--smoke)]" />
            </a>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {socials.map((social) => {
        const Meta = SOCIAL_META[social.kind];
        const Icon = Meta.icon;
        return (
          <div
            key={social.id}
            className="flex items-center gap-2 rounded-lg border border-[var(--ruled)] bg-[var(--surface-soft)] p-2"
          >
            <Icon className="h-4 w-4 shrink-0 text-[var(--ember-deep)]" />
            <select
              value={social.kind}
              onChange={(e) =>
                onChange(
                  socials.map((s) =>
                    s.id === social.id ? { ...s, kind: e.target.value as SocialKind } : s,
                  ),
                )
              }
              className="h-7 rounded-md border border-[var(--ruled)] bg-[var(--surface)] px-1.5 text-[11.5px] outline-none"
            >
              {(Object.keys(SOCIAL_META) as SocialKind[]).map((k) => (
                <option key={k} value={k}>
                  {SOCIAL_META[k].label}
                </option>
              ))}
            </select>
            <input
              value={social.url}
              onChange={(e) =>
                onChange(
                  socials.map((s) => (s.id === social.id ? { ...s, url: e.target.value } : s)),
                )
              }
              placeholder={Meta.placeholder}
              className="h-7 min-w-0 flex-1 rounded-md border border-[var(--ruled)] bg-[var(--surface)] px-2 text-[12px] outline-none focus:border-[var(--ember)]"
            />
            <button
              onClick={() => onChange(socials.filter((s) => s.id !== social.id))}
              className="rounded-md p-1 text-[var(--faint)] hover:bg-red-50 hover:text-red-600"
              aria-label="Link entfernen"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(SOCIAL_META) as SocialKind[]).map((kind) => {
          const Meta = SOCIAL_META[kind];
          const Icon = Meta.icon;
          return (
            <button
              key={kind}
              onClick={() => add(kind)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--ruled)] bg-[var(--surface)] px-2.5 py-1 text-[11.5px] font-semibold text-[var(--smoke)] hover:bg-[var(--ember-tint)] hover:text-[var(--ember-deep)]"
            >
              <Icon className="h-3 w-3" />
              <Plus className="h-3 w-3" />
              {Meta.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DigestPreference({ userId }: { userId: string }) {
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("notification_prefs")
      .select("daily_digest")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setEnabled(data.daily_digest);
      });
  }, [userId]);

  async function toggle() {
    const next = !enabled;
    setEnabled(next);
    setSaving(true);
    const { error } = await supabase
      .from("notification_prefs")
      .upsert({ user_id: userId, daily_digest: next }, { onConflict: "user_id" });
    if (error) {
      setEnabled(!next);
      toast.error("Speichern fehlgeschlagen");
    }
    setSaving(false);
  }

  return (
    <Section title="Benachrichtigungen" compact>
      <button
        onClick={toggle}
        disabled={saving}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="min-w-0">
          <span className="block text-[13.5px] font-semibold text-[var(--ink)]">
            Tägliche E-Mail-Zusammenfassung
          </span>
          <span className="mt-0.5 block text-[11.5px] leading-relaxed text-[var(--smoke)]">
            Morgens dein Fokus, Deadlines und offene Tasks.
          </span>
        </span>
        <span
          className="relative h-6 w-11 shrink-0 rounded-full transition-colors"
          style={{ background: enabled ? "var(--ember)" : "rgba(23,21,15,0.18)" }}
        >
          <span
            className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all"
            style={{ left: enabled ? "1.375rem" : "0.125rem" }}
          />
        </span>
      </button>
    </Section>
  );
}
