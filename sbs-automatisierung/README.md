# SBS-Sektion „Prozessautomatisierung“ (erweitert)

`automatisierung.html` ist die überarbeitete Sektion „Eine Anfrage. Null Handarbeit.“ für die SBS-Website, im Stil des Voice-Agent-Films.

## Was die Animation zeigt

Eine Schleife (12,4 s) erzählt eine konkrete Anfrage von Anfang bis Ende:

1. **Eingang:** Die E-Mail von Müller Haustechnik kommt an, mit Absender, Betreff und Text.
2. **Verstehen:** Der KI-Agent markiert die Stichworte. Sie heben ab und fliegen als Chips in den Agenten, „drei Standorte“ wird dabei zu „3 Standorte“. Danach: „Anliegen erkannt“.
3. **Ausführen:** Drei Aufgaben laufen parallel.
   - **CRM:** Die Felder werden ausgefüllt.
   - **Angebot:** Das Dokument entsteht, dazu das PDF „A-1042“.
   - **Kalender (neu):** Ein Besichtigungstermin wird reserviert.
4. **Freigabe:** Ein Klick auf „Freigeben“, dann flutet „Versendet“ aus dem Button.
5. **Erledigt:** Das Endbild steht 2,5 s. Dann blendet es aus, der Startzustand blendet ein, und die nächste Anfrage kommt.

Dazu:

- **Verbindungslinien:** Sie zeichnen sich mit einem Lichtpunkt, statt dauernd zu blinken.
- **Live-Protokoll:** Es tippt Zeile für Zeile mit Zeitstempel.
- **Kennzahlen:** „bis zur Freigabe“ zählt live mit, bis 4,9 s. Die Freigabe durch den Vertrieb ist bewusst nicht mitgezählt, im Protokoll steht sie Minuten später. So behauptet die Seite nichts, was ein Mensch in 2 Sekunden tun müsste.

## Bedienung und Barrierefreiheit

- **Schrittleiste 1–5:** Ein Klick springt zum jeweiligen Schritt.
- **Pause-Knopf:** WCAG 2.2.2 verlangt, dass sich laufende Animationen anhalten lassen.
- **Automatik:** Die Animation läuft nur, solange die Sektion sichtbar ist. In einem Hintergrund-Tab und außerhalb des Bildschirms pausiert sie.
- **„Bewegung reduzieren“:** Bei dieser Systemeinstellung zeigt die Sektion den fertigen Endzustand und startet nur auf Klick.
- **Ohne JavaScript:** Der Endzustand erscheint als einfaches Raster.
- **Screenreader:** Sie bekommen den Ablauf als Liste in fünf Sätzen. Die Animation und die laufenden Zahlen sind für sie ausgeblendet.
- **Kontrast:** Alle Texte erreichen mindestens 4,5:1, die Fokusrahmen mindestens 3:1.

## Responsiv

- **Ab 900 px Bühnenbreite:** Die Grafik verläuft von links nach rechts. Ihre Zeichenfläche ist 1120 px breit und wird verkleinert, wenn weniger Platz ist.
- **Darunter:** Der Ablauf geht von oben nach unten, die drei Aufgaben stehen als Kacheln nebeneinander.
- Es gibt kein seitliches Scrollen mehr wie in der alten Version.

## Einbauen

- **Übernehmen:** den `<style>`-Block, die `<section id="automatisierung">` und das `<script>` unten aus der Datei.
- **Kapselung:** Alles ist unter `.sbsa` gekapselt. Es gibt keine globalen Klassen und keine globalen Variablen. Die Schrift-Einstellungen der umgebenden Seite schlagen nicht durch.
- **Mehrfach einbauen:** Die Sektion funktioniert auch zweimal auf einer Seite.
- **Formulare:** Die Buttons lösen kein umgebendes Formular aus.
- **Schriften:** Sora und Manrope (Google Fonts, `<link>` im `<head>`).

## Werkzeuge

```bash
node tools/frames.mjs <ordner> 1280 0.5 2 4 7.7 9.4          # Standbilder zu Zeitpunkten (lokale Schriften)
node tools/record.mjs preview/automatisierung-desktop.mp4 1280 # eine Schleife als Video
```

Die Vorschau-Videos liegen in `preview/`.

Alle Namen, Adressen, Zeiten und Nummern sind Beispieldaten.
