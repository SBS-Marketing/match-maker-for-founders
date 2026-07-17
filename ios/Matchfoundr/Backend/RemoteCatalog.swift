// RemoteCatalog — Zugriff auf die wöchentlich gescannten Datenquellen:
// Deals (Vergünstigungen), Grants (Förderungen/Finanzierung) und Partner
// (Ansprechpartner inkl. Kreditgeber wie KfW & Hausbank Finance Desk).
//
// Quelle: public/*.json im Repo, gepflegt vom GitHub-Action-Job
// weekly-deals.yml (Di 07:00 UTC + manuell). Gecacht in UserDefaults,
// damit die App auch offline etwas zeigt.

import Foundation

enum RemoteAssetURL {
    private static let publicBase = "https://raw.githubusercontent.com/SBS-Marketing/match-maker-for-founders/main/public"

    static func resolve(_ raw: String?) -> URL? {
        guard let raw else { return nil }
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }
        if trimmed.hasPrefix("http://") || trimmed.hasPrefix("https://") {
            return URL(string: trimmed)
        }
        if trimmed.hasPrefix("/") {
            return URL(string: "\(publicBase)\(trimmed)")
        }
        return URL(string: "\(publicBase)/\(trimmed)")
    }
}

// MARK: - Modelle (Spiegel der JSON-Schemata aus scripts/build_*_json.py)

struct CatalogDeal: Codable, Identifiable, Hashable {
    let id: String
    let company: String
    let product: String
    let cat: String
    let logo: String?
    let logoUrl: String?
    let bannerUrl: String?
    let catIcon: String?
    let catLabel: String?
    let value: String?
    let badge: String?
    let desc: String?
    let eligibility: String?
    let duration: String?
    let url: String?
    let claimUrl: String?
    let tags: [String]?
    let tier: String?
    let active: Bool?

    enum CodingKeys: String, CodingKey {
        case id, company, product, cat, logo, value, badge, desc, eligibility, duration, url, tags, tier, active
        case logoUrl = "logo_url"
        case bannerUrl = "banner_url"
        case catIcon = "cat_icon"
        case catLabel = "cat_label"
        case claimUrl = "claim_url"
    }
}

struct CatalogGrant: Codable, Identifiable, Hashable {
    var id: String { slug }
    let slug: String
    let name: String
    let category: String?
    let amount: String?
    let region: String?
    let stage: String?
    let deadline: String?
    let duration: String?
    let summary: String?
    let eligibility: [String]?
    let materials: [String]?
    let timeline: String?
    let applyUrl: String?
    let sourceUrl: String?
    let fit: Int?
    let logoUrl: String?
    let bannerUrl: String?
}

struct CatalogPartner: Codable, Identifiable, Hashable {
    var id: String { slug }
    let slug: String
    let name: String
    let firm: String?
    let service: String?
    let city: String?
    let blurb: String?
    let specialties: [String]?
    let packages: [String]?
    let why: String?
    let vouches: Int?
    let bookingUrl: String?
    let sourceUrl: String?
    let fit: Int?
}

// MARK: - Loader

@MainActor
final class RemoteCatalog: ObservableObject {
    static let shared = RemoteCatalog()

    @Published private(set) var deals: [CatalogDeal] = []
    @Published private(set) var grants: [CatalogGrant] = []
    @Published private(set) var partners: [CatalogPartner] = []
    @Published private(set) var lastUpdated: Date?
    @Published private(set) var isRefreshing = false
    @Published private(set) var lastError: String?

    // Rohdaten liegen im Repo — raw.githubusercontent liefert immer den Stand von main.
    private static let base = "https://raw.githubusercontent.com/SBS-Marketing/match-maker-for-founders/main/public"
    private let cacheKey = "mf.remote_catalog.v2"

    private struct DealsFile: Codable { let deals: [CatalogDeal] }
    private struct GrantsFile: Codable { let grants: [CatalogGrant] }
    private struct PartnersFile: Codable { let partners: [CatalogPartner] }

    private struct Cache: Codable {
        let deals: [CatalogDeal]
        let grants: [CatalogGrant]
        let partners: [CatalogPartner]
        let fetchedAt: Date
    }

    private init() {
        loadFromCache()
    }

    /// Lädt alle drei Kataloge. Fehler einzelner Dateien lassen die anderen unberührt.
    func refresh() async {
        guard !isRefreshing else { return }
        isRefreshing = true
        defer { isRefreshing = false }

        async let dealsFile: DealsFile? = fetch("deals.json")
        async let grantsFile: GrantsFile? = fetch("grants.json")
        async let partnersFile: PartnersFile? = fetch("partners.json")

        let (d, g, p) = await (dealsFile, grantsFile, partnersFile)
        if let d { deals = d.deals.filter { $0.active ?? true } }
        if let g { grants = g.grants }
        if let p { partners = p.partners }
        if d != nil || g != nil || p != nil {
            lastError = nil
            lastUpdated = .now
            saveToCache()
        } else if deals.isEmpty && grants.isEmpty && partners.isEmpty {
            lastError = "Datenquellen nicht erreichbar"
        }
    }

    private func fetch<T: Decodable>(_ file: String) async -> T? {
        guard let url = URL(string: "\(Self.base)/\(file)") else { return nil }
        var request = URLRequest(url: url)
        request.cachePolicy = .reloadRevalidatingCacheData
        request.timeoutInterval = 12
        guard let (data, response) = try? await URLSession.shared.data(for: request),
              (response as? HTTPURLResponse)?.statusCode == 200 else { return nil }
        return try? JSONDecoder().decode(T.self, from: data)
    }

    private func loadFromCache() {
        guard let data = UserDefaults.standard.data(forKey: cacheKey),
              let cache = try? JSONDecoder().decode(Cache.self, from: data) else { return }
        deals = cache.deals
        grants = cache.grants
        partners = cache.partners
        lastUpdated = cache.fetchedAt
    }

    private func saveToCache() {
        let cache = Cache(deals: deals, grants: grants, partners: partners, fetchedAt: .now)
        if let data = try? JSONEncoder().encode(cache) {
            UserDefaults.standard.set(data, forKey: cacheKey)
        }
    }
}
