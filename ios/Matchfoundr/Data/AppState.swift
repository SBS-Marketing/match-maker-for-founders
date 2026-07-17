// matchfoundr · App-Zustand
// Ein ObservableObject als Quelle der Wahrheit. Persistenz: UserDefaults
// Supabase-live mit lokalen Nutzerdaten fuer den nativen Arbeitsfluss.

import SwiftUI
#if canImport(UIKit)
import UIKit
#endif
#if canImport(PDFKit)
import PDFKit
#endif

@MainActor
final class AppState: ObservableObject {
    static let shared = AppState()

    // ─── Supabase Auth ───────────────────────────────────────
    @Published var authUser: BackendAuthSnapshot?
    @Published var authIsLoading = true
    @Published var authMessage: String?
    @Published var authError: String?
    var isAuthenticated: Bool { authUser != nil }

    // ─── Profil / Onboarding ─────────────────────────────────
    @Published var profile: MyProfile? {
        didSet { persistProfile() }
    }
    @Published var profileExtras: ProfileExtras = .empty(for: nil) {
        didSet { persist(profileExtras, key: "mf.profile.extras") }
    }
    @Published var companyProfile: CompanyProfile = .empty(for: nil) {
        didSet { persist(companyProfile, key: "mf.company.profile") }
    }
    @Published var documents: [FounderDocument] = [] {
        didSet { persist(documents, key: "mf.documents") }
    }
    @Published var documentAssets: [FounderDocumentAsset] = [] {
        didSet { persist(documentAssets, key: "mf.documents.assets") }
    }
    @Published var plannerItems: [PlannerItem] = [] {
        didSet { persist(plannerItems, key: "mf.planner.items") }
    }
    @Published var startupTeamMembers: [StartupTeamMember] = [] {
        didSet { persist(startupTeamMembers, key: "mf.startup.team") }
    }
    @Published var startupWorkspaceActivated = false {
        didSet { defaults.set(startupWorkspaceActivated, forKey: "mf.startup.activated") }
    }
    @Published var documentDraft: String = "" {
        didSet { defaults.set(documentDraft, forKey: "mf.documents.draft") }
    }
    @Published var copilotFacts: [String] = [] {
        didSet { defaults.set(copilotFacts, forKey: "mf.copilot.facts") }
    }
    @Published var copilotSessions: [CopilotSession] = [] {
        didSet { persist(copilotSessions, key: "mf.copilot.sessions") }
    }
    @Published var pendingCopilotPrompt: String?
    @Published var showingCopilot = false
    @Published var copilotFloating = false
    @Published var showingAppTour = false
    @Published var hasSeenAppTour = false {
        didSet { defaults.set(hasSeenAppTour, forKey: "mf.appTour.seen") }
    }
    @Published var activeCopilotSessionID: UUID? {
        didSet {
            if let activeCopilotSessionID {
                defaults.set(activeCopilotSessionID.uuidString, forKey: "mf.copilot.activeSessionID")
            } else {
                defaults.removeObject(forKey: "mf.copilot.activeSessionID")
            }
        }
    }
    @Published var backendStatus: BackendStatus = .idle
    @Published var partners: [PartnerOffer] = []
    @Published var partnerLoadState: LiveDataState = .idle
    @Published var eventLoadState: LiveDataState = .idle
    @Published var founderRadarBrief: FounderRadarBrief? {
        didSet { persist(founderRadarBrief, key: "mf.founder.radar.brief") }
    }
    @Published var founderRadarState: LiveDataState = .idle
    var isOnboarded: Bool { profile != nil }
    var hasStartupWorkspace: Bool { startupWorkspaceActivated }
    var founderMemory: FounderMemorySnapshot {
        FounderMemorySnapshot.from(
            profile: profile,
            extras: profileExtras,
            company: companyProfile,
            documents: documents,
            registeredEvents: events.filter { registeredEvents.contains($0.id) },
            plannerItems: plannerItems,
            matches: matches
        )
    }

    func copilotLiveContextFacts() -> [String] {
        let memory = founderMemory
        var facts: [String] = [
            "Gründer-Verzeichnis: \(memory.compactSummary)",
            "Idee/Vorhaben: \(memory.idea)",
            "Nächster offener Schritt: \(memory.nextStep)",
            "Unterlagen: \(memory.documentProgress), offen: \(memory.openDocumentsText)",
            "Datei-Uploads: \(documentAssets.isEmpty ? "keine hochgeladenen Unterlagen" : documentAssets.prefix(6).map { "\($0.title) (\($0.kind.label), \($0.compactSize))" }.joined(separator: "; "))",
            "Firmenprofil: \(companyProfile.isPublished ? "veröffentlicht" : "nicht veröffentlicht")",
        ]
        if profile?.mode == .skills {
            facts.append("Arbeitsmodus: Skill-Partner; sucht passende kleine Betriebe, Aufträge oder Vorhaben und sollte nicht ungefragt einen eigenen Gründungsflow starten.")
        } else {
            facts.append("Business Workspace: \(hasStartupWorkspace ? "aktiv" : "noch nicht angelegt")")
        }

        let openPlan = plannerItems
            .filter { !$0.done }
            .prefix(5)
            .map { item in
                let assignee = item.assigneeName.map { " · \($0)" } ?? ""
                return "\(item.title) (\(item.dueLabel), \(item.kind.label)\(assignee))"
            }
        if !openPlan.isEmpty {
            facts.append("Offene Kalender-/Planpunkte: \(openPlan.joined(separator: "; "))")
        }

        let recentMatches = matches
            .sorted { lhs, rhs in
                let lhsDate = lhs.messages.last?.at ?? .distantPast
                let rhsDate = rhs.messages.last?.at ?? .distantPast
                return lhsDate > rhsDate
            }
            .prefix(5)
            .map { match in
                let last = match.messages.last?.text.replacingOccurrences(of: "\n", with: " ") ?? "noch keine Nachricht"
                let snippet = String(last.prefix(90))
                return "\(match.card.name): \(match.card.role), \(match.card.matchPercent)% Fit, letzte Nachricht: \(snippet)"
            }
        if !recentMatches.isEmpty {
            facts.append("Aktuelle Matches/Chats: \(recentMatches.joined(separator: " | "))")
        }

        let partnerSummary = partners.prefix(5).map { "\($0.name) (\($0.serviceLabel), \($0.fit)% Fit)" }
        if !partnerSummary.isEmpty {
            facts.append("Live-Partner verfügbar: \(partnerSummary.joined(separator: "; "))")
        }

        let eventSummary = events
            .filter { registeredEvents.contains($0.id) }
            .prefix(3)
            .map { "\($0.title) am \($0.dateLabel) \($0.timeLabel)" }
        if !eventSummary.isEmpty {
            facts.append("Angemeldete Events: \(eventSummary.joined(separator: "; "))")
        }

        return facts
    }

    // ─── Navigation ──────────────────────────────────────────
    @Published var tab: AppTab = .today
    @Published var todayPath: [TodayRoute] = []
    @Published var discoverPath: [DiscoverRoute] = []
    @Published var communityPath: [DiscoverRoute] = []

    /// Zentrale Navigation — jede Fläche (Co-Pilot, Heute, Celebration)
    /// kann jeden Ort der App öffnen, über Tab-Grenzen hinweg.
    func open(_ dest: CopilotDestination) {
        switch dest {
        case .tab(let t):
            tab = t
        case .guide(let slug):
            if let guide = allGuides.first(where: { $0.slug == slug }) {
                tab = .discover
                discoverPath = [.guide(guide)]
            }
        case .screen(.cofounderDesk):
            tab = .discover
            discoverPath = [.cofounderDesk]
        case .screen(.swipe):
            tab = .discover
            discoverPath = [.swipe]
        case .screen(.guides):
            tab = .discover
            discoverPath = [.guides]
        case .screen(.chats):
            tab = .today
            todayPath = [.chats]
        case .screen(.events):
            tab = .community
            communityPath = []
        case .screen(.company):
            tab = .discover
            discoverPath = [.company]
        case .screen(.documents):
            tab = .discover
            discoverPath = [.documents]
        case .screen(.calendar):
            tab = .today
            todayPath = [.calendar]
        case .screen(.kanban):
            tab = .today
            todayPath = [.kanban]
        case .screen(.startup):
            tab = .startup
        case .screen(.radar):
            tab = .today
            todayPath = [.radar]
        case .screen(.copilot):
            openCopilot()
        case .screen(.partners(let serviceId)):
            tab = .discover
            discoverPath = [.partners(serviceId)]
        case .screen(.partner(let partnerId)):
            tab = .discover
            discoverPath = [.partner(partnerId)]
        }
    }

    func openCopilot() {
        copilotFloating = false
        showingCopilot = true
    }

    func minimizeCopilot() {
        showingCopilot = false
        copilotFloating = true
    }

    func closeCopilotFloating() {
        copilotFloating = false
    }

    // ─── Community-Events ────────────────────────────────────
    @Published var events: [CommunityEvent] = []
    @Published var registeredEvents: Set<String> = [] {
        didSet { defaults.set(Array(registeredEvents), forKey: "mf.events.registered") }
    }

    func toggleRegistration(for event: CommunityEvent) {
        if registeredEvents.contains(event.id) {
            registeredEvents.remove(event.id)
            Haptics.tap()
        } else {
            registeredEvents.insert(event.id)
            Haptics.success()
        }
    }

    func partners(for serviceId: String) -> [PartnerOffer] {
        partners
            .filter { serviceId == "all" || $0.serviceId == serviceId }
            .sorted { lhs, rhs in
                if lhs.fit == rhs.fit { return lhs.name < rhs.name }
                return lhs.fit > rhs.fit
            }
    }

    func partner(id: String) -> PartnerOffer? {
        partners.first { $0.id == id }
    }

    var launchGuideSteps: [LaunchGuideStep] {
        let isSkillPartner = profile?.mode == .skills
        let venture = profile?.industry.ventureTerm ?? "Vorhaben"
        let partnerTerm = profile?.industry.partnerTerm ?? "Partner"
        let hasCopilotMemory = !copilotFacts.isEmpty || !copilotSessions.isEmpty
        let hasStartedWorkspace = isSkillPartner
            ? (swipesToday > 0 || !matches.isEmpty)
            : (startupWorkspaceActivated || !companyProfile.isBlank)
        let hasStartedDocument = documents.contains(where: \.done)
            || !documentDraft.trimmingCharacters(in: .whitespacesAndNewlines).hasPrefix("Noch kein Entwurf")
        let hasTouchedPlan = plannerItems.contains { $0.done || $0.createdByCopilot }
        let hasFirstSignal = swipesToday > 0
            || registeredEvents.isEmpty == false
            || matches.contains { match in match.messages.contains(where: \.mine) }

        return [
            LaunchGuideStep(
                id: "orientation",
                title: "Ablauf verstehen",
                subtitle: "Heute, Co-Pilot, Business, Community",
                detail: "Einmal sehen, in welcher Reihenfolge die App dich durch Profil, Arbeitsstück, Plan und erste Gespräche führt.",
                actionTitle: "Startplan öffnen",
                icon: "map.fill",
                serviceId: "cofounder",
                completed: hasSeenAppTour || showingAppTour,
                destination: nil,
                copilotPrompt: nil
            ),
            LaunchGuideStep(
                id: "memory",
                title: "Gründer-Memory schärfen",
                subtitle: "Co-Pilot versteht dich und dein Vorhaben",
                detail: "Lass den Co-Pilot deine Ausgangslage, offene Fragen und nächste App-Aktionen als internes Arbeitsprofil zusammenziehen.",
                actionTitle: "Memory bauen",
                icon: "brain.head.profile",
                serviceId: "capital",
                completed: hasCopilotMemory,
                destination: .screen(.copilot),
                copilotPrompt: launchGuideMemoryPrompt()
            ),
            LaunchGuideStep(
                id: "workspace",
                title: isSkillPartner ? "Passende Betriebe finden" : "\(venture)-Workspace anlegen",
                subtitle: isSkillPartner ? "Skill-Partner Modus sauber starten" : "Arbeitsfläche statt lose Tabs",
                detail: isSkillPartner
                    ? "Du brauchst nicht sofort selbst zu gründen. Starte mit passenden kleinen Betrieben, Rollen und echten Gesprächen."
                    : "Lege dein Geschäft als Arbeitsfläche an, damit Unterlagen, Kalender, Kontakte und Co-Pilot denselben Kontext nutzen.",
                actionTitle: isSkillPartner ? "Betriebe entdecken" : "Business starten",
                icon: isSkillPartner ? "person.2.fill" : "building.2.fill",
                serviceId: isSkillPartner ? "talent" : "cofounder",
                completed: hasStartedWorkspace,
                destination: isSkillPartner ? .screen(.swipe) : .screen(.startup),
                copilotPrompt: nil
            ),
            LaunchGuideStep(
                id: "artifact",
                title: "Erstes Arbeitsstück erstellen",
                subtitle: "Kurz-Businessplan, Startkosten oder Preise",
                detail: "Die App wird greifbar, sobald ein echtes Dokument entsteht. Das ist dein Anker für Anmeldung, Finanzierung, Partner und Kalender.",
                actionTitle: "Unterlagen öffnen",
                icon: "doc.text.fill",
                serviceId: "funding",
                completed: hasStartedDocument,
                destination: .screen(.documents),
                copilotPrompt: nil
            ),
            LaunchGuideStep(
                id: "plan",
                title: "7-Tage-Plan festziehen",
                subtitle: "Kalender wird zum Prozess",
                detail: "Aus offenen Punkten werden konkrete Termine. So führt dich die App jeden Tag weiter, statt nur Flächen zu zeigen.",
                actionTitle: "Plan öffnen",
                icon: "calendar",
                serviceId: "legal",
                completed: hasTouchedPlan,
                destination: .screen(.calendar),
                copilotPrompt: nil
            ),
            LaunchGuideStep(
                id: "signal",
                title: "Erstes Marktsignal holen",
                subtitle: isSkillPartner ? "Vorhaben, Partner oder Community" : "\(partnerTerm), Partner oder Community",
                detail: "Ein Kontakt, eine Nachricht, ein Termin oder ein Partnergespräch reicht, damit matchfoundr nicht abstrakt bleibt.",
                actionTitle: isSkillPartner ? "Partner öffnen" : "Matching starten",
                icon: "paperplane.fill",
                serviceId: "growth",
                completed: hasFirstSignal,
                destination: isSkillPartner ? .screen(.partners("all")) : .screen(.swipe),
                copilotPrompt: nil
            )
        ]
    }

    var launchGuideCompletedCount: Int {
        launchGuideSteps.filter(\.completed).count
    }

    var launchGuideProgress: Double {
        let steps = launchGuideSteps
        guard !steps.isEmpty else { return 1 }
        return Double(launchGuideCompletedCount) / Double(steps.count)
    }

    var nextLaunchGuideStep: LaunchGuideStep? {
        launchGuideSteps.first { !$0.completed }
    }

    var isLaunchGuideComplete: Bool {
        launchGuideCompletedCount >= launchGuideSteps.count
    }

    func startLaunchGuideStep(_ step: LaunchGuideStep) {
        Haptics.tap()
        if step.id == "orientation" {
            startAppTour()
        } else if let prompt = step.copilotPrompt {
            queueCopilotPrompt(prompt, title: step.title)
        } else if let destination = step.destination {
            open(destination)
        }
    }

    func cofounderGapTitle() -> String {
        let ownSkills = Set(profile?.skills ?? [])
        if !ownSkills.contains("Verkauf") && !ownSkills.contains("Kundenkontakt") {
            return "Jemand mit echtem Kundenkontakt"
        }
        if !ownSkills.contains("Website & Technik") && !ownSkills.contains("Online-Shop") {
            return "Hilfe bei Website, Shop oder Buchungssystem"
        }
        if !ownSkills.contains("Buchhaltung") && !ownSkills.contains("Organisation") {
            return "Buchhaltung/Ops-Gegenpart"
        }
        if !ownSkills.contains("Marketing") && !ownSkills.contains("Social Media") {
            return "Marketing- und Sichtbarkeitshilfe"
        }
        return "Umsetzungsstarker Sparringspartner"
    }

    func cofounderGapSummary() -> String {
        let venture = companyProfile.name.isEmpty ? (profile?.industry.ventureTerm ?? "Vorhaben") : companyProfile.name
        return "\(venture) braucht gerade keinen beliebigen Kontakt, sondern jemanden, der eine klare Lücke mit Zeit, Energie und Beweisarbeit schließt."
    }

    func cofounderCandidates() -> [CofounderCandidate] {
        let matchCandidates = matches.map { candidate(from: $0.card, sourceMatchID: $0.id, messageCount: $0.messages.count) }
        let matchCardIDs = Set(matches.map(\.card.id))
        let deckCandidates = deck
            .filter { !matchCardIDs.contains($0.id) }
            .prefix(6)
            .map { candidate(from: $0, sourceMatchID: nil, messageCount: 0) }
        return (matchCandidates + deckCandidates).sorted { lhs, rhs in
            if lhs.total == rhs.total { return lhs.card.matchPercent > rhs.card.matchPercent }
            return lhs.total > rhs.total
        }
    }

    func startCofounderTrial(with candidate: CofounderCandidate) {
        let firstName = candidate.card.name.split(separator: " ").first.map(String.init) ?? candidate.card.name
        addPlannerItem(
            title: "Partner-Check für \(candidate.card.name) finalisieren",
            note: "Muss-Kriterien, Red Flags und Gesprächsfrage festlegen. Fokus: \(candidate.testSprint)",
            dueLabel: "Heute",
            kind: .match,
            target: .startup,
            createdByCopilot: true
        )
        addPlannerItem(
            title: "15-Minuten Gespräch mit \(firstName)",
            note: "Rolle, Zeitbudget, Arbeitsstil und nächsten kleinen Test prüfen.",
            dueLabel: "Diese Woche",
            kind: .meeting,
            target: .chats,
            createdByCopilot: true
        )
        addPlannerItem(
            title: "7-Tage Praxistest · \(firstName)",
            note: candidate.testSprint,
            dueLabel: "Nach dem Call",
            kind: .match,
            target: .startup,
            createdByCopilot: true
        )
        queueCopilotPrompt(
            cofounderTrialPrompt(for: candidate),
            title: "Praxistest: \(firstName)"
        )
    }

    func startCofounderTrial(candidateID: String) {
        guard let candidate = cofounderCandidates().first(where: { $0.id == candidateID }) else { return }
        startCofounderTrial(with: candidate)
    }

    private func candidate(from card: FounderCard, sourceMatchID: String?, messageCount: Int) -> CofounderCandidate {
        let ownSkills = Set(profile?.skills ?? [])
        let candidateSkills = Set(card.skills)
        let complementary = candidateSkills.subtracting(ownSkills).count
        let overlap = candidateSkills.intersection(ownSkills).count
        let skillFit = clampScore(58 + complementary * 12 - overlap * 4 + card.matchPercent / 8)
        let timingFit: Int = {
            switch card.availability {
            case .fulltime: return 92
            case .parttime: return 76
            case .weekend: return 58
            }
        }()
        let commitmentFit = clampScore(card.matchPercent - (card.availability == .weekend ? 16 : 0) + (sourceMatchID == nil ? -8 : 6))
        let evidenceFit = clampScore(44 + messageCount * 12 + (sourceMatchID == nil ? 0 : 14))
        return CofounderCandidate(
            id: sourceMatchID ?? card.id,
            card: card,
            sourceMatchID: sourceMatchID,
            skillFit: skillFit,
            timingFit: timingFit,
            commitmentFit: commitmentFit,
            evidenceFit: evidenceFit,
            risks: cofounderRisks(for: card, ownSkills: ownSkills, sourceMatchID: sourceMatchID, messageCount: messageCount),
            testSprint: cofounderSprint(for: card)
        )
    }

    private func cofounderRisks(for card: FounderCard, ownSkills: Set<String>, sourceMatchID: String?, messageCount: Int) -> [String] {
        var risks: [String] = []
        if card.availability == .weekend { risks.append("Zeitbudget wirkt noch nebenbei.") }
        if Set(card.skills).isSubset(of: ownSkills) { risks.append("Skill-Profil ist dir sehr ähnlich.") }
        if sourceMatchID == nil { risks.append("Noch kein gegenseitiges Signal.") }
        if messageCount == 0, sourceMatchID != nil { risks.append("Match da, aber noch kein Gesprächssignal.") }
        if card.matchPercent < 82 { risks.append("Fit ist solide, aber nicht zwingend.") }
        return risks.isEmpty ? ["Keine harte Red Flag, aber Beweisarbeit fehlt noch."] : risks
    }

    private func cofounderSprint(for card: FounderCard) -> String {
        if card.skills.contains("Vertrieb") || card.skills.contains("Verkauf") || card.skills.contains("Kundenkontakt") {
            return "In 7 Tagen 20 Zielkunden definieren, 5 Gespräche anbahnen und die Learnings ins Business-Profil zurückspielen."
        }
        if card.skills.contains("Website & Technik") || card.skills.contains("Online-Shop") {
            return "In 7 Tagen eine einfache Website-, Shop- oder Buchungssystem-Checkliste mit Kosten und nächstem Schritt liefern."
        }
        if card.skills.contains("Buchhaltung") || card.skills.contains("Finanzen") || card.skills.contains("Organisation") {
            return "In 7 Tagen Startkosten, Rollen, Zuständigkeiten und 12-Wochen-Meilensteinplan belastbar machen."
        }
        return "In 7 Tagen ein konkretes Ergebnis liefern: Zielgruppe, Aufgabe, Ergebnisformat und Entscheidungskriterium vorher festlegen."
    }

    private func cofounderTrialPrompt(for candidate: CofounderCandidate) -> String {
        """
        PARTNER-CHECK
        Bereite einen seriösen Partner- oder Helfer-Check für eine kleine Gründung vor.

        Mein Bedarf: \(cofounderGapTitle())
        Kandidat: \(candidate.card.name), \(candidate.card.role), \(candidate.card.city)
        Angebot/Profil: \(candidate.card.pitch)
        Skills: \(candidate.card.skills.joined(separator: ", "))
        Verfügbarkeit: \(candidate.card.availability.label)
        Score: \(candidate.total)
        Risiken: \(candidate.risks.joined(separator: "; "))
        Test-Idee: \(candidate.testSprint)

        Bitte erstelle:
        1. eine kurze Entscheidungshypothese
        2. eine 15-Minuten-Call-Agenda
        3. harte Prüf-Fragen
        4. einen kleinen Praxistest mit Erfolgskriterien
        5. eine Nachricht, die ich senden kann
        """
    }

    private func clampScore(_ value: Int) -> Int {
        min(100, max(0, value))
    }

    func refreshPartnerOffers() async {
        partnerLoadState = .loading
        do {
            partners = try await SupabaseService.shared.fetchPartnerOffers()
            partnerLoadState = .loaded
        } catch {
            partners = []
            if let backendError = error as? BackendRequestError,
               backendError.statusCode == 200,
               backendError.message.contains("Antwort konnte nicht gelesen werden") {
                partnerLoadState = .failed("Partnerdaten wurden geladen, konnten aber nicht verarbeitet werden. Bitte erneut laden.")
            } else {
                partnerLoadState = .failed(error.localizedDescription)
            }
        }
    }

    func refreshCommunityEvents(showLoading: Bool = true) async {
        let previousEvents = events
        if showLoading && previousEvents.isEmpty {
            eventLoadState = .loading
        }
        do {
            events = try await SupabaseService.shared.fetchCommunityEvents()
            eventLoadState = .loaded
        } catch {
            if previousEvents.isEmpty {
                events = []
                eventLoadState = .failed(error.localizedDescription)
            } else {
                events = previousEvents
                eventLoadState = .loaded
            }
        }
    }

    private func startCommunityEventPolling() {
        eventRefreshTask?.cancel()
        eventRefreshTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(45))
                await self?.refreshCommunityEvents(showLoading: false)
            }
        }
    }

    // ─── Swipe-Deck ──────────────────────────────────────────
    @Published var deck: [FounderCard] = []
    @Published var matches: [Match] = []
    @Published var celebrating: FounderCard?

    // ─── Freemium ────────────────────────────────────────────
    @Published var swipesToday: Int = 0
    @Published var isPremium: Bool = false
    @Published var paywall: PaywallReason?
    @Published var aiTokensToday: Int = 0 {
        didSet { defaults.set(aiTokensToday, forKey: "mf.ai.tokens.today") }
    }
    @Published var aiTokensThisWeek: Int = 0 {
        didSet { defaults.set(aiTokensThisWeek, forKey: "mf.ai.tokens.week") }
    }
    let freeSwipes = 5
    var swipesLeft: Int { isPremium ? .max : max(0, freeSwipes - swipesToday) }
    var aiDailyLimit: Int { isPremium ? 25_000 : 2_000 }
    var aiWeeklyLimit: Int { isPremium ? 120_000 : 8_000 }
    var planName: String { isPremium ? "Pro" : "Standard" }

    enum PaywallReason { case swipes, chat, aiAnalysis, aiUsage }

    private let defaults = UserDefaults.standard
    private static let liveDataGeneration = 2
    private static let maxCopilotSessions = 24
    private static let maxCopilotMessagesPerSession = 80
    private static let documentDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "de_DE")
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter
    }()
    private var authObserverTask: Task<Void, Never>?
    private var eventRefreshTask: Task<Void, Never>?

    private init() {
        purgeLegacySeedStateIfNeeded()
        loadProfile()
        loadWorkspaceData()
        loadFreemium()
        hasSeenAppTour = defaults.bool(forKey: "mf.appTour.seen")
        registeredEvents = Set(defaults.stringArray(forKey: "mf.events.registered") ?? [])
        deck = []
        matches = []
        applyLaunchArguments()
        Task { await refreshBackendStatus() }
        Task { await refreshPartnerOffers() }
        Task { await refreshCommunityEvents() }
        startCommunityEventPolling()
    }

    func bootstrapAuth() async {
        startAuthObserver()
        await refreshAuthSession()
    }

    func refreshAuthSession() async {
        authIsLoading = true
        let snapshot = await Backend.currentUserSnapshot()
        authUser = snapshot
        authError = nil
        if let snapshot {
            await refreshCloudUserData(for: snapshot)
        } else {
            clearAuthenticatedData()
        }
        authIsLoading = false
    }

    func refreshCloudUserData(for user: BackendAuthSnapshot? = nil) async {
        guard let user = user ?? authUser else {
            clearAuthenticatedData()
            return
        }
        do {
            let cloudProfile = try await SupabaseService.shared.fetchProfile(userID: user.userID)
            if let local = cloudProfile?.toProfile(fallbackEmail: user.email) {
                profile = local
                if !defaultsHas("mf.profile.extras") {
                    profileExtras = .empty(for: local)
                }
                if !defaultsHas("mf.company.profile") {
                    companyProfile = .empty(for: local)
                }
                if documents.isEmpty {
                    documents = FounderDocument.defaults
                }
                if documentAssets.isEmpty {
                    documentAssets = []
                }
                if plannerItems.isEmpty {
                    plannerItems = personalizedPlannerItems()
                }
                await refreshSwipeDeck()
            } else {
                profile = nil
                profileExtras = .empty(for: nil)
                companyProfile = .empty(for: nil)
                documents = []
                documentAssets = []
                plannerItems = []
                deck = []
                matches = []
            }
        } catch {
            backendStatus = .offline(error.localizedDescription)
            profile = nil
            profileExtras = .empty(for: nil)
            companyProfile = .empty(for: nil)
            documents = []
            documentAssets = []
            plannerItems = []
            deck = []
            matches = []
        }
    }

    private func clearAuthenticatedData() {
        authUser = nil
        profile = nil
        profileExtras = .empty(for: nil)
        companyProfile = .empty(for: nil)
        documents = []
        documentAssets = []
        plannerItems = []
        deck = []
        matches = []
        registeredEvents = []
    }

    func signIn(email: String, password: String) async throws {
        authMessage = nil
        authError = nil
        try await Backend.signIn(email: email, password: password)
        await refreshAuthSession()
        Haptics.success()
    }

    func signUp(email: String, password: String) async throws {
        authMessage = nil
        authError = nil
        try await Backend.signUp(email: email, password: password)
        await refreshAuthSession()
        if authUser == nil {
            authMessage = "Account angelegt. Bitte bestaetige deine Mail und logge dich dann ein."
        } else {
            Haptics.success()
        }
    }

    func sendMagicLink(email: String) async throws {
        authMessage = nil
        authError = nil
        try await Backend.sendMagicLink(email: email)
        authMessage = "Magic Link gesendet. Oeffne ihn auf diesem iPhone."
        Haptics.success()
    }

    func handleAuthCallback(_ url: URL) async {
        do {
            try await Backend.handleAuthCallback(url)
            await refreshAuthSession()
            Haptics.success()
        } catch {
            authError = friendlyAuthError(error)
            authIsLoading = false
        }
    }

    func signOut() async {
        do {
            try await Backend.signOut()
            clearAuthenticatedData()
            authMessage = nil
            authError = nil
        } catch {
            authError = friendlyAuthError(error)
        }
    }

    private func startAuthObserver() {
        guard authObserverTask == nil else { return }
        authObserverTask = Task {
            for await (_, session) in Backend.client.auth.authStateChanges {
                let snapshot = Backend.snapshot(from: session)
                await MainActor.run {
                    self.authUser = snapshot
                    self.authIsLoading = false
                    if snapshot != nil {
                        self.authError = nil
                    }
                }
                if let snapshot {
                    await self.refreshCloudUserData(for: snapshot)
                } else {
                    await MainActor.run {
                        self.clearAuthenticatedData()
                    }
                }
            }
        }
    }

    func friendlyAuthError(_ error: Error) -> String {
        let message = error.localizedDescription
        if message.localizedCaseInsensitiveContains("invalid") {
            return "Login fehlgeschlagen. Pruefe E-Mail und Passwort."
        }
        if message.localizedCaseInsensitiveContains("network")
            || message.localizedCaseInsensitiveContains("offline")
            || message.localizedCaseInsensitiveContains("internet") {
            return "Supabase ist gerade nicht erreichbar. Versuch es gleich erneut."
        }
        return message
    }

    /// Für Screenshot-Automation und UI-Tests:
    /// --tab <0-3> wählt den Tab vor.
    /// --screen company/documents springt direkt in neue Feature-Flächen.
    private func applyLaunchArguments() {
        let args = ProcessInfo.processInfo.arguments
        if args.contains("--reset-profile") {
            defaults.removeObject(forKey: "mf.profile")
            profile = nil
        }
        if args.contains("--skip-tour") {
            hasSeenAppTour = true
            showingAppTour = false
        }
        if let idx = args.firstIndex(of: "--tab"), args.count > idx + 1,
           let raw = Int(args[idx + 1]), let t = AppTab(rawValue: raw) {
            tab = t
        }
        if let idx = args.firstIndex(of: "--screen"), args.count > idx + 1 {
            switch args[idx + 1] {
            case "company": open(.screen(.company))
            case "documents": open(.screen(.documents))
            case "calendar": open(.screen(.calendar))
            case "kanban": open(.screen(.kanban))
            case "startup": open(.screen(.startup))
            case "radar": open(.screen(.radar))
            case "cofounder": open(.screen(.cofounderDesk))
            case "swipe": open(.screen(.swipe))
            case "chats": open(.screen(.chats))
            default: break
            }
        }
    }

    // ─── Aktionen ────────────────────────────────────────────

    /// true = Swipe durchgeführt, false = Limit → Paywall gezeigt.
    @discardableResult
    func swipe(_ card: FounderCard, like: Bool, superLike: Bool = false) -> Bool {
        guard registerSwipe() else {
            paywall = .swipes
            return false
        }
        deck.removeAll { $0.id == card.id }
        Task {
            await persistSwipe(card: card, like: like, superLike: superLike)
        }
        Haptics.tap()
        return true
    }

    private func persistSwipe(card: FounderCard, like: Bool, superLike: Bool) async {
        do {
            let result = try await SupabaseService.shared.performSwipe(targetID: card.id, like: like)
            guard result.success, result.mutualMatch else { return }
            var matched = card
            matched.isSuper = superLike
            matches.insert(Match(id: result.matchId ?? card.id, card: matched, messages: [], unread: 0), at: 0)
            celebrating = matched
            Haptics.success()
        } catch {
            backendStatus = .offline("Swipe konnte nicht gespeichert werden: \(error.localizedDescription)")
        }
    }

    func activateTrial(days: Int = 3) {
        isPremium = true
        defaults.set(Date().addingTimeInterval(TimeInterval(days) * 86400), forKey: "mf.trialUntil")
        paywall = nil
        refreshAIUsageWindow()
        Haptics.success()
    }

    func send(_ text: String, to matchId: String) {
        guard let idx = matches.firstIndex(where: { $0.id == matchId }) else { return }
        matches[idx].messages.append(ChatMessage(mine: true, text: text, at: .now))
    }

    func reloadDeck() {
        swipesToday = 0
        Task { await refreshSwipeDeck() }
    }

    func refreshSwipeDeck() async {
        guard let userID = authUser?.userID, profile != nil else {
            deck = []
            return
        }
        do {
            deck = try await SupabaseService.shared.fetchFounderCards(
                currentUserID: userID,
                currentProfile: profile
            )
        } catch {
            deck = []
            backendStatus = .offline("Profile konnten nicht geladen werden: \(error.localizedDescription)")
        }
    }

    func completeOnboarding(with profile: MyProfile, launchAIAnalysis: Bool = false) {
        self.profile = profile
        profileExtras = .empty(for: profile)
        companyProfile = .empty(for: profile)
        documents = FounderDocument.defaults
        documentAssets = []
        documentDraft = "Noch kein Entwurf. Lass den Co-Pilot einen Kurz-Businessplan aus deinem Profil und Business-Profil vorbereiten."
        plannerItems = personalizedPlannerItems()
        startupTeamMembers = []
        startupWorkspaceActivated = false
        todayPath = []
        discoverPath = []
        communityPath = []
        hasSeenAppTour = launchAIAnalysis
        showingAppTour = !launchAIAnalysis
        if launchAIAnalysis {
            queueCopilotPrompt(onboardingAnalysisPrompt(for: profile), title: "KI-Gründungscheck")
        } else {
            tab = .today
        }
        if let userID = authUser?.userID {
            Task {
                await saveOnboardingProfile(profile, userID: userID)
                await refreshSwipeDeck()
            }
        }
        Haptics.success()
    }

    private func saveOnboardingProfile(_ profile: MyProfile, userID: String) async {
        do {
            try await SupabaseService.shared.upsertProfile(profile, userID: userID)
        } catch {
            authError = "Profil konnte nicht live gespeichert werden: \(error.localizedDescription)"
        }
    }

    func restartOnboarding() {
        profile = nil
        profileExtras = .empty(for: nil)
        companyProfile = .empty(for: nil)
        documents = []
        documentAssets = []
        plannerItems = []
        startupTeamMembers = []
        startupWorkspaceActivated = false
        documentDraft = "Noch kein Entwurf. Lass den Co-Pilot einen Kurz-Businessplan aus deinem Profil und Business-Profil vorbereiten."
        copilotFacts = []
        copilotSessions = []
        activeCopilotSessionID = nil
        pendingCopilotPrompt = nil
        registeredEvents = []
        deck = []
        matches = []
        todayPath = []
        discoverPath = []
        communityPath = []
        tab = .today
        paywall = nil
        celebrating = nil
        showingCopilot = false
        copilotFloating = false
        showingAppTour = false
        hasSeenAppTour = false
        if let userID = authUser?.userID {
            Task {
                try? await SupabaseService.shared.resetProfileOnboarding(userID: userID)
            }
        }
        Haptics.success()
    }

    func presentAppTourIfNeeded() {
        guard isOnboarded, !hasSeenAppTour, !showingAppTour else { return }
        showingAppTour = true
    }

    func startAppTour() {
        showingAppTour = true
        Haptics.select()
    }

    func finishAppTour() {
        hasSeenAppTour = true
        showingAppTour = false
    }

    func currentAIUsage() -> AIUsageSnapshot {
        refreshAIUsageWindow()
        return AIUsageSnapshot(
            planName: planName,
            usedToday: aiTokensToday,
            dailyLimit: aiDailyLimit,
            usedThisWeek: aiTokensThisWeek,
            weeklyLimit: aiWeeklyLimit,
            trialUntil: trialUntil
        )
    }

    func registerAIUsage(for prompt: String) -> AIUsageSnapshot? {
        refreshAIUsageWindow()
        let estimated = estimatedAITokens(for: prompt)
        guard aiTokensToday + estimated <= aiDailyLimit,
              aiTokensThisWeek + estimated <= aiWeeklyLimit else {
            return nil
        }
        aiTokensToday += estimated
        aiTokensThisWeek += estimated
        return currentAIUsage()
    }

    func estimatedAITokens(for prompt: String) -> Int {
        max(550, min(6_000, prompt.count / 3 + 750))
    }

    func onboardingAnalysisPrompt(for profile: MyProfile) -> String {
        """
        ONBOARDING-GRÜNDUNGSCHECK
        Erstelle eine konkrete Analyse für eine kleine Gründung. Keine Unicorn-, VC- oder Startup-Floskeln.
        Bitte mit:
        1. Was ich eigentlich starten will, in einfachen Worten
        2. Die wichtigsten Risiken der nächsten 14 Tage
        3. Was ich als erstes klären muss: Anmeldung, Startkosten, Preise, Kunden oder Partner
        4. Die nächsten 3 App-Aktionen

        Name: \(profile.name)
        Rolle: \(profile.role)
        Modus: \(profile.mode == .idea ? "Ich will ein Geschäft starten" : "Ich biete Skills/Hilfe an")
        Branche: \(profile.industry.label)
        Skills/Bedarf: \(profile.skills.joined(separator: ", "))
        Idee/Angebot: \(profile.pitch)
        PLZ: \(profile.plz)
        Verfügbarkeit: \(profile.availability.label)
        """
    }

    private func launchGuideMemoryPrompt() -> String {
        let memory = founderMemory
        return """
        START-ASSISTENT · GRÜNDER-MEMORY
        Baue mir aus der App einen klaren Arbeitsstand. Keine allgemeine Beratung.

        Nutze diese App-Kontexte:
        \(copilotLiveContextFacts().map { "- \($0)" }.joined(separator: "\n"))

        Bitte liefere:
        1. Mein Gründer-Memory in 5 knappen Fakten
        2. Was in der App als Nächstes passieren sollte
        3. Eine Entscheidung: erst Unterlage, erst \(memory.partnerTerm)-Suche oder erst Termin?
        4. Drei konkrete App-Aktionen mit kurzer Begründung
        5. Eine Rückfrage, die wirklich nötig ist
        """
    }

    func publishCompanyProfile() -> String {
        var profile = companyProfile
        if profile.publishedSlug == nil {
            profile.publishedSlug = Self.slug(from: profile.name)
        }
        profile.updatedAt = .now
        companyProfile = profile
        Haptics.success()
        return "/s/\(profile.publishedSlug ?? "preview")"
    }

    func addCompanyBlock(_ type: CompanyBlockType) {
        companyProfile.blocks.append(.empty(type))
        companyProfile.updatedAt = .now
        Haptics.success()
    }

    func removeCompanyBlock(_ blockID: UUID) {
        companyProfile.blocks.removeAll { $0.id == blockID }
        companyProfile.updatedAt = .now
        Haptics.tap()
    }

    func moveCompanyBlock(_ blockID: UUID, direction: Int) {
        guard let index = companyProfile.blocks.firstIndex(where: { $0.id == blockID }) else { return }
        let next = min(max(index + direction, 0), companyProfile.blocks.count - 1)
        guard next != index else { return }
        companyProfile.blocks.move(fromOffsets: IndexSet(integer: index), toOffset: next > index ? next + 1 : next)
        companyProfile.updatedAt = .now
        Haptics.select()
    }

    func updateCompanyBlock(_ blockID: UUID, _ update: (inout CompanyBlock) -> Void) {
        guard let index = companyProfile.blocks.firstIndex(where: { $0.id == blockID }) else { return }
        update(&companyProfile.blocks[index])
        companyProfile.updatedAt = .now
    }

    func toggleDocument(_ id: String) {
        guard let index = documents.firstIndex(where: { $0.id == id }) else { return }
        documents[index].done.toggle()
        Haptics.select()
    }

    func generateDocumentDraft() {
        let venture = profile?.industry.ventureTerm ?? "Vorhaben"
        let idea = companyProfile.name
        documentDraft = """
        Arbeitsentwurf · \(idea)

        Kurz-Businessplan
        Ich starte \(idea) als \(venture). Ziel ist kein Unicorn, sondern ein tragfähiges kleines Geschäft mit klarer Zielgruppe, sauberer Kalkulation und ersten zahlenden Kunden.

        Angebot
        Beschreibe hier konkret, was verkauft wird, wer dafür zahlt, wo das Angebot stattfindet und warum Kundinnen oder Kunden es brauchen.

        Startkosten
        1. Einmalige Kosten: Anmeldung, Ausstattung, Kaution, Website, Material.
        2. Monatliche Kosten: Miete, Software, Versicherungen, Einkauf, Marketing.
        3. Private Reserve: Lebenshaltung, Krankenversicherung und Steuer-Rücklage.

        Nächste Meilensteine
        1. Gewerbe-/Genehmigungsweg klären
        2. Startkosten und Mindestumsatz berechnen
        3. Erstes Angebot mit Preis testen
        4. Drei echte Kunden- oder Partnergespräche führen
        """
        if let index = documents.firstIndex(where: { $0.id == "businessplan" }) {
            documents[index].done = true
        }
        if let index = documents.firstIndex(where: { $0.id == "startup-costs" }) {
            documents[index].done = true
        }
        Haptics.success()
    }

    @discardableResult
    func importDocumentFiles(_ urls: [URL]) -> [FounderDocumentAsset] {
        let imported = urls.compactMap { importDocumentFile($0) }
        guard !imported.isEmpty else { return [] }
        documentAssets.insert(contentsOf: imported, at: 0)
        if let index = documents.firstIndex(where: { $0.id == "businessplan" }) {
            documents[index].done = true
        }
        Haptics.success()
        return imported
    }

    @discardableResult
    func exportDocumentDraftPDF() -> FounderDocumentAsset? {
        let cleanDraft = documentDraft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanDraft.isEmpty, !cleanDraft.hasPrefix("Noch kein Entwurf") else { return nil }

        #if canImport(UIKit)
        let ventureName = companyProfile.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            ? (profile?.industry.ventureTerm ?? "Vorhaben")
            : companyProfile.name
        let fileName = uniqueDocumentFileName(base: "\(ventureName)-Arbeitsentwurf", ext: "pdf")
        let url = documentStorageDirectory().appendingPathComponent(fileName)

        do {
            try renderDraftPDF(title: "Arbeitsentwurf · \(ventureName)", body: cleanDraft, to: url)
            let size = fileSize(at: url)
            let asset = FounderDocumentAsset(
                title: "Arbeitsentwurf · \(ventureName)",
                fileName: fileName,
                kind: .generatedPDF,
                sizeBytes: size,
                importedAt: .now,
                textPreview: String(cleanDraft.prefix(900))
            )
            documentAssets.insert(asset, at: 0)
            if let index = documents.firstIndex(where: { $0.id == "businessplan" }) {
                documents[index].done = true
            }
            rememberCopilotFact("Unterlagen-PDF erstellt: \(asset.title).")
            Haptics.success()
            return asset
        } catch {
            backendStatus = .offline("PDF konnte nicht erstellt werden: \(error.localizedDescription)")
            return nil
        }
        #else
        return nil
        #endif
    }

    func documentAssetURL(_ asset: FounderDocumentAsset) -> URL? {
        let url = documentStorageDirectory().appendingPathComponent(asset.fileName)
        return FileManager.default.fileExists(atPath: url.path) ? url : nil
    }

    func deleteDocumentAsset(_ id: UUID) {
        guard let asset = documentAssets.first(where: { $0.id == id }) else { return }
        if let url = documentAssetURL(asset) {
            try? FileManager.default.removeItem(at: url)
        }
        documentAssets.removeAll { $0.id == id }
        Haptics.tap()
    }

    func startDocumentCopilot(task: String) {
        queueCopilotPrompt(documentCopilotPrompt(task: task), title: "Unterlagen · \(task)")
    }

    func documentCopilotPrompt(task: String) -> String {
        let assets = documentAssets.isEmpty
            ? "- Noch keine Datei hochgeladen."
            : documentAssets.prefix(8).map { asset in
                let preview = asset.textPreview.trimmingCharacters(in: .whitespacesAndNewlines)
                let previewLine = preview.isEmpty ? "Keine lesbare Textvorschau." : String(preview.prefix(600))
                return "- \(asset.title) · \(asset.kind.label) · \(asset.compactSize)\n  Vorschau: \(previewLine)"
            }.joined(separator: "\n")
        let draft = documentDraft.trimmingCharacters(in: .whitespacesAndNewlines)
        let draftContext = draft.isEmpty ? "Noch kein Entwurf." : String(draft.prefix(2600))

        return """
        UNTERLAGEN-WORKSPACE · \(task)
        Arbeite nicht generisch. Nutze die App-Daten, die hochgeladenen/erzeugten Unterlagen und leite mich in konkrete App-Aktionen.

        App-Kontext:
        \(copilotLiveContextFacts().map { "- \($0)" }.joined(separator: "\n"))

        Unterlagen-Dateien:
        \(assets)

        Aktueller editierbarer Entwurf:
        \(draftContext)

        Bitte antworte als Arbeitsbegleiter:
        1. Was fehlt konkret oder ist schwach?
        2. Was soll ich in dieser Unterlagen-Seite als Nächstes tun?
        3. Wenn sinnvoll: gib mir direkt eine überarbeitete Passage.
        4. Schlage maximal drei App-Aktionen vor: Unterlagen öffnen, PDF erstellen/prüfen, Kalenderblock setzen oder Memory speichern.
        """
    }

    private func importDocumentFile(_ sourceURL: URL) -> FounderDocumentAsset? {
        let accessGranted = sourceURL.startAccessingSecurityScopedResource()
        defer {
            if accessGranted {
                sourceURL.stopAccessingSecurityScopedResource()
            }
        }

        let originalTitle = sourceURL.deletingPathExtension().lastPathComponent
        let ext = sourceURL.pathExtension.isEmpty ? "dat" : sourceURL.pathExtension
        let fileName = uniqueDocumentFileName(base: originalTitle, ext: ext)
        let destination = documentStorageDirectory().appendingPathComponent(fileName)

        do {
            if FileManager.default.fileExists(atPath: destination.path) {
                try FileManager.default.removeItem(at: destination)
            }
            try FileManager.default.copyItem(at: sourceURL, to: destination)
            return FounderDocumentAsset(
                title: originalTitle.isEmpty ? "Unterlage" : originalTitle,
                fileName: fileName,
                kind: .upload,
                sizeBytes: fileSize(at: destination),
                importedAt: .now,
                textPreview: extractedTextPreview(from: destination)
            )
        } catch {
            backendStatus = .offline("Unterlage konnte nicht importiert werden: \(error.localizedDescription)")
            return nil
        }
    }

    private func documentStorageDirectory() -> URL {
        let base = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let directory = base.appendingPathComponent("FounderDocuments", isDirectory: true)
        if !FileManager.default.fileExists(atPath: directory.path) {
            try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        }
        return directory
    }

    private func uniqueDocumentFileName(base: String, ext: String) -> String {
        let safeBase = base
            .lowercased()
            .components(separatedBy: CharacterSet.alphanumerics.inverted)
            .filter { !$0.isEmpty }
            .joined(separator: "-")
        let stem = safeBase.isEmpty ? "unterlage" : safeBase
        let cleanExt = ext.lowercased().trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        let suffix = cleanExt.isEmpty ? "dat" : cleanExt
        var candidate = "\(stem).\(suffix)"
        let directory = documentStorageDirectory()
        if FileManager.default.fileExists(atPath: directory.appendingPathComponent(candidate).path) {
            candidate = "\(stem)-\(UUID().uuidString.prefix(6)).\(suffix)"
        }
        return candidate
    }

    private func fileSize(at url: URL) -> Int64 {
        let values = try? url.resourceValues(forKeys: [.fileSizeKey])
        return Int64(values?.fileSize ?? 0)
    }

    private func extractedTextPreview(from url: URL) -> String {
        let ext = url.pathExtension.lowercased()
        if ext == "pdf" {
            #if canImport(PDFKit)
            guard let pdf = PDFDocument(url: url) else { return "" }
            var chunks: [String] = []
            for index in 0..<min(pdf.pageCount, 4) {
                if let text = pdf.page(at: index)?.string, !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                    chunks.append(text)
                }
            }
            return compactPreview(chunks.joined(separator: "\n"))
            #else
            return ""
            #endif
        }
        if ["txt", "md", "csv", "json", "rtf"].contains(ext),
           let text = try? String(contentsOf: url, encoding: .utf8) {
            return compactPreview(text)
        }
        return ""
    }

    private func compactPreview(_ text: String) -> String {
        String(
            text
                .replacingOccurrences(of: "\n", with: " ")
                .split(separator: " ")
                .joined(separator: " ")
                .prefix(1200)
        )
    }

    #if canImport(UIKit)
    private func renderDraftPDF(title: String, body: String, to url: URL) throws {
        let pageRect = CGRect(x: 0, y: 0, width: 595, height: 842)
        let margin: CGFloat = 46
        let textWidth = pageRect.width - margin * 2
        let renderer = UIGraphicsPDFRenderer(bounds: pageRect)

        try renderer.writePDF(to: url) { context in
            var y = margin

            func beginPage() {
                context.beginPage()
                y = margin
            }

            func drawBlock(_ text: String, attributes: [NSAttributedString.Key: Any], after spacing: CGFloat) {
                let attributed = NSAttributedString(string: text, attributes: attributes)
                let rect = attributed.boundingRect(
                    with: CGSize(width: textWidth, height: .greatestFiniteMagnitude),
                    options: [.usesLineFragmentOrigin, .usesFontLeading],
                    context: nil
                )
                let height = ceil(rect.height) + 2
                if y + height > pageRect.height - margin {
                    beginPage()
                }
                attributed.draw(
                    with: CGRect(x: margin, y: y, width: textWidth, height: height),
                    options: [.usesLineFragmentOrigin, .usesFontLeading],
                    context: nil
                )
                y += height + spacing
            }

            beginPage()
            drawBlock(title, attributes: [
                .font: UIFont.systemFont(ofSize: 24, weight: .bold),
                .foregroundColor: UIColor.black
            ], after: 8)
            drawBlock("matchfoundr · erstellt am \(Self.documentDateFormatter.string(from: .now))", attributes: [
                .font: UIFont.systemFont(ofSize: 10, weight: .semibold),
                .foregroundColor: UIColor.darkGray
            ], after: 24)

            let bodyAttributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 12.5, weight: .regular),
                .foregroundColor: UIColor.black,
                .paragraphStyle: {
                    let style = NSMutableParagraphStyle()
                    style.lineSpacing = 4
                    return style
                }()
            ]

            for paragraph in body.components(separatedBy: "\n") {
                let clean = paragraph.trimmingCharacters(in: .whitespacesAndNewlines)
                drawBlock(clean.isEmpty ? " " : clean, attributes: bodyAttributes, after: clean.isEmpty ? 4 : 10)
            }
        }
    }
    #endif

    func rebuildPlannerFromMemory() {
        let doneTitles = Set(plannerItems.filter(\.done).map(\.title))
        plannerItems = personalizedPlannerItems().map { item in
            var next = item
            next.done = doneTitles.contains(item.title)
            return next
        }
        Haptics.success()
    }

    func currentFounderRadarBrief() -> FounderRadarBrief {
        founderRadarBrief ?? localFounderRadarBrief()
    }

    func refreshFounderRadar() async {
        founderRadarState = .loading
        let local = localFounderRadarBrief()
        do {
            let live = try await SupabaseService.shared.generateFounderRadar(founderRadarRequest(localSignals: local.signals))
            founderRadarBrief = live
            founderRadarState = .loaded
        } catch {
            founderRadarBrief = local
            founderRadarState = .failed(error.localizedDescription)
        }
    }

    func installFounderRadarSprint(_ brief: FounderRadarBrief? = nil) {
        let brief = brief ?? currentFounderRadarBrief()
        for move in brief.moves {
            addPlannerItem(
                title: move.title,
                note: "\(move.reason)\nErfolgskriterium: \(move.successMetric)",
                dueLabel: move.dueLabel,
                kind: move.kind,
                target: move.target,
                createdByCopilot: true
            )
        }
        Haptics.success()
    }

    func queueFounderRadarCopilot(_ brief: FounderRadarBrief? = nil) {
        queueCopilotPrompt(
            (brief ?? currentFounderRadarBrief()).copilotPrompt,
            title: "Business Radar"
        )
    }

    func localFounderRadarBrief() -> FounderRadarBrief {
        let memory = founderMemory
        let openDocs = documents.filter { !$0.done }
        let openPlan = plannerItems.filter { !$0.done }
        let bestCandidate = cofounderCandidates().first
        let hasPublishedProfile = companyProfile.isPublished
        let hasTeamSignal = startupTeamMembers.count > 1 || matches.contains { !$0.messages.isEmpty }

        let proofScore = clampScore(42 + documents.filter(\.done).count * 10 + (hasPublishedProfile ? 18 : 0))
        let marketScore = clampScore(44 + registeredEvents.count * 8 + min(matches.count, 4) * 8 + (partners.isEmpty ? 0 : 8))
        let teamScore = clampScore(38 + (hasTeamSignal ? 24 : 0) + (bestCandidate?.total ?? 55) / 3)
        let executionScore = clampScore(52 + max(0, 4 - openPlan.count) * 7 + min(openPlan.filter(\.createdByCopilot).count, 4) * 4)
        let overall = Int(round(Double(proofScore + marketScore + teamScore + executionScore) / 4.0))

        let missingDoc = openDocs.first?.title ?? "nächster Nachweis"
        let venture = memory.ventureName
        let topMatch = bestCandidate?.card.name ?? matches.first?.card.name ?? "dein stärkstes Match"
        let verdict: String = {
            if overall >= 78 { return "\(venture) hat genug Substanz für einen fokussierten 7-Tage-Start." }
            if overall >= 62 { return "\(venture) ist nah dran, braucht aber einen sichtbaren Kundentest statt mehr Planung." }
            return "\(venture) braucht jetzt Klarheit: Kosten, Angebot, Anmeldung und eine konkrete nächste Entscheidung."
        }()

        let primaryRisk: String = {
            if !hasPublishedProfile { return "Dein Business-Profil ist noch nicht klar genug; Kunden oder Partner verstehen zu wenig auf einen Blick." }
            if !openDocs.isEmpty { return "\(missingDoc) ist noch offen; ohne Zahlen oder Papierkram bleibt Förderung/Bank/Partnergespräch weich." }
            if !hasTeamSignal { return "Kontakt-Signal ist noch dünn; sprich erst echte Kunden, Helfer oder Partner an." }
            return "Der Plan ist da, aber Preis, Kundenziel oder Erfolgskriterium sind noch nicht hart genug formuliert."
        }()

        let hiddenOpportunity: String = {
            if let bestCandidate {
                return "\(bestCandidate.card.name) eignet sich für ein kleines Test-Gespräch statt weiterem Chat: \(bestCandidate.testSprint)"
            }
            if !partners.isEmpty {
                return "Die Live-Partnerdaten können als Gesprächsbriefing genutzt werden, bevor du blind Anbieter kontaktierst."
            }
            return "Dein Kalender kann aus Unterlagen, Kontakten und offenen Fragen in einen einfachen 7-Tage-Start übersetzt werden."
        }()

        let investorQuestion = "Welche kleine Sache passiert in den nächsten 7 Tagen, die zeigt, dass jemand für \(venture) zahlen oder helfen würde?"

        return FounderRadarBrief(
            title: "Business Radar · \(memory.ventureName)",
            verdict: verdict,
            overallScore: overall,
            urgency: overall >= 72 ? "Diese Woche entscheiden" : "Heute fokussieren",
            generatedAt: .now,
            source: .local,
            primaryRisk: primaryRisk,
            hiddenOpportunity: hiddenOpportunity,
            investorQuestion: investorQuestion,
            signals: [
                .init(id: "proof", label: "Papierkram", score: proofScore, note: "\(documents.filter(\.done).count)/\(documents.count) Unterlagen · Profil \(hasPublishedProfile ? "sichtbar" : "intern")", trend: proofScore >= 70 ? "steigt" : "offen"),
                .init(id: "market", label: "Kunden", score: marketScore, note: "\(matches.count) Kontakte · \(registeredEvents.count) Events · \(partners.count) Live-Partner", trend: marketScore >= 70 ? "aktiv" : "leise"),
                .init(id: "team", label: "Hilfe", score: teamScore, note: bestCandidate.map { "\($0.card.name) mit \($0.total) Kontakt-Score" } ?? "Noch kein klarer Helfer/Partner getestet", trend: hasTeamSignal ? "Signal" : "Lücke"),
                .init(id: "execution", label: "Tempo", score: executionScore, note: "\(openPlan.count) offene Schritte · \(openPlan.filter(\.createdByCopilot).count) Co-Pilot-Schritte", trend: executionScore >= 70 ? "klar" : "zerstreut"),
            ],
            moves: [
                .init(
                    title: "Ersten Kundentest für \(venture) festlegen",
                    reason: "Ein einfacher Kundentest macht Angebot, Förderung und Partnergespräche sofort konkreter.",
                    dueLabel: "Heute",
                    kind: .focus,
                    target: .startup,
                    successMetric: "Eine konkrete Zahl, Zusage oder Rückmeldung von einem echten Menschen."
                ),
                .init(
                    title: "\(missingDoc) mit Co-Pilot schließen",
                    reason: "Der offenste Nachweis ist gerade der schnellste Hebel für Seriosität.",
                    dueLabel: "Morgen",
                    kind: .document,
                    target: .documents,
                    successMetric: "Erster Entwurf liegt in Unterlagen und ist nicht mehr leer."
                ),
                .init(
                    title: "Kontakt-Nachricht an \(topMatch)",
                    reason: "Ob jemand wirklich helfen oder Kunde werden kann, zeigt sich besser im kleinen Gespräch als im endlosen Schreiben.",
                    dueLabel: "Diese Woche",
                    kind: .match,
                    target: .chats,
                    successMetric: "15-Minuten-Gespräch oder kleiner Test ist konkret vorgeschlagen."
                ),
            ]
        )
    }

    private func founderRadarRequest(localSignals: [FounderRadarSignal]) -> FounderRadarCloudRequest {
        let memory = founderMemory
        return FounderRadarCloudRequest(
            mobileClient: true,
            memory: FounderRadarMemoryPayload(
                founderName: memory.founderName,
                role: memory.role,
                ventureName: memory.ventureName,
                industry: memory.industry,
                stage: memory.stage,
                location: memory.location,
                idea: memory.idea,
                nextStep: memory.nextStep,
                openDocuments: memory.openDocuments,
                documentProgress: memory.documentProgress
            ),
            signals: localSignals,
            openItems: plannerItems.filter { !$0.done }.prefix(8).map { "\($0.title) · \($0.dueLabel) · \($0.note)" },
            matches: matches.prefix(6).map {
                FounderRadarMatchPayload(
                    name: $0.card.name,
                    role: $0.card.role,
                    city: $0.card.city,
                    matchPercent: $0.card.matchPercent,
                    messages: $0.messages.count
                )
            },
            team: startupTeamMembers.prefix(6).map {
                FounderRadarTeamPayload(name: $0.name, role: $0.role, focus: $0.focus)
            },
            partners: partners.prefix(8).map {
                FounderRadarPartnerPayload(name: $0.name, service: $0.serviceLabel, fit: $0.fit, blurb: $0.blurb)
            }
        )
    }

    func addPlannerItem(
        title: String,
        note: String,
        dueLabel: String,
        kind: PlannerItemKind,
        target: PlannerTarget?,
        date: Date? = nil,
        assigneeName: String? = nil,
        createdByCopilot: Bool = false
    ) {
        if plannerItems.contains(where: { $0.title.localizedCaseInsensitiveCompare(title) == .orderedSame }) {
            Haptics.select()
            return
        }
        var item = PlannerItem(title: title, note: note, dueLabel: dueLabel, kind: kind, target: target)
        item.date = date
        item.assigneeName = assigneeName
        item.createdByCopilot = createdByCopilot
        plannerItems.insert(item, at: 0)
        Haptics.success()
    }

    func addSmartPlannerItem(
        title: String,
        note: String,
        dueLabel: String,
        kind: PlannerItemKind,
        target: PlannerTarget?,
        assigneeName: String? = nil
    ) {
        addPlannerItem(
            title: title,
            note: note,
            dueLabel: dueLabel,
            kind: kind,
            target: target,
            date: dateFromDueLabel(dueLabel),
            assigneeName: assigneeName,
            createdByCopilot: true
        )
    }

    func rememberCopilotFact(_ fact: String) {
        let clean = fact.trimmingCharacters(in: .whitespacesAndNewlines)
        guard clean.count > 3 else { return }
        mergeCopilotFacts([clean])
        Haptics.success()
    }

    func foundStartup(name: String, category: String, stage: String, city: String, idea: String) {
        let cleanName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        let profile = profile
        let founderName = profile?.name.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let founderRole = profile?.role.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let finalName = cleanName.isEmpty
            ? (profile?.pitch.isEmpty == false ? profile!.pitch : "\(profile?.industry.ventureTerm ?? "Business") \(profile?.plz ?? "")").trimmingCharacters(in: .whitespacesAndNewlines)
            : cleanName
        let finalIdea = idea.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            ? (profile?.pitch.isEmpty == false ? profile!.pitch : "Noch zu schärfendes Vorhaben")
            : idea.trimmingCharacters(in: .whitespacesAndNewlines)
        let finalCategory = category.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            ? (profile?.industry.label ?? "Kleine Gründung")
            : category.trimmingCharacters(in: .whitespacesAndNewlines)
        let finalStage = stage.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "Idee" : stage.trimmingCharacters(in: .whitespacesAndNewlines)
        let finalCity = city.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            ? (profile?.plz ?? "DACH")
            : city.trimmingCharacters(in: .whitespacesAndNewlines)

        var hero = CompanyBlock.empty(.hero)
        hero.eyebrow = profile?.industry.ventureTerm ?? "Business"
        hero.title = finalName
        hero.subtitle = "\(finalStage) · \(finalCity)"
        hero.body = finalIdea
        hero.ctaLabel = "Kontakt aufnehmen"
        hero.ctaHref = "/matches"

        var about = CompanyBlock.empty(.about)
        about.title = "Worum es geht"
        about.body = finalIdea

        var team = CompanyBlock.empty(.team)
        team.members = [
            CompanyMember(name: founderName.isEmpty ? "Gründer" : founderName, role: founderRole.isEmpty ? "Inhaber" : founderRole, linkedin: "")
        ]

        var cta = CompanyBlock.empty(.cta)
        cta.title = "Mitbauen, testen oder Feedback geben."
        cta.body = "Wir suchen passende Menschen fuer den naechsten belastbaren Schritt."
        cta.ctaLabel = "Match starten"
        cta.ctaHref = "/matches"

        let wasActivated = startupWorkspaceActivated

        companyProfile = CompanyProfile(
            name: finalName,
            category: finalCategory,
            stage: finalStage,
            city: finalCity,
            blocks: [hero, about, .empty(.metrics), .empty(.highlights), team, cta],
            publishedSlug: nil,
            updatedAt: .now
        )
        startupWorkspaceActivated = true
        if !wasActivated || startupTeamMembers.isEmpty {
            startupTeamMembers = [
                StartupTeamMember(
                    name: founderName.isEmpty ? "Du" : founderName,
                    role: founderRole.isEmpty ? "Founder" : founderRole,
                    focus: finalIdea,
                    sourceMatchID: nil
                )
            ]
        }
        addSmartPlannerItem(
            title: "Business Workspace scharfstellen",
            note: "Profilvorschau prüfen, offene Fragen benennen und nächsten Kalenderblock setzen.",
            dueLabel: "Heute",
            kind: .profile,
            target: .company,
            assigneeName: founderName.isEmpty ? nil : founderName
        )
        rememberCopilotFact("Business angelegt: \(finalName) · \(finalStage) · \(finalCategory) · \(finalCity).")
        Haptics.success()
    }

    func addTeamMember(name: String, role: String, focus: String, sourceMatchID: String? = nil) {
        let cleanedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanedName.isEmpty else { return }
        if startupTeamMembers.contains(where: { $0.name.localizedCaseInsensitiveCompare(cleanedName) == .orderedSame }) {
            Haptics.select()
            return
        }
        startupTeamMembers.append(
            StartupTeamMember(
                name: cleanedName,
                role: role.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "Team" : role,
                focus: focus.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "Noch zu klären" : focus,
                sourceMatchID: sourceMatchID
            )
        )
        Haptics.success()
    }

    func addTeamMember(from match: Match) {
        addTeamMember(
            name: match.card.name,
            role: match.card.role,
            focus: match.card.skills.prefix(2).joined(separator: " + "),
            sourceMatchID: match.id
        )
    }

    func togglePlannerItem(_ id: UUID) {
        guard let index = plannerItems.firstIndex(where: { $0.id == id }) else { return }
        plannerItems[index].done.toggle()
        Haptics.select()
    }

    func execute(_ action: CopilotAction) {
        switch action.command {
        case .open(let destination):
            open(destination)
        case .askCopilot:
            break
        case .draftMatchMessage:
            break
        case .startCofounderTrial(let candidateID):
            startCofounderTrial(candidateID: candidateID)
        case .openMatchChat(let matchID):
            tab = .today
            todayPath = [.chat(matchID)]
        case .sendMatchMessage(let matchID, let text):
            send(text, to: matchID)
            tab = .today
            todayPath = [.chat(matchID)]
        case .rebuildPlanner:
            rebuildPlannerFromMemory()
            open(.screen(.calendar))
        case .generateDocumentDraft:
            generateDocumentDraft()
            open(.screen(.documents))
        case .publishCompanyProfile:
            _ = publishCompanyProfile()
            open(.screen(.company))
        case .refreshBackend:
            Task { await refreshBackendStatus() }
        case .refreshPartners:
            Task { await refreshPartnerOffers() }
        case .refreshFounderRadar:
            Task {
                await refreshFounderRadar()
                open(.screen(.radar))
            }
        case .toggleDocument(let id):
            toggleDocument(id)
        case .exportDocumentPDF:
            _ = exportDocumentDraftPDF()
            open(.screen(.documents))
        case .addPlannerItem(let title, let note, let dueLabel, let kind, let target):
            addPlannerItem(title: title, note: note, dueLabel: dueLabel, kind: kind, target: target)
            open(.screen(.calendar))
        case .addSmartPlannerItem(let title, let note, let dueLabel, let kind, let target, let assigneeName):
            addSmartPlannerItem(title: title, note: note, dueLabel: dueLabel, kind: kind, target: target, assigneeName: assigneeName)
            open(.screen(.calendar))
        case .rememberFact(let fact):
            rememberCopilotFact(fact)
            open(.screen(.copilot))
        case .foundStartup(let name, let category, let stage, let city, let idea):
            foundStartup(name: name, category: category, stage: stage, city: city, idea: idea)
            open(.screen(.startup))
        case .addKanbanCard(let title, let note):
            KanbanStore.shared.add(title: title, note: note)
            open(.screen(.kanban))
        }
    }

    @discardableResult
    func startCopilotSession(title: String = "Neues Thema", haptic: Bool = true) -> UUID {
        let session = CopilotSession(title: title)
        var nextSessions = copilotSessions
        nextSessions.insert(session, at: 0)
        copilotSessions = compactCopilotSessions(nextSessions)
        activeCopilotSessionID = session.id
        if haptic { Haptics.select() }
        return session.id
    }

    @discardableResult
    func ensureCopilotSession() -> UUID {
        if let activeCopilotSessionID,
           copilotSessions.contains(where: { $0.id == activeCopilotSessionID }) {
            return activeCopilotSessionID
        }
        return startCopilotSession(haptic: false)
    }

    func switchCopilotSession(_ id: UUID) {
        guard copilotSessions.contains(where: { $0.id == id }) else { return }
        activeCopilotSessionID = id
        Haptics.select()
    }

    @discardableResult
    func queueCopilotPrompt(_ prompt: String, title: String) -> UUID {
        let cleanPrompt = prompt.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanPrompt.isEmpty else { return ensureCopilotSession() }
        let cleanTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        let sessionID = startCopilotSession(
            title: cleanTitle.isEmpty ? CopilotSession.title(from: cleanPrompt) : cleanTitle,
            haptic: true
        )
        pendingCopilotPrompt = cleanPrompt
        openCopilot()
        return sessionID
    }

    func deleteCopilotSession(_ id: UUID) {
        copilotSessions.removeAll { $0.id == id }
        if activeCopilotSessionID == id {
            activeCopilotSessionID = copilotSessions.first?.id
        }
        Haptics.tap()
    }

    func copilotMessages(for sessionID: UUID?) -> [CopilotMessage] {
        guard let sessionID else { return [] }
        return copilotSessions.first(where: { $0.id == sessionID })?.messages ?? []
    }

    func activeCopilotMessages() -> [CopilotMessage] {
        copilotMessages(for: activeCopilotSessionID)
    }

    func activeCopilotSessionTitle() -> String {
        guard let activeCopilotSessionID,
              let session = copilotSessions.first(where: { $0.id == activeCopilotSessionID }) else {
            return "Neues Thema"
        }
        return session.title
    }

    func appendCopilotMessage(_ message: CopilotMessage, to sessionID: UUID) {
        var nextSessions = copilotSessions
        guard let index = nextSessions.firstIndex(where: { $0.id == sessionID }) else { return }
        nextSessions[index].append(message)
        copilotSessions = compactCopilotSessions(nextSessions)
    }

    func mergeCopilotFacts(_ facts: [String]) {
        let cleaned = facts
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { $0.count > 3 }
        guard !cleaned.isEmpty else { return }
        var merged: [String] = []
        for fact in copilotFacts + cleaned where !merged.contains(fact) {
            merged.append(fact)
        }
        copilotFacts = Array(merged.suffix(30))
    }

    func copilotOnboardingContext() -> CopilotOnboardingContext? {
        guard let profile else { return nil }
        return CopilotOnboardingContext(profile: profile)
    }

    func refreshBackendStatus() async {
        backendStatus = .checking
        do {
            let snapshot = try await SupabaseService.shared.healthCheck()
            backendStatus = .online(snapshot.message)
        } catch {
            backendStatus = .offline(error.localizedDescription)
        }
    }

    // ─── Persistenz ──────────────────────────────────────────

    private func persistProfile() {
        if let profile, let data = try? JSONEncoder().encode(profile) {
            defaults.set(data, forKey: "mf.profile")
        } else {
            defaults.removeObject(forKey: "mf.profile")
        }
    }

    private func loadProfile() {
        if let data = defaults.data(forKey: "mf.profile"),
           let p = try? JSONDecoder().decode(MyProfile.self, from: data) {
            profile = p
        }
    }

    private func purgeLegacySeedStateIfNeeded() {
        guard defaults.integer(forKey: "mf.liveDataGeneration") < Self.liveDataGeneration else { return }
        [
            "mf.profile",
            "mf.profile.extras",
            "mf.company.profile",
            "mf.documents",
            "mf.documents.assets",
            "mf.planner.items",
            "mf.startup.team",
            "mf.documents.draft",
            "mf.events.registered",
            "mf.founder.radar.brief"
        ].forEach { defaults.removeObject(forKey: $0) }
        defaults.set(false, forKey: "mf.startup.activated")
        defaults.set(Self.liveDataGeneration, forKey: "mf.liveDataGeneration")
    }

    private func loadWorkspaceData() {
        profileExtras = load(ProfileExtras.self, key: "mf.profile.extras") ?? .empty(for: profile)
        companyProfile = load(CompanyProfile.self, key: "mf.company.profile") ?? .empty(for: profile)
        documents = mergedFounderDocuments(load([FounderDocument].self, key: "mf.documents") ?? [])
        documentAssets = load([FounderDocumentAsset].self, key: "mf.documents.assets") ?? []
        plannerItems = load([PlannerItem].self, key: "mf.planner.items") ?? []
        founderRadarBrief = load(FounderRadarBrief.self, key: "mf.founder.radar.brief")
        startupTeamMembers = load([StartupTeamMember].self, key: "mf.startup.team") ?? []
        startupWorkspaceActivated = defaults.bool(forKey: "mf.startup.activated")
        copilotFacts = defaults.stringArray(forKey: "mf.copilot.facts") ?? []
        copilotSessions = compactCopilotSessions(load([CopilotSession].self, key: "mf.copilot.sessions") ?? [])
        if let rawID = defaults.string(forKey: "mf.copilot.activeSessionID"),
           let id = UUID(uuidString: rawID),
           copilotSessions.contains(where: { $0.id == id }) {
            activeCopilotSessionID = id
        } else {
            activeCopilotSessionID = copilotSessions.first?.id
        }
        documentDraft = defaults.string(forKey: "mf.documents.draft") ?? ""
        if documentDraft.isEmpty {
            documentDraft = "Noch kein Entwurf. Lass den Co-Pilot einen Kurz-Businessplan aus deinem Profil und Business-Profil vorbereiten."
        }
    }

    private func mergedFounderDocuments(_ stored: [FounderDocument]) -> [FounderDocument] {
        guard !stored.isEmpty else { return [] }
        let legacyIDs = Set(["idea", "innovation", "finance", "team", "legal"])
        var legacyDone: [String: Bool] = [:]
        stored.forEach { legacyDone[$0.id] = (legacyDone[$0.id] ?? false) || $0.done }
        var merged = stored.filter { !legacyIDs.contains($0.id) }

        for defaultDocument in FounderDocument.defaults {
            if let index = merged.firstIndex(where: { $0.id == defaultDocument.id }) {
                merged[index].title = defaultDocument.title
                merged[index].note = defaultDocument.note
            } else {
                merged.append(defaultDocument)
            }
        }

        func mark(_ id: String, ifAnyLegacyDone legacy: [String]) {
            guard let index = merged.firstIndex(where: { $0.id == id }) else { return }
            if legacy.contains(where: { legacyDone[$0] == true }) {
                merged[index].done = true
            }
        }
        mark("businessplan", ifAnyLegacyDone: ["idea", "innovation"])
        mark("startup-costs", ifAnyLegacyDone: ["finance"])
        mark("registration", ifAnyLegacyDone: ["legal"])
        return merged
    }

    private func persist<T: Encodable>(_ value: T, key: String) {
        if let data = try? JSONEncoder().encode(value) {
            defaults.set(data, forKey: key)
        }
    }

    private func load<T: Decodable>(_ type: T.Type, key: String) -> T? {
        guard let data = defaults.data(forKey: key) else { return nil }
        return try? JSONDecoder().decode(type, from: data)
    }

    private func compactCopilotSessions(_ sessions: [CopilotSession]) -> [CopilotSession] {
        Array(sessions.sorted { $0.updatedAt > $1.updatedAt }.prefix(Self.maxCopilotSessions)).map { session in
            var trimmed = session
            if trimmed.messages.count > Self.maxCopilotMessagesPerSession {
                trimmed.messages = Array(trimmed.messages.suffix(Self.maxCopilotMessagesPerSession))
            }
            return trimmed
        }
    }

    private func defaultsHas(_ key: String) -> Bool {
        defaults.object(forKey: key) != nil
    }

    private func dateFromDueLabel(_ label: String) -> Date {
        let calendar = Calendar.current
        let lower = label.lowercased()
        if lower.contains("morgen") {
            return calendar.date(byAdding: .day, value: 1, to: .now) ?? .now
        }
        if lower.contains("2 tag") || lower.contains("zwei tag") {
            return calendar.date(byAdding: .day, value: 2, to: .now) ?? .now
        }
        if lower.contains("woche") || lower.contains("7 tage") || lower.contains("sieben tage") {
            return calendar.date(byAdding: .day, value: 4, to: .now) ?? .now
        }
        if lower.contains("14") || lower.contains("zwei wochen") {
            return calendar.date(byAdding: .day, value: 14, to: .now) ?? .now
        }
        return .now
    }

    private func registerSwipe() -> Bool {
        if isPremium { return true }
        if swipesToday >= freeSwipes { return false }
        swipesToday += 1
        defaults.set(swipesToday, forKey: "mf.swipes.count")
        defaults.set(Self.dayKey, forKey: "mf.swipes.day")
        return true
    }

    private func loadFreemium() {
        if let until = defaults.object(forKey: "mf.trialUntil") as? Date, until > .now {
            isPremium = true
        }
        if defaults.string(forKey: "mf.swipes.day") == Self.dayKey {
            swipesToday = defaults.integer(forKey: "mf.swipes.count")
        }
        refreshAIUsageWindow()
    }

    private var trialUntil: Date? {
        defaults.object(forKey: "mf.trialUntil") as? Date
    }

    private func refreshAIUsageWindow() {
        if defaults.string(forKey: "mf.ai.day") == Self.dayKey {
            let storedToday = defaults.integer(forKey: "mf.ai.tokens.today")
            if aiTokensToday != storedToday {
                aiTokensToday = storedToday
            }
        } else {
            if aiTokensToday != 0 {
                aiTokensToday = 0
            }
            defaults.set(Self.dayKey, forKey: "mf.ai.day")
        }

        if defaults.string(forKey: "mf.ai.week") == Self.weekKey {
            let storedWeek = defaults.integer(forKey: "mf.ai.tokens.week")
            if aiTokensThisWeek != storedWeek {
                aiTokensThisWeek = storedWeek
            }
        } else {
            if aiTokensThisWeek != 0 {
                aiTokensThisWeek = 0
            }
            defaults.set(Self.weekKey, forKey: "mf.ai.week")
        }
    }

    private func personalizedPlannerItems() -> [PlannerItem] {
        var items = PlannerItem.defaults(for: profile, company: companyProfile, documents: documents)

        if let firstOpenDocument = documents.first(where: { !$0.done }) {
            items.insert(
                PlannerItem(
                    title: "\(firstOpenDocument.title) mit Co-Pilot vorschreiben",
                    note: firstOpenDocument.note,
                    dueLabel: "Heute",
                    kind: .document,
                    target: .documents
                ),
                at: 1
            )
        }

        if !companyProfile.isPublished {
            items.append(
                PlannerItem(
                    title: "Öffentlichen Profil-Link vorbereiten",
                    note: "Sobald Hero, Team und CTA sitzen, kann dein Profil an Matches und Pilotkunden gehen.",
                    dueLabel: "Vor dem nächsten Gespräch",
                    kind: .profile,
                    target: .company
                )
            )
        }

        if let event = events.first(where: { registeredEvents.contains($0.id) }) {
            items.append(
                PlannerItem(
                    title: "Vorbereitung für \(event.title)",
                    note: "Eine klare Frage, ein 30-Sekunden-Pitch und zwei Zielkontakte für den Abend.",
                    dueLabel: event.dateLabel,
                    kind: .meeting,
                    target: .events
                )
            )
        }

        if let match = matches.first {
            items.append(
                PlannerItem(
                    title: "\(match.card.name) konkret anschreiben",
                    note: "Nicht allgemein netzwerken: 15 Minuten Call mit Bezug auf \(match.card.role).",
                    dueLabel: "Heute Abend",
                    kind: .match,
                    target: .chats
                )
            )
        }

        return items
    }

    private static var dayKey: String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: .now)
    }

    private static var weekKey: String {
        let calendar = Calendar.current
        let parts = calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: .now)
        return "\(parts.yearForWeekOfYear ?? 0)-\(parts.weekOfYear ?? 0)"
    }

    private static func slug(from value: String) -> String {
        let folded = value
            .folding(options: [.diacriticInsensitive, .caseInsensitive], locale: Locale(identifier: "de_DE"))
            .lowercased()
        let allowed = folded.map { char -> Character in
            char.isLetter || char.isNumber ? char : "-"
        }
        let raw = String(allowed)
            .split(separator: "-")
            .joined(separator: "-")
        return raw.isEmpty ? "business" : String(raw.prefix(48))
    }
}

struct AIUsageSnapshot {
    let planName: String
    let usedToday: Int
    let dailyLimit: Int
    let usedThisWeek: Int
    let weeklyLimit: Int
    let trialUntil: Date?

    var remainingToday: Int { max(0, dailyLimit - usedToday) }
    var remainingThisWeek: Int { max(0, weeklyLimit - usedThisWeek) }
    var dayRatio: Double { min(1, Double(usedToday) / Double(max(dailyLimit, 1))) }
    var weekRatio: Double { min(1, Double(usedThisWeek) / Double(max(weeklyLimit, 1))) }

    var trialLabel: String? {
        guard let trialUntil, trialUntil > .now else { return nil }
        return "Trial bis \(trialUntil.formatted(.dateTime.day().month().locale(Locale(identifier: "de_DE"))))"
    }
}
