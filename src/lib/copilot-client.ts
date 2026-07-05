// ─────────────────────────────────────────────────────────────
// Co-Pilot Client-Brain
// Eine gemeinsame Schicht für ALLE Co-Pilot-Oberflächen (Seite,
// globaler Dock, Heute-Box): Senden mit Verlauf + Memory + Seiten-
// kontext, robuster lokaler Fallback (Demo/offline), transparenter
// Memory-Store und persistenter Demo-Verlauf.
// ─────────────────────────────────────────────────────────────

import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { GRANTS } from "@/data/grants";
import type { PlanContext } from "@/lib/plan-draft";

export type CopilotNav = { to: string; label: string };
export type CopilotSource = {
  typ?: string;
  type?: string;
  titel?: string;
  title?: string;
  url?: string;
};
export type CopilotMsg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  navigation?: CopilotNav[];
  sources?: CopilotSource[] | null;
  created_at: string;
};
export type CopilotResult = {
  answer: string;
  quickActions: string[];
  navigation: CopilotNav[];
  newFacts: string[];
  source: "cloud" | "local";
};

const MEMORY_KEY = "mf_copilot_memory_v1";
const DEMO_CHAT_KEY = "mf_copilot_chat_v1";
const CHAT_EVENT = "mf-copilot-chat-changed";

export function makeMsgId(): string {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

// ─── Memory (gemerkte Fakten, transparent + editierbar) ──────

export function readCopilotMemory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(parsed) ? parsed.filter((f) => typeof f === "string") : [];
  } catch {
    return [];
  }
}

export function addCopilotFacts(facts: string[]): string[] {
  const cleaned = facts.map((f) => f.trim()).filter((f) => f.length > 3);
  if (cleaned.length === 0) return readCopilotMemory();
  const merged = [...new Set([...readCopilotMemory(), ...cleaned])].slice(-30);
  try {
    localStorage.setItem(MEMORY_KEY, JSON.stringify(merged));
  } catch {
    /* localStorage kann fehlen */
  }
  return merged;
}

export function removeCopilotFact(fact: string): string[] {
  const next = readCopilotMemory().filter((f) => f !== fact);
  try {
    localStorage.setItem(MEMORY_KEY, JSON.stringify(next));
  } catch {
    /* */
  }
  return next;
}

// ─── Geteilter Verlauf (Demo/offline; Cloud nutzt copilot_messages) ─

export function readSharedChat(): CopilotMsg[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DEMO_CHAT_KEY);
    const parsed = raw ? (JSON.parse(raw) as CopilotMsg[]) : [];
    return Array.isArray(parsed) ? parsed.slice(-60) : [];
  } catch {
    return [];
  }
}

export function writeSharedChat(messages: CopilotMsg[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DEMO_CHAT_KEY, JSON.stringify(messages.slice(-60)));
    window.dispatchEvent(new CustomEvent(CHAT_EVENT));
  } catch {
    /* */
  }
}

export function onSharedChatChange(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHAT_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(CHAT_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

// ─── Kontextuelle Quick-Prompts pro Bereich ──────────────────

export function quickPromptsFor(pathname: string): string[] {
  if (pathname.startsWith("/foerderung")) {
    return [
      "Welche Förderung gibt es für kleine Gründungen?",
      "Was ist der Gründungszuschuss?",
      "Hilf mir bei meinem Antrag weiter",
    ];
  }
  if (pathname.startsWith("/firma")) {
    return [
      "Schreib mir einen schärferen Hero-Claim",
      "Welche Metriken überzeugen Investoren?",
      "Was fehlt auf meiner Startup-Seite?",
    ];
  }
  if (pathname.startsWith("/discover") || pathname.startsWith("/matches")) {
    return [
      "Worauf achte ich beim Co-Founder-Match?",
      "Formuliere eine erste Nachricht an ein Match",
      "Welche Fragen stelle ich im Erstgespräch?",
    ];
  }
  if (pathname.startsWith("/kapital")) {
    return [
      "Brauche ich überhaupt einen Investor?",
      "Wie viel Startkapital brauche ich realistisch?",
      "Kredit, Förderung oder Erspartes — was zuerst?",
    ];
  }
  if (pathname.startsWith("/recht")) {
    return [
      "Gewerbe, GbR oder GmbH — was passt zu mir?",
      "Was muss in den Vertrag mit meinem Partner?",
      "Welche Versicherungen brauche ich?",
    ];
  }
  if (pathname.startsWith("/steuer")) {
    return [
      "Welche Rechtsform passt steuerlich?",
      "Was kann ich als Gründer absetzen?",
      "Wann brauche ich einen Steuerberater?",
    ];
  }
  if (
    pathname.startsWith("/team") ||
    pathname.startsWith("/aufgaben") ||
    pathname.startsWith("/kanban")
  ) {
    return [
      "Strukturiere unsere Woche in 3 Sprints",
      "Welche Aufgaben haben Prio?",
      "Wie verteilen wir Rollen im Team?",
    ];
  }
  if (pathname.startsWith("/guides")) {
    return [
      "Welcher Guide passt zu meinem nächsten Schritt?",
      "Wende den Guide auf mein Vorhaben an",
      "Was sollte ich als Erstes lesen?",
    ];
  }
  if (pathname.startsWith("/heute") || pathname.startsWith("/plan")) {
    return [
      "Was ist heute der wichtigste nächste Schritt?",
      "Wo fange ich mit meiner Gründung an?",
      "Fass meinen Stand in 3 Sätzen zusammen",
    ];
  }
  return [
    "Wo fange ich mit meiner Gründung an?",
    "Welche Unterstützung gibt es für meinen Start?",
    "Wer kann mir beim Aufbau helfen?",
  ];
}

// ─── Haupt-API ────────────────────────────────────────────────

export type AskOptions = {
  message: string;
  surface: string;
  history: CopilotMsg[];
  sessionId?: string | null;
  planContext: PlanContext | null;
  auth: { session: Session | null; user: User | null; isDemo: boolean };
};

export async function askCopilot(options: AskOptions): Promise<CopilotResult> {
  const { message, surface, history, sessionId, planContext, auth } = options;
  const canUseCloud = Boolean(auth.session && auth.user && !auth.isDemo);

  if (!canUseCloud) {
    const result = localCopilotEngine(message, { planContext, surface });
    addCopilotFacts(result.newFacts);
    return result;
  }

  try {
    const { data, error } = await supabase.functions.invoke("copilot", {
      body: {
        task: "chat",
        session_id: sessionId || undefined,
        message,
        extra: {
          surface,
          memory: readCopilotMemory(),
          history: history.slice(-12).map((m) => ({ role: m.role, content: m.content })),
          onboarding: planContext,
        },
      },
    });
    if (error) throw error;
    const answer = typeof data?.answer === "string" && data.answer.trim() ? data.answer : null;
    if (!answer) throw new Error("empty answer");

    const navigation = (Array.isArray(data?.navigation) ? data.navigation : []).filter(
      (n: CopilotNav) => typeof n?.to === "string" && typeof n?.label === "string",
    );
    const newFacts = (Array.isArray(data?.new_facts) ? data.new_facts : []).filter(
      (f: unknown): f is string => typeof f === "string",
    );
    addCopilotFacts(newFacts);

    return {
      answer,
      quickActions: Array.isArray(data?.quick_actions) ? data.quick_actions.slice(0, 4) : [],
      navigation: navigation.slice(0, 2),
      newFacts,
      source: "cloud",
    };
  } catch (err) {
    console.error("copilot cloud failed — local engine takes over", err);
    const result = localCopilotEngine(message, { planContext, surface });
    addCopilotFacts(result.newFacts);
    return result;
  }
}

// ─── Lokale Engine (Demo/offline) ─────────────────────────────
// Regelbasiert, aber kontext- und plattformbewusst: nutzt Plan-
// Kontext, echte Förderdaten und kennt alle Bereiche der App.

type LocalInput = { planContext: PlanContext | null; surface: string };

export function localCopilotEngine(message: string, input: LocalInput): CopilotResult {
  const m = message.toLowerCase();
  const ctx = input.planContext?.context ?? {};
  const idea = (ctx.idea || "dein Vorhaben").trim();
  const stage = (ctx.stage || "frühe Phase").trim();
  const goal = (ctx.goal || "der nächste belastbare Schritt").trim();
  const risk = (ctx.risk || "").trim();
  const topGrant = GRANTS[0];
  const earlyStage = !/umsatz|revenue|skal/i.test(stage);

  const newFacts = extractLocalFacts(message);

  // Erste Nachricht an ein Match formulieren (vor Co-Founder-Intent prüfen!)
  if (/(formulier|nachricht|anschreiben|schreib.*match|erste nachricht)/.test(m)) {
    const who = input.planContext?.partnerTerm || "Mitgründer";
    return {
      answer: `Hier ist ein Entwurf — kurz, ehrlich, ohne Floskeln:\n\n„Hi! Ich baue gerade ${idea} (Stand: ${stage}). Dein Profil ist mir aufgefallen, weil du genau das mitbringst, was mir fehlt. Hast du diese Woche 15 Minuten für ein kurzes Telefonat? Ich erzähl dir in 3 Sätzen, wo ich stehe — und du sagst mir ehrlich, ob es dich reizt.“\n\nPass die Klammer an und schick sie ab — Perfektion ist hier der Feind. Antworten kommen auf Ehrlichkeit, nicht auf Marketing.`,
      quickActions: [
        "Mach sie lockerer",
        "Mach sie förmlicher",
        "Welche Fragen stelle ich im Gespräch?",
      ],
      navigation: [
        { to: "/matches", label: "Zu deinen Chats" },
        { to: "/guides/cofounder-finden", label: `Guide: Den richtigen ${who} finden` },
      ],
      newFacts,
      source: "local",
    };
  }

  // Gewerbe / Anmeldung / offiziell starten
  if (
    /(gewerbe|anmeld|selbständig machen|selbststaendig machen|offiziell starten|freiberufl)/.test(m)
  ) {
    return {
      answer: `Der offizielle Start ist unspektakulärer als sein Ruf: Gewerbeamt (20–60 €, online), dann kommt automatisch der Finanzamt-Fragebogen, dann melden sich IHK/HWK von selbst.\n\nWichtigste Entscheidung dabei: die Kleinunternehmerregelung (unter 25.000 € Umsatz meist sinnvoll).\n\nIm Guide steht der komplette Ablauf in 5 Schritten — 4 Minuten Lesezeit, danach kannst du es einfach machen.`,
      quickActions: ["Bin ich Freiberufler oder Gewerbe?", "Was ist die Kleinunternehmerregelung?"],
      navigation: [{ to: "/guides/gewerbe-anmelden", label: "Guide: Gewerbe anmelden" }],
      newFacts,
      source: "local",
    };
  }

  // Versicherungen
  if (/(versicherung|haftpflicht|absicher)/.test(m)) {
    return {
      answer: `Zwei Versicherungen brauchst du wirklich: die Betriebshaftpflicht (ab ~80 €/Jahr — bei Publikumsverkehr nicht verhandelbar) und deine Krankenversicherung, um die du dich als Selbständige:r selbst kümmern musst.\n\nAlles andere — Rechtsschutz, Cyber, Vorsorge-Konstrukte — kann warten, bis Umsatz da ist. Lass dich nicht vollpacken.`,
      quickActions: ["Was kostet die Krankenversicherung?", "Brauche ich Berufsunfähigkeit?"],
      navigation: [{ to: "/guides/versicherungen-gruender", label: "Guide: Versicherungen" }],
      newFacts,
      source: "local",
    };
  }

  // Businessplan
  if (/(businessplan|geschäftsplan|geschaeftsplan|tragfähigkeit|tragfaehigkeit)/.test(m)) {
    return {
      answer: `Für Gründungszuschuss, Mikrokredit oder Bank brauchst du keine 40 Seiten — fünf reichen: 1) Was & für wen, 2) Markt vor Ort, 3) Warum du, 4–5) ehrliche Zahlen über 24 Monate.\n\nMein Angebot: Wir gehen die Abschnitte zusammen durch — du erzählst, ich formuliere. Und bevor du einreichst, liest die IHK kostenlos gegen.`,
      quickActions: ["Lass uns mit Abschnitt 1 anfangen", "Was prüft die Bank am genauesten?"],
      navigation: [{ to: "/guides/businessplan-light", label: "Guide: 5-Seiten-Businessplan" }],
      newFacts,
      source: "local",
    };
  }

  // Erste Kunden / Reichweite / Marketing
  if (/(kunden|akquise|auftrag|auftraege|aufträge|reichweite|marketing|sichtbar)/.test(m)) {
    return {
      answer: `Die ersten 10 Kunden kommen nicht über Ads — sie kommen über die 30 Menschen, die dich schon kennen, und über die Frage nach der Empfehlung statt nach dem Auftrag.\n\nDazu: Google-Unternehmensprofil anlegen (20 Minuten, kostenlos, wirkt sofort lokal) und die ersten 2–3 Aufträge günstiger gegen Referenz + Bewertung.\n\nZähl Gespräche, nicht Follower: 5 echte Kundengespräche pro Woche schlagen jede Kampagne.`,
      quickActions: [
        "Formuliere die Nachricht an meine 30 Kontakte",
        "Was gehört ins Google-Profil?",
      ],
      navigation: [
        { to: "/guides/erste-kunden", label: "Guide: Die ersten 10 Kunden" },
        { to: "/growth", label: "Growth-Partner ansehen" },
      ],
      newFacts,
      source: "local",
    };
  }

  // Preise / Kalkulation
  if (/(preis|kalkul|stundensatz|angebot schreiben|was verlangen|honorar)/.test(m)) {
    return {
      answer: `Rechne rückwärts: Wunsch-Netto (z.B. 3.000 €) + ~40 % Abgaben + Betriebskosten = nötiger Umsatz. Geteilt durch realistische 100 verrechenbare Stunden im Monat — nicht 160! — ergibt das deinen Mindest-Stundensatz. Meist 55–70 €, nicht 25.\n\nUnd: Verkauf Pakete statt Stunden („Website Basis 1.900 €“) — Kunden mögen Klarheit, du wirst fürs Ergebnis bezahlt statt für Zeit.`,
      quickActions: [
        "Rechne meinen Stundensatz mit mir durch",
        "Wie erhöhe ich Preise bei Bestandskunden?",
      ],
      navigation: [{ to: "/guides/preise-kalkulieren", label: "Guide: Preise kalkulieren" }],
      newFacts,
      source: "local",
    };
  }

  // Startkosten / Budget
  if (/(startkosten|was kostet|kapitalbedarf|budget|runway|erspartes)/.test(m)) {
    return {
      answer: `Die ehrliche Rechnung hat drei Töpfe: Einmalkosten (Ausstattung, Kaution), Monatskosten (Miete, Versicherung, Software) — und deine privaten Lebenskosten inklusive Krankenkasse. Topf 3 vergessen die meisten.\n\nFormel: Einmalkosten + 6 × (Monatskosten + Leben) − halbierte Umsatzschätzung = dein Kapitalbedarf. Unter 10k: Erspartes + Zuschuss. 10–50k: Mikrokredit/KfW. Darüber: Bank + Partner.`,
      quickActions: ["Rechne meine Gründung mit mir durch", "Welche Förderung deckt die Lücke?"],
      navigation: [
        { to: "/guides/startkosten-rechnen", label: "Guide: Startkosten rechnen" },
        { to: "/guides/foerderung-kleine-gruendungen", label: "Guide: Förder-Landkarte" },
      ],
      newFacts,
      source: "local",
    };
  }

  // Förderung / EXIST / Zuschuss
  if (/(förder|foerder|exist|zuschuss|stipendium|grant|profit\b)/.test(m)) {
    return {
      answer: `Gute Nachricht: Für "${idea}" brauchst du kein Millionen-Programm. Die meisten Gründungen starten mit den kleinen Hebeln:\n\n1. Gründungszuschuss der Agentur für Arbeit (wenn du aus der Anstellung kommst), 2. Mikrokredite und regionale Gründungsprämien deiner Stadt, 3. kostenlose Gründungsberatung von IHK/HWK.\n\nIm Förderbereich habe ich Programme nach deinem Stand sortiert — und beim Antrag fülle ich die Felder mit dir gemeinsam aus, Frage für Frage.`,
      quickActions: [
        "Was ist der Gründungszuschuss genau?",
        "Was bietet meine Stadt an?",
        "Hilf mir beim Antrag",
      ],
      navigation: [
        { to: "/foerderung", label: "Programme für deinen Start ansehen" },
        { to: "/guides/gruendungszuschuss", label: "Guide: Gründungszuschuss" },
      ],
      newFacts,
      source: "local",
    };
  }

  // Co-Founder / Partner / Match
  if (/(co.?founder|mitgründer|mitgruender|gründungspartner|partner such|match)/.test(m)) {
    return {
      answer: `Der richtige Partner entscheidet mehr als jedes Feature. Für "${idea}" heißt das: Erst die Lücke benennen (was kannst du nicht selbst?), dann gezielt swipen.\n\nIm Swipe-Deck siehst du Profile mit Fit-Score — achte weniger auf den Lebenslauf, mehr auf Tempo, Verfügbarkeit und ob ihr beim Risiko ehrlich zueinander seid.\n\nWenn ein Match da ist: kein Smalltalk, sondern ein 15-Minuten-Gespräch mit klarer Frage nach Zeitbudget und Erwartung.`,
      quickActions: [
        "Formuliere eine erste Nachricht an ein Match",
        "Welche Fragen stelle ich im Erstgespräch?",
      ],
      navigation: [
        { to: "/discover", label: "Swipe-Deck öffnen" },
        { to: "/guides/cofounder-finden", label: "Guide: Mitgründer prüfen" },
      ],
      newFacts,
      source: "local",
    };
  }

  // Kapital / Investoren
  if (/(investor|kapital|angel|vc\b|pre.?seed|seed|funding\b|finanzierung)/.test(m)) {
    const earlyNote = earlyStage
      ? `Ehrlich: Die meisten Gründungen brauchen keinen Investor. Rechne erst aus, was du wirklich brauchst — oft sind es 10–50k für Ausstattung, Miete und die ersten Monate. Das deckst du mit Erspartem, einem KfW-Mikrokredit oder dem Gründungszuschuss, ohne Anteile abzugeben.`
      : `Wenn du wirklich externes Geld brauchst: Erst die Hausbank/KfW prüfen, dann regionale Förderbanken — Investoren sind die teuerste Option und nur für stark wachsende Modelle sinnvoll.`;
    return {
      answer: `${earlyNote}\n\nIm Kapital-Bereich findest du die Optionen sortiert — und im Förderbereich das, was dich nichts kostet.`,
      quickActions: ["Wie viel brauche ich realistisch?", "Welche Förderung statt Kredit?"],
      navigation: [
        { to: "/kapital", label: "Kapital & Investoren" },
        { to: "/foerderung", label: "Nicht-verwässernde Förderung" },
      ],
      newFacts,
      source: "local",
    };
  }

  // Recht / GmbH / ESOP / Verträge
  if (/(esop|vesting|cap table|gmbh|recht|vertrag|anwalt|term sheet|ip\b)/.test(m)) {
    const early = earlyStage && /(esop|vesting|cap table|term sheet)/.test(m);
    return {
      answer: early
        ? `Gute Frage — aber halt es einfach. Für die meisten Starts reicht: Gewerbe anmelden (oder Freiberufler-Status klären), eine GbR-Vereinbarung, wenn ihr zu zweit seid, und eine Betriebshaftpflicht.\n\nDie GmbH lohnt sich erst, wenn echtes Haftungsrisiko oder größere Verträge kommen — vorher kostet sie nur Geld und Papierkram.\n\nIm Recht-Bereich findest du Anwälte mit Festpreis-Paketen genau für diese Anfangsfragen.`
        : `Für Vertrags- und Gesellschaftsfragen findest du im Recht-Bereich geprüfte Anwälte mit Gründer-Fokus und Festpreis-Paketen. Beschreib dein Anliegen kurz — ich sage dir, welches Paket passt.`,
      quickActions: ["Was muss in den Gründervertrag?", "Wann lohnt sich die GmbH?"],
      navigation: [
        { to: "/guides/rechtsform-waehlen", label: "Guide: Rechtsform wählen" },
        { to: "/recht", label: "Anwälte mit Festpreisen" },
      ],
      newFacts,
      source: "local",
    };
  }

  // Steuer
  if (/(steuer|buchhaltung|umsatzsteuer|finanzamt|rechtsform)/.test(m)) {
    return {
      answer: `Steuer früh sauber aufsetzen spart später richtig Geld. Für "${stage}" reicht meist: Rechtsform-Entscheidung mit Blick auf die nächsten 18 Monate, Belege digital sammeln, und ein Erstcheck mit einem Startup-erfahrenen Steuerberater.\n\nIm Steuer-Bereich findest du passende Kanzleien mit Gründer-Paketen.`,
      quickActions: ["Welche Rechtsform passt zu mir?", "Was kann ich absetzen?"],
      navigation: [
        { to: "/guides/steuern-basics", label: "Guide: Steuern für Gründer" },
        { to: "/steuer", label: "Steuerberater finden" },
      ],
      newFacts,
      source: "local",
    };
  }

  // Team / Orga / Aufgaben
  if (/(team|aufgabe|task|kanban|sprint|orga|workspace|woche planen)/.test(m)) {
    return {
      answer: `Struktur schlägt Motivation. Mein Vorschlag für diese Woche: 1) Ein klares Wochenziel, das auf "${goal}" einzahlt. 2) Maximal 3 Aufgaben pro Person im Board. 3) Freitags 20 Minuten Review — was hat ein echtes Ergebnis gebracht?\n\nIm Team-Workspace habt ihr Aufgaben, Kanban und Kalender an einem Ort.`,
      quickActions: ["Strukturiere unsere Woche in 3 Sprints", "Welche Aufgaben haben Prio?"],
      navigation: [
        { to: "/kanban", label: "Kanban-Board öffnen" },
        { to: "/aufgaben", label: "Aufgabenliste" },
      ],
      newFacts,
      source: "local",
    };
  }

  // Firmenprofil / Pitch / Landingpage
  if (
    /(firmenprofil|landing|pitch|präsentation|praesentation|werben|profil verbessern|hero)/.test(m)
  ) {
    return {
      answer: `Dein Firmenprofil ist deine Bühne auf der Plattform — dort entscheiden Besucher in 10 Sekunden, ob sie dich ernst nehmen.\n\nDie drei Hebel: 1) Hero-Claim mit max 9 Wörtern, der das Problem benennt. 2) Drei ehrliche Metriken (auch "12 Pilotgespräche" zählt). 3) Ein Video oder Bild, das euch echt zeigt.\n\nIch kann jeden Block für dich vorschreiben — öffne den Builder und nutz den Co-Pilot-Button am Block.`,
      quickActions: ["Schreib mir einen schärferen Hero-Claim", "Welche Metriken überzeugen?"],
      navigation: [{ to: "/firma", label: "Firmenprofil-Builder öffnen" }],
      newFacts,
      source: "local",
    };
  }

  // Mentor / Advisor
  if (/(mentor|advisor|berater|sparring)/.test(m)) {
    return {
      answer: `Ein guter Mentor verkürzt Umwege um Monate. Such nicht "irgendwen mit Erfahrung", sondern jemanden, der genau deine nächste Hürde schon genommen hat — bei dir gerade: ${goal}.\n\nIm Mentoren-Bereich siehst du Operator mit Fit-Score. Mein Tipp: Frag konkret nach einer Office Hour zu EINEM Thema, nicht nach "allgemeinem Austausch".`,
      quickActions: ["Formuliere eine Mentor-Anfrage", "Welcher Mentor passt zu mir?"],
      navigation: [{ to: "/mentoren", label: "Mentoren ansehen" }],
      newFacts,
      source: "local",
    };
  }

  // Plan / nächste Schritte / Zusammenfassung
  if (/(plan|nächste|naechste|schritt|prior|fokus|zusammenfass|stand)/.test(m)) {
    return {
      answer: `Dein Stand: "${idea}" in der Phase "${stage}". Ziel: ${goal}.${risk ? ` Größtes Risiko: ${risk}.` : ""}\n\nDer wichtigste nächste Schritt ist fast immer der kleinste, der etwas BEWEIST: ein Nutzergespräch, eine ausgefüllte Antragsseite, eine konkrete Match-Anfrage.\n\nÖffne deinen Plan — dort liegen deine 3 Spuren mit konkreten Schritten, und auf "Heute" siehst du, was davon heute dran ist.`,
      quickActions: ["Zeig mir meine 3 Spuren", "Was blockiert mich gerade?"],
      navigation: [
        { to: "/plan", label: "Meinen Plan öffnen" },
        { to: "/heute", label: "Heute-Fokus ansehen" },
      ],
      newFacts,
      source: "local",
    };
  }

  // Default — strukturierter Mentor-Modus
  return {
    answer: `Verstanden. Ich denke von deinem Stand aus: "${idea}", Phase "${stage}", Ziel: ${goal}.\n\nEgal ob Halle, Handwerk oder Agentur — der Anfang ist immer gleich: 1) den nächsten kleinen Schritt festlegen, 2) eine Person finden, die mitzieht oder es schon gemacht hat, 3) klären, was der Start wirklich kostet.\n\nSag mir, wo es bei dir hakt — oder beschreib dein Vorhaben genauer, dann gehe ich tiefer rein.`,
    quickActions: quickPromptsFor(input.surface),
    navigation: [{ to: "/plan", label: "Meinen Plan ansehen" }],
    newFacts,
    source: "local",
  };
}

// Einfache Fakten-Heuristik für den lokalen Modus: Sätze mit Zahlen,
// Daten oder Entscheidungs-Signalwörtern merken wir uns.
function extractLocalFacts(message: string): string[] {
  const trimmed = message.trim();
  if (trimmed.length < 12 || trimmed.length > 220) return [];
  const signal =
    /\d/.test(trimmed) ||
    /(entschieden|gegründet|gegruendet|deadline|kunden|umsatz|pilot|zusage|absage|eingestellt|launch)/i.test(
      trimmed,
    );
  if (!signal) return [];
  return [trimmed.length > 140 ? `${trimmed.slice(0, 140)}…` : trimmed];
}
