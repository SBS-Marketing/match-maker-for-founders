// matchfoundr · Demo-Daten
// Kein leerer State, nirgends: Deck, Matches und Chats sind ab Sekunde 1
// gefüllt — kleine, echte Gründungen aus dem DACH-Raum.

import Foundation

enum DemoData {
    static let deck: [FounderCard] = [
        .init(id: "anna", name: "Anna Weber", role: "Bauleiterin", city: "Köln",
              pitch: "Ich habe 10 Jahre Hallen gebaut — jetzt will ich eine eigene Padelhalle hochziehen.",
              skills: ["Handwerk", "Organisation", "Einkauf & Logistik"],
              industryId: "gesundheit", availability: .fulltime, matchPercent: 94),
        .init(id: "jonas", name: "Jonas Kessler", role: "Elektromeister", city: "München",
              pitch: "Mache mich selbständig und suche jemanden für Angebote, Rechnungen und Kundenkontakt.",
              skills: ["Handwerk", "Kundenkontakt"],
              industryId: "handwerk", availability: .fulltime, matchPercent: 89),
        .init(id: "mara", name: "Mara Schulte", role: "Designerin", city: "Berlin",
              pitch: "Webdesign-Studio mit Fokus auf Handwerksbetriebe — ich brauche jemanden für Vertrieb.",
              skills: ["Design", "Content & Social"],
              industryId: "kreativ", availability: .parttime, matchPercent: 86),
        .init(id: "tim", name: "Tim Brandt", role: "Koch", city: "Hamburg",
              pitch: "Mittags-Bowls für Büros, erste Testküche läuft. Suche Orga-Talent fürs Wachsen.",
              skills: ["Kundenkontakt", "Einkauf & Logistik"],
              industryId: "gastro", availability: .fulltime, matchPercent: 82),
        .init(id: "leonie", name: "Leonie Fuchs", role: "Steuerfachangestellte", city: "Leipzig",
              pitch: "Biete Buchhaltung + Zahlen-Klarheit für Gründungen — gegen Anteile oder Stunden.",
              skills: ["Finanzen", "Organisation"],
              industryId: "beratung", availability: .weekend, matchPercent: 78),
        .init(id: "deniz", name: "Deniz Kaya", role: "Entwickler", city: "Frankfurt",
              pitch: "Baue Buchungssysteme für Sportanlagen. Suche jemanden mit Hallen-Praxis.",
              skills: ["Entwicklung", "KI & Daten"],
              industryId: "tech", availability: .parttime, matchPercent: 91),
        .init(id: "sofia", name: "Sofia Brandt", role: "Physiotherapeutin", city: "Stuttgart",
              pitch: "Eigene Praxis mit Kurskonzept — mir fehlt jemand für Marketing und Aufbau.",
              skills: ["Kundenkontakt", "Gesundheit"],
              industryId: "gesundheit", availability: .fulltime, matchPercent: 75),
    ]

    static let matches: [Match] = [
        Match(id: "m-lena", card:
            .init(id: "lena", name: "Lena Hoffmann", role: "Schreinerin", city: "Köln",
                  pitch: "Möbel auf Maß — Werkstatt steht, Aufträge kommen, Orga fehlt.",
                  skills: ["Handwerk"], industryId: "handwerk",
                  availability: .fulltime, matchPercent: 92),
            messages: [
                ChatMessage(mine: false, text: "Hi! Dein Profil klingt genau nach dem, was mir fehlt 🙌", at: .now.addingTimeInterval(-7200)),
                ChatMessage(mine: false, text: "Hast du diese Woche Zeit für 15 Minuten Telefon?", at: .now.addingTimeInterval(-7100)),
            ],
            unread: 2),
        Match(id: "m-karim", card:
            .init(id: "karim", name: "Karim Aziz", role: "Vertriebler", city: "Düsseldorf",
                  pitch: "15 Jahre B2B-Vertrieb. Ich verkaufe, was du baust.",
                  skills: ["Vertrieb", "Kundenkontakt"], industryId: "beratung",
                  availability: .parttime, matchPercent: 87),
            messages: [
                ChatMessage(mine: true, text: "Hey Karim, lass uns nächste Woche sprechen!", at: .now.addingTimeInterval(-90000)),
                ChatMessage(mine: false, text: "Klingt gut — Dienstag 17 Uhr?", at: .now.addingTimeInterval(-86000)),
            ],
            unread: 0),
    ]

    static func reply(for text: String) -> String {
        let lower = text.lowercased()
        if lower.contains("telefon") || lower.contains("call") || lower.contains("uhr") {
            return "Passt! Schick mir kurz deine Nummer, dann melde ich mich. 📞"
        }
        if lower.contains("?") {
            return "Gute Frage — lass uns das kurz am Telefon klären, geht schneller. Wann passt es dir?"
        }
        return "Klingt gut! Erzähl mir mehr — wo stehst du gerade genau?"
    }
}
