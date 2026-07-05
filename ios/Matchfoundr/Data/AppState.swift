// matchfoundr · App-Zustand
// Ein ObservableObject als Quelle der Wahrheit. Persistenz: UserDefaults
// (Demo-first — Supabase-Sync ist der nächste Ausbauschritt, die Modelle
// sind bereits deckungsgleich mit den Tabellen).

import SwiftUI

@MainActor
final class AppState: ObservableObject {
    static let shared = AppState()

    // ─── Profil / Onboarding ─────────────────────────────────
    @Published var profile: MyProfile? {
        didSet { persistProfile() }
    }
    var isOnboarded: Bool { profile != nil }

    // ─── Navigation ──────────────────────────────────────────
    @Published var tab: AppTab = .today
    @Published var openGuideSlug: String?

    // ─── Swipe-Deck ──────────────────────────────────────────
    @Published var deck: [FounderCard] = []
    @Published var matches: [Match] = []
    @Published var celebrating: FounderCard?

    // ─── Freemium ────────────────────────────────────────────
    @Published var swipesToday: Int = 0
    @Published var isPremium: Bool = false
    @Published var paywall: PaywallReason?
    let freeSwipes = 5
    var swipesLeft: Int { isPremium ? .max : max(0, freeSwipes - swipesToday) }

    enum PaywallReason { case swipes, chat }

    private let defaults = UserDefaults.standard

    private init() {
        loadProfile()
        loadFreemium()
        deck = DemoData.deck
        matches = DemoData.matches
        applyLaunchArguments()
    }

    /// Für Screenshot-Automation und UI-Tests:
    /// --demo-profile setzt ein fertiges Profil, --tab <0-4> wählt den Tab vor.
    private func applyLaunchArguments() {
        let args = ProcessInfo.processInfo.arguments
        if args.contains("--demo-profile") {
            profile = MyProfile(mode: .idea, industryId: "gesundheit",
                                skills: ["Handwerk", "Vertrieb"],
                                name: "Mara", role: "Gründerin",
                                pitch: "Ich eröffne eine Padelhalle in Köln und suche einen Macher.",
                                plz: "50667", availability: .fulltime)
        }
        if let idx = args.firstIndex(of: "--tab"), args.count > idx + 1,
           let raw = Int(args[idx + 1]), let t = AppTab(rawValue: raw) {
            tab = t
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
        if like {
            // Demo: hohe Match-Werte matchen sofort zurück — Celebration!
            if card.matchPercent >= 88 || superLike {
                var matched = card
                matched.isSuper = superLike
                matches.insert(Match(id: card.id, card: matched, messages: [], unread: 0), at: 0)
                celebrating = matched
                Haptics.success()
            } else {
                Haptics.tap()
            }
        }
        return true
    }

    func activateTrial() {
        isPremium = true
        defaults.set(Date().addingTimeInterval(7 * 86400), forKey: "mf.trialUntil")
        paywall = nil
        Haptics.success()
    }

    func send(_ text: String, to matchId: String) {
        guard let idx = matches.firstIndex(where: { $0.id == matchId }) else { return }
        matches[idx].messages.append(ChatMessage(mine: true, text: text, at: .now))
        // Demo-Gegenseite antwortet kurz darauf.
        let reply = DemoData.reply(for: text)
        Task {
            try? await Task.sleep(for: .seconds(1.2))
            if let i = self.matches.firstIndex(where: { $0.id == matchId }) {
                self.matches[i].messages.append(ChatMessage(mine: false, text: reply, at: .now))
            }
        }
    }

    func resetDemo() {
        deck = DemoData.deck
        swipesToday = 0
    }

    // ─── Persistenz ──────────────────────────────────────────

    private func persistProfile() {
        if let profile, let data = try? JSONEncoder().encode(profile) {
            defaults.set(data, forKey: "mf.profile")
        }
    }

    private func loadProfile() {
        if let data = defaults.data(forKey: "mf.profile"),
           let p = try? JSONDecoder().decode(MyProfile.self, from: data) {
            profile = p
        }
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
    }

    private static var dayKey: String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: .now)
    }
}
