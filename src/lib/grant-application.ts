import type { Grant } from "@/data/grants";
import type { PlanContext } from "@/lib/plan-draft";

export type GrantApplicationField = {
  label: string;
  value: string;
  source: string;
  status: "filled" | "needs_review" | "missing";
};

export type GrantApplicationSection = {
  id: string;
  title: string;
  body: string;
  status: "ready" | "draft" | "missing";
};

export type GrantMaterialDraft = {
  title: string;
  type: "document" | "form" | "email" | "checklist" | "budget";
  status: "ready" | "draft" | "missing";
  body: string;
};

export type GrantApplicationPackage = {
  grantSlug: string;
  grantName: string;
  title: string;
  fillPct: number;
  createdAt: string;
  fields: GrantApplicationField[];
  sections: GrantApplicationSection[];
  materials: GrantMaterialDraft[];
  missing: string[];
  nextSteps: string[];
  markdown: string;
};

export type GrantCompletionQuestion = {
  id: string;
  missingItem: string;
  question: string;
  hint: string;
};

export type GrantCompletionAnswer = {
  missingItem: string;
  question: string;
  answer: string;
};

type RemoteDocument = {
  content?: string | null;
  fillPct?: number | null;
  missingFields?: string[] | null;
};

export function buildGrantApplicationPackage(
  grant: Grant,
  context: PlanContext | null,
  remote?: RemoteDocument,
): GrantApplicationPackage {
  const c = context?.context ?? {};
  const venture = clean(context?.ventureTerm) || "Vorhaben";
  const partner = clean(context?.partnerTerm) || "Co-Founder";
  const idea = clean(c.idea) || `dein ${venture}`;
  const role = clean(c.role) || "Founder";
  const stage = clean(c.stage) || grant.stage?.[0] || "fruehe Phase";
  const goal = clean(c.goal) || "Pilotkunden, Team und Finanzierung strukturiert voranbringen";
  const risk = clean(c.risk) || "noch nicht sauber dokumentiert";
  const city = context?.industryLabel || inferCityFromText(`${role} ${idea}`) || "noch offen";
  const isExist = isExistGrant(grant);
  const isBerlin = (grant.region || "").toLowerCase().includes("berlin");

  const missing = unique([
    ...((remote?.missingFields ?? []).filter(Boolean) as string[]),
    ...(!clean(c.idea) ? ["Vorhaben in einem Satz"] : []),
    ...(!clean(c.stage) ? ["Aktueller Entwicklungsstand"] : []),
    ...(!clean(c.goal) ? ["Konkretes Ziel der Foerderperiode"] : []),
    ...(isExist
      ? [
          "Betreuende Hochschule/Forschungseinrichtung",
          "Mentor oder Lehrstuhl",
          "Gruendungsstatus vor Antragstellung",
        ]
      : []),
    ...(isBerlin && !city.toLowerCase().includes("berlin")
      ? ["Berlin-Bezug/Sitz des Vorhabens"]
      : []),
    "Vollstaendige CVs aller Teammitglieder",
    "Kostenpositionen mit Angeboten oder belastbaren Schaetzungen",
  ]);

  const fields: GrantApplicationField[] = [
    filled("Programm", grant.name, "Foerderdaten"),
    filled("Traeger", grant.body, "Foerderdaten"),
    field("Vorhaben", idea, clean(c.idea) ? "Onboarding" : "Co-Pilot Platzhalter"),
    field("Rolle / Team-Setup", role, clean(c.role) ? "Onboarding" : "Co-Pilot Platzhalter"),
    field("Entwicklungsstand", stage, clean(c.stage) ? "Onboarding" : "Foerderprofil"),
    field("Standort / Bezug", city, city === "noch offen" ? "zu ergaenzen" : "Kontext"),
    field("Ziel der Foerderperiode", goal, clean(c.goal) ? "Onboarding" : "Co-Pilot Vorschlag"),
    field("Haupterisiko", risk, clean(c.risk) ? "Onboarding" : "Co-Pilot Warnung"),
    filled("Foerdervolumen", grant.amount, "Foerderdaten"),
    filled("Laufzeit", grant.duration, "Foerderdaten"),
    filled("Deadline", grant.deadline, "Foerderdaten"),
  ];

  const sections: GrantApplicationSection[] = [
    {
      id: "summary",
      title: "Kurzbeschreibung / Executive Summary",
      status: clean(c.idea) ? "ready" : "draft",
      body: `${idea} adressiert ein klar abgrenzbares Problem in einer fruehen, foerderfaehigen Aufbauphase. Das Vorhaben befindet sich aktuell in "${stage}" und soll in der Foerderperiode auf ${goal} ausgerichtet werden. Der Antrag fokussiert auf belastbare Problemvalidierung, Umsetzung eines pruefbaren MVPs, erste Markt-/Partnernachweise und die Reduktion des Risikos: ${risk}.`,
    },
    {
      id: "innovation",
      title: isExist
        ? "Innovationsgrad und wissenschaftlich-technischer Kern"
        : "Innovation und Mehrwert",
      status: "draft",
      body: isExist
        ? `Der Innovationskern von ${idea} muss im Antrag als nachvollziehbarer technischer oder wissenschaftlicher Neuheitsgrad beschrieben werden. Der Co-Pilot schlaegt vor, den Kern entlang von drei Belegen zu formulieren: bestehende Loesungen und deren Grenzen, eigener Loesungsansatz, messbarer Vorteil fuer die Zielgruppe. Offene Belege: Wettbewerbsvergleich, technische Architektur, Schutz-/Datenstrategie.`
        : `${idea} sollte als konkreter Mehrwert gegen bestehende Alternativen positioniert werden. Der Entwurf beschreibt Problem, Zielgruppe, Loesung, Differenzierung und den kleinsten messbaren Nachweis, der waehrend der Foerderperiode erreicht wird.`,
    },
    {
      id: "market",
      title: "Zielgruppe, Markt und Validierung",
      status: "draft",
      body: `Primaere Zielgruppe und erste Nutzungsfaelle werden aus dem aktuellen Kontext abgeleitet. Fuer den Antrag sollten mindestens 5-10 Zielkunden- oder Partnergespraeche, ein klarer Zahlungs-/Nutzennachweis und eine kurze Wettbewerbslandkarte ergaenzt werden. Das Ziel lautet: ${goal}.`,
    },
    {
      id: "team",
      title: "Team, Rollen und fehlende Kompetenzen",
      status: clean(c.role) ? "draft" : "missing",
      body: `Aktueller Ausgangspunkt: ${role}. Der Antrag sollte die Rollen im Kernteam, relevante Skills, Verfuegbarkeit und die Luecke beschreiben, fuer die matchfoundr ${partner}-Matching oder Advisor-Unterstuetzung liefert. Lebenslaeufe bleiben als Pflichtanlage separat nachzureichen.`,
    },
    {
      id: "workplan",
      title: "Arbeits- und Meilensteinplan",
      status: "ready",
      body: `Monat 1-2: Validierung und Antrags-/Partnerbasis finalisieren. Monat 3-5: MVP oder Projektkern umsetzen, erste Nutzertests starten. Monat 6-8: Marktnachweise, Pilotpartner und Feedbackschleifen verdichten. Monat 9-12: Skalierungs-/Gruendungsschritte, Folgefinanzierung und Abschlussdokumentation vorbereiten.`,
    },
    {
      id: "budget",
      title: "Finanzplan / Mittelverwendung",
      status: "draft",
      body: `Das beantragte Volumen (${grant.amount}) wird in Personalkosten/Stipendium, Sachmittel, Software/Cloud, Markttests, rechtliche Beratung und Coaching aufgeteilt. Konkrete Kostenpositionen muessen noch mit Angeboten oder plausiblen Schaetzungen hinterlegt werden.`,
    },
  ];

  if (remote?.content) {
    sections.unshift({
      id: "ai-document",
      title: "KI-Entwurf aus Co-Pilot Backend",
      status: "draft",
      body: remote.content.trim(),
    });
  }

  const materials: GrantMaterialDraft[] = [
    {
      title: "Antragsformular: vorausgefuellte Felder",
      type: "form",
      status: "ready",
      body: fields.map((f) => `${f.label}: ${f.value}`).join("\n"),
    },
    {
      title: isExist ? "EXIST-Ideenpapier" : "Projektskizze",
      type: "document",
      status: "draft",
      body: sections.map((s) => `## ${s.title}\n${s.body}`).join("\n\n"),
    },
    {
      title: "Finanzplan Grundgeruest",
      type: "budget",
      status: "draft",
      body: [
        "| Position | Zeitraum | Betrag | Status |",
        "| --- | --- | ---: | --- |",
        "| Lebenshaltung / Team | 12 Monate | [AUSFUELLEN] | Angebot/Beleg fehlt |",
        "| Sachmittel / Tools | 12 Monate | [AUSFUELLEN] | Schaetzung pruefen |",
        "| Coaching / Beratung | 12 Monate | [AUSFUELLEN] | Programmgrenzen pruefen |",
        "| Markttests / Pilotierung | 6-12 Monate | [AUSFUELLEN] | Kosten belegen |",
      ].join("\n"),
    },
    {
      title: isExist ? "Hochschul-Anfrage fuer Letter of Intent" : "Partner-/Traeger-Anfrage",
      type: "email",
      status: isExist ? "draft" : "ready",
      body: buildPartnerEmail(grant, idea, stage, goal, isExist),
    },
    {
      title: "Anlagen-Checkliste",
      type: "checklist",
      status: "ready",
      body: [
        ...grant.materials.map((m) => `- [${m.done ? "x" : " "}] ${m.item}`),
        "- [ ] Team-CVs als PDF",
        "- [ ] Kosten-/Angebotsnachweise",
        "- [ ] Nachweis Hochschul-/Standortbezug falls erforderlich",
        "- [ ] Finaler Review gegen offizielle Programmseite",
      ].join("\n"),
    },
  ];

  const fillPct = Math.min(
    100,
    Math.max(remote?.fillPct ?? grant.prefilled, 100 - missing.length * 6),
  );
  const nextSteps = [
    isExist
      ? "Hochschule oder Gruendungszentrum als Antragstraeger festlegen."
      : "Offizielles Antragsportal oeffnen und Pflichtfelder gegenchecken.",
    "Fehlende Angaben im Paket nacheinander ersetzen, keine Platzhalter einreichen.",
    "Finanzplan mit realen Angeboten/Schaetzungen belegen.",
    "Paket vor Einreichung fachlich und formal pruefen lassen.",
  ];

  const pkg: GrantApplicationPackage = {
    grantSlug: grant.slug,
    grantName: grant.name,
    title: `${grant.name} Antragspaket`,
    fillPct,
    createdAt: new Date().toISOString(),
    fields,
    sections,
    materials,
    missing,
    nextSteps,
    markdown: "",
  };
  pkg.markdown = buildGrantApplicationMarkdown(pkg);
  return pkg;
}

export function buildGrantApplicationMarkdown(pkg: GrantApplicationPackage): string {
  const lines = [
    `# ${pkg.title}`,
    "",
    `Erstellt: ${new Date(pkg.createdAt).toLocaleString("de-DE")}`,
    `Ausfuellgrad: ${pkg.fillPct}%`,
    "",
    "## Vorausgefuellte Felder",
    "",
    "| Feld | Wert | Quelle | Status |",
    "| --- | --- | --- | --- |",
    ...pkg.fields.map(
      (f) =>
        `| ${escapeTable(f.label)} | ${escapeTable(f.value)} | ${escapeTable(f.source)} | ${f.status} |`,
    ),
    "",
    "## Entwurf",
    "",
    ...pkg.sections.flatMap((s) => [`### ${s.title}`, "", s.body, ""]),
    "## Materialien",
    "",
    ...pkg.materials.flatMap((m) => [`### ${m.title}`, `Status: ${m.status}`, "", m.body, ""]),
    "## Fehlende Angaben",
    "",
    ...(pkg.missing.length
      ? pkg.missing.map((m) => `- [ ] ${m}`)
      : ["- Keine kritischen Luecken erkannt."]),
    "",
    "## Naechste Schritte",
    "",
    ...pkg.nextSteps.map((s) => `- ${s}`),
  ];
  return lines.join("\n");
}

export function getGrantCompletionQuestions(
  pkg: GrantApplicationPackage,
  limit = 2,
): GrantCompletionQuestion[] {
  return pkg.missing.slice(0, limit).map((missingItem) => ({
    id: slugify(missingItem),
    missingItem,
    ...questionForMissingItem(missingItem, pkg.grantName),
  }));
}

export function applyGrantCompletionAnswers(
  pkg: GrantApplicationPackage,
  answers: GrantCompletionAnswer[],
): GrantApplicationPackage {
  const usableAnswers = answers
    .map((entry) => ({ ...entry, answer: entry.answer.trim() }))
    .filter((entry) => entry.answer.length > 0);

  if (usableAnswers.length === 0) return pkg;

  const answeredItems = new Set(usableAnswers.map((entry) => entry.missingItem));
  const fields: GrantApplicationField[] = [
    ...pkg.fields,
    ...usableAnswers.map((entry) => ({
      label: entry.missingItem,
      value: entry.answer,
      source: "Co-Pilot Nachfrage",
      status: "filled" as const,
    })),
  ];
  const completionSection: GrantApplicationSection = {
    id: `copilot-help-${Date.now()}`,
    title: "Nachgereichte Co-Pilot-Antworten",
    status: "ready",
    body: usableAnswers.map((entry) => `${entry.missingItem}: ${entry.answer}`).join("\n\n"),
  };
  const sections = [...pkg.sections, completionSection];
  const materials = pkg.materials.map((material) => {
    if (material.type === "form") {
      return { ...material, status: "ready" as const, body: fieldsToText(fields) };
    }
    if (material.type === "document") {
      return {
        ...material,
        body: sections.map((section) => `## ${section.title}\n${section.body}`).join("\n\n"),
      };
    }
    if (material.type === "checklist") {
      return {
        ...material,
        body: [
          material.body,
          ...usableAnswers.map((entry) => `- [x] ${entry.missingItem} beantwortet`),
        ].join("\n"),
      };
    }
    return material;
  });

  const next: GrantApplicationPackage = {
    ...pkg,
    fillPct: Math.min(100, pkg.fillPct + usableAnswers.length * 7),
    fields,
    sections,
    materials,
    missing: pkg.missing.filter((item) => !answeredItems.has(item)),
  };
  return { ...next, markdown: buildGrantApplicationMarkdown(next) };
}

export function downloadGrantApplicationPackage(pkg: GrantApplicationPackage): void {
  if (typeof document === "undefined") return;
  const blob = new Blob([pkg.markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${slugify(pkg.grantName)}-antragspaket.md`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

// ─────────────────────────────────────────────────────────────
// Editierbares Antragsformular
// Aus dem generierten Paket wird ein bearbeitbarer Draft, dessen
// Werte der Nutzer überschreibt. Persistiert pro Grant in localStorage.
// ─────────────────────────────────────────────────────────────

export type GrantFormField = {
  key: string;
  label: string;
  value: string;
  source: string;
  locked: boolean; // Programmdaten (Volumen, Deadline …) — nicht editierbar
};

export type GrantFormSection = {
  id: string;
  title: string;
  body: string;
};

export type GrantFormDraft = {
  grantSlug: string;
  grantName: string;
  title: string;
  updatedAt: string;
  fields: GrantFormField[];
  sections: GrantFormSection[];
};

const FORM_DRAFT_PREFIX = "mf_grant_form_v1:";
const LOCKED_FIELD_LABELS = new Set([
  "Programm",
  "Traeger",
  "Foerdervolumen",
  "Laufzeit",
  "Deadline",
]);

export function buildGrantFormDraft(pkg: GrantApplicationPackage): GrantFormDraft {
  return {
    grantSlug: pkg.grantSlug,
    grantName: pkg.grantName,
    title: pkg.title,
    updatedAt: new Date().toISOString(),
    fields: pkg.fields.map((f) => ({
      key: slugify(f.label),
      label: f.label,
      value: f.status === "missing" ? "" : f.value,
      source: f.source,
      locked: LOCKED_FIELD_LABELS.has(f.label),
    })),
    sections: pkg.sections.map((s) => ({ id: s.id, title: s.title, body: s.body })),
  };
}

// Behält Nutzer-Eingaben, übernimmt aber neue Felder/Abschnitte aus dem frischen Paket.
export function mergeGrantFormDraft(
  base: GrantFormDraft,
  saved: GrantFormDraft | null,
): GrantFormDraft {
  if (!saved) return base;
  const savedFields = new Map(saved.fields.map((f) => [f.key, f.value]));
  const savedSections = new Map(saved.sections.map((s) => [s.id, s.body]));
  return {
    ...base,
    updatedAt: saved.updatedAt,
    fields: base.fields.map((f) =>
      !f.locked && savedFields.has(f.key) && savedFields.get(f.key)!.trim()
        ? { ...f, value: savedFields.get(f.key)! }
        : f,
    ),
    sections: base.sections.map((s) =>
      savedSections.has(s.id) && savedSections.get(s.id)!.trim()
        ? { ...s, body: savedSections.get(s.id)! }
        : s,
    ),
  };
}

function isFilledValue(value: string): boolean {
  const t = (value || "").trim();
  if (!t) return false;
  if (/\[AUSFUELLEN\]/i.test(t)) return false;
  if (/^noch offen$/i.test(t)) return false;
  return t.length > 1;
}

export function computeFormFillPct(draft: GrantFormDraft): number {
  const flags = [
    ...draft.fields.map((f) => isFilledValue(f.value)),
    ...draft.sections.map((s) => isFilledValue(s.body)),
  ];
  if (!flags.length) return 0;
  return Math.round((flags.filter(Boolean).length / flags.length) * 100);
}

export function listOpenItems(draft: GrantFormDraft): string[] {
  return [
    ...draft.fields.filter((f) => !f.locked && !isFilledValue(f.value)).map((f) => f.label),
    ...draft.sections.filter((s) => !isFilledValue(s.body)).map((s) => s.title),
  ];
}

export function readGrantFormDraft(slug: string): GrantFormDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${FORM_DRAFT_PREFIX}${slug}`);
    return raw ? (JSON.parse(raw) as GrantFormDraft) : null;
  } catch {
    return null;
  }
}

export function writeGrantFormDraft(draft: GrantFormDraft): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${FORM_DRAFT_PREFIX}${draft.grantSlug}`, JSON.stringify(draft));
  } catch {
    // localStorage kann in restriktiven Browser-Modi fehlen.
  }
}

export function buildDraftMarkdown(draft: GrantFormDraft): string {
  const fillPct = computeFormFillPct(draft);
  const open = listOpenItems(draft);
  const lines = [
    `# ${draft.title}`,
    "",
    `Stand: ${new Date(draft.updatedAt).toLocaleString("de-DE")}`,
    `Ausfuellgrad: ${fillPct}%`,
    "",
    "## Formularfelder",
    "",
    "| Feld | Wert |",
    "| --- | --- |",
    ...draft.fields.map((f) => `| ${escapeTable(f.label)} | ${escapeTable(f.value || "—")} |`),
    "",
    ...draft.sections.flatMap((s) => [`## ${s.title}`, "", s.body || "[noch offen]", ""]),
    "## Noch offen",
    "",
    ...(open.length ? open.map((item) => `- [ ] ${item}`) : ["- Keine offenen Pflichtfelder."]),
  ];
  return lines.join("\n");
}

export function downloadGrantFormDraft(draft: GrantFormDraft): void {
  if (typeof document === "undefined") return;
  const blob = new Blob([buildDraftMarkdown(draft)], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${slugify(draft.grantName)}-antrag.md`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

// Öffnet ein sauberes Druck-Fenster → "Als PDF speichern" im Druckdialog.
export function printGrantForm(draft: GrantFormDraft): void {
  if (typeof window === "undefined") return;
  const win = window.open("", "_blank", "width=820,height=1000");
  if (!win) return;
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const fieldRows = draft.fields
    .map(
      (f) =>
        `<tr><th>${esc(f.label)}</th><td>${esc(f.value || "—")}</td></tr>`,
    )
    .join("");
  const sectionBlocks = draft.sections
    .map(
      (s) =>
        `<section><h2>${esc(s.title)}</h2><p>${esc(s.body || "[noch offen]").replace(/\n/g, "<br>")}</p></section>`,
    )
    .join("");
  win.document.write(`<!doctype html><html lang="de"><head><meta charset="utf-8">
<title>${esc(draft.title)}</title>
<style>
  @page { margin: 22mm 18mm; }
  body { font-family: -apple-system, system-ui, sans-serif; color: #15140f; line-height: 1.5; font-size: 12pt; }
  h1 { font-size: 20pt; margin: 0 0 4px; }
  .meta { color: #777; font-size: 10pt; margin-bottom: 18px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th, td { text-align: left; vertical-align: top; padding: 6px 8px; border-bottom: 1px solid #e5e2d9; font-size: 11pt; }
  th { width: 34%; color: #555; font-weight: 600; }
  section { margin-bottom: 16px; page-break-inside: avoid; }
  h2 { font-size: 13pt; margin: 0 0 4px; border-bottom: 2px solid #e2511c; padding-bottom: 3px; }
  p { margin: 0; white-space: pre-wrap; }
</style></head><body>
  <h1>${esc(draft.title)}</h1>
  <div class="meta">Ausfuellgrad ${computeFormFillPct(draft)}% · Stand ${esc(new Date(draft.updatedAt).toLocaleString("de-DE"))}</div>
  <table>${fieldRows}</table>
  ${sectionBlocks}
</body></html>`);
  win.document.close();
  win.focus();
  win.setTimeout(() => win.print(), 350);
}

function filled(label: string, value: string, source: string): GrantApplicationField {
  return { label, value, source, status: "filled" };
}

function field(label: string, value: string, source: string): GrantApplicationField {
  const missing = value === "noch offen" || source === "zu ergaenzen";
  return {
    label,
    value,
    source,
    status: missing ? "missing" : source.includes("Platzhalter") ? "needs_review" : "filled",
  };
}

function questionForMissingItem(
  missingItem: string,
  grantName: string,
): Pick<GrantCompletionQuestion, "question" | "hint"> {
  const item = missingItem.toLowerCase();
  if (item.includes("hochschule") || item.includes("forschung")) {
    return {
      question:
        "Welche Hochschule, Forschungseinrichtung oder welches Gruendungszentrum kann den Antrag betreuen?",
      hint: "Name reicht erstmal, z.B. TU Berlin, HWR Berlin, Gruendungszentrum X.",
    };
  }
  if (item.includes("mentor") || item.includes("lehrstuhl")) {
    return {
      question: "Wer waere der wahrscheinlichste fachliche Mentor oder Lehrstuhl fuer den Antrag?",
      hint: "Name, Rolle oder ein realistischer Zielkontakt reicht.",
    };
  }
  if (item.includes("gruendung") || item.includes("gründung")) {
    return {
      question: "Wie ist der aktuelle Gruendungsstatus?",
      hint: "Noch nicht gegruendet, UG/GmbH geplant, bereits gegruendet mit Datum, oder unklar.",
    };
  }
  if (item.includes("kosten") || item.includes("finanz") || item.includes("angebot")) {
    return {
      question: "Welche 2-3 groessten Kostenpositionen erwartest du fuer die Foerderperiode?",
      hint: "Zum Beispiel Cloud/Software, Prototyping, Recht, Markttests, Coaching.",
    };
  }
  if (item.includes("cv") || item.includes("lebenslauf")) {
    return {
      question: "Welche Teammitglieder sollen im Antrag auftauchen und welche Rolle haben sie?",
      hint: "Kurz: Name/Rolle/Staerke. CVs koennen spaeter als PDF nachgereicht werden.",
    };
  }
  if (item.includes("berlin") || item.includes("sitz") || item.includes("standort")) {
    return {
      question: "Welchen Standort- oder Berlin-Bezug hat das Vorhaben?",
      hint: "Sitz, geplanter Sitz, Pilotkunden, Hochschule oder Teamstandort.",
    };
  }
  if (item.includes("vorhaben") || item.includes("satz")) {
    return {
      question: `Beschreibe dein Vorhaben fuer ${grantName} in einem Satz.`,
      hint: "Problem, Zielgruppe und Loesung in einem klaren Satz.",
    };
  }
  return {
    question: `Welche Angabe soll Co-Pilot fuer "${missingItem}" eintragen?`,
    hint: "Ein kurzer, konkreter Satz reicht.",
  };
}

function fieldsToText(fields: GrantApplicationField[]): string {
  return fields.map((entry) => `${entry.label}: ${entry.value}`).join("\n");
}

function buildPartnerEmail(
  grant: Grant,
  idea: string,
  stage: string,
  goal: string,
  isExist: boolean,
): string {
  const target = isExist ? "Gruendungszentrum / Lehrstuhl" : "Programm- oder Projektpartner";
  return [
    `Betreff: ${grant.name} - kurze Abstimmung zu Antrag fuer ${idea}`,
    "",
    `Hallo ${target},`,
    "",
    `ich bereite aktuell einen Antrag fuer ${grant.name} vor. Das Vorhaben "${idea}" befindet sich in der Phase "${stage}" und soll in der Foerderperiode auf folgendes Ziel gebracht werden: ${goal}.`,
    "",
    isExist
      ? "Ich wuerde gerne klaeren, ob eine Betreuung als antragstellende Hochschule/Forschungseinrichtung moeglich ist und welche Unterlagen Sie fuer einen ersten Fit-Check benoetigen."
      : "Ich wuerde gerne klaeren, welche formalen Anforderungen fuer die naechste Einreichung kritisch sind und welche Unterlagen zuerst geprueft werden sollten.",
    "",
    "Koennen wir diese Woche einen kurzen Termin fuer einen Vorabcheck finden?",
    "",
    "Viele Gruesse",
  ].join("\n");
}

function isExistGrant(grant: Grant): boolean {
  return `${grant.slug} ${grant.name}`.toLowerCase().includes("exist");
}

function inferCityFromText(text: string): string | null {
  const known = [
    "Berlin",
    "Hamburg",
    "Muenchen",
    "Munich",
    "Koeln",
    "Cologne",
    "Frankfurt",
    "Stuttgart",
    "Leipzig",
    "Dresden",
  ];
  return known.find((city) => text.toLowerCase().includes(city.toLowerCase())) ?? null;
}

function clean(value?: string | null): string {
  return (value || "").trim();
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((v) => v.trim()).filter(Boolean)));
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
