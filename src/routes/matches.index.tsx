import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AuthGate } from "@/components/AuthGate";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AITag, FitScore } from "@/components/Copilot";
import { ServiceIcon } from "@/components/ServiceIcon";
import { GRANTS, type Grant } from "@/data/grants";
import { PARTNERS, type Partner } from "@/data/partners";
import { SERVICE_BY_ID, type ServiceId } from "@/data/services";
import { readGrantFormDraft } from "@/lib/grant-application";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileText,
  Handshake,
  Inbox,
  Landmark,
  MessageCircle,
  Send,
  Sparkles,
  Store,
} from "lucide-react";

export const Route = createFileRoute("/matches/")({
  component: () => (
    <AuthGate>
      <Matches />
    </AuthGate>
  ),
});

type Row = {
  id: string;
  other: {
    id: string;
    display_name: string | null;
    photo_url: string | null;
    role: string | null;
  };
};

type SavedGrant = {
  grant: Grant;
  isDraft: boolean;
  openItems: number;
};

type ChatThread = Row & {
  lastMessage: string;
  lastAt: string;
  unread: number;
  status: "online" | "wartet" | "neu";
  context: string;
};

const demoRows: Row[] = [
  {
    id: "demo-match-anna",
    other: {
      id: "demo-anna",
      display_name: "Anna Wojcik",
      photo_url: null,
      role: "Full-Stack Developer · AI/ML",
    },
  },
  {
    id: "demo-match-felix",
    other: {
      id: "demo-felix",
      display_name: "Felix Krämer",
      photo_url: null,
      role: "Product & Growth · B2B SaaS",
    },
  },
];

const priorityServices: ServiceId[] = ["capital", "growth", "mentor", "legal", "tax", "talent"];

function Matches() {
  const { user, session, isDemo } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [draftSlugs, setDraftSlugs] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<"chats" | "all" | "funding" | "offers">("chats");

  useEffect(() => {
    setDraftSlugs(
      new Set(GRANTS.filter((grant) => readGrantFormDraft(grant.slug)).map((grant) => grant.slug)),
    );
  }, []);

  useEffect(() => {
    if (!user) return;
    if (isDemo || !session) {
      setRows(isDemo ? demoRows : []);
      return;
    }

    (async () => {
      const { data: matches } = await supabase
        .from("matches")
        .select("id, user_a, user_b, created_at")
        .order("created_at", { ascending: false });
      if (!matches) return setRows([]);
      const otherIds = matches.map((m) => (m.user_a === user.id ? m.user_b : m.user_a));
      if (otherIds.length === 0) return setRows([]);
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name, photo_url, role")
        .in("id", otherIds);
      const byId = new Map((profs ?? []).map((p) => [p.id, p]));
      setRows(
        matches.map((m) => {
          const otherId = m.user_a === user.id ? m.user_b : m.user_a;
          const fallback = {
            id: otherId,
            display_name: "Ohne Namen",
            photo_url: null,
            role: null,
          };
          return { id: m.id, other: byId.get(otherId) ?? fallback };
        }),
      );
    })();
  }, [isDemo, session, user]);

  const savedGrants = useMemo<SavedGrant[]>(() => {
    const selected = [...GRANTS]
      .sort(
        (a, b) => Number(draftSlugs.has(b.slug)) - Number(draftSlugs.has(a.slug)) || b.fit - a.fit,
      )
      .slice(0, 5);
    return selected.map((grant) => ({
      grant,
      isDraft: draftSlugs.has(grant.slug),
      openItems: grant.materials.filter((item) => !item.done).length,
    }));
  }, [draftSlugs]);

  const selectedOffers = useMemo(() => {
    const topByService = priorityServices
      .map(
        (service) =>
          PARTNERS.filter((partner) => partner.service === service).sort(
            (a, b) => b.fit - a.fit,
          )[0],
      )
      .filter((partner): partner is Partner => Boolean(partner));
    return topByService.slice(0, 6);
  }, []);

  const chatThreads = useMemo<ChatThread[]>(
    () =>
      (rows ?? []).map((row, index) => ({
        ...row,
        lastMessage:
          index === 0
            ? "Klingt spannend. Ich kann heute Abend dein Pitchdeck und die MVP-Roadmap prüfen."
            : "Passt. Schick mir gern die offenen Punkte, dann blocke ich morgen 20 Minuten.",
        lastAt: index === 0 ? "09:42" : "Gestern",
        unread: index === 0 ? 2 : 0,
        status: index === 0 ? "online" : "wartet",
        context: index === 0 ? "Produkt / Tech Fit" : "Growth / Go-to-market",
      })),
    [rows],
  );

  const peopleCount = chatThreads.length;
  const unreadCount = chatThreads.reduce((sum, thread) => sum + thread.unread, 0);
  const visiblePeople = active === "all" || active === "chats";
  const visibleFunding = active === "all" || active === "funding";
  const visibleOffers = active === "all" || active === "offers";

  if (rows === null)
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-[var(--smoke)]">
        Lade…
      </div>
    );

  return (
    <div className="mx-auto flex h-[calc(100svh-10rem)] max-w-6xl flex-col overflow-hidden px-3 pt-3 sm:h-auto sm:px-6 md:py-10">
      <div className="flex shrink-0 flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="eyebrow mb-1 sm:mb-3">Inbox</div>
          <h1 className="text-balance text-[28px] font-semibold leading-tight tracking-tight sm:text-5xl">
            Chats mit deinen <span className="text-[var(--ember)]">Matches</span>.
          </h1>
          <p className="mt-3 hidden max-w-2xl text-[15px] leading-relaxed text-[var(--smoke)] sm:block">
            Erst Gespräche, dann Kontext: aktive Founder-Chats stehen vorne, Förderprogramme und
            Partnerangebote bleiben griffbereit als Gesprächsgrundlage.
          </p>
        </div>
        <Link to="/discover">
          <Button className="shadow-ember h-11 w-full gap-2 rounded-xl bg-[var(--ember)] px-5 text-[var(--cream)] hover:bg-[var(--ember-deep)] md:w-auto">
            Neuen Chat starten
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="mt-7 hidden gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={Inbox}
          label="Ungelesen"
          value={unreadCount}
          note="Nachrichten brauchen Antwort"
        />
        <MetricCard
          icon={MessageCircle}
          label="Aktive Chats"
          value={peopleCount}
          note="Founder und Partnerkontakte"
        />
        <MetricCard
          icon={Landmark}
          label="Kontext"
          value={savedGrants.length}
          note="Programme für Gespräche"
        />
        <MetricCard
          icon={Store}
          label="Ressourcen"
          value={selectedOffers.length}
          note="Angebote zum Teilen"
        />
      </div>

      <div className="mt-3 grid shrink-0 grid-cols-4 gap-1 rounded-[16px] border border-[var(--ruled)] bg-white/55 p-1 sm:mt-6 sm:flex sm:overflow-x-auto sm:border-0 sm:bg-transparent sm:p-0 sm:pb-1">
        <FilterButton active={active === "chats"} onClick={() => setActive("chats")}>
          Chats
        </FilterButton>
        <FilterButton active={active === "all"} onClick={() => setActive("all")}>
          Chats + Kontext
        </FilterButton>
        <FilterButton active={active === "funding"} onClick={() => setActive("funding")}>
          Förderprogramme
        </FilterButton>
        <FilterButton active={active === "offers"} onClick={() => setActive("offers")}>
          Angebote
        </FilterButton>
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1 sm:mt-7">
        <div className="grid gap-5 lg:grid-cols-[1fr_0.92fr]">
          {visiblePeople && (
            <section className="glass-pane p-4 sm:p-5">
              <SectionHeader
                icon={MessageCircle}
                title="Aktive Chats"
                meta={`${unreadCount} ungelesen`}
              />
              {chatThreads.length === 0 ? (
                <EmptyState
                  text="Noch keine Chats. Geh entdecken, speichere Profile oder sende Likes."
                  cta="Founder entdecken"
                  to="/discover"
                />
              ) : (
                <div className="mt-4 grid gap-3">
                  {chatThreads.map((thread) => (
                    <ChatThreadCard key={thread.id} thread={thread} />
                  ))}
                </div>
              )}
            </section>
          )}

          {visiblePeople && <ChatAssistantCard grants={savedGrants} offers={selectedOffers} />}
        </div>

        {visibleFunding && (
          <section className="glass-pane mt-4 p-4 sm:mt-5 sm:p-5">
            <SectionHeader
              icon={Landmark}
              title="Gesprächskontext: Förderprogramme"
              meta={`${savedGrants.length} Programme`}
            />
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {savedGrants.map(({ grant, isDraft, openItems }) => (
                <GrantCard key={grant.slug} grant={grant} isDraft={isDraft} openItems={openItems} />
              ))}
            </div>
          </section>
        )}

        {visibleOffers && (
          <section className="glass-pane mt-4 p-4 sm:mt-5 sm:p-5">
            <SectionHeader
              icon={Handshake}
              title="Ausgewählte Angebote & Partner"
              meta={`${selectedOffers.length} Ressourcen`}
            />
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {selectedOffers.map((partner) => (
                <OfferCard key={`${partner.service}-${partner.slug}`} partner={partner} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function ChatThreadCard({ thread }: { thread: ChatThread }) {
  return (
    <Link to="/matches/$id" params={{ id: thread.id }}>
      <article className="rounded-2xl border border-[var(--ruled)] bg-white/60 p-4 transition hover:border-[var(--ember)] hover:bg-white">
        <div className="grid grid-cols-[44px_1fr_auto] gap-3">
          <div className="relative">
            <Avatar className="h-11 w-11">
              {thread.other.photo_url && <AvatarImage src={thread.other.photo_url} />}
              <AvatarFallback className="bg-[var(--ember)]/15 text-[var(--ember-deep)]">
                {(thread.other.display_name ?? "?").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span
              className={[
                "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white",
                thread.status === "online" ? "bg-[#2E9E50]" : "bg-[var(--faint)]",
              ].join(" ")}
            />
          </div>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <div className="truncate text-[15px] font-semibold tracking-[-0.01em]">
                {thread.other.display_name ?? "Ohne Namen"}
              </div>
              {thread.unread > 0 && (
                <span className="shrink-0 rounded-full bg-[var(--ember)] px-2 py-0.5 text-[10px] font-bold text-white">
                  {thread.unread}
                </span>
              )}
            </div>
            <div className="mt-0.5 truncate text-[12px] text-[var(--smoke)]">
              {thread.other.role ?? "Co-Founder"} · {thread.context}
            </div>
            <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-[var(--ink-soft)]">
              {thread.lastMessage}
            </p>
          </div>
          <div className="flex flex-col items-end justify-between gap-3">
            <span className="text-[11px] font-semibold text-[var(--smoke)]">{thread.lastAt}</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--ember-tint)] text-[var(--ember-deep)]">
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

function ChatAssistantCard({
  grants,
  offers,
}: {
  grants: SavedGrant[];
  offers: Partner[];
}) {
  const topGrant = grants[0]?.grant;
  const topOffer = offers[0];

  return (
    <aside className="glass-pane-ink p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/12">
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <div className="text-[15px] font-semibold text-white">Chat-Co-Pilot</div>
          <div className="text-[12px] text-white/60">Antworten mit Kontext vorbereiten</div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-white/10 p-4">
        <div className="text-[12px] font-semibold text-white/60">Vorschlag</div>
        <p className="mt-2 text-[15px] font-semibold leading-snug text-white">
          “Ich schicke dir EXIST-Status, MVP-Plan und die offenen Teamrollen in einem kurzen Briefing.”
        </p>
      </div>

      <div className="mt-4 grid gap-2 text-[12px] text-white/72">
        {topGrant && (
          <Link
            to="/foerderung/$slug"
            params={{ slug: topGrant.slug }}
            className="rounded-xl bg-white/10 px-3 py-2 transition hover:bg-white/15"
          >
            Kontext anhängen: {topGrant.name}
          </Link>
        )}
        {topOffer && (
          <a
            href={`${SERVICE_BY_ID[topOffer.service].route}/${topOffer.slug}`}
            className="rounded-xl bg-white/10 px-3 py-2 transition hover:bg-white/15"
          >
            Angebot teilen: {topOffer.name}
          </a>
        )}
      </div>

      <Button className="mt-5 h-11 w-full gap-2 rounded-xl bg-white text-[var(--ember-deep)] hover:bg-white/92">
        <Send className="h-4 w-4" /> Antwort entwerfen
      </Button>
    </aside>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: typeof Inbox;
  label: string;
  value: number;
  note: string;
}) {
  return (
    <div className="glass-pane p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--smoke)]">
            {label}
          </div>
          <div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--paper)] text-[var(--ember-deep)]">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-2 text-[12px] text-[var(--smoke)]">{note}</div>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="min-w-0 truncate rounded-[12px] border px-1 py-2 text-[10.5px] font-semibold transition sm:shrink-0 sm:rounded-full sm:px-4 sm:text-[12.5px]"
      style={{
        background: active ? "var(--ink)" : "rgba(255,255,255,0.55)",
        color: active ? "var(--cream)" : "var(--ink)",
        borderColor: active ? "var(--ink)" : "var(--ruled)",
      }}
    >
      {children}
    </button>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  meta,
}: {
  icon: typeof Inbox;
  title: string;
  meta: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--paper)] text-[var(--ember-deep)]">
          <Icon className="h-4 w-4" />
        </span>
        <h2 className="text-[18px] font-semibold tracking-tight">{title}</h2>
      </div>
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--smoke)]">
        {meta}
      </span>
    </div>
  );
}

function EmptyState({ text, cta, to }: { text: string; cta: string; to: string }) {
  return (
    <div className="mt-4 rounded-xl border border-[var(--ruled)] bg-white/45 p-5 text-center">
      <p className="text-[13px] leading-relaxed text-[var(--smoke)]">{text}</p>
      <a
        href={to}
        className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--ink)]"
      >
        {cta}
        <ArrowRight className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}

function GrantCard({
  grant,
  isDraft,
  openItems,
}: {
  grant: Grant;
  isDraft: boolean;
  openItems: number;
}) {
  return (
    <Link to="/foerderung/$slug" params={{ slug: grant.slug }}>
      <article className="rounded-xl border border-[var(--ruled)] bg-white/55 p-4 transition hover:border-[var(--ember)] hover:bg-white">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold tracking-tight">{grant.name}</div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-[var(--smoke)]">
              <span>{grant.amount}</span>
              <span>{grant.duration}</span>
              <span>{grant.deadline}</span>
            </div>
          </div>
          <FitScore value={grant.fit} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <AITag tone="light">{isDraft ? "Antrag in Arbeit" : "Co-Pilot Auswahl"}</AITag>
          <span className="rounded-full bg-[var(--paper)] px-2.5 py-1 text-[11px] font-medium text-[var(--ink-soft)]">
            {grant.prefilled}% vorbereitet
          </span>
          <span className="rounded-full bg-[var(--paper)] px-2.5 py-1 text-[11px] font-medium text-[var(--ink-soft)]">
            {openItems} offen
          </span>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 text-[12.5px]">
          <span className="inline-flex items-center gap-1.5 text-[var(--smoke)]">
            {isDraft ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-[var(--ember)]" />
            ) : (
              <Clock3 className="h-3.5 w-3.5" />
            )}
            {isDraft ? "Weiter ausfüllen" : "Fit prüfen"}
          </span>
          <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--ink)]">
            Öffnen <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </article>
    </Link>
  );
}

function OfferCard({ partner }: { partner: Partner }) {
  const service = SERVICE_BY_ID[partner.service];
  const href = `${service.route}/${partner.slug}`;
  const firstPackage = partner.packages[0];

  return (
    <a href={href}>
      <article className="h-full rounded-xl border border-[var(--ruled)] bg-white/55 p-4 transition hover:border-[var(--ember)] hover:bg-white">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--cream)]"
              style={{ background: service.hue }}
            >
              <ServiceIcon name={service.icon} size={16} stroke={2.2} />
            </span>
            <div className="min-w-0">
              <div className="truncate text-[15px] font-semibold tracking-tight">
                {partner.name}
              </div>
              <div className="mt-0.5 text-[12px] text-[var(--smoke)]">
                {service.short} · {partner.city}
              </div>
            </div>
          </div>
          <FitScore value={partner.fit} />
        </div>
        <p className="mt-3 line-clamp-3 text-[13px] leading-relaxed text-[var(--ink-soft)]">
          {partner.blurb}
        </p>
        <div className="mt-4 rounded-lg bg-[var(--paper)] p-3">
          <div className="flex items-start gap-2">
            <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--ember-deep)]" />
            <div>
              <div className="text-[12.5px] font-semibold text-[var(--ink)]">
                {firstPackage?.name ?? "Co-Pilot Briefing"}
              </div>
              <div className="mt-0.5 text-[12px] text-[var(--smoke)]">
                {firstPackage?.price ?? "inklusive"}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--smoke)]">
            <Sparkles className="h-3.5 w-3.5 text-[var(--ember-deep)]" />
            ausgewählt
          </span>
          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--ink)]">
            Profil <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </article>
    </a>
  );
}
