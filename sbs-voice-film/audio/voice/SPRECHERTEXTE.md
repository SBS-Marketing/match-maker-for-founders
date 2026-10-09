# Sprechertexte für den SBS-Voice-Agent-Film

Eine Datei pro Zeile, Dateiname wie unten, Ablage in diesem Ordner (`sbs-voice-film/audio/voice/`).
Der Film richtet sein Timing nach der echten Länge jeder Datei.

**Einstellungen:**

- **Modell:** `gpt-4o-mini-tts`, weil nur dieses Modell Sprechanweisungen versteht. Auf openai.fm ist das das Feld „Vibe“.
- **Format:** WAV, wenn möglich (MP3 geht auch).
- **Geschwindigkeit:** normal.
- **Nachbearbeitung:** keine Musik, kein Effekt. Stille am Anfang und Ende schneide ich selbst ab, den Telefonklang mache ich im Mix.

## Stimmen

| Rolle | Stimme | Alternative |
|---|---|---|
| KI-Agent | `ash` | `cedar`, `sage` |
| Anruferin (Sabine Krüger) | `coral` | `shimmer`, `nova` |

Wichtig ist nur, dass sich die beiden Stimmen deutlich unterscheiden.

**Anweisung KI-Agent** (bei allen KI-Zeilen gleich):

> Freundlicher, professioneller Telefon-Assistent eines Elektro-Fachbetriebs. Ruhig, klar, warm und zuversichtlich.
> Natürliches Hochdeutsch, flüssiges Telefon-Tempo, nicht roboterhaft, keine Pausen am Anfang oder Ende.

**Anweisung Anruferin** (bei allen Anruferin-Zeilen gleich):

> Kundin am Telefon, leicht gestresst, weil im Büro ständig die Sicherung rausfliegt, aber höflich.
> Natürliches Hochdeutsch, normales Sprechtempo, keine Pausen am Anfang oder Ende.

## Zeilen

| Datei | Stimme | Text | Zusatz zur Anweisung |
|---|---|---|---|
| `01_ki.wav` | KI-Agent | Elektro Wagner, guten Tag! Wie kann ich Ihnen helfen? | einladend |
| `02_anruferin.wav` | Anruferin | Hallo! Bei uns im Büro fliegt ständig die Sicherung raus. | etwas gehetzt |
| `03_ki.wav` | KI-Agent | Das klingt dringend. Wie ist Ihr Name und Ihre Adresse? | verständnisvoll, dann sachlich |
| `04_anruferin.wav` | Anruferin | Sabine Krüger, Hafenstraße 12 in Bremen. | deutlich, aber flüssig |
| `05_ki.wav` | KI-Agent | Danke, Frau Krüger. Morgen um 8 Uhr ist ein Techniker frei. Passt das? | lösungsorientiert |
| `06_anruferin.wav` | Anruferin | Ja, das passt perfekt! | erleichtert |
| `07_ki.wav` | KI-Agent | Ist gebucht! Die Bestätigung kommt gleich per SMS. | herzlich, abschließend |
| `08_outro.wav` *(optional)* | KI-Agent | Ihr Telefon ist ab heute nie mehr besetzt. | ruhig, mit einem Lächeln, wie ein Claim |

**Wenn eine Zahl falsch gesprochen wird:** „12“ als „zwölf“ und „8 Uhr“ als „acht Uhr“ ausschreiben. Im Transkript bleiben die Ziffern stehen.
