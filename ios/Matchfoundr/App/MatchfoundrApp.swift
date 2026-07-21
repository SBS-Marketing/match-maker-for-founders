// matchfoundr für iOS — Dein Partner. Nicht beim Dating — im Business.

import SwiftUI
#if canImport(UIKit)
import UIKit
#endif

@main
struct MatchfoundrApp: App {
    @StateObject private var state = AppState.shared

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(state)
        }
    }
}

struct RootView: View {
    @EnvironmentObject var state: AppState
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        Group {
            if state.authIsLoading {
                AuthLoadingView()
                    .transition(.opacity)
            } else if !state.isAuthenticated {
                AuthView()
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            } else if state.isOnboarded {
                MainTabView()
                    .transition(.opacity)
            } else {
                OnboardingView()
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .task {
            await state.bootstrapAuth()
        }
        .onOpenURL { url in
            Task {
                await state.handleAuthCallback(url)
            }
        }
        .onChange(of: scenePhase) { _, phase in
            guard phase == .active else { return }
            Task {
                await state.refreshCommunityEvents(showLoading: false)
                await state.refreshConnectedAccounts(showLoading: false)
                await state.refreshMorningReport(showLoading: false)
            }
        }
        .animation(.easeOut(duration: 0.3), value: state.authIsLoading)
        .animation(.easeOut(duration: 0.3), value: state.isAuthenticated)
        .animation(.easeOut(duration: 0.3), value: state.isOnboarded)
    }
}

struct AuthLoadingView: View {
    var body: some View {
        ZStack {
            MF.canvas.ignoresSafeArea()
            VStack(spacing: 14) {
                MFLogo(size: 24)
                ProgressView()
                    .tint(MF.ember)
                Text("Session wird geprueft")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(MF.smoke)
            }
        }
    }
}

struct MainTabView: View {
    @EnvironmentObject var state: AppState

    var body: some View {
        TabView(selection: $state.tab) {
            TodayView()
                .tabItem { Label("Heute", systemImage: "sun.max.fill") }
                .tag(AppTab.today)
            DiscoverView()
                .tabItem { Label("Entdecken", systemImage: "magnifyingglass") }
                .tag(AppTab.discover)
            CommunityTabView()
                .tabItem { Label("Community", systemImage: "person.2.fill") }
                .tag(AppTab.community)
            StartupWorkspaceView()
                .tabItem { Label("Business", systemImage: "building.2.fill") }
                .tag(AppTab.startup)
            ProfileView()
                .tabItem { Label("Profil", systemImage: "person.fill") }
                .tag(AppTab.profile)
        }
        .tint(MF.ember)
        .onChange(of: state.tab) { _, tab in
            dismissKeyboard()
            if tab != .today { state.todayPath = [] }
            if tab != .discover { state.discoverPath = [] }
            if tab != .community { state.communityPath = [] }
            if tab == .community || tab == .discover {
                Task {
                    await state.refreshCommunityEvents(showLoading: false)
                }
            }
        }
        .onAppear {
            state.presentAppTourIfNeeded()
        }
        .simultaneousGesture(tabSwipeGesture)
        // Match-Celebration als Overlay über allem.
        .overlay {
            if let card = state.celebrating {
                MatchCelebrationView(card: card)
            }
        }
        .overlay(alignment: .bottomTrailing) {
            if state.copilotFloating {
                FloatingCopilotDock()
                    .padding(.trailing, 16)
                    .padding(.bottom, 92)
                    .transition(.move(edge: .trailing).combined(with: .opacity))
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
        .sheet(isPresented: $state.showingAppTour, onDismiss: {
            state.finishAppTour()
        }) {
            AppTourView()
                .presentationDetents([.large])
                .presentationCornerRadius(26)
        }
        .sheet(isPresented: $state.showingCopilot) {
            CopilotView()
                .presentationDetents([.large])
                .presentationCornerRadius(26)
        }
    }

    private var tabSwipeGesture: some Gesture {
        DragGesture(minimumDistance: 58, coordinateSpace: .local)
            .onEnded { value in
                guard shouldHandleTabSwipe(value) else { return }
                let nextRaw = state.tab.rawValue + (value.translation.width < 0 ? 1 : -1)
                guard let nextTab = AppTab(rawValue: nextRaw) else { return }
                Haptics.select()
                withAnimation(.easeOut(duration: 0.2)) {
                    state.tab = nextTab
                }
            }
    }

    private func shouldHandleTabSwipe(_ value: DragGesture.Value) -> Bool {
        if state.tab == .discover, state.discoverPath.last == .swipe {
            return false
        }

        let horizontal = value.translation.width
        let vertical = value.translation.height
        let predicted = value.predictedEndTranslation.width
        let isIntentional = abs(horizontal) > 74 || abs(predicted) > 150
        let isMostlyHorizontal = abs(horizontal) > abs(vertical) * 1.8
        let canMoveLeft = horizontal < 0 && state.tab != .profile
        let canMoveRight = horizontal > 0 && state.tab != .today

        return isIntentional && isMostlyHorizontal && (canMoveLeft || canMoveRight)
    }
}

private struct FloatingCopilotDock: View {
    @EnvironmentObject private var state: AppState

    var body: some View {
        HStack(spacing: 6) {
            Button {
                Haptics.tap()
                state.openCopilot()
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "sparkles")
                        .font(.system(size: 13, weight: .bold))
                    Text("Co-Pilot")
                        .font(.system(size: 13, weight: .heavy))
                        .lineLimit(1)
                }
                .foregroundStyle(.white)
                .padding(.leading, 13)
                .padding(.trailing, 12)
                .frame(height: 44)
                .background(MF.indigoGrad)
                .clipShape(Capsule())
            }
            .buttonStyle(.plain)

            Button {
                Haptics.tap()
                state.closeCopilotFloating()
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 11, weight: .heavy))
                    .foregroundStyle(MF.indigoInk)
                    .frame(width: 36, height: 36)
                    .background(MF.surface)
                    .clipShape(Circle())
                    .overlay(Circle().stroke(MF.border, lineWidth: 1))
            }
            .buttonStyle(.plain)
        }
        .padding(5)
        .background(.ultraThinMaterial)
        .clipShape(Capsule())
        .overlay(Capsule().stroke(MF.border, lineWidth: 1))
        .warmShadow(large: true)
    }
}

struct CommunityTabView: View {
    @EnvironmentObject var state: AppState

    var body: some View {
        NavigationStack(path: $state.communityPath) {
            VStack(spacing: 0) {
                MShellTop(title: "Community", subtitle: "Gründerkreis & Live-Agenda") {
                    Button {
                        Haptics.tap()
                        state.open(.screen(.calendar))
                    } label: {
                        Image(systemName: "calendar.badge.plus")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(MF.ink)
                            .frame(width: 38, height: 38)
                            .background(MF.surface)
                            .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
                            .overlay(RoundedRectangle(cornerRadius: 13).stroke(MF.border, lineWidth: 1))
                    }
                    .buttonStyle(.plain)
                }

                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        communityPulse
                        MSectionHead(text: "Live-Events", action: "Kalender") {
                            state.open(.screen(.calendar))
                        }
                        VStack(spacing: 12) {
                            if state.events.isEmpty {
                                emptyCommunityEvents
                            } else {
                                ForEach(state.events) { event in
                                Button {
                                    Haptics.tap()
                                    state.communityPath.append(.event(event.id))
                                } label: {
                                    EventCard(event: event, registered: state.registeredEvents.contains(event.id))
                                }
                                .buttonStyle(.plain)
                            }
                            }
                        }
                    }
                    .padding(20)
                    .padding(.bottom, 90)
                }
                .scrollIndicators(.hidden)
                .refreshable {
                    await state.refreshCommunityEvents()
                }
            }
            .background(MF.canvas.ignoresSafeArea())
            .navigationDestination(for: DiscoverRoute.self) { route in
                switch route {
                case .cofounderDesk: CofounderTrialOSView()
                case .swipe: SwipeDeckView()
                case .guides: GuidesListView()
                case .guide(let guide): GuideDetailView(guide: guide)
                case .event(let id): EventDetailView(eventId: id)
                case .company: CompanyProfileView()
                case .documents: DocumentsView()
                case .calendar: PlannerView()
                case .startup: StartupWorkspaceView()
                case .deals: DealsIndexView()
                case .deal(let id): DealDetailView(dealId: id)
                case .partners(let serviceId): PartnerIndexView(serviceId: serviceId)
                case .partner(let partnerId): PartnerDetailView(partnerId: partnerId)
                }
            }
            .toolbar(.hidden, for: .navigationBar)
        }
        .tint(MF.emberDeep)
        .task {
            await state.refreshCommunityEvents(showLoading: false)
        }
    }

    private var emptyCommunityEvents: some View {
        VStack(spacing: 9) {
            Image(systemName: "calendar")
                .font(.system(size: 24, weight: .semibold))
                .foregroundStyle(MF.faint)
            Text("Noch keine Live-Events")
                .font(.system(size: 15, weight: .bold))
                .foregroundStyle(MF.ink)
            Text("Sobald Events aus Supabase freigeschaltet sind, erscheinen sie hier.")
                .font(.system(size: 13))
                .foregroundStyle(MF.smoke)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(20)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 17, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 17).stroke(MF.border, lineWidth: 1))
        .warmShadow()
    }

    @ViewBuilder
    private var communityPulse: some View {
        let liveCount = state.deck.count + state.matches.count
        HStack(alignment: .center, spacing: 14) {
            ZStack {
                ForEach(Array(state.deck.prefix(3).enumerated()), id: \.element.id) { index, card in
                    MFAvatar(name: card.name, service: "cofounder", size: 42)
                        .offset(x: CGFloat(index) * 24)
                }
            }
            .frame(width: 92, height: 46, alignment: .leading)

            VStack(alignment: .leading, spacing: 4) {
                Text(liveCount == 0 ? "Live-Community bereit" : "\(liveCount) Live-Profile verfügbar")
                    .font(.system(size: 18, weight: .heavy))
                    .foregroundStyle(MF.ink)
                    .fixedSize(horizontal: false, vertical: true)
                Text("\(state.registeredEvents.count) RSVPs · \(state.matches.count) aktive Matches")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(MF.smoke)
            }

            Spacer(minLength: 0)
        }
        .padding(16)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(MF.border, lineWidth: 1))
        .warmShadow()
    }
}

struct ChatsTabView: View {
    @EnvironmentObject var state: AppState

    var body: some View {
        NavigationStack(path: $state.todayPath) {
            ChatsListView()
                .navigationDestination(for: TodayRoute.self) { route in
                    switch route {
                    case .chat(let id):
                        ChatDetailView(matchId: id)
                    case .chats:
                        ChatsListView()
                    case .calendar:
                        PlannerView()
                    case .kanban:
                        KanbanView()
                    case .startup:
                        StartupWorkspaceView()
                    case .radar:
                        FounderRadarView()
                    }
                }
        }
    }
}

private func dismissKeyboard() {
    #if canImport(UIKit)
    UIApplication.shared.sendAction(
        #selector(UIResponder.resignFirstResponder),
        to: nil,
        from: nil,
        for: nil
    )
    #endif
}
