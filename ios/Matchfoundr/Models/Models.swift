// matchfoundr · Domänen-Modelle
// Spiegeln die Web-Strukturen (profiles, guides, matches) — Supabase-ready.

import Foundation

enum FounderMode: String, Codable { case skills, idea }
enum Availability: String, Codable, CaseIterable {
    case fulltime, parttime, weekend
    var label: String {
        switch self {
        case .fulltime: "Vollzeit"
        case .parttime: "Teilzeit"
        case .weekend: "Wochenende"
        }
    }
    var sub: String {
        switch self {
        case .fulltime: "Das wird mein Hauptding"
        case .parttime: "Neben Job oder Studium"
        case .weekend: "Erstmal nebenbei testen"
        }
    }
}

struct Industry: Identifiable, Hashable {
    let id: String
    let label: String
    let emoji: String
    let ventureTerm: String   // „Startup" → „Betrieb", „Lokal", „Studio"
    let partnerTerm: String
}

/// Die 8 Branchen — jede:r soll sich aufgenommen fühlen.
let industries: [Industry] = [
    .init(id: "tech", label: "Tech & Startup", emoji: "⚡️", ventureTerm: "Startup", partnerTerm: "Co-Founder"),
    .init(id: "handwerk", label: "Handwerk & Produktion", emoji: "🔨", ventureTerm: "Betrieb", partnerTerm: "Geschäftspartner"),
    .init(id: "gastro", label: "Gastro & Food", emoji: "🍳", ventureTerm: "Lokal", partnerTerm: "Mitgründer"),
    .init(id: "kreativ", label: "Kreativwirtschaft", emoji: "🎨", ventureTerm: "Studio", partnerTerm: "Partner"),
    .init(id: "handel", label: "Handel & E-Commerce", emoji: "🛍️", ventureTerm: "Shop", partnerTerm: "Mitgründer"),
    .init(id: "bildung", label: "Bildung & Soziales", emoji: "📚", ventureTerm: "Projekt", partnerTerm: "Mitgründer"),
    .init(id: "gesundheit", label: "Gesundheit & Sport", emoji: "💪", ventureTerm: "Praxis/Studio", partnerTerm: "Partner"),
    .init(id: "beratung", label: "Beratung & Dienstleistung", emoji: "💼", ventureTerm: "Agentur", partnerTerm: "Partner"),
]

let skillTags = [
    "Entwicklung", "Design", "Vertrieb", "Marketing", "Finanzen", "Recht",
    "Handwerk", "Organisation", "Content & Social", "Kundenkontakt",
    "Einkauf & Logistik", "KI & Daten",
]

/// Das eigene Profil (nach Onboarding).
struct MyProfile: Codable {
    var mode: FounderMode
    var industryId: String
    var skills: [String]
    var name: String
    var role: String
    var pitch: String
    var plz: String
    var availability: Availability

    var industry: Industry { industries.first { $0.id == industryId } ?? industries[0] }
    var firstName: String { name.split(separator: " ").first.map(String.init) ?? name }
}

/// Ein Founder-Profil im Swipe-Deck / Marktplatz.
struct FounderCard: Identifiable, Hashable {
    let id: String
    let name: String
    let role: String
    let city: String
    let pitch: String
    let skills: [String]
    let industryId: String
    let availability: Availability
    let matchPercent: Int
    var isSuper: Bool = false
}

/// Match + Chat.
struct Match: Identifiable {
    let id: String
    let card: FounderCard
    var messages: [ChatMessage]
    var unread: Int
    var lastPreview: String { messages.last?.text ?? "Sag Hallo 👋" }
}

struct ChatMessage: Identifiable {
    let id = UUID()
    let mine: Bool
    let text: String
    let at: Date
}

/// Guide (aus guides.ts portiert — GuidesData.swift).
struct Guide: Identifiable, Hashable {
    var id: String { slug }
    let slug: String
    let title: String
    let category: GuideCategory
    let minutes: Int
    let intro: String
    let sections: [(h: String, body: String)]

    static func == (lhs: Guide, rhs: Guide) -> Bool { lhs.slug == rhs.slug }
    func hash(into hasher: inout Hasher) { hasher.combine(slug) }
}

enum GuideCategory: String, CaseIterable {
    case gruendung, foerderung, recht, finanzen, team
    var label: String {
        switch self {
        case .gruendung: "Gründung"
        case .foerderung: "Förderung"
        case .recht: "Recht"
        case .finanzen: "Finanzen"
        case .team: "Team"
        }
    }
}

/// Co-Pilot Nachricht + Navigation.
struct CopilotMessage: Identifiable {
    let id = UUID()
    let mine: Bool
    let text: String
    var navigation: [CopilotNav] = []
}

struct CopilotNav: Identifiable, Hashable {
    var id: String { label }
    let label: String
    let destination: CopilotDestination
}

enum CopilotDestination: Hashable {
    case tab(AppTab)
    case guide(String)   // slug
}

enum AppTab: Int, Hashable {
    case today, swipe, chats, guides, pilot
}
