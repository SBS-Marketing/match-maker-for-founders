import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AuthGate } from "@/components/AuthGate";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Link as LinkIcon, BookOpen, Send, Zap, ArrowRight } from "lucide-react";

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

function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => setProfile(data));
  }, [user]);

  if (!profile)
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-[var(--smoke)]">
        Lade…
      </div>
    );

  const skills: string[] = profile.skills ?? [];
  const wordCount = (profile.vision ?? "").trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">
      {/* Breadcrumb */}
      <div className="eyebrow mb-5 flex items-center gap-2.5 px-2">
        <span>Profil</span>
        <span>/</span>
        <span style={{ color: "var(--ink)" }}>{profile.display_name ?? "Du"}</span>
        <span className="flex-1" />
        <Link to="/onboarding">
          <span className="cursor-pointer hover:text-[var(--ink)]">Bearbeiten</span>
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        {/* Left column */}
        <div className="flex flex-col gap-4">
          {/* Hero card */}
          <div className="glass-pane flex items-center gap-6 p-7">
            <Avatar className="h-[104px] w-[104px] ring-2 ring-[var(--ember)]/30">
              {profile.photo_url && <AvatarImage src={profile.photo_url} />}
              <AvatarFallback className="bg-[var(--ember)] text-2xl text-[var(--cream)]">
                {(profile.display_name ?? "?").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="eyebrow" style={{ fontSize: 10 }}>
                Sucht · {profile.role ? roleLabel[profile.role] : "Co-Founder"}
              </div>
              <h1 className="mt-1 text-4xl font-semibold leading-[1.05] tracking-tight md:text-[44px]">
                {profile.display_name ?? "Ohne Namen"}
              </h1>
              <div className="mt-2.5 flex flex-wrap gap-3.5 text-[13px] text-[var(--smoke)]">
                {profile.location && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {profile.location}
                  </span>
                )}
                {profile.industry && (
                  <span className="inline-flex items-center gap-1.5">
                    <LinkIcon className="h-3.5 w-3.5" />
                    {profile.industry}
                  </span>
                )}
                {skills.length > 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5" />
                    {skills.length} Skills
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="eyebrow" style={{ fontSize: 10 }}>Fit</div>
              <div
                className="font-semibold leading-[0.9] tracking-tight"
                style={{ fontSize: 56, color: "var(--ember)" }}
              >
                100
              </div>
              <div className="mt-1 text-[11px] text-[var(--smoke)]">dein eigenes Profil</div>
            </div>
          </div>

          {/* Story */}
          {profile.vision && (
            <div className="glass-pane p-7">
              <div className="mb-3 flex items-center justify-between">
                <span className="eyebrow" style={{ fontSize: 10 }}>In deinen Worten</span>
                <span className="font-mono text-[11px] text-[var(--smoke)]">
                  {wordCount} Wörter · {Math.max(1, Math.round(wordCount / 130))} min
                </span>
              </div>
              <p className="font-serif text-[22px] italic leading-[1.35] text-[var(--ink)]">
                „{profile.vision}"
              </p>
              <div
                className="mt-5 grid grid-cols-1 gap-5 border-t pt-5 sm:grid-cols-3"
                style={{ borderColor: "rgba(21,20,15,0.07)" }}
              >
                <StoryStat label="Stage" value={profile.stage ? stageLabel[profile.stage] : "—"} />
                <StoryStat
                  label="Commitment"
                  value={profile.commitment ? commitLabel[profile.commitment] : "—"}
                />
                <StoryStat label="Sucht" value={profile.role ? roleLabel[profile.role] : "—"} />
              </div>
            </div>
          )}

          {/* Why this match (ink) */}
          <div className="glass-pane-ink p-6">
            <div className="mb-3.5 flex items-center gap-2.5">
              <span
                className="eyebrow"
                style={{ color: "rgba(255,255,255,0.55)", fontSize: 11 }}
              >
                So zeigen wir dich anderen
              </span>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              {[
                {
                  n: "01",
                  t: "Klarer Suchgrund",
                  d: profile.looking_for
                    ? "Andere sehen genau wen du suchst — keine Rätsel."
                    : "Beschreibe wen du suchst, um gefunden zu werden.",
                },
                {
                  n: "02",
                  t: "Ehrliche Stage",
                  d: "Wir matchen Founder die ungefähr gleich weit sind.",
                },
                {
                  n: "03",
                  t: "Echtes Commitment",
                  d: "Vollzeit wird mit Vollzeit gematcht — keine Tire-Kicker.",
                },
              ].map((x) => (
                <div key={x.n}>
                  <div
                    className="font-mono uppercase tracking-[0.16em]"
                    style={{ fontSize: 10, color: "rgba(255,255,255,0.45)" }}
                  >
                    {x.n}
                  </div>
                  <div
                    className="mt-1.5 font-semibold"
                    style={{ fontSize: 15, color: "var(--cream)" }}
                  >
                    {x.t}
                  </div>
                  <div
                    className="mt-1.5 leading-[1.55]"
                    style={{ fontSize: 12.5, color: "rgba(255,255,255,0.72)" }}
                  >
                    {x.d}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Looking for */}
          {profile.looking_for && (
            <div className="glass-pane p-7">
              <div className="eyebrow mb-3" style={{ fontSize: 10 }}>
                Suchst
              </div>
              <p className="text-[15px] leading-relaxed text-[var(--ink)]">
                {profile.looking_for}
              </p>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-3.5">
          <div className="glass-pane p-6">
            <Link to="/discover">
              <Button className="shadow-ember h-12 w-full gap-2.5 rounded-xl bg-[var(--ember)] text-[var(--cream)] hover:bg-[var(--ember-deep)]">
                Founder entdecken
                <Send className="h-4 w-4" />
              </Button>
            </Link>
            <div className="mt-2 flex gap-2">
              <Link to="/matches" className="flex-1">
                <button
                  className="w-full rounded-[10px] border px-3 py-2.5 text-sm font-medium"
                  style={{
                    background: "rgba(255,255,255,0.5)",
                    borderColor: "rgba(21,20,15,0.1)",
                    color: "var(--ink)",
                  }}
                >
                  Matches
                </button>
              </Link>
              <Link to="/onboarding" className="flex-1">
                <button
                  className="w-full rounded-[10px] border px-3 py-2.5 text-sm font-medium"
                  style={{
                    background: "rgba(255,255,255,0.5)",
                    borderColor: "rgba(21,20,15,0.1)",
                    color: "var(--smoke)",
                  }}
                >
                  Bearbeiten
                </button>
              </Link>
            </div>
            {!profile.onboarded_at && (
              <div
                className="mt-3.5 flex items-start gap-2 rounded-[10px] p-3"
                style={{
                  background: "rgba(226,81,28,0.07)",
                  border: "1px solid rgba(226,81,28,0.18)",
                  color: "var(--ember-deep)",
                }}
              >
                <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="text-[12px] leading-[1.5]">
                  Dein Profil ist noch nicht veröffentlicht.{" "}
                  <Link to="/onboarding" className="underline">
                    Jetzt fertigstellen
                  </Link>
                  .
                </span>
              </div>
            )}
          </div>

          {/* Skills */}
          {skills.length > 0 && (
            <div className="glass-pane p-6">
              <div className="eyebrow mb-3.5" style={{ fontSize: 10 }}>
                Was du mitbringst
              </div>
              <div className="flex flex-wrap gap-2">
                {skills.map((s) => (
                  <span
                    key={s}
                    className="glass-pill px-3 py-1.5 text-[12.5px] font-medium text-[var(--ink)]"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tags pane */}
          <div className="glass-pane p-6">
            <div className="eyebrow mb-3" style={{ fontSize: 10 }}>
              Profil-Tags
            </div>
            <div className="flex flex-col gap-2 text-[13px]">
              {profile.role && <TagRow label="Rolle" value={roleLabel[profile.role]} />}
              {profile.stage && <TagRow label="Stage" value={stageLabel[profile.stage]} />}
              {profile.commitment && (
                <TagRow label="Commitment" value={commitLabel[profile.commitment]} />
              )}
              {profile.industry && <TagRow label="Branche" value={profile.industry} />}
              {profile.location && <TagRow label="Standort" value={profile.location} />}
            </div>
          </div>

          <Link to="/discover">
            <div
              className="glass-pane flex items-center gap-3 p-5 text-[13px]"
              style={{ color: "var(--ink)" }}
            >
              <ArrowRight className="h-4 w-4" />
              Bereit? Geh aufs Discover-Deck.
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

function StoryStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="eyebrow mb-1.5" style={{ fontSize: 10 }}>
        {label}
      </div>
      <div className="text-[14px] font-medium tracking-[-0.005em] text-[var(--ink)]">{value}</div>
    </div>
  );
}

function TagRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="w-24 shrink-0 text-[var(--smoke)]">{label}</span>
      <span className="font-medium text-[var(--ink)]">{value}</span>
    </div>
  );
}
