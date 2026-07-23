// ─────────────────────────────────────────────────────────────
// /events — Community-Events als Karte oder Liste. Karte = self-
// contained DACH-SVG mit Ember-Pins pro Stadt (kein Tile-Provider).
// Quelle: community_events (published). Anmeldung wie in der iOS-App.
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CalendarDays, Check, List, MapPin, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { EventsMapCanvas } from "@/components/EventsMapCanvas";
import { type CommunityEvent, clusterByCity, eventDateLabel } from "@/lib/events-geo";

export const Route = createFileRoute("/events")({
  head: () => ({ meta: [{ title: "Community-Events — matchfoundr" }] }),
  component: EventsPage,
});

// Farbtokens aus dem Warm-Signal-System (für die Karte).
const MAP_COLORS = {
  surface: "#FFFFFF",
  surfaceSoft: "#F7F3EC",
  ink: "#17150F",
  smoke: "#6E665C",
  faint: "#9A9286",
  ember: "#E2511C",
  emberDeep: "#B23B0E",
  border: "rgba(23,21,15,0.10)",
};

const PREVIEW_EVENTS = [
  {
    id: "demo-koeln",
    title: "Gründerstammtisch Köln",
    kind: "Stammtisch",
    city: "Köln",
    venue: "Startplatz, Im Mediapark 5",
    date_label: "Do, 24. Juli",
    time_label: "19:00",
    spots: 30,
    taken: 18,
    host: "matchfoundr Team",
    blurb: "Lockerer Austausch für kleine Gründer — Padelhalle bis Webdesign-Agentur.",
    banner_image_url: null,
    starts_at: "2026-07-24T19:00:00Z",
  },
  {
    id: "demo-berlin",
    title: "Förder-Workshop Berlin",
    kind: "Workshop",
    city: "Berlin",
    date_label: "Di, 5. August",
    time_label: "17:30",
    spots: 50,
    taken: 12,
    host: "IHK Berlin",
    blurb: "Gründungszuschuss Schritt für Schritt — mit echten Beispielen.",
    banner_image_url: null,
    starts_at: "2026-08-05T17:30:00Z",
  },
  {
    id: "demo-muc",
    title: "Handwerk & KI Meetup",
    kind: "Meetup",
    city: "München",
    date_label: "Mi, 13. August",
    time_label: "18:00",
    spots: 40,
    taken: 9,
    host: "HWK München",
    blurb: "Wie kleine Betriebe KI im Alltag nutzen — Praxis statt Buzzwords.",
    banner_image_url: null,
    starts_at: "2026-08-13T18:00:00Z",
  },
] as unknown as CommunityEvent[];

function EventsPage() {
  const { user, session, isDemo } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<CommunityEvent[] | null>(null);
  const [view, setView] = useState<"map" | "list">("map");
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [registered, setRegistered] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    // cancelled-Flag: verhindert, dass eine spät resolvende Echt-Query die
    // Demo-Events überschreibt, wenn der Auth-Status verzögert auf Demo kippt.
    let cancelled = false;
    if (isDemo) {
      setEvents(PREVIEW_EVENTS);
      return;
    }
    supabase
      .from("community_events")
      .select(
        "id,title,kind,service_id,starts_at,date_label,time_label,city,venue,spots,taken,host,blurb,agenda,banner_image_url,is_published",
      )
      .eq("is_published", true)
      .order("starts_at", { ascending: true, nullsFirst: false })
      .then(({ data }) => {
        if (!cancelled) setEvents((data as CommunityEvent[]) ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [isDemo]);

  useEffect(() => {
    if (!user || isDemo) return;
    supabase
      .from("community_event_registrations")
      .select("event_id")
      .eq("user_id", user.id)
      .then(({ data }) => setRegistered(new Set((data ?? []).map((r) => r.event_id))));
  }, [user, isDemo]);

  const { clusters } = useMemo(() => clusterByCity(events ?? []), [events]);

  const visibleEvents = useMemo(() => {
    if (!events) return [];
    if (view === "map" && selectedCity) {
      const cluster = clusters.find((c) => c.city === selectedCity);
      return cluster?.events ?? [];
    }
    return events;
  }, [events, view, selectedCity, clusters]);

  async function register(ev: CommunityEvent) {
    if (!user || !session || isDemo) {
      toast.info("Melde dich an, um dich für Events einzutragen.");
      navigate({ to: "/auth" });
      return;
    }
    setBusy(ev.id);
    const { error } = await supabase.from("community_event_registrations").insert({
      event_id: ev.id,
      user_id: user.id,
      name: user.user_metadata?.name ?? null,
      email: user.email ?? null,
    });
    setBusy(null);
    if (error && !error.message.includes("duplicate")) {
      toast.error(`Anmeldung fehlgeschlagen: ${error.message}`);
      return;
    }
    setRegistered((s) => new Set([...s, ev.id]));
    toast.success(`Angemeldet für „${ev.title}“.`);
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      {/* Kopf */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ember)]">
            Community-Events
          </div>
          <h1 className="mt-1 text-[26px] font-bold tracking-tight text-[var(--ink)]">
            Triff Gründer in deiner Nähe
          </h1>
          <p className="mt-1 max-w-lg text-[13.5px] text-[var(--smoke)]">
            Stammtische, Workshops und Meetups in ganz DACH — für kleine Gründer, nicht für
            IPO-Startups. Auf der Karte oder als Liste.
          </p>
        </div>
        <div className="flex overflow-hidden rounded-xl border border-[var(--ruled)]">
          <button
            onClick={() => setView("map")}
            className={
              view === "map"
                ? "flex items-center gap-1.5 bg-[var(--ink)] px-3.5 py-2 text-[13px] font-semibold text-white"
                : "flex items-center gap-1.5 bg-[var(--surface)] px-3.5 py-2 text-[13px] font-semibold text-[var(--smoke)]"
            }
          >
            <MapPin className="h-4 w-4" /> Karte
          </button>
          <button
            onClick={() => setView("list")}
            className={
              view === "list"
                ? "flex items-center gap-1.5 bg-[var(--ink)] px-3.5 py-2 text-[13px] font-semibold text-white"
                : "flex items-center gap-1.5 bg-[var(--surface)] px-3.5 py-2 text-[13px] font-semibold text-[var(--smoke)]"
            }
          >
            <List className="h-4 w-4" /> Liste
          </button>
        </div>
      </div>

      {view === "map" && (
        <div className="mt-5 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <EventsMapCanvas
            clusters={clusters}
            colors={MAP_COLORS}
            selectedCity={selectedCity}
            onSelectCity={setSelectedCity}
            height={460}
          />
          <div className="min-h-0">
            <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-[var(--faint)]">
              {selectedCity ? `${selectedCity} · ${visibleEvents.length} Events` : "Alle Events"}
              {selectedCity && (
                <button
                  onClick={() => setSelectedCity(null)}
                  className="ml-2 font-semibold text-[var(--ember)]"
                >
                  Alle zeigen
                </button>
              )}
            </p>
            <div className="max-h-[420px] space-y-2.5 overflow-y-auto pr-1">
              {(events === null ? [] : visibleEvents).map((ev) => (
                <EventCard
                  key={ev.id}
                  ev={ev}
                  compact
                  registered={registered.has(ev.id)}
                  busy={busy === ev.id}
                  onRegister={() => register(ev)}
                />
              ))}
              {events !== null && visibleEvents.length === 0 && (
                <p className="py-6 text-center text-[13px] text-[var(--smoke)]">
                  Keine Events hier — wähl eine andere Stadt.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {view === "list" && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {(events ?? []).map((ev) => (
            <EventCard
              key={ev.id}
              ev={ev}
              registered={registered.has(ev.id)}
              busy={busy === ev.id}
              onRegister={() => register(ev)}
            />
          ))}
          {events !== null && events.length === 0 && (
            <p className="col-span-full py-10 text-center text-[13px] text-[var(--smoke)]">
              Noch keine veröffentlichten Events.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function EventCard({
  ev,
  compact,
  registered,
  busy,
  onRegister,
}: {
  ev: CommunityEvent;
  compact?: boolean;
  registered: boolean;
  busy: boolean;
  onRegister: () => void;
}) {
  const spotsLeft = Math.max(0, (ev.spots ?? 0) - (ev.taken ?? 0));
  return (
    <div className="overflow-hidden rounded-[16px] border border-[var(--ruled)] bg-[var(--surface)] shadow-warm">
      {!compact && ev.banner_image_url && (
        <img src={ev.banner_image_url} alt="" className="h-28 w-full object-cover" loading="lazy" />
      )}
      <div className="p-3.5">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[var(--ember-tint)] px-2 py-0.5 text-[10.5px] font-bold text-[var(--ember-deep)]">
            {ev.kind}
          </span>
          <span className="flex items-center gap-1 text-[11.5px] text-[var(--smoke)]">
            <MapPin className="h-3 w-3" /> {ev.city ?? "Online"}
          </span>
        </div>
        <h3 className="mt-1.5 text-[14.5px] font-bold leading-tight text-[var(--ink)]">
          {ev.title}
        </h3>
        {!compact && ev.blurb && (
          <p className="mt-1 line-clamp-2 text-[12.5px] text-[var(--smoke)]">{ev.blurb}</p>
        )}
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-[var(--smoke)]">
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3 w-3" /> {eventDateLabel(ev)}
            {ev.time_label ? ` · ${ev.time_label}` : ""}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />{" "}
            {spotsLeft > 0 ? `${spotsLeft} Plätze frei` : "ausgebucht"}
          </span>
        </div>
        <button
          onClick={onRegister}
          disabled={busy || registered}
          className={
            registered
              ? "mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--ember-tint)] py-2 text-[13px] font-bold text-[var(--ember-deep)]"
              : "mt-3 w-full rounded-xl bg-[var(--ink)] py-2 text-[13px] font-bold text-white disabled:opacity-50"
          }
        >
          {registered ? (
            <>
              <Check className="h-4 w-4" /> Angemeldet
            </>
          ) : busy ? (
            "Melde an…"
          ) : (
            "Anmelden"
          )}
        </button>
      </div>
    </div>
  );
}
