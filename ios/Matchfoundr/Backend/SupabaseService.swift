// matchfoundr · Supabase Backend
// Native, dependency-free client for Supabase REST and Edge Functions.

import Foundation

enum SupabaseConfig {
    // Supabase-Projekt „Matchfoundr" (rzmcoxnfcpqqyxgkafwk, eu-central-1).
    // Umzug von der Lovable-Cloud-Instanz am 21.07.2026.
    static let projectURL = URL(string: "https://rzmcoxnfcpqqyxgkafwk.supabase.co")!
    static let anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6bWNveG5mY3BxcXl4Z2thZndrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NTk1MzAsImV4cCI6MjEwMDIzNTUzMH0.9hT70TrLAQks_m3ZUmoH8daRRhHyZ-kP50_-5kIgea0"

    static var restURL: URL {
        projectURL.appending(path: "rest/v1")
    }

    static var functionsURL: URL {
        projectURL.appending(path: "functions/v1")
    }
}

enum BackendStatus: Equatable {
    case idle
    case checking
    case online(String)
    case offline(String)

    var title: String {
        switch self {
        case .idle: "Backend bereit"
        case .checking: "Backend prüfen..."
        case .online: "Supabase verbunden"
        case .offline: "Backend nicht erreichbar"
        }
    }

    var detail: String {
        switch self {
        case .idle: "Noch nicht geprüft"
        case .checking: "Verbindung läuft"
        case .online(let message): message
        case .offline(let message): message
        }
    }

    var icon: String {
        switch self {
        case .idle: "server.rack"
        case .checking: "arrow.triangle.2.circlepath"
        case .online: "checkmark.seal.fill"
        case .offline: "exclamationmark.triangle.fill"
        }
    }

    var isOnline: Bool {
        if case .online = self { return true }
        return false
    }
}

struct SupabaseBackendSnapshot: Equatable {
    let checkedAt: Date
    let publishedCompanyProfiles: Int

    var message: String {
        if publishedCompanyProfiles == 1 {
            return "REST online · 1 Firmenprofil öffentlich"
        }
        return "REST online · \(publishedCompanyProfiles) Firmenprofile öffentlich"
    }
}

struct SupabasePublishedCompanyProfile: Decodable, Identifiable, Equatable {
    var id: String { slug }
    let slug: String
    let name: String
    let published: Bool
    let updatedAt: Date?
}

struct SupabaseProfileRow: Decodable, Equatable {
    let id: String
    let displayName: String?
    let founderType: String?
    let industry: String?
    let ventureTerm: String?
    let partnerTerm: String?
    let role: String?
    let skills: [String]?
    let location: String?
    let vision: String?
    let lookingFor: String?
    let commitment: String?
    let onboardedAt: Date?
    let isOnboarded: Bool?
    let updatedAt: Date?

    var hasCompletedOnboarding: Bool {
        onboardedAt != nil || isOnboarded == true
    }

    func toProfile(fallbackEmail: String?) -> MyProfile? {
        guard hasCompletedOnboarding else { return nil }
        let mode: FounderMode = founderType == "talent" ? .skills : .idea
        let resolvedIndustry = resolvedIndustryID
        return MyProfile(
            mode: mode,
            industryId: resolvedIndustry,
            skills: skills ?? [],
            name: clean(displayName) ?? fallbackEmail?.split(separator: "@").first.map(String.init) ?? "Gründer",
            role: roleLabel,
            pitch: clean(vision) ?? "",
            plz: clean(location) ?? "",
            availability: availability
        )
    }

    func toCard(currentProfile: MyProfile?) -> FounderCard {
        let resolvedIndustry = resolvedIndustryID
        let cardSkills = skills ?? []
        return FounderCard(
            id: id,
            name: clean(displayName) ?? "Gründer",
            role: roleLabel,
            city: clean(location) ?? "DACH",
            pitch: clean(vision) ?? clean(lookingFor) ?? "Profil ist angelegt, aber noch nicht ausgefuellt.",
            skills: cardSkills,
            industryId: resolvedIndustry,
            availability: availability,
            matchPercent: fitEstimate(against: currentProfile, skills: cardSkills, industry: resolvedIndustry)
        )
    }

    private var roleLabel: String {
        if let founderType {
            switch founderType {
            case "talent": return "Skill-Partner"
            case "hybrid": return "Gründer & Macher"
            default: break
            }
        }
        switch role {
        case "tech": return "Website & Technik"
        case "business": return "Business & Verkauf"
        case "product": return "Produkt & Angebot"
        case "design": return "Design & Auftritt"
        default: return "Gründer"
        }
    }

    private var resolvedIndustryID: String {
        guard let industry,
              industries.contains(where: { $0.id == industry }) else {
            return "tech"
        }
        return industry
    }

    private var availability: Availability {
        switch commitment {
        case "full_time": return .fulltime
        case "part_time": return .parttime
        default: return .weekend
        }
    }

    private func fitEstimate(against profile: MyProfile?, skills: [String], industry: String) -> Int {
        guard let profile else { return 0 }
        var score = 45
        if profile.industryId == industry { score += 15 }
        let own = Set(profile.skills)
        let other = Set(skills)
        let overlap = own.intersection(other).count
        let complement = max(0, other.subtracting(own).count)
        score += min(20, overlap * 5)
        score += min(20, complement * 4)
        return min(95, max(0, score))
    }

    private func clean(_ value: String?) -> String? {
        guard let value else { return nil }
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }
}

struct SupabaseProfileUpsert: Encodable {
    let id: String
    let displayName: String
    let founderType: String
    let industry: String
    let ventureTerm: String
    let partnerTerm: String
    let skills: [String]
    let location: String?
    let vision: String?
    let commitment: String
    let stage: String
    let isOnboarded: Bool
    let onboardedAt: Date
}

struct SupabaseProfileOnboardingReset: Encodable {
    let id: String
    let onboardedAt: Date?
    let isOnboarded: Bool
}

struct SupabaseSwipeRow: Decodable {
    let targetId: String
}

struct SupabaseCommunityEventRow: Decodable {
    let id: String
    let title: String
    let kind: String?
    let serviceId: String?
    let dateLabel: String?
    let timeLabel: String?
    let startsAt: Date?
    let city: String?
    let venue: String?
    let spots: Int?
    let taken: Int?
    let host: String?
    let blurb: String?
    let agenda: [String]?
    let bannerImageUrl: String?

    func toEvent() -> CommunityEvent {
        CommunityEvent(
            id: id,
            title: clean(title) ?? "Live-Event",
            kind: clean(kind) ?? "Event",
            serviceId: clean(serviceId) ?? "growth",
            dateLabel: resolvedDateLabel,
            timeLabel: resolvedTimeLabel,
            city: clean(city) ?? "DACH",
            venue: clean(venue) ?? "Ort folgt",
            spots: max(0, spots ?? 0),
            taken: max(0, taken ?? 0),
            host: clean(host) ?? "matchfoundr",
            blurb: clean(blurb) ?? "",
            agenda: agenda?.filter { clean($0) != nil } ?? [],
            bannerImageURL: clean(bannerImageUrl)
        )
    }

    private var resolvedDateLabel: String {
        if let dateLabel = clean(dateLabel) { return dateLabel }
        guard let startsAt else { return "Termin folgt" }
        return startsAt.formatted(.dateTime.weekday(.abbreviated).day().month(.abbreviated))
    }

    private var resolvedTimeLabel: String {
        if let timeLabel = clean(timeLabel) { return timeLabel }
        guard let startsAt else { return "Uhrzeit folgt" }
        return startsAt.formatted(.dateTime.hour().minute())
    }

    private func clean(_ value: String?) -> String? {
        guard let value else { return nil }
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }
}

struct SwipeFunctionRequest: Encodable {
    let targetId: String
    let direction: String
}

struct SwipeFunctionResponse: Decodable {
    let success: Bool
    let mutualMatch: Bool
    let matchId: String?
    let conversationId: String?
    let direction: String
}

struct SupabaseAPIError: Decodable, LocalizedError {
    let message: String?
    let details: String?
    let hint: String?
    let code: String?

    var errorDescription: String? {
        [message, details, hint, code]
            .compactMap { $0 }
            .filter { !$0.isEmpty }
            .joined(separator: " · ")
    }
}

struct BackendRequestError: LocalizedError {
    let statusCode: Int
    let message: String

    var errorDescription: String? {
        "HTTP \(statusCode): \(message)"
    }
}

private struct IntegrationConnectRequest: Encodable {
    let provider: String
    let returnTo: String
}

struct IntegrationConnectResponse: Decodable {
    let url: URL
}

private struct IntegrationDisconnectRequest: Encodable {
    let provider: String
    let action: String = "disconnect"
}

struct IntegrationDisconnectResponse: Decodable {
    let ok: Bool
}

private struct MCPConnectorRequest: Encodable {
    let connectorID: String
    let action: String
    let returnTo: String?

    enum CodingKeys: String, CodingKey {
        case connectorID = "connector_id"
        case action
        case returnTo
    }
}

struct MCPConnectorResponse: Decodable {
    let ok: Bool?
    let url: URL?
    let status: String?
    let message: String?
}

private struct SupabaseConnectedAccountUpsert: Encodable {
    let userID: String
    let provider: String
    let status: String
    let accountLabel: String?

    enum CodingKeys: String, CodingKey {
        case userID = "user_id"
        case provider
        case status
        case accountLabel = "account_label"
    }
}

private struct MorningReportRunRequest: Encodable {
    let force: Bool
}

struct MorningReportRunResponse: Decodable {
    let ok: Bool
    let users: Int
    let results: [String: String]?
}

struct SupabaseService {
    private static let liveSession: URLSession = {
        let configuration = URLSessionConfiguration.default
        configuration.timeoutIntervalForRequest = 120
        configuration.timeoutIntervalForResource = 150
        configuration.waitsForConnectivity = true
        return URLSession(configuration: configuration)
    }()

    static let shared = SupabaseService(session: liveSession)

    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    init(session: URLSession = .shared) {
        self.session = session

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let value = try container.decode(String.self)
            if let date = ISO8601DateFormatter.supabaseWithFraction.date(from: value)
                ?? ISO8601DateFormatter.supabase.date(from: value) {
                return date
            }
            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Invalid Supabase date: \(value)"
            )
        }
        self.decoder = decoder

        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        encoder.dateEncodingStrategy = .iso8601
        self.encoder = encoder
    }

    func healthCheck() async throws -> SupabaseBackendSnapshot {
        let published = try await fetchPublishedCompanyProfiles(limit: 10)
        return SupabaseBackendSnapshot(
            checkedAt: .now,
            publishedCompanyProfiles: published.count
        )
    }

    func fetchPublishedCompanyProfiles(limit: Int = 10) async throws -> [SupabasePublishedCompanyProfile] {
        try await rest(
            "company_profiles",
            query: [
                URLQueryItem(name: "select", value: "slug,name,published,updated_at"),
                URLQueryItem(name: "published", value: "eq.true"),
                URLQueryItem(name: "limit", value: "\(limit)"),
                URLQueryItem(name: "order", value: "updated_at.desc")
            ]
        )
    }

    func fetchPublishedCompanyProfile(slug: String) async throws -> SupabasePublishedCompanyProfile? {
        let rows: [SupabasePublishedCompanyProfile] = try await rest(
            "company_profiles",
            query: [
                URLQueryItem(name: "select", value: "slug,name,published,updated_at"),
                URLQueryItem(name: "slug", value: "eq.\(slug)"),
                URLQueryItem(name: "published", value: "eq.true"),
                URLQueryItem(name: "limit", value: "1")
            ]
        )
        return rows.first
    }

    func fetchPartnerOffers(limit: Int = 50) async throws -> [PartnerOffer] {
        try await rest(
            "partner_offers",
            query: [
                URLQueryItem(name: "select", value: "slug,name,firm,serviceId:service_id,city,blurb,fit,sourceUrl:source_url,bookingUrl:booking_url,logoUrl:logo_url,bannerUrl:banner_url,specialties,packages,why,vouches"),
                URLQueryItem(name: "is_active", value: "eq.true"),
                URLQueryItem(name: "order", value: "fit.desc"),
                URLQueryItem(name: "limit", value: "\(limit)")
            ]
        )
    }

    func fetchCommunityEvents(limit: Int = 30) async throws -> [CommunityEvent] {
        let rows: [SupabaseCommunityEventRow] = try await rest(
            "community_events",
            query: [
                URLQueryItem(name: "select", value: "id,title,kind,service_id,date_label,time_label,starts_at,city,venue,spots,taken,host,blurb,agenda,banner_image_url"),
                URLQueryItem(name: "is_published", value: "eq.true"),
                URLQueryItem(name: "order", value: "starts_at.asc"),
                URLQueryItem(name: "limit", value: "\(limit)")
            ],
            accessToken: SupabaseConfig.anonKey
        )
        return rows.map { $0.toEvent() }
    }

    func fetchConnectedAccounts() async throws -> [ConnectedAccount] {
        try await rest(
            "connected_accounts",
            query: [
                URLQueryItem(name: "select", value: "provider,status,account_label,updated_at"),
                URLQueryItem(name: "order", value: "updated_at.desc")
            ]
        )
    }

    func fetchMCPConnections() async throws -> [MCPConnectorLink] {
        try await rest(
            "mcp_connections",
            query: [
                URLQueryItem(name: "select", value: "connector_id,status,account_label,connected_at,updated_at,note:metadata->>note"),
                URLQueryItem(name: "order", value: "updated_at.desc")
            ]
        )
    }

    func connectMCPConnector(_ connector: MCPConnectorID) async throws -> MCPConnectorResponse {
        try await invokeFunction(
            "mcp-connect",
            body: MCPConnectorRequest(
                connectorID: connector.rawValue,
                action: "connect",
                returnTo: "matchfoundr://integration-callback"
            )
        )
    }

    func disconnectMCPConnector(_ connector: MCPConnectorID) async throws -> MCPConnectorResponse {
        try await invokeFunction(
            "mcp-connect",
            body: MCPConnectorRequest(
                connectorID: connector.rawValue,
                action: "disconnect",
                returnTo: nil
            )
        )
    }

    func connectIntegration(provider: IntegrationProvider) async throws -> IntegrationConnectResponse {
        try await invokeFunction(
            "connect-google",
            body: IntegrationConnectRequest(
                provider: provider.rawValue,
                returnTo: "matchfoundr://integration-callback"
            )
        )
    }

    func requestWhatsAppConnection(userID: String) async throws {
        let body = SupabaseConnectedAccountUpsert(
            userID: userID,
            provider: IntegrationProvider.whatsapp.rawValue,
            status: "pending",
            accountLabel: "Gateway angefragt"
        )
        try await upsert("connected_accounts", body: body, onConflict: "user_id,provider")
    }

    func disconnectIntegration(provider: IntegrationProvider) async throws -> IntegrationDisconnectResponse {
        try await invokeFunction(
            "connect-google",
            body: IntegrationDisconnectRequest(provider: provider.rawValue)
        )
    }

    func fetchTodayMorningReport() async throws -> MorningReport? {
        let rows: [MorningReport] = try await rest(
            "daily_reports",
            query: [
                URLQueryItem(name: "select", value: "id,report_date,content,created_at"),
                URLQueryItem(name: "report_date", value: "eq.\(Self.todayKey)"),
                URLQueryItem(name: "limit", value: "1")
            ]
        )
        return rows.first
    }

    func runMorningReportNow(force: Bool = true) async throws -> MorningReportRunResponse {
        try await invokeFunction("morning-report", body: MorningReportRunRequest(force: force))
    }

    func fetchProfile(userID: String) async throws -> SupabaseProfileRow? {
        let rows: [SupabaseProfileRow] = try await rest(
            "profiles",
            query: [
                URLQueryItem(name: "select", value: "id,display_name,founder_type,industry,venture_term,partner_term,role,skills,location,vision,looking_for,commitment,onboarded_at,is_onboarded,updated_at"),
                URLQueryItem(name: "id", value: "eq.\(userID)"),
                URLQueryItem(name: "limit", value: "1")
            ]
        )
        return rows.first
    }

    func upsertProfile(_ profile: MyProfile, userID: String) async throws {
        let body = SupabaseProfileUpsert(
            id: userID,
            displayName: profile.name,
            founderType: profile.mode == .skills ? "talent" : "founder",
            industry: profile.industryId,
            ventureTerm: profile.industry.ventureTerm,
            partnerTerm: profile.industry.partnerTerm,
            skills: profile.skills,
            location: profile.plz.isEmpty ? nil : profile.plz,
            vision: profile.pitch.isEmpty ? nil : profile.pitch,
            commitment: profile.availability.supabaseCommitment,
            stage: "idea",
            isOnboarded: true,
            onboardedAt: .now
        )
        try await upsert("profiles", body: body, onConflict: "id")
    }

    func resetProfileOnboarding(userID: String) async throws {
        try await upsert(
            "profiles",
            body: SupabaseProfileOnboardingReset(id: userID, onboardedAt: nil, isOnboarded: false),
            onConflict: "id"
        )
    }

    func fetchFounderCards(currentUserID: String, currentProfile: MyProfile?, limit: Int = 40) async throws -> [FounderCard] {
        let swipes: [SupabaseSwipeRow] = (try? await rest(
            "swipes",
            query: [
                URLQueryItem(name: "select", value: "target_id"),
                URLQueryItem(name: "swiper_id", value: "eq.\(currentUserID)")
            ]
        )) ?? []
        let excluded = Set(swipes.map(\.targetId) + [currentUserID])

        let rows: [SupabaseProfileRow] = try await rest(
            "profiles",
            query: [
                URLQueryItem(name: "select", value: "id,display_name,founder_type,industry,venture_term,partner_term,role,skills,location,vision,looking_for,commitment,onboarded_at,is_onboarded,updated_at"),
                URLQueryItem(name: "onboarded_at", value: "not.is.null"),
                URLQueryItem(name: "is_visible", value: "eq.true"),
                URLQueryItem(name: "order", value: "updated_at.desc"),
                URLQueryItem(name: "limit", value: "\(limit)")
            ]
        )
        return rows
            .filter { !excluded.contains($0.id) }
            .map { $0.toCard(currentProfile: currentProfile) }
    }

    func performSwipe(targetID: String, like: Bool) async throws -> SwipeFunctionResponse {
        try await invokeFunction(
            "swipe",
            body: SwipeFunctionRequest(targetId: targetID, direction: like ? "like" : "pass")
        )
    }

    func generateFounderRadar(_ request: FounderRadarCloudRequest) async throws -> FounderRadarBrief {
        try await invokeFunction("founder-radar", body: request)
    }

    func pingFunction(_ name: String) async throws {
        var request = URLRequest(url: SupabaseConfig.functionsURL.appending(path: name))
        request.httpMethod = "OPTIONS"
        request.timeoutInterval = 12
        applyHeaders(to: &request, accessToken: await Backend.accessToken())
        let (_, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse,
              (200..<300).contains(http.statusCode) else {
            throw URLError(.cannotConnectToHost)
        }
    }

    func invokeFunction<Response: Decodable, Body: Encodable>(
        _ name: String,
        body: Body,
        accessToken: String? = nil
    ) async throws -> Response {
        var request = URLRequest(url: SupabaseConfig.functionsURL.appending(path: name))
        request.httpMethod = "POST"
        request.timeoutInterval = 120
        request.httpBody = try encoder.encode(body)
        let token = await resolvedAccessToken(accessToken)
        applyHeaders(to: &request, accessToken: token)
        return try await send(request)
    }

    private func upsert<Body: Encodable>(
        _ table: String,
        body: Body,
        onConflict: String
    ) async throws {
        var components = URLComponents(url: SupabaseConfig.restURL.appending(path: table), resolvingAgainstBaseURL: false)!
        components.queryItems = [URLQueryItem(name: "on_conflict", value: onConflict)]
        guard let url = components.url else {
            throw URLError(.badURL)
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.httpBody = try encoder.encode(body)
        request.setValue("resolution=merge-duplicates,return=minimal", forHTTPHeaderField: "Prefer")
        let token = await resolvedAccessToken(nil)
        applyHeaders(to: &request, accessToken: token)
        try await sendEmpty(request)
    }

    private func rest<Response: Decodable>(
        _ table: String,
        query: [URLQueryItem] = [],
        accessToken: String? = nil
    ) async throws -> Response {
        var components = URLComponents(url: SupabaseConfig.restURL.appending(path: table), resolvingAgainstBaseURL: false)!
        components.queryItems = query
        guard let url = components.url else {
            throw URLError(.badURL)
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        let token = await resolvedAccessToken(accessToken)
        applyHeaders(to: &request, accessToken: token)
        return try await send(request)
    }

    private func resolvedAccessToken(_ explicitToken: String?) async -> String? {
        if let explicitToken { return explicitToken }
        return await Backend.accessToken()
    }

    private func applyHeaders(to request: inout URLRequest, accessToken: String?) {
        request.setValue(SupabaseConfig.anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(accessToken ?? SupabaseConfig.anonKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    }

    private func send<Response: Decodable>(_ request: URLRequest) async throws -> Response {
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw URLError(.badServerResponse)
        }
        guard (200..<300).contains(http.statusCode) else {
            if let error = try? decoder.decode(SupabaseAPIError.self, from: data),
               let description = error.errorDescription,
               !description.isEmpty {
                throw error
            }
            throw BackendRequestError(statusCode: http.statusCode, message: responsePreview(from: data))
        }
        do {
            return try decoder.decode(Response.self, from: data)
        } catch {
            throw BackendRequestError(
                statusCode: http.statusCode,
                message: "Antwort konnte nicht gelesen werden: \(responsePreview(from: data))"
            )
        }
    }

    private func sendEmpty(_ request: URLRequest) async throws {
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw URLError(.badServerResponse)
        }
        guard (200..<300).contains(http.statusCode) else {
            if let error = try? decoder.decode(SupabaseAPIError.self, from: data),
               let description = error.errorDescription,
               !description.isEmpty {
                throw error
            }
            throw BackendRequestError(statusCode: http.statusCode, message: responsePreview(from: data))
        }
    }

    private func responsePreview(from data: Data) -> String {
        guard !data.isEmpty else { return "Leere Antwort vom Server" }
        let raw = String(data: data, encoding: .utf8) ?? "\(data.count) Bytes"
        let compact = raw
            .replacingOccurrences(of: "\n", with: " ")
            .split(separator: " ")
            .joined(separator: " ")
        return String(compact.prefix(320))
    }

    private static var todayKey: String {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "de_DE")
        formatter.timeZone = TimeZone(identifier: "Europe/Berlin")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: .now)
    }
}

private extension ISO8601DateFormatter {
    static let supabaseWithFraction: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    static let supabase: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter
    }()
}

private extension Availability {
    var supabaseCommitment: String {
        switch self {
        case .fulltime: "full_time"
        case .parttime: "part_time"
        case .weekend: "exploring"
        }
    }
}
