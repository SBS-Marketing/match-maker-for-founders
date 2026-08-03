// ─────────────────────────────────────────────────────────────
// Rich Cards für den Co-Pilot — generische, strukturierte Karten,
// die der Agent selbst ausspielen darf, wenn die Lage es hergibt.
//
// Zwei Sorten zum Start:
//   contact  — Person/Stelle mit sauber getrennten Feldern
//   research — Titel, Kernaussage, Quellen
//
// Der Zweck der Normalisierung: das Modell klebt sonst Freitext
// zusammen ("Dr. rer. oec. Ardeystraße 93, 44139 Dortmund"). Hier
// wird jedes Feld einzeln geprüft, gesäubert und im Zweifel lieber
// verworfen als vermischt ausgeliefert.
// ─────────────────────────────────────────────────────────────

export type CardSource = {
  title: string;
  url: string;
};

export type ContactCard = {
  kind: "contact";
  name: string;
  role?: string;
  organization?: string;
  phone?: string;
  email?: string;
  street?: string;
  postal_code?: string;
  city?: string;
  website?: string;
  note?: string;
  source_url?: string;
};

export type ResearchCard = {
  kind: "research";
  title: string;
  summary: string;
  bullets: string[];
  sources: CardSource[];
};

export type CopilotCard = ContactCard | ResearchCard;

const MAX_CARDS = 3;

// Straßen- und PLZ-Muster — Adressbestandteile, die in einem Namensfeld
// nichts verloren haben.
const STREET_RE =
  /(stra(?:ß|ss)e|str\.|weg|allee|platz|ring|gasse|ufer|damm|chaussee|hof|markt)\s*\d|\d+\s*[a-z]?\s*$/i;
const POSTAL_RE = /\b\d{5}\b/;

// Akademische Grade und Berufsbezeichnungen, die als Name durchgereicht
// werden, obwohl sie keiner sind.
const TITLE_TOKEN_RE =
  /^(prof|dr|dipl|ing|mag|rer|nat|oec|pol|med|jur|phil|habil|mba|msc|bsc|b\.?a|m\.?a|m\.?sc|b\.?sc|univ|des|h\.?c|lic|ass|dipl\.-[a-zäöüß]+|diplom-[a-zäöüß]+|betriebswirt(?:in)?|kauffrau|kaufmann|ökonom(?:in)?|oekonom(?:in)?)\.?$/i;

function text(value: unknown, max = 200): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

/** Erstes nicht-leeres Feld aus mehreren erlaubten Schlüsseln (deutsch + englisch). */
function pick(row: Record<string, unknown>, keys: string[], max = 200): string {
  for (const key of keys) {
    const value = text(row[key], max);
    if (value && !/^(unbekannt|unknown|n\/a|keine angabe|-)$/i.test(value)) return value;
  }
  return "";
}

function stripLabel(value: string): string {
  return value.replace(/^(tel(?:efon)?|fon|phone|mail|e-?mail|web(?:site)?|url)\s*[:.]\s*/i, "");
}

/**
 * Trennt Adressanteile ab, die versehentlich im Namen gelandet sind.
 * Gibt den bereinigten Namen und den abgeschnittenen Rest zurück.
 */
function splitAddressFromName(raw: string): { name: string; addressTail: string } {
  // Eine Straße kann mitten in einem Komma-Teil beginnen ("… Ökonomin Ardeystraße 93"):
  // ab dem Straßennamen gehört alles zur Adresse, davor bleibt der Namensteil stehen.
  const inlineStreet =
    /(\S*(?:stra(?:ß|ss)e|str\.|weg|allee|platz|ring|gasse|damm|chaussee)\s*\d+.*)$/i;
  const keep: string[] = [];
  const tail: string[] = [];
  for (const part of raw.split(/\s*,\s*/)) {
    if (tail.length > 0) {
      tail.push(part);
      continue;
    }
    const match = part.match(inlineStreet);
    if (match) {
      const prefix = part.slice(0, match.index).trim();
      if (prefix) keep.push(prefix);
      tail.push(match[1].trim());
      continue;
    }
    if (POSTAL_RE.test(part) || STREET_RE.test(part)) {
      tail.push(part);
      continue;
    }
    keep.push(part);
  }
  return {
    name: keep.join(", ").replace(/[,;]\s*$/, "").trim(),
    addressTail: tail.join(", ").trim(),
  };
}

/**
 * Entfernt führende akademische Grade. Bleibt danach nichts übrig, war das
 * Feld gar kein Name — dann liefert die Funktion einen leeren Namen und den
 * Titel separat zurück, damit er in "role" landen kann.
 */
function splitTitleFromName(raw: string): { name: string; title: string } {
  const tokens = raw.split(/\s+/).filter(Boolean);
  const titles: string[] = [];
  let index = 0;
  while (index < tokens.length) {
    const token = tokens[index].replace(/^\//, "").replace(/\/$/, "");
    if (token === "/" || TITLE_TOKEN_RE.test(token)) {
      titles.push(tokens[index]);
      index += 1;
      continue;
    }
    break;
  }
  const rest = tokens.slice(index).join(" ").replace(/^[\/\s-]+/, "").trim();
  // "Diplom-Ökonomin" o.ä. steht manchmal hinter dem Grad und ist ebenfalls
  // kein Name: ein Name braucht mindestens zwei Wortteile oder keine Endung
  // aus dem Titel-Vokabular.
  const restTokens = rest.split(/\s+/).filter(Boolean);
  const restIsTitleOnly =
    restTokens.length > 0 && restTokens.every((token) => TITLE_TOKEN_RE.test(token));
  if (!rest || restIsTitleOnly) {
    return { name: "", title: [...titles, rest].filter(Boolean).join(" ").trim() };
  }
  return { name: rest, title: titles.join(" ").trim() };
}

function normalizePhone(raw: string): string {
  const cleaned = stripLabel(raw).replace(/[^\d+()\/\s.-]/g, "").trim();
  const digits = cleaned.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 18) return "";
  return cleaned.replace(/\s{2,}/g, " ").slice(0, 40);
}

function normalizeEmail(raw: string): string {
  const cleaned = stripLabel(raw).replace(/^mailto:/i, "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@.]+\.[^\s@]{2,}$/.test(cleaned) ? cleaned.slice(0, 160) : "";
}

function normalizeURL(raw: string): string {
  const cleaned = stripLabel(raw).trim();
  if (!cleaned) return "";
  const candidate = /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
  try {
    const url = new URL(candidate);
    if (!/^https?:$/.test(url.protocol)) return "";
    if (!url.hostname.includes(".")) return "";
    const normalized = url.toString();
    // Kein künstlicher Schrägstrich am Ende einer reinen Domain.
    return (url.pathname === "/" && !url.search && !url.hash
      ? normalized.replace(/\/$/, "")
      : normalized
    ).slice(0, 400);
  } catch {
    return "";
  }
}

/** "Ardeystraße 93, 44139 Dortmund" → getrennte Felder. */
function parseAddress(raw: string): { street: string; postalCode: string; city: string } {
  const value = raw.replace(/\s+/g, " ").trim();
  if (!value) return { street: "", postalCode: "", city: "" };
  const postalMatch = value.match(/\b(\d{5})\b\s*([A-Za-zÄÖÜäöüß .\/-]{2,60})?/);
  const postalCode = postalMatch?.[1] ?? "";
  const city = text(postalMatch?.[2] ?? "", 80).replace(/[,;]\s*$/, "");
  const street = postalMatch
    ? value.slice(0, postalMatch.index).replace(/[,;]\s*$/, "").trim()
    : value;
  return { street: text(street, 120), postalCode, city };
}

function normalizeContactCard(row: Record<string, unknown>): ContactCard | null {
  const rawName = pick(row, ["name", "person", "ansprechpartner", "kontakt", "titel", "title"], 160);
  const organization = pick(
    row,
    ["organisation", "organization", "firma", "stelle", "behoerde", "behörde", "company", "org"],
    140,
  );
  let role = pick(row, ["rolle", "role", "funktion", "abteilung", "position", "department"], 140);

  const addressField = pick(row, ["adresse", "address", "anschrift"], 220);
  let { street, postalCode, city } = parseAddress(addressField);
  street = pick(row, ["strasse", "straße", "street"], 120) || street;
  postalCode = pick(row, ["plz", "postleitzahl", "postal_code", "postalCode", "zip"], 12) || postalCode;
  city = pick(row, ["ort", "stadt", "city"], 80) || city;
  if (!/^\d{4,5}$/.test(postalCode)) postalCode = "";

  // Der eigentliche Trennschnitt: Adresse und Grad raus aus dem Namen.
  const withoutAddress = splitAddressFromName(rawName);
  if (withoutAddress.addressTail && !street) {
    const parsed = parseAddress(withoutAddress.addressTail);
    street = street || parsed.street;
    postalCode = postalCode || parsed.postalCode;
    city = city || parsed.city;
  }
  const withoutTitle = splitTitleFromName(withoutAddress.name);
  let name = withoutTitle.name;
  // Ein Grad ohne dazugehörige Person ist keine Rolle, sondern Rest — der
  // wandert nur mit, wenn wirklich ein Personenname überlebt hat.
  if (name && withoutTitle.title && !role) role = withoutTitle.title;

  const phone = normalizePhone(pick(row, ["telefon", "phone", "tel", "telefonnummer", "fon"], 60));
  const email = normalizeEmail(pick(row, ["email", "e_mail", "mail", "e-mail"], 200));
  const website = normalizeURL(pick(row, ["website", "webseite", "url", "web", "homepage"], 400));
  const sourceURL = normalizeURL(pick(row, ["quelle", "source_url", "sourceUrl", "beleg"], 400));
  const note = pick(row, ["notiz", "note", "hinweis", "detail", "beschreibung"], 220);

  // Kein verwertbarer Personenname? Dann trägt die Organisation die Karte.
  let displayOrganization = organization;
  if (!name) {
    if (!organization) return null;
    name = organization;
    displayOrganization = "";
  } else if (organization && organization.toLowerCase() === name.toLowerCase()) {
    displayOrganization = "";
  }

  if (name.length < 2 || POSTAL_RE.test(name)) return null;
  // Eine Karte ohne jeden Kontaktweg ist nur Text mit Rahmen.
  if (!phone && !email && !website && !street && !city) return null;

  const card: ContactCard = { kind: "contact", name };
  if (role) card.role = role;
  if (displayOrganization) card.organization = displayOrganization;
  if (phone) card.phone = phone;
  if (email) card.email = email;
  if (street) card.street = street;
  if (postalCode) card.postal_code = postalCode;
  if (city) card.city = city;
  if (website) card.website = website;
  if (note) card.note = note;
  if (sourceURL) card.source_url = sourceURL;
  return card;
}

function normalizeCardSources(value: unknown): CardSource[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const sources: CardSource[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const url = normalizeURL(pick(row, ["url", "link", "quelle"], 400));
    if (!url) continue;
    const key = url.replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    let title = pick(row, ["title", "titel", "name"], 90);
    if (!title) {
      try {
        title = new URL(url).hostname.replace(/^www\./, "");
      } catch {
        title = "Quelle";
      }
    }
    sources.push({ title, url });
    if (sources.length >= 4) break;
  }
  return sources;
}

function normalizeResearchCard(row: Record<string, unknown>): ResearchCard | null {
  const title = pick(row, ["titel", "title", "thema"], 110);
  const summary = pick(row, ["kernaussage", "summary", "zusammenfassung", "text", "aussage"], 420);
  if (!title || summary.length < 15) return null;

  const rawBullets = row.fakten ?? row.bullets ?? row.punkte ?? row.details;
  const bullets = (Array.isArray(rawBullets) ? rawBullets : [])
    .map((entry) => text(entry, 170))
    .filter((entry) => entry.length > 3)
    .slice(0, 4);

  const sources = normalizeCardSources(row.quellen ?? row.sources);
  // Eine Recherche-Karte ohne Beleg ist genau das, was wir vermeiden wollen.
  if (sources.length === 0) return null;

  return { kind: "research", title, summary, bullets, sources };
}

/**
 * Validiert die vom Modell gelieferten Karten. Alles, was nicht sauber
 * getrennt und belegbar ist, fliegt raus — lieber keine Karte als eine,
 * in der Name und Adresse verschmelzen.
 */
export function normalizeCards(value: unknown): CopilotCard[] {
  if (!Array.isArray(value)) return [];
  const cards: CopilotCard[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const kind = text(row.typ ?? row.kind ?? row.type, 40).toLowerCase();
    const card =
      kind === "kontakt" || kind === "contact"
        ? normalizeContactCard(row)
        : kind === "recherche" || kind === "research"
          ? normalizeResearchCard(row)
          : null;
    if (!card) continue;
    // Doppelte Karten (gleicher Name/Titel) nur einmal ausspielen.
    const key =
      card.kind === "contact"
        ? `contact:${card.name.toLowerCase()}`
        : `research:${card.title.toLowerCase()}`;
    if (cards.some((existing) => cardKey(existing) === key)) continue;
    cards.push(card);
    if (cards.length >= MAX_CARDS) break;
  }
  return cards;
}

function cardKey(card: CopilotCard): string {
  return card.kind === "contact"
    ? `contact:${card.name.toLowerCase()}`
    : `research:${card.title.toLowerCase()}`;
}

// ─────────────────────────────────────────────────────────────
// Fließtext-Riegel
// ─────────────────────────────────────────────────────────────

// Abkürzungen, deren Punkt kein Satzende ist — sonst zerfällt "Dr. rer. oec."
// in vier Sätze und die Filterung greift am falschen Ort.
const ABBREVIATIONS =
  /\b(dr|prof|dipl|ing|rer|oec|nat|pol|med|jur|phil|habil|bzw|ca|ggf|evtl|inkl|zzgl|Nr|Str|Tel|Abs|Art|u|a|z|B|d|h|s|o)\.\s?/gi;

function splitSentences(value: string): string[] {
  const MASK = "";
  const masked = value.replace(ABBREVIATIONS, (match) => match.replace(".", MASK));
  return masked
    .split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ0-9„"])/)
    .map((sentence) => sentence.replaceAll(MASK, ".").trim())
    .filter(Boolean);
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Entfernt aus dem Fließtext genau die Angaben, die eine Kontaktkarte bereits
 * sauber getrennt trägt. Das ist der Riegel gegen den bekannten Fehler, in dem
 * das Modell Titel, Straße und PLZ zu einem Satz verklebt: die Karte hat die
 * Felder, der Text muss sie nicht noch einmal zusammenrühren.
 */
export function answerWithoutCardDuplicates(answer: string, cards: CopilotCard[]): string {
  const contacts = cards.filter((card): card is ContactCard => card.kind === "contact");
  if (contacts.length === 0 || !answer.trim()) return answer;

  const kept = splitSentences(answer).filter((sentence) => {
    const haystack = sentence.toLowerCase();
    const sentenceDigits = digitsOnly(sentence);
    return !contacts.some((card) => {
      if (card.street && card.street.length >= 6 && haystack.includes(card.street.toLowerCase())) {
        return true;
      }
      if (card.postal_code && sentence.includes(card.postal_code)) return true;
      if (card.email && haystack.includes(card.email)) return true;
      const phoneDigits = card.phone ? digitsOnly(card.phone) : "";
      if (phoneDigits.length >= 7 && sentenceDigits.includes(phoneDigits)) return true;
      return false;
    });
  });

  const cleaned = kept.join(" ").trim();
  // Bleibt nichts übrig, war der ganze Text nur die Karte in Prosa.
  return cleaned.length >= 15 ? cleaned : "Die Kontaktdaten stehen in der Karte.";
}

// ─────────────────────────────────────────────────────────────
// Prompt-Baustein — eine Quelle für Interaction-, Recherche- und
// Execution-Ebene, damit alle drei dieselbe Karte bauen.
// ─────────────────────────────────────────────────────────────

export const CARD_RULES = `
    RICH CARDS (strukturierte Karten im Chat):
    Du darfst einer Antwort Karten beilegen, wenn das Ergebnis wirklich strukturiert ist.
    Karten sind die Ausnahme, kein Standard — bei Small Talk, Einordnung, Rat oder einer
    normalen Sachantwort gibst du "karten": [].
    - Kontaktkarte, wenn du eine konkrete Stelle oder Person mit echten Kontaktdaten hast,
      die der Founder anrufen, anschreiben oder besuchen kann.
    - Recherche-Karte, wenn dein Ergebnis auf EINER klaren Kernaussage steht, die durch echte
      Treffer getragen wird. Insbesondere, wenn der Founder ausdrücklich nach Beleg, Quelle oder
      Nachweis gefragt hat oder wenn die Aussage eine Entscheidung von ihm trägt: dann gehört sie
      in eine Recherche-Karte, nicht in einen Fließtext mit angehängter Quellenliste.
      Keine Karte dagegen, wenn du selbst schreibst, dass die Lage unklar ist oder die Treffer
      nichts Belastbares hergeben — dann bleibt es beim kurzen Text.
    - Maximal 3 Karten. Nur belegte Angaben: jedes Feld muss aus einem Treffer, einem
      Connector-Ergebnis oder dem gemerkten Kontext stammen. Erfinde nichts und rate nichts.
    - Wurde nach einem Ansprechpartner gefragt, SUCHE den Namen aktiv im Treffermaterial.
      Die Seitenauszüge sind länger als ein Suchmaschinen-Snippet und enthalten in der Regel
      Name, Funktion, Durchwahl und Mailadresse — lies sie durch, bevor du aufgibst.
      Nenne die Person nur dann nicht, wenn sie im Material wirklich nicht steht; dann sagst
      du in einem Halbsatz, dass die Stelle keinen Namen veröffentlicht, und lieferst die
      Karte mit der Stelle. „Kein Name gefunden" ist erst nach dem Lesen eine zulässige Antwort,
      nicht vorher.
    - Lass ein Feld lieber WEG als es zu füllen. Ein leeres Feld ist richtig, ein geratenes falsch.
    - JEDES FELD ENTHÄLT NUR SEINEN EIGENEN INHALT. Niemals Name und Adresse, Titel und
      Straße oder Rolle und Organisation in dasselbe Feld schreiben.
      "name" ist ausschließlich der Personen- oder Stellenname ("Anna Behrens" oder
      "Existenzgründungsberatung"). Akademische Grade und Berufsbezeichnungen
      ("Dr. rer. oec.", "Diplom-Ökonomin") gehören in "rolle", niemals in "name".
      Ist kein Personenname belegt, lass "name" leer und fülle "organisation" —
      eine Karte ohne Personennamen ist völlig in Ordnung.
    - Die sichtbare "antwort" bleibt kurz und wiederholt die Karteninhalte NICHT.
      Keine Adresse, keine Telefonnummer, keine Quellenliste im Fließtext, wenn eine
      Karte sie schon trägt. Ein Satz Einordnung reicht, maximal zwei.
    - Gilt auch andersherum: Wenn ein Treffer nur Bruchstücke hergibt, klebe sie NIE im
      Fließtext aneinander. Bruchstücke gehören in die Karte, jedes in sein Feld — und was
      fehlt, bleibt leer und wird in einem Halbsatz benannt.

    Beispiel (Platzhalterdaten, kein realer Fall):
    SCHLECHT — Felder im Fließtext verschmolzen:
      "Zuständig ist Dipl.-Kffr. Musterweg 4, 12345 Musterstadt."
    GUT — Fließtext ordnet ein, die Karte trägt die Daten:
      "Die Beratung läuft über die Gründungsstelle. Ein Name steht auf der Seite nicht,
       Anschrift und Telefon habe ich."
      + {"typ": "kontakt", "name": "Gründungsstelle", "organisation": "Musterkammer",
         "strasse": "Musterweg 4", "plz": "12345", "ort": "Musterstadt", "telefon": "0123 456-0"}

    Kartenformat:
    {"typ": "kontakt", "name": "", "rolle": "", "organisation": "", "telefon": "",
     "email": "", "strasse": "", "plz": "", "ort": "", "website": "", "notiz": "", "quelle": ""}
    {"typ": "recherche", "titel": "", "kernaussage": "", "fakten": ["", ""],
     "quellen": [{"titel": "", "url": ""}]}
`;
