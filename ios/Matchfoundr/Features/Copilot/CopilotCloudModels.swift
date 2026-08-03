// Cloud contract for Supabase Edge Function `copilot`.

import Foundation

struct CopilotCloudRequest: Encodable {
    let task = "chat"
    let message: String
    /// Lokale Session-UUID — das Backend legt die Session bei Bedarf an und
    /// kann darüber später recherchierte Antworten nachreichen (Realtime).
    let sessionID: UUID?
    let extra: CopilotCloudExtra

    enum CodingKeys: String, CodingKey {
        case task, message, extra
        case sessionID = "session_id"
    }
}

struct CopilotCloudExtra: Encodable {
    let surface: String
    let memory: [String]
    let history: [CopilotCloudTurn]
    let onboarding: CopilotOnboardingContext?
    let mcpConnectors: [CopilotCloudMCPConnector]
    let app = CopilotAppContext.matchfoundr
    let mobileClient = true

    enum CodingKeys: String, CodingKey {
        case surface, memory, history, onboarding, app
        case mcpConnectors = "mcp_connectors"
        case mobileClient = "mobile_client"
    }
}

struct CopilotCloudMCPConnector: Encodable {
    let id: String
    let label: String
    let category: String
    let status: String
    let tools: [String]
    let useCase: String

    enum CodingKeys: String, CodingKey {
        case id, label, category, status, tools
        case useCase = "use_case"
    }

    init(link: MCPConnectorLink) {
        id = link.connectorID.id
        label = link.connectorID.label
        category = link.connectorID.category
        status = link.status
        tools = link.connectorID.tools
        useCase = link.connectorID.copilotUseCase
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
            .init(id: "discover", label: "Entdecken", purpose: "Kontakte, Guides, Business-Profil, Unterlagen, Partner, Deals"),
            .init(id: "community", label: "Community", purpose: "Events, Gründerkreis, lokale Kontakte, RSVP"),
            .init(id: "startup", label: "Business", purpose: "Workspace für kleine Gründung, Angebot, Kosten, Anmeldung, Team, Plan, Akten"),
            .init(id: "profile", label: "Profil", purpose: "Nutzung, Onboarding, App-Tour, Integrationen, MCP-Werkzeuge, Einstellungen"),
            .init(id: "copilot", label: "Co-Pilot", purpose: "Live-KI, gespeicherte Sessions, Memory, App-Aktionen"),
        ],
        actions: [
            "open_calendar", "add_calendar_item", "add_kanban_card", "open_kanban",
            "open_business", "found_business",
            "open_company_profile", "publish_company_profile", "open_documents",
            "open_matches", "draft_match_message", "remember_fact", "refresh_live_data",
            "web_research_sources", "find_authority_contacts",
            "use_mcp_connector", "mcp_read_context", "mcp_prepare_action", "mcp_request_confirmation",
            "slack_post_confirmed", "email_draft", "gmail_send_confirmed"
        ],
        rule: "Wenn eine Antwort eine App-Aktion braucht, formuliere sie konkret und gib passende navigation/follow_up_aktionen nur dann, wenn sie jetzt wirklich helfen. Bei Fragen zu Kammer, Amt, Genehmigung oder Ansprechpartnern nutze Web-Recherche und gib sources zurueck, wenn die Quellen konkret verwendet wurden. MCP-Werkzeuge sind stille Faehigkeiten: nutze sie nur bei echtem Kontextnutzen, nenne fehlende Verknuepfungen nur bei Bedarf, und verlange vor externen Schreibaktionen immer eine Bestaetigung."
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
    /// Die im Onboarding gewählten Schwerpunkte — bisher gingen sie nach dem
    /// Startplan verloren, obwohl der Co-Pilot sie dauerhaft brauchen kann.
    let focus: [String]
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
            city: profile.plz.isEmpty ? nil : profile.plz,
            role: profile.role,
            stage: profile.mode == .idea ? "Idee" : "Skills-Profil",
            goal: "den nächsten belastbaren Schritt finden",
            risk: nil
        )
        skills = CopilotOnboardingSkills(
            selected: profile.skills,
            availability: profile.availability.hoursPerWeek
        )
        // Nach dem Onboarding stecken die Schwerpunkte in den copilotFacts
        // und gehen dem Modell darüber zu — hier bleibt das Feld leer.
        focus = []
        createdAt = ISO8601DateFormatter().string(from: .now)
    }
}

extension CopilotOnboardingContext {
    /// Variante für den Onboarding-Flow selbst: dort gibt es noch kein
    /// `MyProfile`, die Antworten liegen nur im View-State.
    init(
        userName: String,
        mode: FounderMode?,
        pitch: String,
        industry: Industry?,
        region: String,
        skills: [String],
        availability: Availability?,
        focus: [String]
    ) {
        self.userName = userName
        path = mode == .skills ? "talent" : "founder"
        self.industry = industry?.id ?? ""
        industryLabel = industry?.label ?? ""
        ventureTerm = industry?.ventureTerm ?? "Vorhaben"
        partnerTerm = industry?.partnerTerm ?? "Partner"
        copilotContext = industry?.copilotContext ?? ""
        context = CopilotOnboardingDetails(
            idea: pitch.isEmpty ? nil : pitch,
            city: region.isEmpty ? nil : region,
            role: mode == .skills ? "bietet Skills an" : "gründet selbst",
            stage: "Onboarding, noch nicht gestartet",
            goal: "den nächsten belastbaren Schritt finden",
            risk: nil
        )
        self.skills = CopilotOnboardingSkills(
            selected: skills,
            availability: availability?.hoursPerWeek ?? 0
        )
        self.focus = focus
        createdAt = ISO8601DateFormatter().string(from: .now)
    }
}

struct CopilotOnboardingDetails: Encodable {
    let idea: String?
    let city: String?
    let role: String
    let stage: String
    let goal: String
    let risk: String?
}

struct CopilotOnboardingSkills: Encodable {
    let selected: [String]
    let availability: Int
}

// ─── Onboarding: echter Startplan statt Template ──────────────

/// Startet die Hintergrund-Recherche, sobald Vorhaben, Branche und Ort
/// stehen. Läuft weiter, während der Nutzer die restlichen Fragen beantwortet.
struct OnboardingResearchRequest: Encodable {
    let task = "onboarding_research"
    let message: String
    let sessionID: UUID?
    let extra: CopilotCloudExtra

    enum CodingKeys: String, CodingKey {
        case task, message, extra
        case sessionID = "session_id"
    }
}

struct OnboardingResearchResponse: Decodable {
    let jobId: String?
    let agent: String?
    let error: String?
}

struct OnboardingBriefRequest: Encodable {
    let task = "onboarding_brief"
    let message: String
    let sessionID: UUID?
    let extra: OnboardingBriefExtra

    enum CodingKeys: String, CodingKey {
        case task, message, extra
        case sessionID = "session_id"
    }
}

struct OnboardingBriefExtra: Encodable {
    let surface = "/onboarding"
    let onboarding: CopilotOnboardingContext
    let jobId: String?

    enum CodingKeys: String, CodingKey {
        case surface, onboarding
        case jobId = "job_id"
    }
}

struct OnboardingBriefResponse: Decodable {
    let summary: String?
    let regulatory: OnboardingRegulatory?
    let steps: [OnboardingBriefStep]?
    let sources: [CopilotSource]?
    let researched: Bool?
    let error: String?
}

struct OnboardingRegulatory: Decodable {
    let level: String?
    let title: String?
    let detail: String?
    let needsExpert: Bool?

    var isCritical: Bool { level == "critical" }
    var isRelevant: Bool {
        guard let level, level != "none" else { return false }
        return !(title ?? "").isEmpty
    }
}

struct OnboardingBriefStep: Decodable {
    let title: String
    let detail: String
    let icon: String?
}

struct CopilotCloudResponse: Decodable {
    let answer: String?
    let followUpQuestion: String?
    let quickActions: [String]?
    let navigation: [CopilotCloudNav]?
    let appActions: [CopilotCloudAppAction]?
    let newFacts: [String]?
    let sources: [CopilotSource]?
    let cards: [CopilotCard]?
    let celebratedWin: String?
    let pending: Bool?
    let error: String?
}

/// Strukturierte, backend-validierte App-Aktion — wird zum tippbaren Chip.
struct CopilotCloudAppAction: Decodable {
    let action: String
    let title: String?
    let note: String?
    let due: String?
    let screen: String?
    let channelId: String?
    let channel: String?
    let message: String?
    let recipient: String?
    let to: String?
    let subject: String?
    let body: String?
    let date: String?
    let start: String?
    let end: String?
    let location: String?
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
