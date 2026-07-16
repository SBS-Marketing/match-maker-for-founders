// matchfoundr · Supabase Auth
// Ein nativer Supabase-Client als gemeinsame Quelle fuer Auth und Functions.

import Foundation
import Supabase

struct BackendAuthSnapshot: Equatable {
    let userID: String
    let email: String?

    var displayName: String {
        email?.split(separator: "@").first.map(String.init) ?? "Founder"
    }
}

enum Backend {
    static let redirectURL = URL(string: "matchfoundr://auth-callback")!

    static let client = SupabaseClient(
        supabaseURL: SupabaseConfig.projectURL,
        supabaseKey: SupabaseConfig.anonKey
    )

    static func currentUserSnapshot() async -> BackendAuthSnapshot? {
        guard let session = try? await client.auth.session else { return nil }
        return snapshot(from: session)
    }

    static func accessToken() async -> String? {
        guard let session = try? await client.auth.session else { return nil }
        return session.accessToken
    }

    static func signIn(email: String, password: String) async throws {
        try await client.auth.signIn(email: email, password: password)
    }

    static func signUp(email: String, password: String) async throws {
        try await client.auth.signUp(email: email, password: password, redirectTo: redirectURL)
    }

    static func sendMagicLink(email: String) async throws {
        try await client.auth.signInWithOTP(email: email, redirectTo: redirectURL)
    }

    static func oauthURL(provider: OAuthProvider) -> URL {
        var components = URLComponents(
            url: SupabaseConfig.projectURL.appending(path: "auth/v1/authorize"),
            resolvingAgainstBaseURL: false
        )!
        var items = [
            URLQueryItem(name: "provider", value: provider.rawValue),
            URLQueryItem(name: "redirect_to", value: redirectURL.absoluteString)
        ]
        if provider == .google {
            items.append(URLQueryItem(name: "access_type", value: "offline"))
            items.append(URLQueryItem(name: "prompt", value: "consent"))
        }
        components.queryItems = items
        return components.url!
    }

    static func handleAuthCallback(_ url: URL) async throws {
        _ = try await client.auth.session(from: url)
    }

    static func signOut() async throws {
        try await client.auth.signOut()
    }

    static func snapshot(from session: Session?) -> BackendAuthSnapshot? {
        guard let session else { return nil }
        return BackendAuthSnapshot(
            userID: String(describing: session.user.id),
            email: session.user.email
        )
    }
}

enum OAuthProvider: String, CaseIterable, Identifiable {
    case google
    case apple

    static let nativeEnabledProviders: [OAuthProvider] = [.google]

    var id: String { rawValue }

    var label: String {
        switch self {
        case .google: "Google"
        case .apple: "Apple"
        }
    }

    var icon: String {
        switch self {
        case .google: "g.circle.fill"
        case .apple: "apple.logo"
        }
    }
}
