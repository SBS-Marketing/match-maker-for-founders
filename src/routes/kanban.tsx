import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, CheckCircle2, Kanban, Plus, Sparkles } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { Button } from "@/components/ui/button";
import { GRANTS } from "@/data/grants";
import { partnersFor } from "@/data/partners";

export const Route = createFileRoute("/kanban")({
  head: () => ({ meta: [{ title: "Kanban — matchfoundr" }] }),
  component: () => (
    <AuthGate>
      <KanbanPage />
    </AuthGate>
  ),
});

type LaneId = "backlog" | "doing" | "review" | "done";
type Priority = "hoch" | "mittel" | "niedrig";

type KanbanCard = {
  id: string;
  title: string;
  note: string;
  owner: string;
  lane: LaneId;
  priority: Priority;
};

const STORAGE_KEY = "mf_kanban_cards_v1";
const LANES: { id: LaneId; title: string; hint: string }[] = [
  { id: "backlog", title: "Backlog", hint: "Noch nicht gestartet" },
  { id: "doing", title: "In Arbeit", hint: "Aktiver Fokus" },
  { id: "review", title: "Review", hint: "Prüfen, finalisieren" },
  { id: "done", title: "Erledigt", hint: "Abgeschlossen" },
];

function KanbanPage() {
  const defaults = useMemo(() => buildDefaultCards(), []);
  const [cards, setCards] = useState<KanbanCard[]>(() => readCards(defaults));
  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState("Founder");
  const [activeLane, setActiveLane] = useState<LaneId>("doing");
  const doingCount = cards.filter((card) => card.lane === "doing").length;
  const doneCount = cards.filter((card) => card.lane === "done").length;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  }, [cards]);

  function addCard() {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    setCards((current) => [
      {
        id: `custom-${Date.now()}`,
        title: cleanTitle,
        note: "Neu angelegt. Zieh daraus einen klaren nächsten Schritt.",
        owner: owner.trim() || "Founder",
        lane: "backlog",
        priority: "mittel",
      },
      ...current,
    ]);
    setTitle("");
  }

  function updateCard(id: string, patch: Partial<KanbanCard>) {
    setCards((current) => current.map((card) => (card.id === id ? { ...card, ...patch } : card)));
  }

  return (
    <div className="mx-auto flex h-[calc(100svh-10rem)] max-w-7xl flex-col overflow-hidden px-3 pt-3 sm:h-auto sm:px-6 sm:pt-8">
      <div className="flex shrink-0 flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow">Execution Board</div>
          <h1 className="mt-1 text-[24px] font-semibold leading-tight tracking-tight sm:mt-2 sm:text-4xl">
            Kanban für Antrag, Produkt und Partner.
          </h1>
          <p className="mt-2 hidden max-w-2xl text-[14px] leading-relaxed text-[var(--smoke)] sm:block">
            Angebote, Förderungen und Teamaufgaben werden zu Karten, die jeder sofort weiterschieben kann.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/aufgaben">
            <Button variant="ghost" className="glass-pill rounded-full px-4 text-[13px]">
              Aufgaben
            </Button>
          </Link>
          <Link to="/team">
            <Button className="rounded-full bg-[var(--ember)] px-4 text-[13px] text-white shadow-ember hover:bg-[var(--ember-deep)]">
              Team
            </Button>
          </Link>
        </div>
      </div>

      <section className="glass-pane-ink mt-3 shrink-0 grid gap-3 p-3 sm:mt-5 sm:p-5 md:grid-cols-[1fr_auto] md:items-center">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 sm:h-11 sm:w-11">
            <Kanban className="h-5 w-5" />
          </span>
          <div>
            <div className="text-[15px] font-semibold text-[var(--cream)]">
              {doingCount} aktiv · {doneCount} abgeschlossen
            </div>
            <div className="text-[12px] text-white/55">
              Board bleibt lokal gespeichert.
            </div>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-[260px_130px_auto]">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Neue Karte..."
            className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-[13px] text-[var(--cream)] outline-none placeholder:text-white/35 focus:border-white/35"
          />
          <input
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            placeholder="Owner"
            className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-[13px] text-[var(--cream)] outline-none placeholder:text-white/35 focus:border-white/35"
          />
          <Button
            onClick={addCard}
            disabled={!title.trim()}
            className="rounded-2xl bg-[var(--cream)] px-4 text-[var(--ink)] hover:bg-white"
            aria-label="Neue Karte anlegen"
          >
            <Plus className="h-4 w-4" /> Karte
          </Button>
        </div>
      </section>

      <div className="mt-3 grid shrink-0 grid-cols-4 gap-1 rounded-[16px] border border-[var(--ruled)] bg-white/55 p-1 lg:hidden">
        {LANES.map((lane) => (
          <button
            key={lane.id}
            type="button"
            onClick={() => setActiveLane(lane.id)}
            className={[
              "h-9 rounded-[12px] px-1 text-[10.5px] font-semibold transition",
              activeLane === lane.id
                ? "bg-[var(--ember)] text-white shadow-ember"
                : "text-[var(--smoke)]",
            ].join(" ")}
          >
            {lane.title}
          </button>
        ))}
      </div>

      <div className="mt-3 grid min-h-0 flex-1 gap-3 lg:mt-5 lg:grid-cols-4">
        {LANES.map((lane) => {
          const laneCards = cards.filter((card) => card.lane === lane.id);
          return (
            <section
              key={lane.id}
              className={[
                "glass-pane min-h-0 flex-col p-3 sm:p-4 lg:flex",
                activeLane === lane.id ? "flex" : "hidden lg:flex",
              ].join(" ")}
            >
              <div className="mb-3 flex shrink-0 items-start justify-between gap-3 sm:mb-4">
                <div>
                  <div className="text-[15px] font-semibold tracking-tight">{lane.title}</div>
                  <div className="text-[12px] text-[var(--smoke)]">{lane.hint}</div>
                </div>
                <span className="rounded-full bg-[rgba(21,20,15,0.06)] px-2 py-1 font-mono text-[11px]">
                  {laneCards.length}
                </span>
              </div>
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                {laneCards.map((card) => (
                  <KanbanCardView key={card.id} card={card} onUpdate={updateCard} />
                ))}
                {laneCards.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-[var(--ruled)] p-4 text-[12px] text-[var(--smoke)]">
                    Keine Karten in dieser Spalte.
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <Link
        to="/co-pilot"
        className="glass-pane mt-5 hidden items-center justify-between gap-3 p-4 transition hover:-translate-y-0.5 lg:flex"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ background: "var(--indigo-grad)" }}>
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <div className="text-[14px] font-semibold">
              Co-Pilot kann Karten in Arbeitspakete brechen
            </div>
            <div className="text-[12px] text-[var(--smoke)]">
              Nutze den Board-Stand als Kontext für Sprintplanung.
            </div>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0" />
      </Link>
    </div>
  );
}

function KanbanCardView({
  card,
  onUpdate,
}: {
  card: KanbanCard;
  onUpdate: (id: string, patch: Partial<KanbanCard>) => void;
}) {
  const laneIndex = LANES.findIndex((lane) => lane.id === card.lane);
  const previousLane = LANES[laneIndex - 1]?.id;
  const nextLane = LANES[laneIndex + 1]?.id;

  return (
    <div className="rounded-2xl border border-[var(--ruled)] bg-white/55 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[14px] font-semibold leading-snug tracking-tight">{card.title}</div>
          <div className="mt-1 text-[12px] leading-relaxed text-[var(--smoke)]">{card.note}</div>
        </div>
        {card.lane === "done" && <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--ember)]" />}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
        <span className="rounded-full bg-[rgba(21,20,15,0.06)] px-2.5 py-1">{card.owner}</span>
        <button
          onClick={() =>
            onUpdate(card.id, {
              priority:
                card.priority === "hoch"
                  ? "mittel"
                  : card.priority === "mittel"
                    ? "niedrig"
                    : "hoch",
            })
          }
          className="rounded-full bg-[rgba(226,81,28,0.1)] px-2.5 py-1 font-semibold text-[var(--ember-deep)]"
        >
          {card.priority}
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          size="sm"
          variant="ghost"
          disabled={!previousLane}
          onClick={() => previousLane && onUpdate(card.id, { lane: previousLane })}
          className="glass-pill h-8 rounded-full"
          aria-label="Karte zurückschieben"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="sm"
          disabled={!nextLane}
          onClick={() => nextLane && onUpdate(card.id, { lane: nextLane })}
          className="h-8 flex-1 rounded-full bg-[var(--ember)] text-white hover:bg-[var(--ember-deep)]"
        >
          Weiter <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function buildDefaultCards(): KanbanCard[] {
  const grant = GRANTS[0];
  const mentor = partnersFor("mentor")[0];
  return [
    {
      id: "grant-package",
      title: `${grant?.name || "Förderprogramm"} Paket schließen`,
      note: "Unterlagen prüfen, offene Felder markieren, Co-Pilot Entwurf erzeugen.",
      owner: "Founder",
      lane: "doing",
      priority: "hoch",
    },
    {
      id: "team-roles",
      title: "Teamrollen definieren",
      note: "Owner für Produkt, Funding, Growth und Ops festlegen.",
      owner: "Team",
      lane: "backlog",
      priority: "hoch",
    },
    {
      id: "mentor-call",
      title: `${mentor?.name || "Mentor"} Call vorbereiten`,
      note: "3 Fragen, Kontext und gewünschtes Ergebnis notieren.",
      owner: "Founder",
      lane: "review",
      priority: "mittel",
    },
    {
      id: "profile-cleanup",
      title: "Match-Profil finalisieren",
      note: "Skills, Commitment und Suchprofil prüfen.",
      owner: "Founder",
      lane: "done",
      priority: "niedrig",
    },
  ];
}

function readCards(defaults: KanbanCard[]): KanbanCard[] {
  if (typeof window === "undefined") return defaults;
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") as KanbanCard[] | null;
    if (!stored?.length) return defaults;
    const storedIds = new Set(stored.map((card) => card.id));
    return [...stored, ...defaults.filter((card) => !storedIds.has(card.id))];
  } catch {
    return defaults;
  }
}
