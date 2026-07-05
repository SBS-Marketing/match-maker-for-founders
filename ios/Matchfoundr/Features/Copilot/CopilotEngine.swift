// Co-Pilot Engine — portiert aus src/lib/copilot-client.ts.
// Regelbasiert, kennt Guides und Bereiche der App; personalisiert über das
// Profil. Cloud-Anbindung (Supabase Edge Function) ist der nächste Schritt —
// dieselbe Signatur, gleiche Antwortstruktur.

import Foundation

enum CopilotEngine {

    static func answer(for message: String, profile: MyProfile?) -> CopilotMessage {
        let m = message.lowercased()
        let venture = profile?.industry.ventureTerm ?? "Vorhaben"
        let partner = profile?.industry.partnerTerm ?? "Mitgründer"
        let pitch = profile?.pitch.isEmpty == false ? profile!.pitch : "dein \(venture)"

        // Erste Nachricht formulieren (vor Partner-Intent!)
        if matches(m, "formulier", "nachricht", "anschreiben", "erste nachricht") {
            return CopilotMessage(mine: false, text:
                """
                Hier ist ein Entwurf — kurz, ehrlich, ohne Floskeln:

                „Hi! Ich baue gerade \(pitch). Dein Profil ist mir aufgefallen, weil du genau das mitbringst, was mir fehlt. Hast du diese Woche 15 Minuten für ein kurzes Telefonat?"

                Pass ihn an und schick ihn ab — Antworten kommen auf Ehrlichkeit, nicht auf Marketing.
                """,
                navigation: [
                    .init(label: "Zu deinen Chats", destination: .tab(.chats)),
                    .init(label: "Guide: Den richtigen \(partner) finden", destination: .guide("cofounder-finden")),
                ])
        }

        // Gewerbe / offiziell starten
        if matches(m, "gewerbe", "anmeld", "selbständig machen", "offiziell", "freiberufl") {
            return CopilotMessage(mine: false, text:
                """
                Der offizielle Start ist unspektakulärer als sein Ruf: Gewerbeamt (20–60 €, online), dann kommt automatisch der Finanzamt-Fragebogen, dann melden sich IHK/HWK von selbst.

                Wichtigste Entscheidung: die Kleinunternehmerregelung (unter 25.000 € Umsatz meist sinnvoll). Im Guide steht der komplette Ablauf in 5 Schritten.
                """,
                navigation: [.init(label: "Guide: Gewerbe anmelden", destination: .guide("gewerbe-anmelden"))])
        }

        // Förderung
        if matches(m, "förder", "foerder", "zuschuss", "stipendium", "exist") {
            return CopilotMessage(mine: false, text:
                """
                Gute Nachricht: Für \(pitch) brauchst du kein Millionen-Programm. Die kleinen Hebel zuerst:

                1. Gründungszuschuss der Arbeitsagentur (wenn du aus der Anstellung kommst), 2. Mikrokredite und regionale Gründungsprämien deiner Stadt, 3. kostenlose Gründungsberatung von IHK/HWK.
                """,
                navigation: [
                    .init(label: "Guide: Gründungszuschuss", destination: .guide("gruendungszuschuss")),
                    .init(label: "Guide: Förder-Landkarte", destination: .guide("foerderung-kleine-gruendungen")),
                ])
        }

        // Kapital / Investoren
        if matches(m, "investor", "kapital", "kredit", "finanzierung", "angel", "vc") {
            return CopilotMessage(mine: false, text:
                """
                Ehrlich: Die meisten Gründungen brauchen keinen Investor. Rechne erst aus, was du wirklich brauchst — oft sind es 10–50k für Ausstattung, Miete und die ersten Monate.

                Das deckst du mit Erspartem, einem KfW-Mikrokredit oder dem Gründungszuschuss — ohne Anteile abzugeben.
                """,
                navigation: [
                    .init(label: "Guide: Startkosten rechnen", destination: .guide("startkosten-rechnen")),
                    .init(label: "Guide: Förder-Landkarte", destination: .guide("foerderung-kleine-gruendungen")),
                ])
        }

        // Recht / Rechtsform
        if matches(m, "gmbh", "gbr", "rechtsform", "recht", "vertrag", "haftung", "anwalt") {
            return CopilotMessage(mine: false, text:
                """
                Halt es einfach: Für die meisten Starts reicht Gewerbe (oder Freiberufler-Status), eine GbR-Vereinbarung, wenn ihr zu zweit seid, und eine Betriebshaftpflicht.

                Die GmbH lohnt sich erst bei echtem Haftungsrisiko oder großen Verträgen — vorher kostet sie nur Geld und Papierkram.
                """,
                navigation: [
                    .init(label: "Guide: Rechtsform wählen", destination: .guide("rechtsform-waehlen")),
                    .init(label: "Guide: Mitgründer & Vertrag", destination: .guide("cofounder-finden")),
                ])
        }

        // Versicherungen
        if matches(m, "versicherung", "haftpflicht", "absicher", "krankenkasse") {
            return CopilotMessage(mine: false, text:
                """
                Zwei brauchst du wirklich: die Betriebshaftpflicht (ab ~80 €/Jahr — bei Publikumsverkehr nicht verhandelbar) und deine Krankenversicherung, um die du dich selbst kümmern musst.

                Alles andere kann warten, bis Umsatz da ist. Lass dich nicht vollpacken.
                """,
                navigation: [.init(label: "Guide: Versicherungen", destination: .guide("versicherungen-gruender"))])
        }

        // Steuern
        if matches(m, "steuer", "finanzamt", "umsatzsteuer", "kleinunternehmer") {
            return CopilotMessage(mine: false, text:
                """
                Drei Dinge reichen fürs Erste: 1. Entscheide die Kleinunternehmerregelung (unter 25.000 € Umsatz meist ja). 2. Leg von jedem Geldeingang sofort 30 % auf ein Steuer-Unterkonto. 3. Sammle Belege digital ab Tag 1.

                Der Steuerbescheid im zweiten Jahr ist die böseste Gründer-Überraschung — mit dem 30-%-Topf ist er langweilig.
                """,
                navigation: [.init(label: "Guide: Steuern für Gründer", destination: .guide("steuern-basics"))])
        }

        // Preise
        if matches(m, "preis", "kalkul", "stundensatz", "verlangen", "honorar") {
            return CopilotMessage(mine: false, text:
                """
                Rechne rückwärts: Wunsch-Netto + ~40 % Abgaben + Betriebskosten = nötiger Umsatz. Geteilt durch realistische 100 verrechenbare Stunden im Monat — nicht 160! — ergibt deinen Mindest-Stundensatz. Meist 55–70 €, nicht 25.

                Und: Verkauf Pakete statt Stunden — Kunden mögen Klarheit.
                """,
                navigation: [.init(label: "Guide: Preise kalkulieren", destination: .guide("preise-kalkulieren"))])
        }

        // Startkosten
        if matches(m, "startkosten", "was kostet", "kapitalbedarf", "budget", "runway") {
            return CopilotMessage(mine: false, text:
                """
                Drei Töpfe: Einmalkosten (Ausstattung, Kaution), Monatskosten (Miete, Versicherung, Software) — und deine privaten Lebenskosten inklusive Krankenkasse. Topf 3 vergessen die meisten.

                Formel: Einmalkosten + 6 × (Monatskosten + Leben) − halbierte Umsatzschätzung = dein Kapitalbedarf.
                """,
                navigation: [.init(label: "Guide: Startkosten rechnen", destination: .guide("startkosten-rechnen"))])
        }

        // Erste Kunden
        if matches(m, "kunden", "akquise", "auftrag", "reichweite", "marketing", "sichtbar") {
            return CopilotMessage(mine: false, text:
                """
                Die ersten 10 Kunden kommen nicht über Ads — sie kommen über die 30 Menschen, die dich schon kennen. Frag nach der EMPFEHLUNG, nicht nach dem Auftrag.

                Dazu: Google-Unternehmensprofil anlegen (20 Minuten, wirkt sofort lokal) und die ersten 2–3 Aufträge günstiger gegen Referenz + Bewertung.
                """,
                navigation: [.init(label: "Guide: Die ersten 10 Kunden", destination: .guide("erste-kunden"))])
        }

        // Partner / Mitgründer
        if matches(m, "co-founder", "cofounder", "mitgründer", "mitgruender", "partner", "wer kann mir helfen", "team") {
            return CopilotMessage(mine: false, text:
                """
                Such Komplement, nicht Kopie: Du brauchst, was dir FEHLT. Macher sucht Verkäufer, Ideengeber sucht Umsetzer.

                Im Swipe-Deck siehst du Profile mit Fit-Wert — und bevor ihr euch bindet: erst ein kleines Projekt zusammen bauen.
                """,
                navigation: [
                    .init(label: "Swipe-Deck öffnen", destination: .tab(.swipe)),
                    .init(label: "Guide: \(partner) prüfen", destination: .guide("cofounder-finden")),
                ])
        }

        // Wo anfangen / Default
        return CopilotMessage(mine: false, text:
            """
            Ich denke von deinem Stand aus: \(pitch).

            Egal ob Halle, Handwerk oder Agentur — der Anfang ist immer gleich: 1) den nächsten kleinen Schritt festlegen, 2) eine Person finden, die mitzieht, 3) klären, was der Start wirklich kostet.

            Sag mir, wo es bei dir hakt — oder nimm einen der Vorschläge.
            """,
            navigation: [
                .init(label: "Guide: Wo anfangen", destination: .guide("gewerbe-anmelden")),
                .init(label: "Menschen finden", destination: .tab(.swipe)),
            ])
    }

    static let quickPrompts = [
        "Wo fange ich mit meiner Gründung an?",
        "Welche Förderung gibt es für mich?",
        "Formuliere eine erste Nachricht an ein Match",
        "Was kostet meine Gründung realistisch?",
    ]

    private static func matches(_ text: String, _ needles: String...) -> Bool {
        needles.contains { text.contains($0) }
    }
}
