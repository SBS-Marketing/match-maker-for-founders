// matchfoundr · Startup-Guides
// Kompakte, praktische Anleitungen für kleine Gründungen im DACH-Raum.
// Kein Consulting-Sprech — Schritt für Schritt, wie man es einem Freund erklärt.

export type GuideCategory = "gruendung" | "foerderung" | "recht" | "finanzen" | "team";

export type GuideSection = { h: string; body: string };

export type Guide = {
  slug: string;
  title: string;
  category: GuideCategory;
  minutes: number;
  intro: string;
  sections: GuideSection[];
};

export const GUIDE_CATEGORIES: { id: GuideCategory; label: string }[] = [
  { id: "gruendung", label: "Gründung" },
  { id: "foerderung", label: "Förderung" },
  { id: "recht", label: "Recht" },
  { id: "finanzen", label: "Finanzen" },
  { id: "team", label: "Team" },
];

export const GUIDES: Guide[] = [
  {
    slug: "gewerbe-anmelden",
    title: "Gewerbe anmelden in 30 Minuten",
    category: "gruendung",
    minutes: 4,
    intro:
      "Der offizielle Startschuss deiner Selbständigkeit kostet 20–60 € und ist einfacher als jeder Handyvertrag. So läuft es ab.",
    sections: [
      {
        h: "Brauchst du überhaupt ein Gewerbe?",
        body: "Fast immer ja — außer du bist Freiberufler:in (z.B. Designer, Texterin, Berater, Entwickler mit kreativ-konzeptioneller Arbeit). Freiberufler melden sich nur beim Finanzamt. Unsicher? Kurz beim Finanzamt anrufen — die sagen es dir kostenlos.",
      },
      {
        h: "Schritt 1: Gewerbeamt deiner Stadt",
        body: "Online oder vor Ort. Du brauchst: Personalausweis, ~20–60 € Gebühr, und eine kurze Beschreibung deiner Tätigkeit. Tipp: Beschreibung etwas breiter formulieren („Handel mit Sportartikeln und Betrieb von Sportanlagen“) — dann musst du später nicht nachmelden.",
      },
      {
        h: "Schritt 2: Fragebogen vom Finanzamt",
        body: "Kommt automatisch nach der Anmeldung (ELSTER, „Fragebogen zur steuerlichen Erfassung“). Wichtigste Entscheidung: Kleinunternehmerregelung ja/nein (siehe Guide „Steuern für Gründer“). Bei geschätztem Umsatz unter 25.000 €/Jahr meist: ja.",
      },
      {
        h: "Schritt 3: Was automatisch passiert",
        body: "IHK oder HWK melden sich (Mitgliedschaft ist Pflicht, im ersten Jahr oft beitragsfrei bei kleinen Umsätzen). Die Berufsgenossenschaft schreibt dich an — antworten, auch wenn du keine Mitarbeiter hast.",
      },
      {
        h: "Fertig — was jetzt?",
        body: "Geschäftskonto eröffnen (trennt privat und geschäftlich, spart dir im Steuer-Chaos Stunden) und die erste Rechnung schreiben. Mehr brauchst du für den Start nicht.",
      },
    ],
  },
  {
    slug: "rechtsform-waehlen",
    title: "Einzelunternehmen, GbR oder GmbH?",
    category: "recht",
    minutes: 5,
    intro:
      "Die Rechtsform ist keine Glaubensfrage, sondern Mathematik aus Haftung, Kosten und Papierkram. Für die meisten Starts ist die Antwort einfacher als gedacht.",
    sections: [
      {
        h: "Solo und klein anfangen: Einzelunternehmen",
        body: "Kostenlos, sofort, kein Mindestkapital. Du haftest privat — klingt gruselig, ist aber bei Dienstleistungen mit Betriebshaftpflicht meist tragbar. 80 % aller Gründungen starten so.",
      },
      {
        h: "Zu zweit: GbR",
        body: "Entsteht automatisch, wenn ihr zusammen arbeitet — auch ohne Vertrag! Deshalb: Schreibt IMMER eine GbR-Vereinbarung (2 Seiten reichen): Wer bringt was ein, wie werden Gewinne geteilt, was passiert wenn einer geht. Ohne das wird jede Trennung zum Streit.",
      },
      {
        h: "Wann die GmbH (oder UG) wirklich lohnt",
        body: "Wenn echtes Haftungsrisiko besteht (Halle mit Publikumsverkehr, große Warenlager, Verträge über zehntausende Euro) oder Geschäftspartner sie verlangen. Kosten: ~800–1.500 € Gründung, 25.000 € Stammkapital (UG: ab 1 €, aber mit Rücklagepflicht), Bilanzpflicht ~1.000+ €/Jahr Steuerberater.",
      },
      {
        h: "Die ehrliche Faustregel",
        body: "Starte als Einzelunternehmen/GbR, wechsle zur GmbH, wenn Umsatz und Risiko es rechtfertigen. Der Wechsel ist Standard-Prozedere — falsch herum (GmbH zu früh) kostet dich nur Geld und Nerven.",
      },
    ],
  },
  {
    slug: "gruendungszuschuss",
    title: "Gründungszuschuss: Geld von der Arbeitsagentur",
    category: "foerderung",
    minutes: 5,
    intro:
      "Wer aus der Arbeitslosigkeit gründet, kann 6 Monate ALG I + 300 € monatlich bekommen — und danach oft 9 weitere Monate 300 €. Der meistunterschätzte Förderhebel für kleine Gründungen.",
    sections: [
      {
        h: "Wer ihn bekommen kann",
        body: "Du beziehst ALG I und hast noch mindestens 150 Tage Restanspruch. Kein ALG I? Dann schau auf das Einstiegsgeld (bei Bürgergeld) oder regionale Programme deiner Stadt.",
      },
      {
        h: "Was du einreichen musst",
        body: "1. Businessplan (5–10 Seiten reichen: Idee, Zielgruppe, Konkurrenz, Preise, Umsatzplanung), 2. Lebenslauf, 3. Tragfähigkeitsbescheinigung — die bekommst du kostenlos von IHK, HWK oder einem Gründungsberater, der deinen Plan gegenliest.",
      },
      {
        h: "Der wichtigste Insider-Punkt",
        body: "Der Zuschuss ist eine ERMESSENSleistung — dein Sachbearbeiter entscheidet. Geh vorbereitet ins Gespräch: zeig, dass die Gründung dich schneller aus der Arbeitslosigkeit bringt als jede Bewerbung. Erst Antrag stellen, DANN gründen — nie umgekehrt.",
      },
      {
        h: "Realistische Zahlen",
        body: "Phase 1: 6 Monate dein ALG I + 300 € (steuerfrei!). Phase 2: 9 Monate 300 €, wenn du Haupttätigkeit nachweist. Zusammen oft 10.000–20.000 € — ohne Anteile abzugeben, ohne Rückzahlung.",
      },
    ],
  },
  {
    slug: "foerderung-kleine-gruendungen",
    title: "Förderung für kleine Gründungen — die Landkarte",
    category: "foerderung",
    minutes: 6,
    intro:
      "Du brauchst kein EXIST und keinen Investor. Für Halle, Handwerk und Agentur gibt es einen eigenen Werkzeugkasten — hier ist er, sortiert nach Aufwand.",
    sections: [
      {
        h: "Stufe 1: Kostenlos beraten lassen (0 € / sofort)",
        body: "IHK- und HWK-Gründungsberatung ist kostenlos und gut. Dazu: geförderte Beratung über die BAFA („Förderung unternehmerischen Know-hows“) — 50–80 % Zuschuss auf professionelle Beratung nach der Gründung.",
      },
      {
        h: "Stufe 2: Zuschüsse (geschenktes Geld)",
        body: "Gründungszuschuss (Arbeitsagentur, siehe eigener Guide), Einstiegsgeld (Jobcenter), regionale Gründungsprämien — viele Städte und Länder zahlen 5.000–15.000 € für Gründungen mit Standortbezug. Such: „[deine Stadt] Gründungsprämie“.",
      },
      {
        h: "Stufe 3: Mikrokredite und KfW",
        body: "Mikrokreditfonds Deutschland: bis 25.000 € ohne Bank-Theater. KfW-StartGeld (ERP-Gründerkredit): bis 125.000 €, die KfW übernimmt 80 % des Risikos gegenüber deiner Hausbank — dadurch sagen Banken viel öfter ja.",
      },
      {
        h: "Was du ignorieren kannst",
        body: "EXIST (nur mit Hochschulanbindung + innovativem Tech-Kern), VC/Business Angels (nur für stark skalierende Modelle), alles mit „Series“ im Namen. Das ist eine andere Welt — deine Welt sind Stufe 1–3.",
      },
      {
        h: "Die richtige Reihenfolge",
        body: "1. Kostenlose Beratung buchen. 2. Startkosten realistisch rechnen (Guide „Was kostet deine Gründung“). 3. Zuschüsse prüfen. 4. Nur die Lücke über Kredit finanzieren. So gibst du keine Anteile ab und zahlst so wenig Zinsen wie möglich.",
      },
    ],
  },
  {
    slug: "startkosten-rechnen",
    title: "Was kostet deine Gründung wirklich?",
    category: "finanzen",
    minutes: 5,
    intro:
      "Die meisten Gründungen scheitern nicht an der Idee, sondern daran, dass nach 4 Monaten das Geld weg ist. Eine ehrliche Rechnung dauert einen Abend und schützt dich davor.",
    sections: [
      {
        h: "Die 3 Töpfe",
        body: "1. EINMALIG: Ausstattung, Umbau, Kaution, Website, Gewerbeanmeldung. 2. MONATLICH: Miete, Versicherungen, Software, Material, Marketing. 3. DEIN LEBEN: Miete privat, Essen, Krankenkasse (als Selbständiger ~200–400 €/Monat Minimum!). Topf 3 vergessen die meisten.",
      },
      {
        h: "Die 6-Monats-Regel",
        body: "Rechne: Einmalkosten + 6 × (Monatskosten + private Lebenskosten) − realistischer Umsatz der ersten 6 Monate (im Zweifel: halbiere deine Schätzung). Das Ergebnis ist dein Kapitalbedarf. Beispiel Webdesign-Agentur: oft nur 5–10k. Beispiel Padelhalle: eher 100k+ — dann brauchst du Partner oder Bank.",
      },
      {
        h: "Puffer ist kein Luxus",
        body: "Plane 20 % auf alles drauf. Der Handwerker kommt später, die Kaution ist höher, der erste Kunde zahlt in 45 statt 14 Tagen. Immer.",
      },
      {
        h: "Was die Zahl dir sagt",
        body: "Unter 10k: mit Erspartem + Gründungszuschuss machbar, leg los. 10–50k: Mikrokredit oder KfW-StartGeld. Über 50k: Businessplan professionalisieren, Bank + Förderbank kombinieren, eventuell Partner mit Kapital suchen (Swipe-Deck!).",
      },
    ],
  },
  {
    slug: "erste-kunden",
    title: "Die ersten 10 Kunden — ohne Werbebudget",
    category: "gruendung",
    minutes: 5,
    intro:
      "Deine ersten Kunden kommen nicht über Instagram-Ads. Sie kommen über Menschen, die dich kennen — und über den Mut, direkt zu fragen.",
    sections: [
      {
        h: "Fang bei den Warmen an",
        body: "Schreib eine Liste: 30 Menschen, die dich kennen und denen du in einem Satz erklären kannst, was du jetzt machst. Schick jedem eine persönliche Nachricht (keine Massenmail!): „Ich mache jetzt X. Kennst du jemanden, der das braucht?“ — Die Frage nach der EMPFEHLUNG ist leichter als die Frage nach dem Auftrag.",
      },
      {
        h: "Der Referenz-Deal",
        body: "Die ersten 2–3 Aufträge: mach sie günstiger (nicht kostenlos!) gegen zwei Dinge — eine Bewertung/Referenz mit Foto und die Erlaubnis, das Ergebnis öffentlich zu zeigen. Danach nie wieder Rabatt ohne Gegenleistung.",
      },
      {
        h: "Sei da, wo deine Kunden ohnehin sind",
        body: "Handwerker: lokale Facebook-Gruppen + nebenan.de + Google-Unternehmensprofil (Pflicht, 20 Minuten Setup!). Padelhalle: Sportvereine, Firmen-Events, lokale Presse liebt Eröffnungen. Agentur: LinkedIn-Beiträge über echte Projekte, keine Buzzwords.",
      },
      {
        h: "Die eine Kennzahl",
        body: "Zähl Gespräche, nicht Follower. 5 echte Gespräche pro Woche mit möglichen Kunden schlagen jede Marketing-Kampagne. Wenn du nach 20 Gesprächen keinen Auftrag hast, ist es nicht das Marketing — dann stimmt Angebot oder Preis nicht. Das ist eine gute Erkenntnis, keine schlechte.",
      },
    ],
  },
  {
    slug: "preise-kalkulieren",
    title: "Preise, von denen du leben kannst",
    category: "finanzen",
    minutes: 4,
    intro:
      "Der häufigste Gründerfehler: Preise am „Gefühl“ oder an der Konkurrenz festmachen — und nach einem Jahr merken, dass man für 8 € netto die Stunde arbeitet.",
    sections: [
      {
        h: "Rückwärts rechnen",
        body: "Was willst du netto verdienen? Sagen wir 3.000 €/Monat. Dazu: ~40 % Steuern/Sozialabgaben/Krankenkasse und deine Betriebskosten. Du musst also eher 5.500–6.000 € Umsatz machen. Bei realistisch 100 verrechenbaren Stunden im Monat (der Rest ist Akquise, Orga, Fahrt) heißt das: 55–60 €/Stunde. NICHT 25.",
      },
      {
        h: "Pakete schlagen Stundensätze",
        body: "Kunden hassen offene Stundenzähler. Bau 2–3 Pakete („Website Basis 1.900 €“, „Court-Stunde 34 €“, „Badsanierung Komplettpreis“) — du verkaufst Ergebnis statt Zeit und kannst effizienter werden, ohne weniger zu verdienen.",
      },
      {
        h: "Der Preiserhöhungs-Trick für Anfänger",
        body: "Nenne jedem neuen Kunden einen etwas höheren Preis als dem letzten, bis 3 von 10 nein sagen. Vorher bist du zu billig. Bestandskunden erhöhst du jährlich moderat mit Ansage.",
      },
    ],
  },
  {
    slug: "versicherungen-gruender",
    title: "Welche Versicherungen du wirklich brauchst",
    category: "recht",
    minutes: 4,
    intro:
      "Es gibt zwei Versicherungen, ohne die du nicht starten solltest — und fünf, die dir Vertreter aufschwatzen wollen. Hier ist die ehrliche Liste.",
    sections: [
      {
        h: "Pflicht fürs Gefühl UND fürs Konto",
        body: "1. BETRIEBSHAFTPFLICHT (80–300 €/Jahr für kleine Betriebe): Wenn beim Kunden etwas kaputt geht oder sich jemand verletzt, bist du sonst existenziell dran. Bei Publikumsverkehr (Halle!) absolut nicht verhandelbar. 2. KRANKENVERSICHERUNG: Als Selbständiger bist du selbst zuständig — freiwillig gesetzlich (einkommensabhängig, ~200–900 €/Monat) oder privat. Nicht aufschieben.",
      },
      {
        h: "Sinnvoll je nach Lage",
        body: "Berufshaftpflicht/Vermögensschadenhaftpflicht (Berater, Agenturen — wenn dein Fehler den Kunden Geld kostet), Inhaltsversicherung (teure Ausstattung/Maschinen), Berufsunfähigkeit (wenn dein Körper dein Kapital ist — Handwerk!).",
      },
      {
        h: "Kann warten",
        body: "Rechtsschutz, Cyber-Versicherung, Firmenrechtschutz, betriebliche Altersvorsorge-Konstrukte. Erst wenn Umsatz da ist. Ein Versicherungsmakler (nicht Vertreter einer einzelnen Gesellschaft!) vergleicht kostenlos.",
      },
    ],
  },
  {
    slug: "steuern-basics",
    title: "Steuern für Gründer — das Minimum, das du wissen musst",
    category: "finanzen",
    minutes: 6,
    intro:
      "Du musst kein Steuerprofi werden. Du musst nur drei Dinge verstehen, eine Entscheidung treffen und eine Gewohnheit aufbauen.",
    sections: [
      {
        h: "Entscheidung: Kleinunternehmerregelung",
        body: "Unter 25.000 € Umsatz im Vorjahr (Grenze seit 2025) kannst du auf Umsatzsteuer verzichten: keine 19 % auf deine Rechnungen, keine Voranmeldungen. GUT bei Privatkunden (du bist effektiv billiger). SCHLECHT bei Geschäftskunden mit hohen eigenen Investitionen (du bekommst keine Vorsteuer zurück). Faustregel: Privatkunden → ja, B2B mit großen Anschaffungen → nein.",
      },
      {
        h: "Die 30-%-Gewohnheit",
        body: "Von jedem Geldeingang sofort 30 % auf ein separates Unterkonto. Das ist dein Steuer-Topf für Einkommensteuer-Nachzahlung und Vorauszahlungen. Die böseste Gründer-Überraschung ist der Steuerbescheid im zweiten Jahr — mit diesem Topf ist er langweilig.",
      },
      {
        h: "Belege: digital und sofort",
        body: "Jede Rechnung, jeder Beleg in eine App/einen Ordner am Tag des Entstehens (Lexoffice, sevdesk o.ä. ab ~10 €/Monat — zahlt sich ab Tag 1 aus). Die EÜR (Einnahmen-Überschuss-Rechnung) reicht als Gewinnermittlung, solange du kein Handelsregister-Kaufmann bist.",
      },
      {
        h: "Wann ein Steuerberater lohnt",
        body: "Spätestens ab ~30.000 € Gewinn, bei Mitarbeitern oder GmbH sofort. Vorher reicht oft: Software + einmal jährlich eine Beratungsstunde zum Gegencheck (~150–250 €). Beim ersten Fragebogen des Finanzamts hilft auch die kostenlose IHK-Beratung.",
      },
    ],
  },
  {
    slug: "cofounder-finden",
    title: "Den richtigen Mitgründer finden (und prüfen)",
    category: "team",
    minutes: 5,
    intro:
      "Ein Mitgründer ist die wichtigste Personalentscheidung deines Lebens — wichtiger als jede Ehe, sagen manche. So findest und testest du, bevor ihr euch bindet.",
    sections: [
      {
        h: "Such Komplement, nicht Kopie",
        body: "Der Reflex ist, jemanden zu suchen, der ist wie du. Falsch: Du brauchst, was dir FEHLT. Macher sucht Verkäufer. Techie sucht Kundenversteher. Ideengeber sucht Umsetzer. Im Swipe-Deck zeigt dir der Match-Wert genau diese Komplementarität.",
      },
      {
        h: "Das 15-Minuten-Erstgespräch",
        body: "Drei Fragen, die alles zeigen: 1. „Wie viele Stunden pro Woche kannst du WIRKLICH?“ 2. „Wie lange kannst du ohne Einkommen daraus leben?“ 3. „Was machst du, wenn wir nach 6 Monaten keinen Kunden haben?“ Ehrliche Antworten > beeindruckende Antworten.",
      },
      {
        h: "Erst ein Projekt, dann die Ringe",
        body: "Bevor ihr irgendetwas unterschreibt: Baut 2–4 Wochen ein Mini-Projekt zusammen. Eine Landingpage, zehn Kundengespräche, ein Marktstand-Wochenende. Wie jemand unter kleinem Druck arbeitet, kommuniziert und Zusagen hält, siehst du nur in echt.",
      },
      {
        h: "Dann: alles auf 2 Seiten",
        body: "Anteile (Tipp: Fairness nach Einsatz, nicht automatisch 50/50), wer entscheidet was, was passiert beim Ausstieg (Vesting-Gedanke: Anteile wachsen über 2–4 Jahre, wer früh geht, nimmt nicht alles mit). Eine einfache GbR-Vereinbarung reicht am Anfang — Hauptsache schriftlich, BEVOR es ernst wird.",
      },
    ],
  },
  {
    slug: "businessplan-light",
    title: "Der 5-Seiten-Businessplan, den Banken akzeptieren",
    category: "gruendung",
    minutes: 5,
    intro:
      "Für Gründungszuschuss, Mikrokredit oder Bankgespräch brauchst du keinen 40-Seiten-Roman. Du brauchst fünf Abschnitte, die zeigen: Du hast nachgedacht und gerechnet.",
    sections: [
      {
        h: "Seite 1: Was und für wen",
        body: "Dein Angebot in 3 Sätzen. Deine Zielgruppe so konkret wie möglich („Padel-Neugierige 25–45 im Kölner Westen“, nicht „sportinteressierte Menschen“). Warum bei DIR kaufen — ein Satz Ehrlichkeit reicht: näher, schneller, persönlicher, spezialisierter.",
      },
      {
        h: "Seite 2: Markt und Wettbewerb",
        body: "Wer macht das schon in deiner Region? (Google Maps + 1 Stunde Recherche.) Was kosten die? Was machst du anders? Keine erfundenen Milliarden-Marktgrößen — lokale, ehrliche Einschätzung überzeugt Sachbearbeiter mehr.",
      },
      {
        h: "Seite 3: Du",
        body: "Warum kannst DU das? Ausbildung, Erfahrung, erste Erfolge, dein Netzwerk. Lücken ehrlich benennen + wie du sie schließt (Partner, Kurs, Beratung). Das wirkt stärker als Perfektion.",
      },
      {
        h: "Seite 4–5: Die Zahlen",
        body: "Startkosten (Guide „Was kostet deine Gründung“), monatliche Kosten, Preise, realistische Umsatzentwicklung über 24 Monate (Monat 1 ist fast immer nahe null!), und dein privater Finanzbedarf. Banken prüfen vor allem: Reicht es zum Leben, und ist die Annahme plausibel?",
      },
      {
        h: "Abkürzung",
        body: "Lass den Plan kostenlos von der IHK/HWK gegenlesen, bevor du ihn einreichst — die kennen die Anforderungen der Arbeitsagentur und Banken und sagen dir genau, wo es hakt. Der Co-Pilot hilft dir beim Formulieren jedes Abschnitts.",
      },
    ],
  },
  {
    slug: "exist-kompakt",
    title: "EXIST kompakt — nur falls du aus der Uni gründest",
    category: "foerderung",
    minutes: 4,
    intro:
      "EXIST ist DAS Programm für innovative Gründungen aus Hochschulen: bis ~125.000 € Stipendium. Aber es passt nur auf wenige — hier der ehrliche Schnellcheck.",
    sections: [
      {
        h: "Der 60-Sekunden-Check",
        body: "Du brauchst ALLE drei: 1. Hochschulbezug (Studium/Abschluss/Mitarbeit, Uni als Träger), 2. einen innovativen, meist technischen Kern (nicht: Agentur, Laden, lokale Dienstleistung), 3. noch keine Gründung vollzogen. Fehlt eins → Guide „Förderung für kleine Gründungen“ ist dein Weg.",
      },
      {
        h: "Was es gibt",
        body: "12 Monate Stipendium pro Kopf (1.000–3.000 €/Monat je nach Abschluss), bis 30.000 € Sachmittel, 5.000 € Coaching. Team bis 3 Personen. Kein Anteilsverlust, keine Rückzahlung.",
      },
      {
        h: "So läuft der Antrag",
        body: "1. Gründungsnetzwerk deiner Hochschule kontaktieren (jede Uni hat eins — das ist dein Pflicht-Erstkontakt). 2. Ideenpapier (~10 Seiten) mit Mentor:in aus der Hochschule. 3. Einreichung über die Hochschule beim Projektträger. Rechne 2–4 Monate bis Bewilligung. Auf der Förderung-Seite füllt der Co-Pilot das Antragspaket mit dir aus.",
      },
    ],
  },
];

export function guidesByCategory(category: GuideCategory | "alle"): Guide[] {
  if (category === "alle") return GUIDES;
  return GUIDES.filter((g) => g.category === category);
}

export function searchGuides(query: string): Guide[] {
  const q = query.trim().toLowerCase();
  if (!q) return GUIDES;
  return GUIDES.filter(
    (g) =>
      g.title.toLowerCase().includes(q) ||
      g.intro.toLowerCase().includes(q) ||
      g.sections.some((s) => s.h.toLowerCase().includes(q) || s.body.toLowerCase().includes(q)),
  );
}

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
