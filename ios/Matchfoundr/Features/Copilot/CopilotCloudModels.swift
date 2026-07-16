// Cloud contract for Supabase Edge Function `copilot`.

import Foundation

struct CopilotCloudRequest: Encodable {
    let task = "chat"
    let message: String
    let extra: CopilotCloudExtra
}

struct CopilotCloudExtra: Encodable {
    let surface: String
    let memory: [String]
    let history: [CopilotCloudTurn]
    let onboarding: CopilotOnboardingContext?
    let app = CopilotAppContext.matchfoundr
    let mobileClient = true

    enum CodingKeys: String, CodingKey {
        case surface, memory, history, onboarding, app
        case mobileClient = "mobile_client"
    }
}

struct CopilotAppContext: Encodable {
    let name: String
    let areas: [CopilotAppArea]
    let actions: [String]
    let rule: String

    static let matchfoundr = CopilotAppContext(
        name: "Matchfoundr native iOS",
        areas: [
            .init(id: "today", label: "Heute", purpose: "Kommandozentrale, Chats, Kalender, Radar"),
            .init(id: "discover", label: "Entdecken", purpose: "Swipe, Guides, Firmenprofil, Unterlagen, Partner, Co-Founder OS"),
            .init(id: "community", label: "Community", purpose: "Events, Gründerkreis, RSVP"),
            .init(id: "startup", label: "Startup", purpose: "Workspace erst nach bewusster Gründung, Team, Plan, Akten"),
            .init(id: "profile", label: "Profil", purpose: "Nutzung, Onboarding, App-Tour, Einstellungen"),
            .init(id: "copilot", label: "Co-Pilot", purpose: "Live-KI, gespeicherte Sessions, Memory, App-Aktionen"),
        ],
        actions: [
            "open_calendar", "add_calendar_item", "open_startup", "found_startup",
            "open_company_profile", "publish_company_profile", "open_documents",
            "open_matches", "draft_match_message", "remember_fact", "refresh_live_data"
        ],
        rule: "Wenn eine Antwort eine App-Aktion braucht, formuliere sie konkret und gib passende navigation/follow_up_aktionen. Der native Client macht daraus Chips."
    )
}

struct CopilotAppArea: Encodable {
    let id: String
    let label: String
    let purpose: String
}

struct CopilotCloudTurn: Encodable {
    let role: String
    let content: String
}

struct CopilotOnboardingContext: Encodable {
    let userName: String
    let path: String
    let industry: String
    let industryLabel: String
    let ventureTerm: String
    let partnerTerm: String
    let copilotContext: String
    let context: CopilotOnboardingDetails
    let skills: CopilotOnboardingSkills
    let createdAt: String

    init(profile: MyProfile) {
        userName = profile.name
        path = profile.mode == .skills ? "talent" : "founder"
        industry = profile.industry.id
        industryLabel = profile.industry.label
        ventureTerm = profile.industry.ventureTerm
        partnerTerm = profile.industry.partnerTerm
        copilotContext = profile.industry.copilotContext
        context = CopilotOnboardingDetails(
            idea: profile.pitch.isEmpty ? nil : profile.pitch,
            role: profile.role,
            stage: profile.mode == .idea ? "Idee" : "Skills-Profil",
            goal: "den nächsten belastbaren Schritt finden",
            risk: nil
        )
        skills = CopilotOnboardingSkills(
            selected: profile.skills,
            availability: profile.availability.hoursPerWeek
        )
        createdAt = ISO8601DateFormatter().string(from: .now)
    }
}

struct CopilotOnboardingDetails: Encodable {
    let idea: String?
    let role: String
    let stage: String
    let goal: String
    let risk: String?
}

struct CopilotOnboardingSkills: Encodable {
    let selected: [String]
    let availability: Int
}

struct CopilotCloudResponse: Decodable {
    let answer: String?
    let quickActions: [String]?
    let navigation: [CopilotCloudNav]?
    let newFacts: [String]?
    let error: String?
}

struct CopilotCloudNav: Decodable {
    let to: String
    let label: String
}

extension Availability {
    var hoursPerWeek: Int {
        switch self {
        case .fulltime: 40
        case .parttime: 15
        case .weekend: 8
        }
    }
}
