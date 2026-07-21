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

    var copilotContext: String {
        switch id {
        case "lokal":
            "Ladenfläche, Genehmigungen, Preise, erste Stammkunden, Google Maps und lokale Sichtbarkeit."
        case "handwerk":
            "Meisterpflicht, Handwerkskammer, Material, Kalkulation, Auftragsgewinnung und Versicherungen."
        case "gastro":
            "HACCP, Konzession, Pachtvertrag, Lieferanten, Food-Costs, Personal und lokale Sichtbarkeit."
        case "agentur":
            "Angebote, Stundensatz, Referenzen, erste Kunden, Positionierung und wiederkehrende Aufträge."
        case "handel":
            "Online-Shop, Lieferanten, Einkauf, Logistik, Retouren, Warenbestand und Ads."
        case "beauty":
            "Salonkonzept, Ausstattung, Hygiene, Preise, Buchungssystem, Stammkunden und Standort."
        case "bildung":
            "Kurse, Erlaubnisse, Preise, Räume, Vertrauen, lokale Partner und wiederkehrende Teilnehmer."
        case "gesundheit":
            "Zulassung, Datenschutz, Praxisräume, Abrechnung, Vertrauen und lokale Nachfrage."
        case "beratung":
            "Positionierung, Akquise, Stundensatz, Angebote, Kundennutzen und planbare Auslastung."
        default:
            "Profil, Unterlagen, Matches, Kalender und nächste konkrete Schritte."
        }
    }
}

/// Branchen für normale Gründungen: lokal, praktisch, dienstleistungsnah.
let industries: [Industry] = [
    .init(id: "lokal", label: "Laden & lokales Geschäft", emoji: "🏪", ventureTerm: "Geschäft", partnerTerm: "Geschäftspartner"),
    .init(id: "handwerk", label: "Handwerk & Produktion", emoji: "🔨", ventureTerm: "Betrieb", partnerTerm: "Geschäftspartner"),
    .init(id: "gastro", label: "Gastro & Food", emoji: "🍳", ventureTerm: "Lokal", partnerTerm: "Mitgründer"),
    .init(id: "beauty", label: "Friseur, Beauty & Wellness", emoji: "✂️", ventureTerm: "Salon", partnerTerm: "Partner"),
    .init(id: "handel", label: "Online-Shop & Handel", emoji: "🛍️", ventureTerm: "Shop", partnerTerm: "Mitgründer"),
    .init(id: "agentur", label: "Agentur & Freelance", emoji: "🎨", ventureTerm: "Agentur", partnerTerm: "Partner"),
    .init(id: "bildung", label: "Kurse, Bildung & Soziales", emoji: "📚", ventureTerm: "Angebot", partnerTerm: "Mitgründer"),
    .init(id: "gesundheit", label: "Praxis, Fitness & Gesundheit", emoji: "💪", ventureTerm: "Praxis/Studio", partnerTerm: "Partner"),
    .init(id: "beratung", label: "Beratung & Dienstleistung", emoji: "💼", ventureTerm: "Agentur", partnerTerm: "Partner"),
]

let skillTags = [
    "Kundenkontakt", "Handwerk", "Verkauf", "Marketing", "Buchhaltung", "Organisation",
    "Einkauf & Lieferanten", "Online-Shop", "Social Media", "Design", "Recht & Verträge",
    "Website & Technik", "Preise kalkulieren", "Service vor Ort",
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

/// Zusätzliche Profilfläche aus der Web-Version: Headline, About, Cover und Links.
struct ProfileExtras: Codable, Equatable {
    var headline: String
    var about: String
    var websiteURL: String
    var linkedinURL: String
    var githubURL: String
    var bannerStyle: BannerStyle

    enum BannerStyle: String, Codable, CaseIterable, Identifiable {
        case ember, indigo, forest
        var id: String { rawValue }
        var label: String {
            switch self {
            case .ember: "Warm"
            case .indigo: "Pilot"
            case .forest: "Trust"
            }
        }
    }

    static func empty(for profile: MyProfile?) -> ProfileExtras {
        ProfileExtras(
            headline: profile.map { "\($0.role) · \($0.industry.partnerTerm)" } ?? "",
            about: profile?.pitch ?? "",
            websiteURL: "",
            linkedinURL: "",
            githubURL: "",
            bannerStyle: .ember
        )
    }
}

enum SocialKind: String, CaseIterable, Identifiable {
    case website, linkedin, github
    var id: String { rawValue }
    var label: String {
        switch self {
        case .website: "Website"
        case .linkedin: "LinkedIn"
        case .github: "GitHub"
        }
    }
    var icon: String {
        switch self {
        case .website: "globe"
        case .linkedin: "person.crop.square"
        case .github: "chevron.left.forwardslash.chevron.right"
        }
    }
}

/// Block-basierter Firmenprofil-Builder, angelehnt an src/lib/company-blocks.ts.
enum CompanyBlockType: String, Codable, CaseIterable, Identifiable {
    case hero, about, metrics, highlights, team, cta
    var id: String { rawValue }
    var label: String {
        switch self {
        case .hero: "Hero"
        case .about: "Über das Vorhaben"
        case .metrics: "Metriken"
        case .highlights: "Highlights"
        case .team: "Team"
        case .cta: "Call to Action"
        }
    }
    var icon: String {
        switch self {
        case .hero: "sparkles"
        case .about: "text.alignleft"
        case .metrics: "chart.bar.fill"
        case .highlights: "checkmark.seal.fill"
        case .team: "person.2.fill"
        case .cta: "arrow.up.right.circle.fill"
        }
    }
}

struct CompanyMetric: Codable, Hashable, Identifiable {
    var id = UUID()
    var value: String
    var label: String
}

struct CompanyMember: Codable, Hashable, Identifiable {
    var id = UUID()
    var name: String
    var role: String
    var linkedin: String
}

struct CompanyBlock: Identifiable, Codable, Hashable {
    var id = UUID()
    var type: CompanyBlockType
    var eyebrow: String = ""
    var title: String = ""
    var subtitle: String = ""
    var body: String = ""
    var ctaLabel: String = ""
    var ctaHref: String = ""
    var metrics: [CompanyMetric] = []
    var items: [String] = []
    var members: [CompanyMember] = []

    static func empty(_ type: CompanyBlockType) -> CompanyBlock {
        switch type {
        case .hero:
            return CompanyBlock(type: .hero)
        case .about:
            return CompanyBlock(type: .about)
        case .metrics:
            return CompanyBlock(type: .metrics, metrics: [
                CompanyMetric(value: "", label: ""),
                CompanyMetric(value: "", label: ""),
                CompanyMetric(value: "", label: "")
            ])
        case .highlights:
            return CompanyBlock(type: .highlights, items: ["", "", ""])
        case .team:
            return CompanyBlock(type: .team, members: [CompanyMember(name: "", role: "", linkedin: "")])
        case .cta:
            return CompanyBlock(type: .cta)
        }
    }
}

struct CompanyProfile: Codable, Equatable {
    var name: String
    var category: String
    var stage: String
    var city: String
    var blocks: [CompanyBlock]
    var publishedSlug: String?
    var updatedAt: Date

    var isPublished: Bool { publishedSlug != nil }

    var isBlank: Bool {
        name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && blocks.allSatisfy { block in
                block.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                    && block.body.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                    && block.items.allSatisfy { $0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
            }
    }

    static func empty(for profile: MyProfile?) -> CompanyProfile {
        let category = profile?.industry.label ?? "Kleine Gründung"
        let city = profile?.plz ?? ""
        return CompanyProfile(
            name: "",
            category: category,
            stage: "Idee",
            city: city,
            blocks: [
                CompanyBlock(type: .hero),
                CompanyBlock(type: .about),
                CompanyBlock(type: .team),
                CompanyBlock(type: .cta),
            ],
            publishedSlug: nil,
            updatedAt: .now
        )
    }

}

struct FounderDocument: Identifiable, Codable, Hashable {
    let id: String
    var title: String
    var note: String
    var done: Bool

    static let defaults: [FounderDocument] = [
        .init(id: "businessplan", title: "Kurz-Businessplan", note: "Was du anbietest, für wen, warum Leute zahlen und wie du startest.", done: false),
        .init(id: "startup-costs", title: "Startkosten & private Reserve", note: "Einmalige Kosten, laufende Kosten und dein eigener Lebensunterhalt.", done: false),
        .init(id: "registration", title: "Anmeldung & Genehmigungen", note: "Gewerbe, Finanzamt, Kammer, Erlaubnisse, Hygiene oder Zulassung.", done: false),
        .init(id: "pricing", title: "Preise & Angebot", note: "Pakete, Stundensatz, Marge, Mindestumsatz und Zahlungsbedingungen.", done: false),
        .init(id: "customer-proof", title: "Kundenliste & Verkaufstest", note: "20 Zielkunden, 5 echte Gespräche und ein einfacher Testpreis.", done: false),
        .init(id: "tax-insurance", title: "Steuern & Versicherung", note: "Kleinunternehmerregelung, Steuer-Rücklage, Haftpflicht und Buchhaltung.", done: false),
    ]
}

enum FounderDocumentAssetKind: String, Codable, Hashable {
    case upload, generatedPDF

    var label: String {
        switch self {
        case .upload: "Upload"
        case .generatedPDF: "PDF"
        }
    }

    var icon: String {
        switch self {
        case .upload: "tray.and.arrow.up.fill"
        case .generatedPDF: "doc.richtext.fill"
        }
    }
}

struct FounderDocumentAsset: Identifiable, Codable, Hashable {
    var id: UUID = UUID()
    var title: String
    var fileName: String
    var kind: FounderDocumentAssetKind
    var sizeBytes: Int64
    var importedAt: Date = .now
    var textPreview: String = ""

    var fileExtension: String {
        URL(fileURLWithPath: fileName).pathExtension.uppercased()
    }

    var compactSize: String {
        let formatter = ByteCountFormatter()
        formatter.allowedUnits = [.useKB, .useMB]
        formatter.countStyle = .file
        return formatter.string(fromByteCount: sizeBytes)
    }
}

/// Arbeitsplan/Kalender: konkrete Schritte, die Co-Pilot, Heute und Workspace teilen.
enum PlannerItemKind: String, Codable, CaseIterable, Hashable {
    case focus, meeting, document, funding, legal, profile, match

    var label: String {
        switch self {
        case .focus: "Fokus"
        case .meeting: "Termin"
        case .document: "Unterlagen"
        case .funding: "Förderung"
        case .legal: "Recht"
        case .profile: "Profil"
        case .match: "Matching"
        }
    }

    var icon: String {
        switch self {
        case .focus: "target"
        case .meeting: "calendar"
        case .document: "doc.text.fill"
        case .funding: "eurosign.circle.fill"
        case .legal: "checkmark.seal.fill"
        case .profile: "building.2.fill"
        case .match: "person.2.fill"
        }
    }

    var serviceId: String {
        switch self {
        case .focus, .profile: "cofounder"
        case .meeting: "growth"
        case .document, .funding: "funding"
        case .legal: "legal"
        case .match: "talent"
        }
    }
}

enum PlannerTarget: String, Codable, Hashable {
    case chats, swipe, guides, events, company, documents, calendar, startup, pilot, profile

    var title: String {
        switch self {
        case .chats: "Chats"
        case .swipe: "Swipe"
        case .guides: "Guides"
        case .events: "Events"
        case .company: "Firmenprofil"
        case .documents: "Unterlagen"
        case .calendar: "Kalender"
        case .startup: "Business"
        case .pilot: "Co-Pilot"
        case .profile: "Profil"
        }
    }

    var destination: CopilotDestination {
        switch self {
        case .chats: .screen(.chats)
        case .swipe: .screen(.swipe)
        case .guides: .screen(.guides)
        case .events: .screen(.events)
        case .company: .screen(.company)
        case .documents: .screen(.documents)
        case .calendar: .screen(.calendar)
        case .startup: .screen(.startup)
        case .pilot: .screen(.copilot)
        case .profile: .tab(.profile)
        }
    }
}

/// Geführter Einstieg nach Login/Onboarding: konkrete Schritte statt reiner Feature-Tour.
struct LaunchGuideStep: Identifiable, Hashable {
    let id: String
    let title: String
    let subtitle: String
    let detail: String
    let actionTitle: String
    let icon: String
    let serviceId: String
    let completed: Bool
    let destination: CopilotDestination?
    let copilotPrompt: String?
}

struct PlannerItem: Identifiable, Codable, Hashable {
    var id: UUID = UUID()
    var title: String
    var note: String
    var dueLabel: String
    var kind: PlannerItemKind
    var target: PlannerTarget?
    var date: Date?
    var assigneeName: String?
    var createdByCopilot: Bool = false
    var done: Bool = false

    enum CodingKeys: String, CodingKey {
        case id, title, note, dueLabel, kind, target, date, assigneeName, createdByCopilot, done
    }

    init(
        id: UUID = UUID(),
        title: String,
        note: String,
        dueLabel: String,
        kind: PlannerItemKind,
        target: PlannerTarget?,
        date: Date? = nil,
        assigneeName: String? = nil,
        createdByCopilot: Bool = false,
        done: Bool = false
    ) {
        self.id = id
        self.title = title
        self.note = note
        self.dueLabel = dueLabel
        self.kind = kind
        self.target = target
        self.date = date
        self.assigneeName = assigneeName
        self.createdByCopilot = createdByCopilot
        self.done = done
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decodeIfPresent(UUID.self, forKey: .id) ?? UUID()
        title = try container.decode(String.self, forKey: .title)
        note = try container.decode(String.self, forKey: .note)
        dueLabel = try container.decode(String.self, forKey: .dueLabel)
        kind = try container.decode(PlannerItemKind.self, forKey: .kind)
        target = try container.decodeIfPresent(PlannerTarget.self, forKey: .target)
        date = try container.decodeIfPresent(Date.self, forKey: .date)
        assigneeName = try container.decodeIfPresent(String.self, forKey: .assigneeName)
        createdByCopilot = try container.decodeIfPresent(Bool.self, forKey: .createdByCopilot) ?? false
        done = try container.decodeIfPresent(Bool.self, forKey: .done) ?? false
    }

    static func defaults(for profile: MyProfile?, company: CompanyProfile, documents: [FounderDocument]) -> [PlannerItem] {
        let venture = profile?.industry.ventureTerm ?? "Vorhaben"
        let idea = company.name.isEmpty ? (profile?.pitch ?? "dein Vorhaben") : company.name
        let nextDoc = documents.first(where: { !$0.done })?.title ?? "Unterlagen prüfen"

        return [
            PlannerItem(
                title: "Startkosten für \(idea) schätzen",
                note: "Einmalkosten, Monatskosten und private Lebenshaltung in eine grobe Zahl bringen.",
                dueLabel: "Heute",
                kind: .focus,
                target: .guides
            ),
            PlannerItem(
                title: "\(nextDoc) fertig machen",
                note: "Der Co-Pilot kann aus deinem Profil einen ersten Entwurf vorbereiten.",
                dueLabel: "Diese Woche",
                kind: .document,
                target: .documents
            ),
            PlannerItem(
                title: "2 passende \(profile?.industry.partnerTerm ?? "Partner") oder Helfer ansprechen",
                note: "Nicht nur swipen: eine kurze, ehrliche Nachricht mit konkretem 15-Minuten-Vorschlag senden.",
                dueLabel: "Nächste 7 Tage",
                kind: .match,
                target: .swipe
            ),
            PlannerItem(
                title: "\(venture)-Profil verständlich machen",
                note: "Angebot, Zielgruppe, Standort, nächster Schritt und Kontakt so schärfen, dass fremde Menschen es sofort verstehen.",
                dueLabel: "Nächster Meilenstein",
                kind: .profile,
                target: .company
            ),
        ]
    }
}

/// Selbst aktualisierendes Gründer-Verzeichnis für den Co-Pilot.
struct FounderMemorySnapshot: Hashable {
    let founderName: String
    let role: String
    let ventureName: String
    let industry: String
    let stage: String
    let location: String
    let idea: String
    let partnerTerm: String
    let headline: String
    let about: String
    let completedDocuments: Int
    let totalDocuments: Int
    let openDocuments: [String]
    let registeredEvents: [String]
    let openPlannerItems: [String]
    let bestMatches: [String]

    var documentProgress: String { "\(completedDocuments)/\(totalDocuments) Unterlagen" }
    var openDocumentsText: String { openDocuments.isEmpty ? "keine offenen Pflichtunterlagen" : openDocuments.joined(separator: ", ") }
    var nextStep: String { openPlannerItems.first ?? "Firmenprofil und Matching aktuell halten" }

    var compactSummary: String {
        "\(ventureName) · \(stage) · \(industry) · \(location)"
    }

    static func from(
        profile: MyProfile?,
        extras: ProfileExtras,
        company: CompanyProfile,
        documents: [FounderDocument],
        registeredEvents: [CommunityEvent],
        plannerItems: [PlannerItem],
        matches: [Match]
    ) -> FounderMemorySnapshot {
        let openDocs = documents.filter { !$0.done }.map(\.title)
        let openPlan = plannerItems.filter { !$0.done }.prefix(4).map(\.title)
        let bestMatches = matches.prefix(3).map { "\($0.card.name) (\($0.card.matchPercent)%)" }
        let fallbackIdea = profile?.pitch.isEmpty == false ? profile!.pitch : company.name

        return FounderMemorySnapshot(
            founderName: profile?.name ?? "Noch kein Name",
            role: profile?.role ?? "Gründer",
            ventureName: company.name.isEmpty ? (profile?.industry.ventureTerm ?? "Vorhaben") : company.name,
            industry: profile?.industry.label ?? company.category,
            stage: company.stage,
            location: company.city.isEmpty ? (profile?.plz ?? "DACH") : company.city,
            idea: company.blocks.first(where: { $0.type == .hero })?.body.isEmpty == false
                ? company.blocks.first(where: { $0.type == .hero })!.body
                : fallbackIdea,
            partnerTerm: profile?.industry.partnerTerm ?? "Mitgründer",
            headline: extras.headline,
            about: extras.about,
            completedDocuments: documents.filter(\.done).count,
            totalDocuments: documents.count,
            openDocuments: openDocs,
            registeredEvents: registeredEvents.map(\.title),
            openPlannerItems: Array(openPlan),
            bestMatches: bestMatches
        )
    }
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

struct CofounderSignal: Identifiable, Hashable {
    let id: String
    let label: String
    let value: Int
    let note: String
}

struct CofounderCandidate: Identifiable, Hashable {
    let id: String
    let card: FounderCard
    let sourceMatchID: String?
    let skillFit: Int
    let timingFit: Int
    let commitmentFit: Int
    let evidenceFit: Int
    let risks: [String]
    let testSprint: String

    var total: Int {
        Int(round(Double(skillFit + timingFit + commitmentFit + evidenceFit) / 4.0))
    }

    var signals: [CofounderSignal] {
        [
            .init(id: "skill", label: "Skill-Fit", value: skillFit, note: "Ergänzt deine Lücke statt nur ähnlich zu sein."),
            .init(id: "timing", label: "Timing", value: timingFit, note: "Verfügbarkeit und Nähe zum aktuellen Tempo."),
            .init(id: "commitment", label: "Commitment", value: commitmentFit, note: "Wie belastbar das Interesse aktuell wirkt."),
            .init(id: "evidence", label: "Beweis", value: evidenceFit, note: "Ob es schon Gesprächs- oder Arbeits-Signale gibt."),
        ]
    }
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
struct CopilotSource: Identifiable, Codable, Hashable {
    var id: String { url ?? title }
    var type: String
    var title: String
    var url: String?
    var snippet: String?

    enum CodingKeys: String, CodingKey {
        case type, typ, title, titel, url, snippet
    }

    init(type: String = "Web", title: String, url: String? = nil, snippet: String? = nil) {
        self.type = type
        self.title = title
        self.url = url
        self.snippet = snippet
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        type = try container.decodeIfPresent(String.self, forKey: .type)
            ?? container.decodeIfPresent(String.self, forKey: .typ)
            ?? "Web"
        title = try container.decodeIfPresent(String.self, forKey: .title)
            ?? container.decodeIfPresent(String.self, forKey: .titel)
            ?? "Quelle"
        url = try container.decodeIfPresent(String.self, forKey: .url)
        snippet = try container.decodeIfPresent(String.self, forKey: .snippet)
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(type, forKey: .type)
        try container.encode(title, forKey: .title)
        try container.encodeIfPresent(url, forKey: .url)
        try container.encodeIfPresent(snippet, forKey: .snippet)
    }
}

struct CopilotMessage: Identifiable, Codable {
    let id: UUID
    let mine: Bool
    let text: String
    var navigation: [CopilotNav] = []
    var actions: [CopilotAction] = []
    var quickReplies: [String] = []
    var choices: [CopilotChoice] = []
    var sources: [CopilotSource] = []
    var memory: FounderMemorySnapshot?
    var source: CopilotAnswerSource = .local
    var createdAt: Date = .now

    init(
        id: UUID = UUID(),
        mine: Bool,
        text: String,
        actions: [CopilotAction] = [],
        navigation: [CopilotNav] = [],
        quickReplies: [String] = [],
        choices: [CopilotChoice] = [],
        sources: [CopilotSource] = [],
        memory: FounderMemorySnapshot? = nil,
        source: CopilotAnswerSource = .local,
        createdAt: Date = .now
    ) {
        self.id = id
        self.mine = mine
        self.text = text
        self.actions = actions
        self.navigation = navigation
        self.quickReplies = quickReplies
        self.choices = choices
        self.sources = sources
        self.memory = memory
        self.source = source
        self.createdAt = createdAt
    }

    enum CodingKeys: String, CodingKey {
        case id, mine, text, quickReplies, choices, sources, source, createdAt
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        mine = try container.decode(Bool.self, forKey: .mine)
        text = try container.decode(String.self, forKey: .text)
        quickReplies = try container.decodeIfPresent([String].self, forKey: .quickReplies) ?? []
        choices = try container.decodeIfPresent([CopilotChoice].self, forKey: .choices) ?? []
        sources = try container.decodeIfPresent([CopilotSource].self, forKey: .sources) ?? []
        source = try container.decodeIfPresent(CopilotAnswerSource.self, forKey: .source) ?? .local
        createdAt = try container.decodeIfPresent(Date.self, forKey: .createdAt) ?? .now
        navigation = []
        actions = []
        memory = nil
    }
}

struct CopilotChoice: Identifiable, Codable, Hashable {
    let id: String
    let label: String
    let detail: String?
    let prompt: String
    let icon: String

    init(
        id: String,
        label: String,
        detail: String? = nil,
        prompt: String,
        icon: String = "circle"
    ) {
        self.id = id
        self.label = label
        self.detail = detail
        self.prompt = prompt
        self.icon = icon
    }
}

enum CopilotAnswerSource: String, Codable {
    case cloud, local

    var label: String {
        switch self {
        case .cloud: "KI live"
        case .local: "App"
        }
    }
}

struct CopilotSession: Identifiable, Codable {
    let id: UUID
    var title: String
    var createdAt: Date
    var updatedAt: Date
    var messages: [CopilotMessage]

    init(
        id: UUID = UUID(),
        title: String = "Neues Thema",
        createdAt: Date = .now,
        updatedAt: Date = .now,
        messages: [CopilotMessage] = []
    ) {
        self.id = id
        self.title = title
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.messages = messages
    }

    var preview: String {
        messages.last?.text.replacingOccurrences(of: "\n", with: " ") ?? "Noch keine Nachrichten"
    }

    var userMessageCount: Int {
        messages.filter(\.mine).count
    }

    mutating func append(_ message: CopilotMessage) {
        messages.append(message)
        updatedAt = message.createdAt
        if title == "Neues Thema", message.mine {
            title = Self.title(from: message.text)
        }
    }

    static func title(from text: String) -> String {
        let cleaned = text
            .replacingOccurrences(of: "\n", with: " ")
            .split(separator: " ")
            .joined(separator: " ")
        guard !cleaned.isEmpty else { return "Neues Thema" }
        return String(cleaned.prefix(46))
    }
}

struct CopilotNav: Identifiable, Hashable {
    var id: String { label }
    let label: String
    let destination: CopilotDestination
}

struct CopilotAction: Identifiable, Hashable {
    let id = UUID()
    let label: String
    let icon: String
    let command: CopilotCommand
}

enum CopilotCommand: Hashable {
    case open(CopilotDestination)
    case askCopilot(String)
    case draftMatchMessage(String)
    case startCofounderTrial(String)
    case openMatchChat(String)
    case sendMatchMessage(matchID: String, text: String)
    case rebuildPlanner
    case generateDocumentDraft
    case publishCompanyProfile
    case refreshBackend
    case refreshPartners
    case refreshFounderRadar
    case toggleDocument(String)
    case exportDocumentPDF
    case addPlannerItem(title: String, note: String, dueLabel: String, kind: PlannerItemKind, target: PlannerTarget?)
    case addSmartPlannerItem(title: String, note: String, dueLabel: String, kind: PlannerItemKind, target: PlannerTarget?, assigneeName: String?)
    case rememberFact(String)
    case foundStartup(name: String, category: String, stage: String, city: String, idea: String)
    case addKanbanCard(title: String, note: String)
}

enum CopilotDestination: Hashable {
    case tab(AppTab)
    case screen(AppScreen)
    case guide(String)   // slug
}

/// Routen des Heute-Tabs (Chats leben hier, wie im Design-Feed).
enum TodayRoute: Hashable {
    case chats
    case chat(String)
    case calendar
    case kanban
    case startup
    case radar
}

enum AppTab: Int, Hashable, CaseIterable {
    case today, discover, community, startup, profile

    var label: String {
        switch self {
        case .today: "Heute"
        case .discover: "Entdecken"
        case .community: "Community"
        case .startup: "Business"
        case .profile: "Profil"
        }
    }
    var icon: String {
        switch self {
        case .today: "sparkle"
        case .discover: "magnifyingglass"
        case .community: "person.2.fill"
        case .startup: "building.2.fill"
        case .profile: "person.fill"
        }
    }
}

/// Ziel-Erweiterung: Screens, die der Co-Pilot/Heute öffnen kann.
enum AppScreen: Hashable {
    case cofounderDesk, swipe, chats, guides, events, company, documents, calendar, kanban, startup, radar, copilot
    case partners(String)
    case partner(String)
}

enum IntegrationProvider: String, Codable, CaseIterable, Identifiable, Hashable {
    case gmail
    case googleCalendar = "google_calendar"
    case whatsapp

    var id: String { rawValue }

    var label: String {
        switch self {
        case .gmail: "Gmail"
        case .googleCalendar: "Google Kalender"
        case .whatsapp: "WhatsApp"
        }
    }

    var shortLabel: String {
        switch self {
        case .gmail: "Mail"
        case .googleCalendar: "Kalender"
        case .whatsapp: "WhatsApp"
        }
    }

    var detail: String {
        switch self {
        case .gmail:
            "Wichtige Mails, Antwortentwuerfe und Rueckfragen im Morgenbriefing."
        case .googleCalendar:
            "Termine erkennen, vorbereiten und bei Bestaetigung in den Kalender legen."
        case .whatsapp:
            "Gateway fuer Nachrichten-Signale aus echten Kunden- und Team-Chats."
        }
    }

    var icon: String {
        switch self {
        case .gmail: "envelope.fill"
        case .googleCalendar: "calendar.badge.clock"
        case .whatsapp: "message.fill"
        }
    }

    var tintKey: String {
        switch self {
        case .gmail: "growth"
        case .googleCalendar: "capital"
        case .whatsapp: "talent"
        }
    }

    var usesOAuth: Bool {
        self == .gmail || self == .googleCalendar
    }
}

struct ConnectedAccount: Identifiable, Codable, Hashable {
    let provider: IntegrationProvider
    let status: String
    let accountLabel: String?
    let updatedAt: Date?

    var id: String { provider.id }
    var isConnected: Bool { status == "connected" }
    var isPending: Bool { status == "pending" }

    var statusLabel: String {
        if isConnected { return "verbunden" }
        if isPending { return "wartet" }
        if status == "error" { return "Fehler" }
        return status
    }

    var displayLabel: String {
        let trimmed = accountLabel?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return trimmed.isEmpty ? provider.detail : trimmed
    }
}

enum MCPConnectorID: String, Codable, CaseIterable, Identifiable, Hashable {
    case authorities = "authorities"
    case googleDrive = "google_drive"
    case notion = "notion"
    case slack = "slack"
    case github = "github"
    case commerce = "commerce"
    case accounting = "accounting"
    case googleBusiness = "google_business"

    var id: String { rawValue }

    static let recommended: [MCPConnectorID] = [
        .authorities,
        .googleDrive,
        .accounting,
        .googleBusiness,
        .commerce,
        .notion,
        .slack,
        .github,
    ]

    var label: String {
        switch self {
        case .authorities: "Web, Kammern & Aemter"
        case .googleDrive: "Google Drive & Docs"
        case .notion: "Notion Wissen"
        case .slack: "Slack Team"
        case .github: "GitHub & Website-Code"
        case .commerce: "Shopify/WooCommerce"
        case .accounting: "Buchhaltung"
        case .googleBusiness: "Google Business"
        }
    }

    var shortLabel: String {
        switch self {
        case .authorities: "Aemter"
        case .googleDrive: "Drive"
        case .notion: "Notion"
        case .slack: "Slack"
        case .github: "GitHub"
        case .commerce: "Shop"
        case .accounting: "Buchhaltung"
        case .googleBusiness: "Maps"
        }
    }

    var category: String {
        switch self {
        case .authorities: "Recherche"
        case .googleDrive, .notion: "Unterlagen"
        case .slack: "Team"
        case .github: "Tech"
        case .commerce: "Vertrieb"
        case .accounting: "Finanzen"
        case .googleBusiness: "Lokal"
        }
    }

    var detail: String {
        switch self {
        case .authorities:
            "Findet HWK/IHK, Gewerbeamt, Foerderstellen und Quellen als Chips."
        case .googleDrive:
            "Liest Gruenderordner, PDFs, Businessplaene und Entwuerfe fuer Unterlagen."
        case .notion:
            "Nutzt Wikis, Checklisten und Projektseiten als lebendes Vorhaben-Gedaechtnis."
        case .slack:
            "Bereitet Team-Updates, Broadcasts und offene Fragen fuer kleine Teams vor."
        case .github:
            "Hilft bei Website, Shop-Code, Issues und technischen Aufgaben."
        case .commerce:
            "Analysiert Produkte, Bestellungen, Warenkorb-Signale und erste Kunden."
        case .accounting:
            "Versteht Belege, Rechnungen, USt., DATEV/Lexoffice-Signale und Cash-Fragen."
        case .googleBusiness:
            "Optimiert lokale Sichtbarkeit, Bewertungen, Fotos, Oeffnungszeiten und Leads."
        }
    }

    var icon: String {
        switch self {
        case .authorities: "building.columns.fill"
        case .googleDrive: "folder.fill"
        case .notion: "doc.text.fill"
        case .slack: "bubble.left.and.bubble.right.fill"
        case .github: "chevron.left.forwardslash.chevron.right"
        case .commerce: "cart.fill"
        case .accounting: "banknote.fill"
        case .googleBusiness: "mappin.and.ellipse"
        }
    }

    var tintKey: String {
        switch self {
        case .authorities: "mentor"
        case .googleDrive: "capital"
        case .notion: "legal"
        case .slack: "talent"
        case .github: "cofounder"
        case .commerce: "growth"
        case .accounting: "tax"
        case .googleBusiness: "funding"
        }
    }

    var tools: [String] {
        switch self {
        case .authorities:
            ["Quellen", "Kontakte", "Pflichten"]
        case .googleDrive:
            ["PDFs", "Docs", "Uploads"]
        case .notion:
            ["Wikis", "Checklisten", "Notizen"]
        case .slack:
            ["Team", "Broadcast", "Briefing"]
        case .github:
            ["Repo", "Issues", "Deploy"]
        case .commerce:
            ["Produkte", "Orders", "Kunden"]
        case .accounting:
            ["Belege", "USt.", "DATEV"]
        case .googleBusiness:
            ["Profil", "Bewertungen", "Lokal"]
        }
    }

    var copilotUseCase: String {
        switch self {
        case .authorities:
            "nutzt Web-/Behoerdenrecherche fuer belastbare Pflichten, Ansprechpartner und Quellenchips"
        case .googleDrive:
            "zieht relevante Unterlagen heran, erstellt Versionen und kann fehlende Dokumente erkennen"
        case .notion:
            "liest Wissensseiten und haelt Aufgaben, Entscheidungen und offene Fragen zusammen"
        case .slack:
            "bereitet Team-Broadcasts, Zusammenfassungen und Entscheidungsfragen vor"
        case .github:
            "analysiert Website-/Shop-Code, Issues und technische TODOs fuer umsetzbare Schritte"
        case .commerce:
            "liest Shop-Signale und schlaegt konkrete Growth-/Operations-Massnahmen vor"
        case .accounting:
            "bereitet Rechnungs-, Steuer- und Cashflow-Fragen mit vorhandenen Belegen vor"
        case .googleBusiness:
            "verbessert lokales Profil, Rezensionen, Bilder, Oeffnungszeiten und Suchbarkeit"
        }
    }
}

struct MCPConnectorLink: Identifiable, Codable, Hashable {
    let connectorID: MCPConnectorID
    var status: String
    var connectedAt: Date?
    var note: String?

    var id: String { connectorID.id }
    var isConnected: Bool { status == "connected" }
    var statusLabel: String {
        isConnected ? "aktiv" : status
    }
}

struct MorningReport: Identifiable, Codable, Hashable {
    let id: UUID
    let reportDate: String
    let content: MorningReportContent
    let createdAt: Date?

    var formattedDate: String {
        Self.dateFormatter.string(from: reportDateDate ?? .now)
    }

    private var reportDateDate: Date? {
        Self.storageDateFormatter.date(from: reportDate)
    }

    private static let storageDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "de_DE")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()

    private static let dateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "de_DE")
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter
    }()
}

struct MorningReportContent: Codable, Hashable {
    var fokus: String?
    var hinweis: String?
    var tagesablauf: [MorningScheduleBlock]?
    var wichtigeMails: [MorningMail]?
    var draftVorschlaege: [MorningDraft]?
    var erkannteTermine: [MorningDetectedEvent]?
    var whatsapp: MorningWhatsApp?
    var verbundeneKonten: [String]?

    var safeFocus: String {
        clean(fokus) ?? "Noch kein Briefing fuer heute."
    }

    var connectedAccountLabels: [String] {
        (verbundeneKonten ?? [])
            .compactMap { IntegrationProvider(rawValue: $0)?.shortLabel }
    }

    private func clean(_ value: String?) -> String? {
        guard let value else { return nil }
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }
}

struct MorningScheduleBlock: Codable, Hashable, Identifiable {
    var id: String { "\(zeit)-\(titel)" }
    let zeit: String
    let titel: String

    enum CodingKeys: String, CodingKey {
        case zeit, titel, title
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        zeit = try container.decodeIfPresent(String.self, forKey: .zeit) ?? ""
        titel = try container.decodeIfPresent(String.self, forKey: .titel)
            ?? container.decodeIfPresent(String.self, forKey: .title)
            ?? "Block"
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(zeit, forKey: .zeit)
        try container.encode(titel, forKey: .titel)
    }
}

struct MorningMail: Codable, Hashable, Identifiable {
    var id: String { "\(von)-\(betreff)" }
    let von: String
    let betreff: String
    let warum: String

    enum CodingKeys: String, CodingKey {
        case von, from, betreff, subject, warum, reason
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        von = try container.decodeIfPresent(String.self, forKey: .von)
            ?? container.decodeIfPresent(String.self, forKey: .from)
            ?? "Unbekannt"
        betreff = try container.decodeIfPresent(String.self, forKey: .betreff)
            ?? container.decodeIfPresent(String.self, forKey: .subject)
            ?? "Ohne Betreff"
        warum = try container.decodeIfPresent(String.self, forKey: .warum)
            ?? container.decodeIfPresent(String.self, forKey: .reason)
            ?? "Der Co-Pilot hat diese Mail als relevant markiert."
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(von, forKey: .von)
        try container.encode(betreff, forKey: .betreff)
        try container.encode(warum, forKey: .warum)
    }
}

struct MorningDraft: Codable, Hashable, Identifiable {
    var id: String { "\(an)-\(betreff)-\(gmailDraftId ?? "")" }
    let an: String
    let betreff: String
    let entwurf: String
    let gmailDraftId: String?

    enum CodingKeys: String, CodingKey {
        case an, to, betreff, subject, entwurf, body, gmailDraftId
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        an = try container.decodeIfPresent(String.self, forKey: .an)
            ?? container.decodeIfPresent(String.self, forKey: .to)
            ?? ""
        betreff = try container.decodeIfPresent(String.self, forKey: .betreff)
            ?? container.decodeIfPresent(String.self, forKey: .subject)
            ?? "Antwort"
        entwurf = try container.decodeIfPresent(String.self, forKey: .entwurf)
            ?? container.decodeIfPresent(String.self, forKey: .body)
            ?? ""
        gmailDraftId = try container.decodeIfPresent(String.self, forKey: .gmailDraftId)
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(an, forKey: .an)
        try container.encode(betreff, forKey: .betreff)
        try container.encode(entwurf, forKey: .entwurf)
        try container.encodeIfPresent(gmailDraftId, forKey: .gmailDraftId)
    }
}

struct MorningDetectedEvent: Codable, Hashable, Identifiable {
    var id: String { "\(titel)-\(datum)-\(zeit ?? "")" }
    let titel: String
    let datum: String
    let zeit: String?
    let quelle: String?
    let calendarEventId: String?

    enum CodingKeys: String, CodingKey {
        case titel, title, datum, date, zeit, time, quelle, source, calendarEventId
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        titel = try container.decodeIfPresent(String.self, forKey: .titel)
            ?? container.decodeIfPresent(String.self, forKey: .title)
            ?? "Termin"
        datum = try container.decodeIfPresent(String.self, forKey: .datum)
            ?? container.decodeIfPresent(String.self, forKey: .date)
            ?? ""
        zeit = try container.decodeIfPresent(String.self, forKey: .zeit)
            ?? container.decodeIfPresent(String.self, forKey: .time)
        quelle = try container.decodeIfPresent(String.self, forKey: .quelle)
            ?? container.decodeIfPresent(String.self, forKey: .source)
        calendarEventId = try container.decodeIfPresent(String.self, forKey: .calendarEventId)
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(titel, forKey: .titel)
        try container.encode(datum, forKey: .datum)
        try container.encodeIfPresent(zeit, forKey: .zeit)
        try container.encodeIfPresent(quelle, forKey: .quelle)
        try container.encodeIfPresent(calendarEventId, forKey: .calendarEventId)
    }
}

struct MorningWhatsApp: Codable, Hashable {
    let neue: Int?
    let verbunden: Bool?
}

struct StartupTeamMember: Identifiable, Codable, Hashable {
    var id: UUID = UUID()
    var name: String
    var role: String
    var focus: String
    var sourceMatchID: String?
    var joinedAt: Date = .now

    static func defaults(profile: MyProfile?, matches: [Match]) -> [StartupTeamMember] {
        var members: [StartupTeamMember] = [
            StartupTeamMember(
                name: profile?.name ?? "Du",
                role: profile?.role ?? "Gründer",
                focus: profile.flatMap { $0.pitch.isEmpty ? nil : $0.pitch } ?? "Vision, Entscheidungen und nächster Schritt",
                sourceMatchID: nil
            )
        ]

        for match in matches.prefix(2) {
            members.append(
                StartupTeamMember(
                    name: match.card.name,
                    role: match.card.role,
                    focus: match.card.skills.prefix(2).joined(separator: " + "),
                    sourceMatchID: match.id
                )
            )
        }
        return members
    }
}

/// Community-Event — öffnen, ansehen, anmelden.
struct CommunityEvent: Identifiable, Hashable {
    let id: String
    let title: String
    let kind: String        // "Pitch-Night", "Stammtisch", "Hackathon"
    let serviceId: String   // Farbe aus der Service-Palette
    let dateLabel: String
    let timeLabel: String
    let city: String
    let venue: String
    let spots: Int
    let taken: Int
    let host: String
    let blurb: String
    let agenda: [String]
    let bannerImageURL: String?

    var spotsLeft: Int { max(0, spots - taken) }

    var bannerURL: URL? {
        guard let bannerImageURL else { return nil }
        let trimmed = bannerImageURL.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }
        return URL(string: trimmed)
    }
}

/// Kuratierte Partnerangebote aus der Web-Version (src/data/partners.*).
enum LiveDataState: Equatable {
    case idle
    case loading
    case loaded
    case failed(String)

    var message: String {
        switch self {
        case .idle: "Live-Daten bereit"
        case .loading: "Live-Daten werden geladen"
        case .loaded: "Live-Daten geladen"
        case .failed(let message): message
        }
    }
}

struct PartnerSpecialty: Codable, Hashable {
    let label: String
    let level: Double
}

struct PartnerPackage: Codable, Hashable {
    let name: String
    let price: String
    let desc: String
}

struct PartnerVouch: Codable, Hashable {
    let from: String
    let role: String
    let quote: String
}

struct PartnerOffer: Identifiable, Decodable, Hashable {
    let slug: String
    let name: String
    let firm: String
    let serviceId: String
    let city: String
    let blurb: String
    let fit: Int
    let sourceURL: URL?
    let bookingURL: URL?
    let logoURL: URL?
    let bannerURL: URL?
    let specialties: [PartnerSpecialty]
    let packages: [PartnerPackage]
    let why: [String]
    let vouches: [PartnerVouch]

    var id: String { slug }
    var service: ServiceInfo? { serviceCatalog.first { $0.id == serviceId } }
    var serviceLabel: String { service?.label ?? serviceId.capitalized }
    var primaryURL: URL? { bookingURL ?? sourceURL }

    private enum CodingKeys: String, CodingKey {
        case slug, name, firm, city, blurb, fit, specialties, packages, why, vouches
        case service
        case serviceId
        case serviceIdSnake = "service_id"
        case sourceURL = "sourceURL"
        case sourceUrl = "sourceUrl"
        case sourceUrlSnake = "source_url"
        case bookingURL = "bookingURL"
        case bookingUrl = "bookingUrl"
        case bookingUrlSnake = "booking_url"
        case logoURL = "logoURL"
        case logoUrl = "logoUrl"
        case logoUrlSnake = "logo_url"
        case bannerURL = "bannerURL"
        case bannerUrl = "bannerUrl"
        case bannerUrlSnake = "banner_url"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)

        slug = Self.string(in: container, .slug) ?? UUID().uuidString
        name = Self.string(in: container, .name) ?? "Partner"
        firm = Self.string(in: container, .firm) ?? "matchfoundr Partner"
        serviceId = Self.firstString(in: container, [.serviceId, .serviceIdSnake, .service]) ?? "growth"
        city = Self.string(in: container, .city) ?? "Remote"
        blurb = Self.string(in: container, .blurb) ?? "Kuratierter Partner aus dem matchfoundr Netzwerk."
        fit = Self.int(in: container, .fit) ?? 75
        sourceURL = Self.url(in: container, [.sourceURL, .sourceUrl, .sourceUrlSnake])
        bookingURL = Self.url(in: container, [.bookingURL, .bookingUrl, .bookingUrlSnake])
        logoURL = Self.url(in: container, [.logoURL, .logoUrl, .logoUrlSnake])
        bannerURL = Self.url(in: container, [.bannerURL, .bannerUrl, .bannerUrlSnake])
        specialties = (try? container.decodeIfPresent([PartnerSpecialty].self, forKey: .specialties)) ?? []
        packages = (try? container.decodeIfPresent([PartnerPackage].self, forKey: .packages)) ?? []
        why = (try? container.decodeIfPresent([String].self, forKey: .why)) ?? []
        vouches = (try? container.decodeIfPresent([PartnerVouch].self, forKey: .vouches)) ?? []
    }

    private static func firstString(
        in container: KeyedDecodingContainer<CodingKeys>,
        _ keys: [CodingKeys]
    ) -> String? {
        keys.lazy.compactMap { string(in: container, $0) }.first
    }

    private static func string(
        in container: KeyedDecodingContainer<CodingKeys>,
        _ key: CodingKeys
    ) -> String? {
        guard let value = try? container.decodeIfPresent(String.self, forKey: key) else { return nil }
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }

    private static func int(
        in container: KeyedDecodingContainer<CodingKeys>,
        _ key: CodingKeys
    ) -> Int? {
        if let value = try? container.decodeIfPresent(Int.self, forKey: key) {
            return value
        }
        if let value = try? container.decodeIfPresent(Double.self, forKey: key) {
            return Int(value.rounded())
        }
        return nil
    }

    private static func url(
        in container: KeyedDecodingContainer<CodingKeys>,
        _ keys: [CodingKeys]
    ) -> URL? {
        for key in keys {
            guard let raw = string(in: container, key) else { continue }
            if let url = RemoteAssetURL.resolve(raw) {
                return url
            }
        }
        return nil
    }
}

/// Service-Kachel für Entdecken (Design: MEntdecken).
struct ServiceInfo: Identifiable {
    let id: String
    let label: String
    let blurb: String
    let count: Int
    let icon: String  // SF Symbol
}

let serviceCatalog: [ServiceInfo] = [
    .init(id: "cofounder", label: "Partner & Mitstreiter", blurb: "Menschen, die wirklich mit anpacken.", count: 412, icon: "person.2.fill"),
    .init(id: "legal", label: "Recht & Anmeldung", blurb: "Gewerbe, Verträge, Erlaubnisse, Haftung.", count: 86, icon: "checkmark.seal.fill"),
    .init(id: "tax", label: "Steuer & Buchhaltung", blurb: "Kleinunternehmer, Belege, Rücklagen.", count: 64, icon: "doc.text.fill"),
    .init(id: "funding", label: "Förderung", blurb: "Zuschüsse, IHK/HWK, Arbeitsagentur.", count: 31, icon: "eurosign.circle.fill"),
    .init(id: "capital", label: "Startkapital", blurb: "Eigenmittel, Mikrokredit, KfW, Bank.", count: 214, icon: "arrow.up.right.circle.fill"),
    .init(id: "mentor", label: "Erfahrene Gründer", blurb: "Leute, die kleine Betriebe kennen.", count: 178, icon: "safari.fill"),
    .init(id: "talent", label: "Helfer & Team", blurb: "Aushilfe, Umsetzung, erste Unterstützung.", count: 540, icon: "sparkles"),
    .init(id: "growth", label: "Kunden gewinnen", blurb: "Google, Social, Empfehlungen, lokale Sichtbarkeit.", count: 122, icon: "chart.line.uptrend.xyaxis"),
]
