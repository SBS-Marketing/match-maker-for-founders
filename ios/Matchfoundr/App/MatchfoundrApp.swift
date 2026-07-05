// matchfoundr für iOS — Dein Partner. Nicht beim Dating — im Business.

import SwiftUI

@main
struct MatchfoundrApp: App {
    @StateObject private var state = AppState.shared

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(state)
                .preferredColorScheme(.light)
        }
    }
}

struct RootView: View {
    @EnvironmentObject var state: AppState

    var body: some View {
        Group {
            if state.isOnboarded {
                MainTabView()
                    .transition(.opacity)
            } else {
                OnboardingView()
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .animation(.easeOut(duration: 0.3), value: state.isOnboarded)
    }
}

struct MainTabView: View {
    @EnvironmentObject var state: AppState

    var body: some View {
        TabView(selection: $state.tab) {
            TodayView()
                .tabItem { Label("Heute", systemImage: "sun.max.fill") }
                .tag(AppTab.today)
            SwipeDeckView()
                .tabItem { Label("Swipe", systemImage: "rectangle.stack.fill") }
                .tag(AppTab.swipe)
            ChatsView()
                .tabItem { Label("Chats", systemImage: "bubble.left.and.bubble.right.fill") }
                .tag(AppTab.chats)
            GuidesView()
                .tabItem { Label("Guides", systemImage: "book.fill") }
                .tag(AppTab.guides)
            CopilotView()
                .tabItem { Label("Pilot", systemImage: "sparkles") }
                .tag(AppTab.pilot)
        }
        .tint(MF.ember)
        // Match-Celebration als Overlay über allem.
        .overlay {
            if let card = state.celebrating {
                MatchCelebrationView(card: card)
            }
        }
        // Premium-Paywall — nach Feature-Nutzung, nie im Onboarding.
        .sheet(isPresented: Binding(
            get: { state.paywall != nil },
            set: { if !$0 { state.paywall = nil } }
        )) {
            PremiumSheetView(reason: state.paywall ?? .swipes)
                .presentationDetents([.medium, .large])
                .presentationCornerRadius(26)
        }
    }
}
