import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type PageIntro = {
  kicker: string;
  title: string;
  body: string;
  bullets: string[];
};

const INTRO_VERSION = "v1";

const PAGE_INTROS: Array<{ match: (path: string) => boolean; intro: PageIntro }> = [
  {
    match: (path) => path.startsWith("/heute"),
    intro: {
      kicker: "Daily Hub",
      title: "Dein Startpunkt für heute.",
      body: "Hier siehst du nur, was gerade wichtig ist: Fokus, Co-Pilot, nächste Bereiche.",
      bullets: ["Erledige den ersten Fokus", "Frag den Co-Pilot", "Spring in den passenden Workspace"],
    },
  },
  {
    match: (path) => path.startsWith("/matches"),
    intro: {
      kicker: "Chats",
      title: "Gespräche zuerst.",
      body: "Matches sind hier als Inbox gedacht. Kontext wie Förderungen und Angebote hängt darunter.",
      bullets: ["Neue Nachrichten prüfen", "Thread öffnen", "Kontext an Antwort hängen"],
    },
  },
  {
    match: (path) => path.startsWith("/kalender"),
    intro: {
      kicker: "Kalender",
      title: "Monatsblick für Termine und Deadlines.",
      body: "Plane Calls, Antragsfristen und Teamtermine ohne die Daily Page zu überladen.",
      bullets: ["Tag antippen", "Termin ergänzen", "Tagesplan prüfen"],
    },
  },
  {
    match: (path) => path.startsWith("/co-pilot"),
    intro: {
      kicker: "Co-Pilot",
      title: "Arbeite mit Kontext, nicht mit leeren Prompts.",
      body: "Der Co-Pilot nutzt Onboarding, Anträge und Workspaces als Grundlage für konkrete nächste Schritte.",
      bullets: ["Frage stellen", "Plan entwerfen", "Materialien vorbereiten"],
    },
  },
  {
    match: (path) => path.startsWith("/discover") || path.startsWith("/entdecken"),
    intro: {
      kicker: "Swipe",
      title: "Neue Profile schnell vorsortieren.",
      body: "Hier geht es um erste Signale: merken, ablehnen oder Match anstoßen.",
      bullets: ["Profil scannen", "Fit prüfen", "Like oder speichern"],
    },
  },
  {
    match: (path) => path.startsWith("/marketplace"),
    intro: {
      kicker: "Marketplace",
      title: "Partner, Angebote und Programme nach Bedarf.",
      body: "Nutze Kategorien, wenn du gezielt etwas suchst, oder lass den Co-Pilot vorsortieren.",
      bullets: ["Kategorie wählen", "Fit-Score prüfen", "Partnerprofil öffnen"],
    },
  },
  {
    match: (path) => path.startsWith("/firma"),
    intro: {
      kicker: "Firmenprofil",
      title: "Deine kleine öffentliche Startup-Seite.",
      body: "Bearbeiten links, Preview rechts. Später wird daraus ein teilbares Profil.",
      bullets: ["Story ausfüllen", "Proof ergänzen", "Preview prüfen"],
    },
  },
  {
    match: (path) => path.startsWith("/team"),
    intro: {
      kicker: "Team",
      title: "Teamstatus, Invite und Zusammenarbeit.",
      body: "Hier liegen Mitglieder, Workstreams, Blackboard und Chat für die operative Abstimmung.",
      bullets: ["Invite-Link teilen", "Owner setzen", "Blackboard aktuell halten"],
    },
  },
  {
    match: (path) => path.startsWith("/kanban"),
    intro: {
      kicker: "Kanban",
      title: "Alles, was in Bewegung ist.",
      body: "Das Board ist für größere Arbeitspakete: Antrag, Produkt, Partner und Team.",
      bullets: ["Karte anlegen", "Owner wählen", "Status weiterschieben"],
    },
  },
  {
    match: (path) => path.startsWith("/aufgaben"),
    intro: {
      kicker: "Aufgaben",
      title: "Kleine To-dos raus aus Heute.",
      body: "Hier sammelst du operative Aufgaben, damit der Daily Hub schlank bleibt.",
      bullets: ["Aufgabe abhaken", "Später parken", "Bereich öffnen"],
    },
  },
  {
    match: (path) => path.startsWith("/unterlagen"),
    intro: {
      kicker: "Unterlagen",
      title: "Antragspaket und offene Materialien.",
      body: "Checkliste, Status und Co-Pilot-Entwürfe bündeln alles, was für Anträge fehlt.",
      bullets: ["Fehlendes abhaken", "Entwurf erzeugen", "Antrag öffnen"],
    },
  },
  {
    match: (path) => path.startsWith("/foerderung"),
    intro: {
      kicker: "Förderung",
      title: "Programme und Anträge im Arbeitsmodus.",
      body: "Nicht nur lesen: Fit prüfen, offene Punkte beantworten, Materialien vorbereiten.",
      bullets: ["Fit-Score ansehen", "Offene Fragen klären", "Co-Pilot helfen lassen"],
    },
  },
  {
    match: (path) =>
      ["/recht", "/steuer", "/kapital", "/mentoren", "/talent", "/growth", "/co-founder"].some(
        (prefix) => path.startsWith(prefix),
      ),
    intro: {
      kicker: "Partner",
      title: "Kuratierte Hilfe statt langer Listen.",
      body: "Jede Detailseite zeigt dir Fit, Pakete, Verfügbarkeit und den nächsten Kontaktpunkt.",
      bullets: ["Fit verstehen", "Paket wählen", "Kontakt vorbereiten"],
    },
  },
  {
    match: (path) => path.startsWith("/profile"),
    intro: {
      kicker: "Profil",
      title: "Dein persönliches Founder-Profil.",
      body: "Dieses Profil verbessert Matching, Co-Pilot-Kontext und spätere Sichtbarkeit.",
      bullets: ["Headline pflegen", "Links ergänzen", "Onboardingstatus prüfen"],
    },
  },
  {
    match: (path) => path.startsWith("/plan"),
    intro: {
      kicker: "Plan",
      title: "Aus Onboarding wird ein Arbeitsplan.",
      body: "Der Plan übersetzt deine Antworten in konkrete Schritte und nächste Entscheidungen.",
      bullets: ["Slides prüfen", "Risiken sehen", "Nächsten Schritt übernehmen"],
    },
  },
];

const FALLBACK_INTRO: PageIntro = {
  kicker: "Workspace",
  title: "Diese Seite ist ein Arbeitsbereich.",
  body: "Du bekommst beim ersten Besuch kurz Orientierung. Danach bleibt die Oberfläche ruhiger.",
  bullets: ["Wichtiges zuerst", "Aktion wählen", "Bei Bedarf Co-Pilot fragen"],
};

function introFor(pathname: string): PageIntro {
  return PAGE_INTROS.find((item) => item.match(pathname))?.intro ?? FALLBACK_INTRO;
}

function keyFor(pathname: string): string {
  const section =
    pathname
      .split("/")
      .filter(Boolean)
      .slice(0, 2)
      .join(":") || "home";
  return `mf_page_intro_${INTRO_VERSION}_${section}`;
}

export function PageOnboarding({ pathname }: { pathname: string }) {
  const intro = useMemo(() => introFor(pathname), [pathname]);
  const storageKey = useMemo(() => keyFor(pathname), [pathname]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    if (typeof window === "undefined") return;
    try {
      if (localStorage.getItem(storageKey) === "1") return;
    } catch {
      return;
    }
    const timer = window.setTimeout(() => setVisible(true), 520);
    return () => window.clearTimeout(timer);
  }, [storageKey]);

  function close() {
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      /* localStorage can be unavailable. */
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-[rgba(23,21,15,0.34)] px-3 pb-[88px] pt-20 backdrop-blur-[2px] sm:items-center sm:pb-6">
      <section className="w-full max-w-[420px] overflow-hidden rounded-[22px] border border-[var(--ruled)] bg-[var(--surface)] shadow-warm-lg">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--ruled-soft)] px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--ember-tint)] text-[var(--ember-deep)]">
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="eyebrow">{intro.kicker}</div>
              <h2 className="mt-1 text-[20px] font-semibold leading-tight tracking-tight">
                {intro.title}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--smoke)] hover:bg-[var(--surface-soft)] hover:text-[var(--ink)]"
            aria-label="Onboarding schließen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="text-[14px] leading-relaxed text-[var(--smoke)]">{intro.body}</p>
          <div className="mt-4 grid gap-2">
            {intro.bullets.map((bullet) => (
              <div
                key={bullet}
                className="flex items-center gap-2 rounded-xl bg-[var(--surface-soft)] px-3 py-2 text-[13px] font-semibold text-[var(--ink-soft)]"
              >
                <Check className="h-3.5 w-3.5 shrink-0 text-[var(--ember)]" />
                <span>{bullet}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-5 pb-5">
          <button
            type="button"
            onClick={close}
            className="text-[12.5px] font-semibold text-[var(--smoke)] hover:text-[var(--ink)]"
          >
            Später
          </button>
          <Button
            onClick={close}
            className="h-10 gap-2 rounded-xl bg-[var(--ember)] px-4 text-white hover:bg-[var(--ember-deep)]"
          >
            Verstanden <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>
    </div>
  );
}
