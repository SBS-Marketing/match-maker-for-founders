---
name: matchfoundr-loop
description: >
  Autonome Entwicklungsschleife für matchfoundr. Hermes (Executive) entscheidet und verteilt Aufgaben,
  developer setzt um, founding-engineer reviewt, grüne Arbeit wird nach main übernommen, die App wird
  zwischendurch getestet, danach fragt Hermes marketing-strategist und founding-engineer nach dem
  nächsten Schritt und entscheidet erneut. Einsetzen, wenn der User die Schleife starten, fortsetzen
  oder den Stand der Schleife wissen will ("weiter", "nächster Zyklus", "lauf weiter", /loop).
---

# matchfoundr-loop

Eine Runde Produktarbeit, von der Entscheidung bis zur Übernahme in Web und iOS — wiederholbar.

## Wie das läuft (wichtig)

**Die Schleife läuft in der Hauptsession, nicht in Hermes.** Subagenten können keine Subagenten starten. Hermes *entscheidet und formuliert Aufträge*; du (Hauptsession) startest die Agenten über das Agent-Tool, sammelst die Ergebnisse ein und gibst sie zurück an Hermes. Du bist die Verkabelung, Hermes ist das Urteil. Du überstimmst ihn nicht — außer eine Regel unter „Harte Regeln" greift.

Verfügbare Agenten: `hermes` · `founding-engineer` · `developer` · `marketing-strategist` · `content-scout`.

## Zustand

Zwei Dateien, beide für den User lesbar:

- `.claude/orchestrator/board.md` — offene, laufende, erledigte, geparkte Aufgaben
- `.claude/orchestrator/log.md` — append-only: pro Zyklus die Entscheidung, was übernommen wurde, was schiefging

**Immer zuerst beide lesen.** Existiert `board.md` nicht, ist das Zyklus 1 — leg es aus der Vorlage in diesem Skill-Ordner an.

---

## Der Zyklus

### 1 · Lage

Fakten sammeln, bevor irgendwer entscheidet:

```bash
git status --short && git branch --list && git log --oneline -15
```

Dazu `board.md`, `log.md` (letzte 2 Zyklen) und — wenn seit dem letzten Zyklus Code gefallen ist — `bun run lint` und `bun run build`.

### 2 · Hermes entscheidet

Starte `hermes` mit: Lage aus Schritt 1, dem Board, den letzten Log-Einträgen und (ab Zyklus 2) den Vorschlägen aus Schritt 7 des Vorzyklus.

Zurück kommt ein Pitch im Hermes-Format. Daraus nimmst du: **die Entscheidung** und **die Aufgabenliste mit Zuständigkeit**.

Enthält der Pitch eine Frage unter „Von dir brauche ich", die keine reine Höflichkeitsfrage ist → **anhalten, dem User zeigen, warten.** Der Loop läuft nicht über offene Entscheidungen hinweg.

### 3 · Verteilen

Jede Aufgabe an den benannten Agenten, **parallel in einem Block**, wenn sie sich nicht dieselben Dateien teilen. Teilen sie sich Dateien: nacheinander.

Jeder Auftrag enthält:
- was gebaut wird und was ausdrücklich nicht
- Akzeptanzkriterien (woran man Fertigsein erkennt)
- Branchname `loop/<zyklus>-<kurzname>` — **nie direkt auf `main`**
- der Verifikationsschritt, den der Agent selbst fahren soll

Board auf `läuft` setzen.

### 4 · Rückmeldung prüfen

`founding-engineer` bekommt den Diff (`git diff main...<branch>`) plus die Akzeptanzkriterien und reviewt.

- **Passt** → Schritt 5.
- **Passt nicht** → konkretes Feedback zurück an den ausführenden Agenten, eine zweite Runde. Danach ist Schluss: Aufgabe auf `geparkt` mit Begründung, weiter im Zyklus. Keine dritte Runde — das war im alten Paperclip-Setup die Endlosschleife.

### 5 · Übernahme

Erst die Gates, dann der Merge. Nie umgekehrt.

```bash
bun run lint && bun run build
```

Beides grün → auf `main` mergen und dort noch einmal bauen. Danach Branch löschen.

Wurde unter `ios/` etwas geändert, zusätzlich vor dem Merge:

```bash
xcodebuild -project ios/Matchfoundr.xcodeproj -scheme Matchfoundr \
  -destination 'platform=iOS Simulator,id=7F2BCAA3-8AB3-4D64-9B50-B99B8B893C99' \
  -derivedDataPath /tmp/mf-build build
```

Ein rotes Gate wird gemeldet, nie umgangen. Der Branch bleibt dann liegen, die Aufgabe geht auf `geparkt`.

**Der Merge bleibt lokal. Kein `git push`, kein Deploy.** Siehe Harte Regeln.

### 6 · App testen

**Web — jeden Zyklus**, in dem Web-Code angefasst wurde: Preview über `preview_start` (`matchfoundr-dev`), die betroffenen Routen aufrufen, Konsole und Netzwerk auf Fehler prüfen, bei sichtbaren Änderungen ein Screenshot als Beleg.

**iOS — jeden dritten Zyklus** oder immer, wenn `ios/` angefasst wurde: bauen, im Simulator starten, die fünf Tabs durchgehen, Screenshot. Onboarding/Today liegen hinter Auth — Einloggen ist tabu, stattdessen `MF_PREVIEW_TODAY=1` nutzen und den Preview-Branch danach zurücksetzen.

Gefundene Fehler wandern als neue Aufgabe aufs Board, nicht in eine spontane Nebenreparatur.

### 7 · Nächster Schritt einholen

`marketing-strategist` und `founding-engineer` **parallel** fragen: „Was ist nach diesem Zyklus der nächste sinnvolle Schritt und warum?" Beide bekommen den Stand aus Schritt 1–6. Jede Antwort: max. drei Vorschläge, priorisiert, mit Begründung.

Jeden vierten Zyklus zusätzlich `content-scout` für den Inhaltsstand.

### 8 · Abschluss

`board.md` aktualisieren, `log.md` um einen Eintrag ergänzen:

```
## Zyklus N — <Datum>
Entscheidung: <ein Satz>
Übernommen: <Branches/Dateien>  ·  Geparkt: <mit Grund>
Getestet: <Web/iOS, was geprüft wurde>
Nächste Vorschläge: <Marketing / Engineering, je ein Satz>
```

Dann dem User in **maximal zehn Zeilen** berichten: was entschieden, was gebaut, was übernommen, was geparkt, was als nächstes ansteht. Keine Wall of Text — er hat den Log, wenn er Details will.

Danach zurück zu Schritt 1.

---

## Stoppbedingungen

Anhalten und den User fragen bei:

- **Ein-Weg-Tür** — Push, Deploy, App-Store-Einreichung, Pricing, Domain, Zielgruppenwechsel, Datenmigration, alles Öffentliche.
- **Offene Frage von Hermes** aus Schritt 2.
- **Zwei rote Gates hintereinander** — irgendwas Grundsätzliches ist kaputt, weiterschleifen macht es schlimmer.
- **Board leer und Hermes hat keinen belegbaren nächsten Schritt.** Dann ehrlich sagen: nichts zu tun, das ist ein Ergebnis.
- **Externes Konto, Secret oder Bezahltes nötig.**

## Harte Regeln

- **Kein Deploy, kein Push.** Übernahme heißt: gemergt auf lokales `main`, Build grün. Netlify/Cloudflare hängen an `main` — ein Push wäre ein Live-Deploy und damit die Entscheidung des Users, nicht deine. Willst du das ändern, steht die Regel genau hier und nirgends sonst.
- **Edge Functions nur per CLI** (`npx supabase functions deploy … --project-ref rzmcoxnfcpqqyxgkafwk`), nie über den Supabase-MCP mit reproduziertem Inhalt. Das hat die Live-`copilot`-Function schon einmal zerstört. Und auch das ist Deploy, also Stoppbedingung.
- **Ein Branch pro Aufgabe.** Nie mehrere Agenten im selben Working Tree auf `main` — genau daran ist das Paperclip-Setup gestorben.
- **Rot ist rot.** Ein fehlgeschlagenes Gate wird berichtet, nicht weggeredet und nicht mit `--force` umgangen.
- **Nichts löschen**, was nicht in diesem Zyklus entstanden ist.
- **Maximal zwei Review-Runden** pro Aufgabe, dann parken.
- **Der Code gilt**, nicht ältere Doku. Bei Widerspruch: `AGENTS.md` und die Quelldateien schlagen jede Beschreibung.

## Dauerbetrieb

Ein Aufruf = ein Zyklus. Für mehrere hintereinander:

```bash
/loop 30m /matchfoundr-loop
```

Ohne Intervall taktet sich der Loop selbst. Gestoppt wird mit `/loop stop` oder indem der User es sagt — eine Stoppbedingung hält ohnehin von selbst an.
