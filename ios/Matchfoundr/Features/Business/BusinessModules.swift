// Business-Module — einzelne Bausteine, die der Co-Pilot je Geschäft zieht.
// Nach Design "matchfoundr Business Module": dieselben Module, andere Auswahl
// und andere Daten je Betrieb. Der Co-Pilot wählt, begründet und bleibt
// abschaltbar (siehe BusinessModulePickerView).

import SwiftUI

// ─── Registry ────────────────────────────────────────────────────────────

/// Die verfügbaren Bausteine. Der Co-Pilot referenziert sie über die rawValue.
enum BusinessModuleID: String, Codable, CaseIterable, Identifiable {
    // Kern — für jedes Geschäft
    case umsatz, auslastung, tagesplan, abos, offen
    case kurzinfo, bestand, stimmen, personal, startklar
    // Gastro
    case tageskasse, wareneinsatz, reservierungen
    // Handel
    case bestellungen, retouren, topseller
    // Handwerk & Bau
    case auftraege, zeiterfassung, material, fahrzeuge
    // Dienstleistung & Beratung
    case angebote, projekte, stundenkonto
    // Kurse & Bildung
    case kursbelegung, warteliste
    // Online & Sichtbarkeit
    case reichweite, shop, newsletter
    // Geld & Pflichten
    case liquiditaet, steuertermine, pflichten

    var id: String { rawValue }

    /// Für welche Art Geschäft der Baustein gedacht ist.
    var branch: String {
        switch self {
        case .tageskasse, .wareneinsatz, .reservierungen: "Gastro"
        case .bestellungen, .retouren, .topseller: "Handel"
        case .auftraege, .zeiterfassung, .material, .fahrzeuge: "Handwerk"
        case .angebote, .projekte, .stundenkonto: "Dienstleistung"
        case .kursbelegung, .warteliste: "Kurse"
        case .reichweite, .shop, .newsletter: "Online"
        case .liquiditaet, .steuertermine, .pflichten: "Geld & Pflichten"
        default: "Grundlagen"
        }
    }

    var name: String {
        switch self {
        case .umsatz: "Umsatz & Ziel"
        case .auslastung: "Auslastung"
        case .tagesplan: "Heute"
        case .abos: "Mitgliedschaften"
        case .offen: "Offene Posten"
        case .kurzinfo: "Stand heute"
        case .bestand: "Bestand & Verleih"
        case .stimmen: "Bewertungen"
        case .personal: "Schicht"
        case .startklar: "Startklar-Check"
        case .tageskasse: "Tageskasse"
        case .wareneinsatz: "Wareneinsatz"
        case .reservierungen: "Reservierungen"
        case .bestellungen: "Bestellungen"
        case .retouren: "Retouren"
        case .topseller: "Topseller"
        case .auftraege: "Auftragslage"
        case .zeiterfassung: "Stunden diese Woche"
        case .material: "Material"
        case .fahrzeuge: "Fahrzeuge"
        case .angebote: "Angebote"
        case .projekte: "Projekte"
        case .stundenkonto: "Stundenkonto"
        case .kursbelegung: "Kursbelegung"
        case .warteliste: "Warteliste"
        case .reichweite: "Reichweite"
        case .shop: "Onlineshop"
        case .newsletter: "Newsletter"
        case .liquiditaet: "Liquidität"
        case .steuertermine: "Steuertermine"
        case .pflichten: "Pflichten & Nachweise"
        }
    }

    var hint: String {
        switch self {
        case .umsatz: "Monatsumsatz gegen Mindestumsatz"
        case .auslastung: "Plätze, Stühle, Räume — heute belegt"
        case .tagesplan: "Nächste Termine, Kurse oder Aufträge"
        case .abos: "Aktive Abos, Kündigungen, laufende Einnahmen"
        case .offen: "Unbezahlte Rechnungen und Fälligkeiten"
        case .kurzinfo: "Kurze Fakten zum Geschäft"
        case .bestand: "Material, Leihgeräte, Ware"
        case .stimmen: "Schnitt und neue Rückmeldungen"
        case .personal: "Wer heute da ist, offene Schichten"
        case .startklar: "Fortschritt bis zur Eröffnung"
        case .tageskasse: "Umsatz, Gäste und Bon-Schnitt von heute"
        case .wareneinsatz: "Food-Cost gegen Zielquote"
        case .reservierungen: "Tische und Gäste pro Service"
        case .bestellungen: "Offene Aufträge und Versandstatus"
        case .retouren: "Quote und häufigste Gründe"
        case .topseller: "Was sich diesen Monat verkauft"
        case .auftraege: "Anfragen, Angebote, laufende Aufträge"
        case .zeiterfassung: "Erfasste und noch nicht berechnete Zeit"
        case .material: "Verbrauch, Nachbestellungen, Lieferzeiten"
        case .fahrzeuge: "Flotte, Prüftermine, Kilometer"
        case .angebote: "Offener Wert und Zuschlagsquote"
        case .projekte: "Laufende Projekte und Budgetstand"
        case .stundenkonto: "Retainer: verbraucht von gebucht"
        case .kursbelegung: "Freie Plätze pro Kurs oder Termin"
        case .warteliste: "Wer auf einen Platz wartet"
        case .reichweite: "Follower, Aufrufe, bestes Format"
        case .shop: "Besucher, Käufe, Warenkorb"
        case .newsletter: "Abonnenten und letzte Kampagne"
        case .liquiditaet: "Kontostand, Reichweite, nächste Abbuchungen"
        case .steuertermine: "Fristen für Umsatzsteuer und Abschluss"
        case .pflichten: "Genehmigungen, Prüfungen, Versicherungen"
        }
    }

    var icon: String {
        switch self {
        case .umsatz, .offen: "eurosign.circle"
        case .auslastung: "sportscourt"
        case .tagesplan: "clock"
        case .abos: "creditcard"
        case .kurzinfo: "building.2"
        case .bestand: "shippingbox"
        case .stimmen: "star"
        case .personal: "person.2"
        case .startklar: "sparkles"
        case .tageskasse: "printer"
        case .wareneinsatz: "fork.knife"
        case .reservierungen: "table.furniture"
        case .bestellungen: "shippingbox.and.arrow.backward"
        case .retouren: "arrow.uturn.backward"
        case .topseller: "tag"
        case .auftraege: "square.stack.3d.up"
        case .zeiterfassung, .stundenkonto: "timer"
        case .material: "cube.box"
        case .fahrzeuge: "car"
        case .angebote: "doc.text"
        case .projekte: "chart.bar.doc.horizontal"
        case .kursbelegung, .warteliste: "graduationcap"
        case .reichweite: "megaphone"
        case .shop: "cart"
        case .newsletter: "envelope"
        case .liquiditaet: "banknote"
        case .steuertermine: "receipt"
        case .pflichten: "checkmark.shield"
        }
    }

    /// Wie der Baustein gezeichnet wird — die 21 Bibliotheksmodule teilen
    /// sich wenige Muster, deshalb reicht ein Layout-Typ statt 21 Renderer.
    enum Layout {
        case custom          // die zehn Kernmodule mit eigener Darstellung
        case heroSplit       // Kennzahl oben, Dreier-Split unten
        case heroList        // Kennzahl oben, Liste unten
        case splitList       // Dreier-Split oben, Liste unten
        case stagesList      // drei Phasen oben, Liste unten
        case list            // nur Liste
        case ranked          // Rangliste mit Balken (Topseller)
        case progress        // Zeilen mit Fortschrittsbalken (Projekte)
        case valueList       // Zeile mit farbigem Wert (Kursbelegung)
    }

    var layout: Layout {
        switch self {
        case .tageskasse, .zeiterfassung, .shop: .heroSplit
        case .wareneinsatz, .retouren, .angebote, .stundenkonto, .liquiditaet: .heroList
        case .reservierungen, .warteliste, .reichweite, .newsletter: .splitList
        case .bestellungen, .auftraege: .stagesList
        case .material, .fahrzeuge, .steuertermine, .pflichten: .list
        case .topseller: .ranked
        case .projekte: .progress
        case .kursbelegung: .valueList
        default: .custom
        }
    }
}

// ─── Daten ───────────────────────────────────────────────────────────────

struct BusinessStat: Codable, Hashable, Identifiable {
    var value: String
    var label: String
    var id: String { label + value }
}

/// Eine Fortschrittszeile (Platz 1 · 92 %). `value`/`sub` nutzen die
/// Bibliotheksmodule Topseller und Projekte.
struct BusinessBar: Codable, Hashable, Identifiable {
    var name: String
    var pct: Int
    var value: String?
    var sub: String?
    var id: String { name }
}

/// Eine Zeile im Tagesplan.
struct BusinessAgendaRow: Codable, Hashable, Identifiable {
    var time: String
    var title: String
    var sub: String?
    var tag: String?
    var now: Bool = false
    var id: String { time + title }
}

/// Eine Label/Wert-Zeile (Stand heute, Offene Posten).
struct BusinessFact: Codable, Hashable, Identifiable {
    var label: String
    var value: String
    var sub: String?
    var warn: Bool = false
    var id: String { label }
}

/// Inhalt eines Moduls. Bewusst alles optional: jedes Modul nutzt nur, was es
/// braucht — so kann der Co-Pilot dieselbe Struktur für alle Bausteine füllen.
struct BusinessModuleData: Codable, Hashable {
    var title: String?
    var summary: String?
    var label: String?
    var value: String?
    var goal: String?
    var pct: Int?
    var left: String?
    var delta: String?
    var note: String?
    var alert: String?
    var score: String?
    var count: String?
    var today: String?
    var names: String?
    var openShifts: String?
    var next: String?
    /// Färbt den Kennzahl-Balken warnend (z. B. Wareneinsatz über Ziel).
    var warn: Bool?
    var stats: [BusinessStat]?
    /// Drei Phasen nebeneinander (Anfragen → Angebote → in Arbeit).
    var stages: [BusinessStat]?
    var bars: [BusinessBar]?
    var agenda: [BusinessAgendaRow]?
    var facts: [BusinessFact]?
}

/// Ein Modul auf der Übersicht — inklusive Begründung des Co-Piloten.
struct BusinessModuleInstance: Codable, Hashable, Identifiable {
    var module: BusinessModuleID
    var label: String?
    var action: String?
    var why: String?
    var enabled: Bool = true
    var data = BusinessModuleData()

    var id: String { module.rawValue }
    var displayLabel: String { label ?? module.name }
}

/// Eine Kachel im Bereiche-Grid. `screen` verweist auf einen bestehenden
/// App-Bereich, damit die Übersicht der Einstieg ins Tagesgeschäft bleibt.
struct BusinessTile: Codable, Hashable, Identifiable {
    var icon: String
    var label: String
    var meta: String
    var highlight: Bool = false
    /// rawValue-artige Kennung, aufgelöst in `destination`.
    var screen: String?
    var id: String { label }

    var destination: AppScreen? {
        switch screen {
        case "calendar": .calendar
        case "documents": .documents
        case "company": .company
        case "kanban": .kanban
        case "chats": .chats
        case "startup": .startup
        case "profile": nil
        default: nil
        }
    }
}

// ─── Modul-Karte ─────────────────────────────────────────────────────────

struct BusinessModuleCard: View {
    let instance: BusinessModuleInstance

    var body: some View {
        BizCard {
            if isEmpty {
                emptyState
            } else {
                switch instance.module.layout {
                case .custom: core
                case .heroSplit:
                    VStack(spacing: 0) { hero; BizHairline(); BizSplit(stats: d.stats ?? []) }
                case .heroList:
                    VStack(spacing: 0) { hero; BizHairline(); factList }
                case .splitList:
                    VStack(spacing: 0) { BizSplit(stats: d.stats ?? []); BizHairline(); factList }
                case .stagesList:
                    VStack(spacing: 0) { BizStages(stages: d.stages ?? []); BizHairline(); factList }
                case .list: factList
                case .ranked: rankedList
                case .progress: progressList
                case .valueList: valueRows
                }
            }
        }
    }

    private var d: BusinessModuleData { instance.data }

    /// Die zehn Kernmodule mit eigener Darstellung.
    @ViewBuilder
    private var core: some View {
        switch instance.module {
        case .auslastung: utilization
        case .tagesplan: agenda
        case .abos: subscriptions
        case .offen: openItems
        case .kurzinfo: facts
        case .bestand: inventory
        case .stimmen: reviews
        case .personal: shift
        case .startklar: readiness
        default: revenue
        }
    }

    // ─── Geteilte Layouts der Bibliothek ─────────────────────────────

    /// Kennzahl oben: Eyebrow, große Zahl, optionaler Balken, Fußzeile.
    private var hero: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(d.label ?? instance.displayLabel)
                .font(.mfMono(11))
                .tracking(0.9)
                .textCase(.uppercase)
                .foregroundStyle(MF.faint)
            HStack(alignment: .firstTextBaseline, spacing: 7) {
                Text(d.value ?? "—")
                    .font(.system(size: 30, weight: .heavy))
                    .tracking(-1)
                    .foregroundStyle(MF.ink)
                if let sub = d.goal {
                    Text(sub).font(.system(size: 13.5)).foregroundStyle(MF.smoke)
                }
            }
            .padding(.top, 5)
            if let pct = d.pct {
                BizBar(pct: pct, tint: (d.warn ?? false) ? MF.ember : MF.smoke).padding(.top, 12)
            }
            if d.left != nil || d.delta != nil {
                HStack {
                    Text(d.left ?? "").font(.system(size: 13)).foregroundStyle(MF.smoke)
                    Spacer(minLength: 8)
                    if let right = d.delta {
                        Text(right).font(.mfMono(12)).foregroundStyle(MF.faint)
                    }
                }
                .padding(.top, 8)
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 15)
        .padding(.bottom, 14)
    }

    /// Label/Wert-Liste mit optionaler Unterzeile.
    private var factList: some View {
        VStack(spacing: 0) {
            ForEach(Array((d.facts ?? []).enumerated()), id: \.element.id) { index, row in
                if index > 0 { BizHairline(inset: 16) }
                HStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 1) {
                        Text(row.label).font(.system(size: 14.5, weight: .medium)).foregroundStyle(MF.ink)
                        if let sub = row.sub {
                            Text(sub)
                                .font(.system(size: 12.5))
                                .foregroundStyle(row.warn ? MF.ember : MF.smoke)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                    Spacer(minLength: 6)
                    if !row.value.isEmpty {
                        Text(row.value)
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(row.warn ? MF.ember : MF.ink)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
            }
        }
    }

    /// Rangliste mit Balken — Topseller.
    private var rankedList: some View {
        VStack(spacing: 0) {
            ForEach(Array((d.bars ?? []).enumerated()), id: \.element.id) { index, row in
                if index > 0 { BizHairline(inset: 16) }
                HStack(spacing: 12) {
                    Text("\(index + 1)")
                        .font(.mfMono(12))
                        .foregroundStyle(MF.faint)
                        .frame(width: 16, alignment: .leading)
                    VStack(alignment: .leading, spacing: 6) {
                        Text(row.name).font(.system(size: 14.5, weight: .medium)).foregroundStyle(MF.ink)
                        BizBar(pct: row.pct, height: 4)
                    }
                    if let value = row.value {
                        Text(value)
                            .font(.system(size: 13.5, weight: .semibold))
                            .foregroundStyle(MF.ink)
                            .frame(width: 62, alignment: .trailing)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
            }
        }
    }

    /// Zeilen mit Fortschrittsbalken — Projekte.
    private var progressList: some View {
        VStack(spacing: 0) {
            ForEach(Array((d.bars ?? []).enumerated()), id: \.element.id) { index, row in
                if index > 0 { BizHairline(inset: 16) }
                HStack(alignment: .top, spacing: 12) {
                    VStack(alignment: .leading, spacing: 1) {
                        Text(row.name).font(.system(size: 14.5, weight: .semibold)).foregroundStyle(MF.ink)
                        if let sub = row.sub {
                            Text(sub).font(.system(size: 12.5)).foregroundStyle(MF.smoke)
                        }
                        BizBar(pct: row.pct, tint: row.pct > 85 ? MF.ember : MF.smoke, height: 4)
                            .padding(.top, 8)
                    }
                    Text("\(row.pct)%")
                        .font(.mfMono(12))
                        .foregroundStyle(row.pct > 85 ? MF.ember : MF.faint)
                        .frame(width: 40, alignment: .trailing)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
            }
        }
    }

    /// Zeile mit farbigem Wert — Kursbelegung (voll = gedämpft).
    private var valueRows: some View {
        VStack(spacing: 0) {
            ForEach(Array((d.facts ?? []).enumerated()), id: \.element.id) { index, row in
                if index > 0 { BizHairline(inset: 16) }
                HStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 1) {
                        Text(row.label).font(.system(size: 14.5, weight: .semibold)).foregroundStyle(MF.ink)
                        if let sub = row.sub {
                            Text(sub).font(.system(size: 12.5)).foregroundStyle(MF.smoke)
                        }
                    }
                    Spacer(minLength: 6)
                    Text(row.value)
                        .font(.mfMono(13))
                        .foregroundStyle(row.warn ? MF.smoke : MF.ember)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
            }
        }
    }

    /// Ein Modul ohne Inhalt soll keinen leeren Kasten zeigen, sondern sagen,
    /// was ihm fehlt — sonst wirkt die Übersicht kaputt statt jung.
    private var isEmpty: Bool {
        switch instance.module.layout {
        case .heroSplit: (d.value ?? "").isEmpty && (d.stats ?? []).isEmpty
        case .heroList: (d.value ?? "").isEmpty && (d.facts ?? []).isEmpty
        case .splitList: (d.stats ?? []).isEmpty && (d.facts ?? []).isEmpty
        case .stagesList: (d.stages ?? []).isEmpty && (d.facts ?? []).isEmpty
        case .list, .valueList: (d.facts ?? []).isEmpty
        case .ranked, .progress: (d.bars ?? []).isEmpty
        case .custom:
            switch instance.module {
            case .tagesplan: (d.agenda ?? []).isEmpty
            case .kurzinfo, .offen: (d.facts ?? []).isEmpty
            case .auslastung: (d.bars ?? []).isEmpty
            case .abos, .bestand: (d.stats ?? []).isEmpty
            case .stimmen: (d.score ?? "").isEmpty
            case .personal: (d.today ?? "").isEmpty
            case .startklar: false
            default: (d.value ?? "—") == "—" && (d.pct ?? 0) == 0
            }
        }
    }

    private var emptyHint: String {
        switch instance.module {
        case .umsatz: "Sag mir dein Monatsziel, dann rechne ich mit."
        case .auslastung: "Sobald Buchungen reinkommen, siehst du hier deine Auslastung."
        case .tagesplan: "Noch nichts für heute eingetragen."
        case .abos: "Noch keine laufenden Verträge hinterlegt."
        case .offen: "Keine offenen Posten — gut so."
        case .kurzinfo: "Erzähl mir kurz von deinem Betrieb, dann fülle ich das."
        case .bestand: "Noch kein Material erfasst."
        case .stimmen: "Noch keine Bewertungen verknüpft."
        case .personal: "Noch niemand für heute eingeteilt."
        case .startklar: ""
        case .tageskasse: "Noch keine Kasse für heute."
        case .wareneinsatz: "Sag mir deine Zielquote, dann rechne ich mit."
        case .reservierungen: "Noch keine Reservierungen."
        case .bestellungen: "Noch keine Bestellungen."
        case .retouren: "Noch keine Retouren — gut so."
        case .topseller: "Noch keine Verkäufe erfasst."
        case .auftraege: "Noch keine Anfragen oder Aufträge."
        case .zeiterfassung: "Noch keine Stunden erfasst."
        case .material: "Noch kein Material hinterlegt."
        case .fahrzeuge: "Noch keine Fahrzeuge eingetragen."
        case .angebote: "Noch keine offenen Angebote."
        case .projekte: "Noch keine laufenden Projekte."
        case .stundenkonto: "Noch kein Retainer hinterlegt."
        case .kursbelegung: "Noch keine Kurse angelegt."
        case .warteliste: "Niemand wartet gerade auf einen Platz."
        case .reichweite: "Verknüpf deine Kanäle, dann siehst du das hier."
        case .shop: "Noch keine Shop-Daten verknüpft."
        case .newsletter: "Noch kein Newsletter verknüpft."
        case .liquiditaet: "Sag mir deinen Kontostand und die Fixkosten."
        case .steuertermine: "Noch keine Fristen hinterlegt."
        case .pflichten: "Noch keine Nachweise erfasst."
        }
    }

    private var emptyState: some View {
        HStack(spacing: 11) {
            Image(systemName: instance.module.icon)
                .font(.system(size: 16, weight: .medium))
                .foregroundStyle(MF.faint)
            Text(emptyHint)
                .font(.system(size: 13.5))
                .foregroundStyle(MF.smoke)
                .fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 15)
    }

    // Umsatz gegen Ziel
    private var revenue: some View {
        VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: 0) {
                Text(d.label ?? "Umsatz")
                    .font(.mfMono(11))
                    .tracking(0.9)
                    .textCase(.uppercase)
                    .foregroundStyle(MF.faint)
                HStack(alignment: .firstTextBaseline, spacing: 7) {
                    Text(d.value ?? "—")
                        .font(.system(size: 32, weight: .heavy))
                        .tracking(-1)
                        .foregroundStyle(MF.ink)
                    if let goal = d.goal {
                        Text("von \(goal)").font(.system(size: 13.5)).foregroundStyle(MF.smoke)
                    }
                }
                .padding(.top, 5)
                BizBar(pct: d.pct ?? 0).padding(.top, 13)
                HStack {
                    Text(d.left ?? "").font(.system(size: 13)).foregroundStyle(MF.smoke)
                    Spacer(minLength: 8)
                    if let delta = d.delta {
                        Text(delta).font(.mfMono(12)).foregroundStyle(MF.faint)
                    }
                }
                .padding(.top, 8)
            }
            .padding(16)

            if let stats = d.stats, !stats.isEmpty {
                BizHairline()
                BizSplit(stats: stats)
            }
        }
    }

    // Auslastung
    private var utilization: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .firstTextBaseline) {
                Text(d.title ?? instance.displayLabel)
                    .font(.system(size: 15.5, weight: .semibold))
                    .foregroundStyle(MF.ink)
                Spacer(minLength: 8)
                if let summary = d.summary {
                    Text(summary).font(.mfMono(12.5)).foregroundStyle(MF.smoke)
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 14)
            .padding(.bottom, 12)

            VStack(spacing: 10) {
                ForEach(d.bars ?? []) { row in
                    HStack(spacing: 11) {
                        Text(row.name)
                            .font(.system(size: 13))
                            .foregroundStyle(MF.smoke)
                            .frame(width: 66, alignment: .leading)
                        BizBar(pct: row.pct, tint: row.pct >= 90 ? MF.ember : MF.smoke, height: 6)
                        Text("\(row.pct)%")
                            .font(.mfMono(12))
                            .foregroundStyle(MF.faint)
                            .frame(width: 36, alignment: .trailing)
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 14)
        }
    }

    // Tagesplan
    private var agenda: some View {
        VStack(spacing: 0) {
            ForEach(Array((d.agenda ?? []).enumerated()), id: \.element.id) { index, row in
                if index > 0 { BizHairline(inset: 16) }
                HStack(spacing: 12) {
                    Text(row.time)
                        .font(.mfMono(13))
                        .foregroundStyle(row.now ? MF.ember : MF.smoke)
                        .frame(width: 46, alignment: .leading)
                    VStack(alignment: .leading, spacing: 1) {
                        Text(row.title).font(.system(size: 14.5, weight: .semibold)).foregroundStyle(MF.ink)
                        if let sub = row.sub {
                            Text(sub).font(.system(size: 12.5)).foregroundStyle(MF.smoke)
                        }
                    }
                    Spacer(minLength: 6)
                    if let tag = row.tag {
                        Text(tag)
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(MF.smoke)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(MF.surfaceSoft)
                            .clipShape(RoundedRectangle(cornerRadius: 7, style: .continuous))
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
            }
        }
    }

    // Mitgliedschaften
    private var subscriptions: some View {
        VStack(spacing: 0) {
            BizSplit(stats: d.stats ?? [])
            if let note = d.note {
                BizHairline()
                HStack(spacing: 12) {
                    Text(note).font(.system(size: 13.5)).foregroundStyle(MF.smoke)
                    Spacer(minLength: 6)
                    Image(systemName: "chevron.right").font(.system(size: 13, weight: .semibold)).foregroundStyle(MF.faint)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
            }
        }
    }

    // Offene Posten
    private var openItems: some View {
        VStack(spacing: 0) {
            ForEach(Array((d.facts ?? []).enumerated()), id: \.element.id) { index, row in
                if index > 0 { BizHairline(inset: 16) }
                HStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 1) {
                        Text(row.label).font(.system(size: 14.5, weight: .medium)).foregroundStyle(MF.ink)
                        if let sub = row.sub {
                            Text(sub).font(.system(size: 12.5)).foregroundStyle(row.warn ? MF.ember : MF.smoke)
                        }
                    }
                    Spacer(minLength: 6)
                    Text(row.value).font(.system(size: 14.5, weight: .semibold)).foregroundStyle(MF.ink)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
            }
        }
    }

    // Stand heute
    private var facts: some View {
        VStack(spacing: 0) {
            ForEach(Array((d.facts ?? []).enumerated()), id: \.element.id) { index, row in
                if index > 0 { BizHairline(inset: 16) }
                HStack(spacing: 12) {
                    Text(row.label).font(.system(size: 14.5)).foregroundStyle(MF.smoke)
                    Spacer(minLength: 6)
                    Text(row.value)
                        .font(.system(size: 14.5, weight: .semibold))
                        .foregroundStyle(row.warn ? MF.ember : MF.ink)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
            }
        }
    }

    // Bestand & Verleih
    private var inventory: some View {
        VStack(spacing: 0) {
            BizSplit(stats: d.stats ?? [])
            if let alert = d.alert {
                BizHairline()
                HStack(spacing: 12) {
                    Text(alert).font(.system(size: 13.5, weight: .medium)).foregroundStyle(MF.ember)
                    Spacer(minLength: 6)
                    Image(systemName: "chevron.right").font(.system(size: 13, weight: .semibold)).foregroundStyle(MF.faint)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
            }
        }
    }

    // Bewertungen
    private var reviews: some View {
        HStack(spacing: 14) {
            Text(d.score ?? "—")
                .font(.system(size: 30, weight: .heavy))
                .tracking(-1)
                .foregroundStyle(MF.ink)
            VStack(alignment: .leading, spacing: 2) {
                Text(d.count ?? "").font(.system(size: 14.5, weight: .semibold)).foregroundStyle(MF.ink)
                if let note = d.note {
                    Text(note).font(.system(size: 13)).foregroundStyle(MF.smoke).fixedSize(horizontal: false, vertical: true)
                }
            }
            Spacer(minLength: 6)
            Image(systemName: "chevron.right").font(.system(size: 14, weight: .semibold)).foregroundStyle(MF.faint)
        }
        .padding(16)
    }

    // Schicht
    private var shift: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 1) {
                Text(d.today ?? "Heute").font(.system(size: 14.5, weight: .semibold)).foregroundStyle(MF.ink)
                if let names = d.names {
                    Text(names).font(.system(size: 12.5)).foregroundStyle(MF.smoke)
                }
            }
            Spacer(minLength: 6)
            if let open = d.openShifts {
                Text(open).font(.system(size: 12.5, weight: .semibold)).foregroundStyle(MF.ember)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }

    // Startklar-Check
    private var readiness: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle().stroke(MF.border, lineWidth: 4).frame(width: 42, height: 42)
                Circle()
                    .trim(from: 0, to: min(1, Double(d.pct ?? 0) / 100))
                    .stroke(MF.ember, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                    .frame(width: 42, height: 42)
                Text("\(d.pct ?? 0)").font(.system(size: 13, weight: .bold)).foregroundStyle(MF.ink)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text("Startklar zu \(d.pct ?? 0) %")
                    .font(.system(size: 15.5, weight: .semibold))
                    .foregroundStyle(MF.ink)
                if let next = d.next {
                    Text("Als nächstes: \(next)").font(.system(size: 13)).foregroundStyle(MF.smoke)
                }
            }
            Spacer(minLength: 6)
            Image(systemName: "chevron.right").font(.system(size: 14, weight: .semibold)).foregroundStyle(MF.faint)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }
}

// ─── Bausteine ───────────────────────────────────────────────────────────

struct BizCard<Content: View>: View {
    @ViewBuilder var content: Content

    var body: some View {
        content
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(MF.surface)
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 18).stroke(MF.border, lineWidth: 0.6))
    }
}

struct BizHairline: View {
    var inset: CGFloat = 0
    var body: some View {
        Rectangle().fill(MF.border).frame(height: 0.6).padding(.leading, inset)
    }
}

struct BizBar: View {
    let pct: Int
    var tint: Color = MF.ember
    var height: CGFloat = 5

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(MF.surfaceSoft)
                Capsule().fill(tint)
                    .frame(width: geo.size.width * min(1, max(0, Double(pct) / 100)))
            }
        }
        .frame(height: height)
    }
}

struct BizSplit: View {
    let stats: [BusinessStat]

    var body: some View {
        HStack(spacing: 0) {
            ForEach(Array(stats.enumerated()), id: \.element.id) { index, stat in
                if index > 0 {
                    Rectangle().fill(MF.border).frame(width: 0.6)
                }
                VStack(alignment: .leading, spacing: 1) {
                    Text(stat.value)
                        .font(.system(size: 17, weight: .bold))
                        .tracking(-0.4)
                        .foregroundStyle(MF.ink)
                    Text(stat.label).font(.system(size: 11.5)).foregroundStyle(MF.smoke)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 14)
                .padding(.vertical, 12)
            }
        }
    }
}

/// Drei Phasen nebeneinander, die vorderste in Ember (Anfragen → Angebote → in Arbeit).
struct BizStages: View {
    let stages: [BusinessStat]

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            ForEach(Array(stages.enumerated()), id: \.element.id) { index, stage in
                VStack(alignment: .leading, spacing: 0) {
                    Capsule()
                        .fill(MF.ember.opacity(index == 0 ? 1 : max(0.15, 0.35 - Double(index) * 0.1)))
                        .frame(height: 4)
                    Text(stage.value)
                        .font(.system(size: 17, weight: .bold))
                        .tracking(-0.4)
                        .foregroundStyle(MF.ink)
                        .padding(.top, 8)
                    Text(stage.label)
                        .font(.system(size: 11.5))
                        .foregroundStyle(MF.smoke)
                        .padding(.top, 1)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
    }
}

struct BizLabel: View {
    let text: String
    var action: String?
    var onAction: (() -> Void)?

    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            Text(text)
                .font(.mfMono(11))
                .tracking(1.1)
                .textCase(.uppercase)
                .foregroundStyle(MF.faint)
            Spacer(minLength: 8)
            if let action {
                Button {
                    Haptics.tap()
                    onAction?()
                } label: {
                    Text(action).font(.system(size: 13, weight: .semibold)).foregroundStyle(MF.ember)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 4)
        .padding(.top, 6)
    }
}
