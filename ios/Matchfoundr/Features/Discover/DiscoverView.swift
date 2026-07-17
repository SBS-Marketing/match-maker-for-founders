// Entdecken — Hub nach Design-Spec (MEntdecken): Suche, 8 Service-Kacheln
// in Vibrant-Tints, plus Community-Events (öffnen → Detail → anmelden)
// und Guides-Einstieg.

import SwiftUI

enum DiscoverRoute: Hashable {
    case cofounderDesk
    case swipe
    case guides
    case guide(Guide)
    case event(String)   // Event-ID
    case company
    case documents
    case calendar
    case startup
    case deals
    case deal(String)
    case partners(String)
    case partner(String)
}

struct DiscoverView: View {
    @EnvironmentObject var state: AppState
    @ObservedObject private var catalog = RemoteCatalog.shared
    @State private var query = ""

    var body: some View {
        NavigationStack(path: $state.discoverPath) {
            VStack(spacing: 0) {
                MShellTop(title: "Entdecken", subtitle: "Alles, was du zum Gründen brauchst") {
                    MFAvatar(name: state.profile?.name ?? "F", size: 38)
                }
                ScrollView {
                    VStack(alignment: .leading, spacing: 14) {
                        searchField
                        serviceGrid
                        MSectionHead(text: "Deals & Credits", action: "Alle") {
                            state.discoverPath.append(.deals)
                        }
                        dealHighlights
                        MSectionHead(text: "Partner-Picks", action: "Alle") {
                            state.discoverPath.append(.partners("all"))
                        }
                        partnerPicks
                        MSectionHead(text: "Dein Workspace")
                        workspaceCards
                        MSectionHead(text: "Community · Events", action: "Alle") {
                            state.tab = .community
                            state.communityPath = []
                        }
                        eventsRow
                        MSectionHead(text: "Guides", action: "Alle") { state.discoverPath.append(.guides) }
                        guideTeasers
                    }
                    .padding(20)
                    .padding(.bottom, 90)
                }
                .scrollIndicators(.hidden)
            }
            .background(MF.canvas.ignoresSafeArea())
            .navigationDestination(for: DiscoverRoute.self) { route in
                switch route {
                case .cofounderDesk: CofounderTrialOSView()
                case .swipe: SwipeDeckView()
                case .guides: GuidesListView()
                case .guide(let g): GuideDetailView(guide: g)
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
            switch state.partnerLoadState {
            case .idle, .failed:
                await state.refreshPartnerOffers()
            case .loaded where state.partners.isEmpty:
                await state.refreshPartnerOffers()
            default:
                break
            }
            switch state.eventLoadState {
            case .idle, .failed:
                await state.refreshCommunityEvents()
            case .loaded where state.events.isEmpty:
                await state.refreshCommunityEvents()
            default:
                break
            }
            if catalog.deals.isEmpty {
                await catalog.refresh()
            }
        }
        .refreshable {
            await state.refreshPartnerOffers()
            await state.refreshCommunityEvents()
            await catalog.refresh()
        }
    }

    // ─── Suche (Design: weißes Feld, Radius 14) ──────────────
    private var searchField: some View {
        HStack(spacing: 10) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(MF.faint)
            TextField("Wonach suchst du gerade?", text: $query)
                .font(.system(size: 14.5))
        }
        .padding(.horizontal, 15)
        .frame(height: 48)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(MF.border, lineWidth: 1))
        .warmShadow()
    }

    // ─── 8 Service-Kacheln (Design: 2 Spalten, minHeight 132) ─
    private var serviceGrid: some View {
        LazyVGrid(columns: [.init(.flexible(), spacing: 12), .init(.flexible())], spacing: 12) {
            ForEach(serviceCatalog) { svc in
                Button {
                    Haptics.tap()
                    switch svc.id {
                    case "cofounder": state.discoverPath.append(.cofounderDesk)
                    case "legal": state.discoverPath.append(.partners("legal"))
                    case "funding": state.discoverPath.append(.documents)
                    default: state.discoverPath.append(.partners(svc.id))
                    }
                } label: {
                    ServiceTile(service: svc)
                }
                .buttonStyle(.plain)
            }
        }
    }

    private var visiblePartnerPicks: [PartnerOffer] {
        let term = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let base = state.partners
        let filtered = term.isEmpty ? base : base.filter { partner in
            [
                partner.name,
                partner.firm,
                partner.city,
                partner.blurb,
                partner.serviceLabel,
            ]
            .joined(separator: " ")
            .lowercased()
            .contains(term)
        }
        let growth = filtered.filter { $0.serviceId == "growth" }.sorted { $0.fit > $1.fit }
        let rest = filtered.filter { $0.serviceId != "growth" }.sorted { $0.fit > $1.fit }
        return Array((growth + rest).prefix(term.isEmpty ? 4 : 8))
    }

    private var partnerPicks: some View {
        VStack(spacing: 10) {
            switch state.partnerLoadState {
            case .loading:
                livePartnerStatusCard(icon: "arrow.triangle.2.circlepath", title: "Live-Partner laden", text: "Ich hole Growth, Kapital, Talent und Steuer gerade aus Supabase.", loading: true)
            case .failed(let message):
                livePartnerStatusCard(icon: "exclamationmark.triangle.fill", title: "Live-Partner fehlgeschlagen", text: "\(message) · Versuch es erneut.", loading: false)
            default:
                if visiblePartnerPicks.isEmpty {
                    livePartnerStatusCard(icon: "tray", title: "Keine Live-Partner", text: "In Supabase sind aktuell keine aktiven Partnerangebote freigegeben.", loading: false)
                } else {
                    ForEach(visiblePartnerPicks) { partner in
                        Button {
                            Haptics.tap()
                            state.discoverPath.append(.partner(partner.id))
                        } label: {
                            PartnerPreviewCard(partner: partner)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }

    private func livePartnerStatusCard(icon: String, title: String, text: String, loading: Bool) -> some View {
        HStack(spacing: 12) {
            if loading {
                ProgressView()
                    .controlSize(.small)
                    .tint(MF.indigo)
                    .frame(width: 40, height: 40)
                    .background(MF.indigoTint)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            } else {
                Image(systemName: icon)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(MF.indigoInk)
                    .frame(width: 40, height: 40)
                    .background(MF.indigoTint)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                    .font(.system(size: 14.5, weight: .bold))
                    .foregroundStyle(MF.ink)
                Text(text)
                    .font(.system(size: 12.5))
                    .foregroundStyle(MF.smoke)
                    .lineLimit(2)
            }
            Spacer()
            if !loading {
                Button {
                    Haptics.tap()
                    Task { await state.refreshPartnerOffers() }
                } label: {
                    Image(systemName: "arrow.clockwise")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(MF.indigoInk)
                        .frame(width: 34, height: 34)
                        .background(MF.surfaceSoft)
                        .clipShape(RoundedRectangle(cornerRadius: 11, style: .continuous))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(14)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(MF.border, lineWidth: 1))
        .warmShadow()
    }

    private var visibleDealHighlights: [CatalogDeal] {
        let term = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let base = catalog.deals.filter { $0.active ?? true }
        let filtered = term.isEmpty ? base : base.filter { $0.searchBlob.contains(term) }
        return Array(filtered.sorted(by: dealPrioritySort).prefix(term.isEmpty ? 4 : 8))
    }

    private var dealHighlights: some View {
        VStack(spacing: 10) {
            if visibleDealHighlights.isEmpty {
                livePartnerStatusCard(
                    icon: catalog.isRefreshing ? "arrow.triangle.2.circlepath" : "giftcard.fill",
                    title: catalog.isRefreshing ? "Deals laden" : "Keine Deals gefunden",
                    text: catalog.lastError ?? "Cloud-Credits, SaaS-Rabatte und Legal-Angebote werden aus dem Web-Katalog geladen.",
                    loading: catalog.isRefreshing
                )
            } else {
                ForEach(visibleDealHighlights) { deal in
                    Button {
                        Haptics.tap()
                        state.discoverPath.append(.deal(deal.id))
                    } label: {
                        DealPreviewCard(deal: deal, compact: true)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private var workspaceCards: some View {
        VStack(spacing: 10) {
            workspaceCard(
                icon: "building.2.crop.circle",
                title: "Business Workspace",
                text: "\(state.startupTeamMembers.count) Rollen · Plan, Unterlagen, Kalender",
                accent: MF.indigo,
                tint: MF.indigoTint
            ) {
                state.discoverPath.append(.startup)
            }
            workspaceCard(
                icon: "building.2.fill",
                title: "Firmenprofil",
                text: state.companyProfile.isPublished ? "Öffentlich · /s/\(state.companyProfile.publishedSlug ?? "preview")" : "Builder, Vorschau, Profil-Link",
                accent: MF.ember,
                tint: MF.emberTint
            ) {
                state.discoverPath.append(.company)
            }
            workspaceCard(
                icon: "folder.fill",
                title: "Unterlagen",
                text: "\(state.documents.filter { $0.done }.count)/\(state.documents.count) fertig · Co-Pilot Entwurf",
                accent: MF.indigo,
                tint: MF.indigoTint
            ) {
                state.discoverPath.append(.documents)
            }
            workspaceCard(
                icon: "calendar",
                title: "Kalender",
                text: "\(state.plannerItems.filter { !$0.done }.count) offene Schritte · Termine & Co-Pilot-Plan",
                accent: MF.indigo,
                tint: MF.indigoTint
            ) {
                state.discoverPath.append(.calendar)
            }
        }
    }

    private func workspaceCard(icon: String, title: String, text: String, accent: Color, tint: Color, action: @escaping () -> Void) -> some View {
        Button {
            Haptics.tap()
            action()
        } label: {
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(accent)
                    .frame(width: 40, height: 40)
                    .background(tint)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                VStack(alignment: .leading, spacing: 3) {
                    Text(title)
                        .font(.system(size: 14.5, weight: .bold))
                        .foregroundStyle(MF.ink)
                    Text(text)
                        .font(.system(size: 12.5))
                        .foregroundStyle(MF.smoke)
                        .lineLimit(1)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(MF.faint)
            }
            .padding(14)
            .background(MF.surface)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(MF.border, lineWidth: 1))
            .warmShadow()
        }
        .buttonStyle(.plain)
    }

    // ─── Events (User-Wunsch: öffnen + anmelden) ─────────────
    private var eventsRow: some View {
        VStack(spacing: 10) {
            if !state.events.isEmpty {
                ForEach(state.events) { event in
                    Button {
                        Haptics.tap()
                        state.discoverPath.append(.event(event.id))
                    } label: {
                        EventCard(event: event, registered: state.registeredEvents.contains(event.id))
                    }
                    .buttonStyle(.plain)
                }
            } else if state.eventLoadState == .loading {
                livePartnerStatusCard(icon: "arrow.triangle.2.circlepath", title: "Live-Events laden", text: "Ich hole Event-Banner, Termine und Plätze aus Supabase.", loading: true)
            } else if case .failed(let message) = state.eventLoadState {
                livePartnerStatusCard(icon: "exclamationmark.triangle.fill", title: "Live-Events fehlgeschlagen", text: "\(message) · Versuch es erneut.", loading: false)
            } else if state.events.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "calendar")
                        .font(.system(size: 22, weight: .semibold))
                        .foregroundStyle(MF.faint)
                    Text("Noch keine Live-Events")
                        .font(.system(size: 14.5, weight: .bold))
                        .foregroundStyle(MF.ink)
                    Text("Events werden nicht mehr lokal gefaked.")
                        .font(.system(size: 12.5))
                        .foregroundStyle(MF.smoke)
                }
                .frame(maxWidth: .infinity)
                .padding(18)
                .background(MF.surface)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 16).stroke(MF.border, lineWidth: 1))
            }
        }
    }

    private var guideTeasers: some View {
        VStack(spacing: 10) {
            ForEach(allGuides.prefix(2)) { guide in
                Button {
                    Haptics.tap()
                    state.discoverPath.append(.guide(guide))
                } label: {
                    HStack(spacing: 12) {
                        Image(systemName: "book.fill")
                            .font(.system(size: 15))
                            .foregroundStyle(MF.emberDeep)
                            .frame(width: 38, height: 38)
                            .background(MF.emberTint)
                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                        VStack(alignment: .leading, spacing: 2) {
                            Text(guide.title)
                                .font(.system(size: 14, weight: .bold))
                                .foregroundStyle(MF.ink)
                                .lineLimit(1)
                            Text("\(guide.category.label) · \(guide.minutes) Min")
                                .font(.system(size: 12)).foregroundStyle(MF.smoke)
                        }
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(MF.faint)
                    }
                    .padding(13)
                    .background(MF.surface)
                    .clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 15).stroke(MF.border, lineWidth: 1))
                    .warmShadow()
                }
                .buttonStyle(.plain)
            }
        }
    }
}

// ─── Co-Founder Trial OS ─────────────────────────────────────

struct CofounderTrialOSView: View {
    @EnvironmentObject var state: AppState

    private var candidates: [CofounderCandidate] {
        state.cofounderCandidates()
    }

    private var topCandidate: CofounderCandidate? {
        candidates.first
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                hero
                gapCard
                processStrip
                if let topCandidate {
                    scorecard(topCandidate)
                }
                MSectionHead(text: "Smart Shortlist", action: "Swipe öffnen") {
                    state.discoverPath.append(.swipe)
                }
                shortlist
            }
            .padding(20)
            .padding(.bottom, 90)
        }
        .scrollIndicators(.hidden)
        .background(MF.canvas.ignoresSafeArea())
        .navigationTitle("Partner")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var hero: some View {
        let hue = MF.services["cofounder"]!
        return VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 10) {
                Image(systemName: "person.2.fill")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 42, height: 42)
                    .background(MF.emberGrad)
                    .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
                VStack(alignment: .leading, spacing: 2) {
                    Eyebrow(text: "Partner-Check", color: hue.ink)
                    Text("Nicht swipen und hoffen. Kurz prüfen, sprechen, entscheiden.")
                        .font(.system(size: 12.5, weight: .semibold))
                        .foregroundStyle(MF.smoke)
                }
                Spacer()
            }

            Text("Partner-Check")
                .font(.system(size: 28, weight: .heavy))
                .foregroundStyle(MF.ink)
            Text("Finde heraus, wer praktisch helfen kann: Partner, Dienstleister, erster Kunde oder Mitstreiter. Die App macht aus Kontakten eine einfache Checkliste und ein Gespräch.")
                .font(.system(size: 14.5))
                .foregroundStyle(MF.smoke)
                .lineSpacing(3)

            HStack(spacing: 9) {
                metric("Shortlist", "\(candidates.count)")
                metric("Top Fit", topCandidate.map { "\($0.total)" } ?? "-")
                metric("Trials", "\(state.plannerItems.filter { $0.title.contains("Trial Sprint") }.count)")
            }
        }
        .padding(17)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 20).stroke(MF.border, lineWidth: 1))
        .warmShadow(large: true)
    }

    private var gapCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 10) {
                Image(systemName: "scope")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(MF.indigoInk)
                    .frame(width: 38, height: 38)
                    .background(MF.indigoTint)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                VStack(alignment: .leading, spacing: 2) {
                    Text("Was fehlt gerade?")
                        .font(.system(size: 13.5, weight: .bold))
                        .foregroundStyle(MF.smoke)
                    Text(state.cofounderGapTitle())
                        .font(.system(size: 17, weight: .heavy))
                        .foregroundStyle(MF.ink)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            Text(state.cofounderGapSummary())
                .font(.system(size: 13.5))
                .foregroundStyle(MF.inkSoft)
                .lineSpacing(3)
            FlowLayout(spacing: 7) {
                scoreChip("Muss: Zeit")
                scoreChip("Muss: Ergänzung")
                scoreChip("Red Flag: nur Idee")
                scoreChip("Beweis: Trial Sprint")
            }
        }
        .padding(15)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 17, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 17).stroke(MF.border, lineWidth: 1))
        .warmShadow()
    }

    private var processStrip: some View {
        HStack(spacing: 8) {
            processStep("1", "Gap", "Lücke")
            processStep("2", "Shortlist", "prüfen")
            processStep("3", "Call", "fragen")
            processStep("4", "Trial", "beweisen")
        }
    }

    private func scorecard(_ candidate: CofounderCandidate) -> some View {
        VStack(alignment: .leading, spacing: 13) {
            MSectionHead(text: "Top-Kandidat · Scorecard")
            VStack(alignment: .leading, spacing: 13) {
                HStack(alignment: .top, spacing: 12) {
                    MFAvatar(name: candidate.card.name, service: "cofounder", size: 46)
                    VStack(alignment: .leading, spacing: 3) {
                        Text(candidate.card.name)
                            .font(.system(size: 16, weight: .heavy))
                            .foregroundStyle(MF.ink)
                        Text("\(candidate.card.role) · \(candidate.card.city)")
                            .font(.system(size: 12.5))
                            .foregroundStyle(MF.smoke)
                    }
                    Spacer()
                    PartnerFitBadge(value: candidate.total, tint: MF.emberTint, ink: MF.emberDeep)
                }
                ForEach(candidate.signals) { signal in
                    signalBar(signal)
                }
                VStack(alignment: .leading, spacing: 7) {
                    Text("Trial-Hypothese")
                        .font(.system(size: 12.5, weight: .bold))
                        .foregroundStyle(MF.smoke)
                    Text(candidate.testSprint)
                        .font(.system(size: 13.5, weight: .semibold))
                        .foregroundStyle(MF.inkSoft)
                        .lineSpacing(3)
                }
                .padding(13)
                .background(MF.surfaceSoft)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            }
            .padding(15)
            .background(MF.surface)
            .clipShape(RoundedRectangle(cornerRadius: 17, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 17).stroke(MF.border, lineWidth: 1))
            .warmShadow()
        }
    }

    private var shortlist: some View {
        VStack(spacing: 10) {
            if candidates.isEmpty {
                VStack(spacing: 10) {
                    Image(systemName: "person.2.slash")
                        .font(.system(size: 26, weight: .semibold))
                        .foregroundStyle(MF.faint)
                    Text("Noch keine Kandidaten")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(MF.ink)
                    Text("Öffne Swipe, damit die App aus Profilen eine belastbare Shortlist bauen kann.")
                        .font(.system(size: 13))
                        .foregroundStyle(MF.smoke)
                        .multilineTextAlignment(.center)
                    MFGhostButton(title: "Swipe öffnen", icon: "person.2.fill") {
                        state.discoverPath.append(.swipe)
                    }
                    .frame(width: 210)
                }
                .frame(maxWidth: .infinity)
                .padding(24)
                .background(MF.surface)
                .clipShape(RoundedRectangle(cornerRadius: 17, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 17).stroke(MF.border, lineWidth: 1))
            } else {
                ForEach(candidates.prefix(5)) { candidate in
                    candidateRow(candidate)
                }
            }
        }
    }

    private func candidateRow(_ candidate: CofounderCandidate) -> some View {
        let hue = candidate.sourceMatchID == nil ? MF.services["cofounder"]! : MF.services["talent"]!
        return VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top, spacing: 11) {
                MFAvatar(name: candidate.card.name, service: candidate.sourceMatchID == nil ? "cofounder" : "talent", size: 42)
                VStack(alignment: .leading, spacing: 3) {
                    Text(candidate.card.name)
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(MF.ink)
                    Text("\(candidate.card.role) · \(candidate.card.availability.label)")
                        .font(.system(size: 12.5))
                        .foregroundStyle(MF.smoke)
                        .lineLimit(1)
                }
                Spacer()
                VStack(spacing: 1) {
                    Text("\(candidate.total)")
                        .font(.system(size: 18, weight: .heavy))
                        .foregroundStyle(hue.ink)
                    Text(candidate.sourceMatchID == nil ? "prüfen" : "Match")
                        .font(.system(size: 9.5, weight: .bold))
                        .foregroundStyle(hue.ink.opacity(0.7))
                }
                .frame(width: 54, height: 44)
                .background(hue.tint)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            }

            Text(candidate.testSprint)
                .font(.system(size: 13))
                .foregroundStyle(MF.inkSoft)
                .lineSpacing(3)
                .lineLimit(3)

            FlowLayout(spacing: 6) {
                ForEach(candidate.risks.prefix(3), id: \.self) { risk in
                    Text(risk)
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(MF.smoke)
                        .padding(.horizontal, 9)
                        .frame(height: 26)
                        .background(MF.surfaceSoft)
                        .clipShape(Capsule())
                }
            }

            HStack(spacing: 8) {
                Button {
                    Haptics.success()
                    state.startCofounderTrial(with: candidate)
                } label: {
                    Label("Trial starten", systemImage: "checklist.checked")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 42)
                        .background(MF.emberGrad)
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                .buttonStyle(.plain)

                Button {
                    Haptics.tap()
                    if let matchID = candidate.sourceMatchID {
                        state.tab = .today
                        state.todayPath = [.chat(matchID)]
                    } else {
                        state.discoverPath.append(.swipe)
                    }
                } label: {
                    Image(systemName: candidate.sourceMatchID == nil ? "person.2.fill" : "bubble.left.and.bubble.right.fill")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(MF.emberDeep)
                        .frame(width: 42, height: 42)
                        .background(MF.emberTint)
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(14)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 17, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 17).stroke(MF.border, lineWidth: 1))
        .warmShadow()
    }

    private func metric(_ label: String, _ value: String) -> some View {
        VStack(spacing: 2) {
            Text(value)
                .font(.system(size: 15, weight: .heavy))
                .foregroundStyle(MF.ink)
            Text(label)
                .font(.system(size: 10.5, weight: .semibold))
                .foregroundStyle(MF.faint)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .background(MF.surfaceSoft)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private func processStep(_ number: String, _ title: String, _ sub: String) -> some View {
        VStack(spacing: 5) {
            Text(number)
                .font(.system(size: 12, weight: .heavy))
                .foregroundStyle(.white)
                .frame(width: 28, height: 28)
                .background(MF.emberGrad)
                .clipShape(Circle())
            Text(title)
                .font(.system(size: 11.5, weight: .bold))
                .foregroundStyle(MF.ink)
                .lineLimit(1)
                .minimumScaleFactor(0.75)
            Text(sub)
                .font(.system(size: 10.5, weight: .semibold))
                .foregroundStyle(MF.faint)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 11)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(MF.border, lineWidth: 1))
    }

    private func signalBar(_ signal: CofounderSignal) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(signal.label)
                    .font(.system(size: 12.5, weight: .bold))
                    .foregroundStyle(MF.ink)
                Spacer()
                Text("\(signal.value)")
                    .font(.mfMono(10.5))
                    .foregroundStyle(MF.faint)
            }
            ProgressView(value: Double(signal.value), total: 100)
                .tint(signal.value >= 80 ? MF.ember : MF.indigo)
            Text(signal.note)
                .font(.system(size: 11.5))
                .foregroundStyle(MF.smoke)
        }
    }

    private func scoreChip(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 11.5, weight: .bold))
            .foregroundStyle(MF.emberDeep)
            .padding(.horizontal, 10)
            .frame(height: 28)
            .background(MF.emberTint)
            .clipShape(Capsule())
    }
}

// ─── Service-Kachel ───────────────────────────────────────────

struct ServiceTile: View {
    let service: ServiceInfo
    var body: some View {
        let hue = MF.services[service.id] ?? MF.services["cofounder"]!
        VStack(alignment: .leading, spacing: 10) {
            Image(systemName: service.icon)
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(hue.hue)
                .frame(width: 40, height: 40)
                .background(hue.tint)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            VStack(alignment: .leading, spacing: 3) {
                Text(service.label)
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(MF.ink)
                Text(service.blurb)
                    .font(.system(size: 12))
                    .foregroundStyle(MF.smoke)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
            }
            Spacer(minLength: 0)
            Text("\(service.count) verfügbar")
                .font(.system(size: 11.5, weight: .bold))
                .foregroundStyle(hue.ink)
        }
        .padding(15)
        .frame(maxWidth: .infinity, minHeight: 132, alignment: .leading)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(MF.border, lineWidth: 1))
        .warmShadow()
    }
}

private struct RemoteLogoTile: View {
    let url: URL?
    let size: CGFloat
    let cornerRadius: CGFloat
    let background: Color
    let fallbackText: String?
    let fallbackSystemImage: String?
    let fallbackColor: Color

    var body: some View {
        ZStack {
            if let url {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFit()
                            .padding(size * 0.16)
                    case .failure:
                        fallback
                    case .empty:
                        ProgressView()
                            .controlSize(.small)
                            .tint(fallbackColor)
                    @unknown default:
                        fallback
                    }
                }
            } else {
                fallback
            }
        }
        .frame(width: size, height: size)
        .background(background)
        .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
    }

    @ViewBuilder
    private var fallback: some View {
        if let fallbackText {
            Text(fallbackText)
                .font(.system(size: size * 0.52))
                .foregroundStyle(fallbackColor)
        } else {
            Image(systemName: fallbackSystemImage ?? "sparkles")
                .font(.system(size: size * 0.38, weight: .semibold))
                .foregroundStyle(fallbackColor)
        }
    }
}

private struct RemoteBannerTile: View {
    let url: URL?
    let height: CGFloat
    let colors: [Color]

    var body: some View {
        ZStack {
            if let url {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFill()
                    case .failure:
                        fallback
                    case .empty:
                        fallback
                            .overlay {
                                ProgressView()
                                    .tint(.white)
                            }
                    @unknown default:
                        fallback
                    }
                }
            } else {
                fallback
            }
        }
        .frame(maxWidth: .infinity)
        .frame(height: height)
        .clipped()
    }

    private var fallback: some View {
        LinearGradient(colors: colors, startPoint: .topLeading, endPoint: .bottomTrailing)
    }
}

// ─── Deals & Credits ─────────────────────────────────────────

private struct DealCategory: Identifiable, Hashable {
    let id: String
    let label: String
    let icon: String
    let count: Int
}

struct DealPreviewCard: View {
    let deal: CatalogDeal
    var compact = false

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            RemoteLogoTile(
                url: deal.logoImageURL,
                size: compact ? 42 : 46,
                cornerRadius: 13,
                background: MF.surfaceSoft,
                fallbackText: deal.displayLogo,
                fallbackSystemImage: nil,
                fallbackColor: MF.emberDeep
            )

            VStack(alignment: .leading, spacing: 7) {
                HStack(alignment: .top, spacing: 8) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(deal.product)
                            .font(.system(size: compact ? 14.5 : 16, weight: .heavy))
                            .foregroundStyle(MF.ink)
                            .lineLimit(1)
                        Text(deal.company)
                            .font(.system(size: 12.5, weight: .semibold))
                            .foregroundStyle(MF.smoke)
                            .lineLimit(1)
                    }
                    Spacer(minLength: 8)
                    DealBadgeView(deal: deal)
                }

                if let value = deal.cleanValue {
                    Text(value)
                        .font(.system(size: compact ? 12.5 : 13.5, weight: .bold))
                        .foregroundStyle(deal.isEpic ? MF.emberDeep : MF.ink)
                        .lineLimit(1)
                }

                if let desc = deal.cleanDescription {
                    Text(desc)
                        .font(.system(size: 12.5))
                        .foregroundStyle(MF.inkSoft)
                        .lineSpacing(2)
                        .lineLimit(compact ? 2 : 3)
                }

                FlowLayout(spacing: 6) {
                    ForEach(deal.displayTags.prefix(compact ? 3 : 5), id: \.self) { tag in
                        Text(tag)
                            .font(.system(size: 10.5, weight: .semibold))
                            .foregroundStyle(MF.indigoInk)
                            .padding(.horizontal, 8)
                            .frame(height: 24)
                            .background(MF.indigoTint.opacity(0.7))
                            .clipShape(Capsule())
                    }
                    Text(deal.categoryLabel)
                        .font(.system(size: 10.5, weight: .bold))
                        .foregroundStyle(MF.smoke)
                        .padding(.horizontal, 8)
                        .frame(height: 24)
                        .background(MF.surfaceSoft)
                        .clipShape(Capsule())
                }
            }

            Image(systemName: "chevron.right")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(MF.faint)
                .padding(.top, 4)
        }
        .padding(14)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(deal.isEpic ? MF.ember.opacity(0.35) : MF.border, lineWidth: 1))
        .warmShadow()
    }
}

private struct DealBadgeView: View {
    let deal: CatalogDeal

    var body: some View {
        Text(deal.badgeText)
            .font(.system(size: 10.5, weight: .heavy))
            .foregroundStyle(foreground)
            .padding(.horizontal, 8)
            .frame(height: 24)
            .background(background)
            .clipShape(Capsule())
    }

    private var background: Color {
        switch deal.badgeStyle {
        case "epic": MF.emberTint
        case "premium": MF.indigoTint
        case "hot": Color(hex: 0xFFE5D6)
        default: MF.surfaceSoft
        }
    }

    private var foreground: Color {
        switch deal.badgeStyle {
        case "epic": MF.emberDeep
        case "premium": MF.indigoInk
        case "hot": Color(hex: 0xB94718)
        default: MF.inkSoft
        }
    }
}

struct DealsIndexView: View {
    @EnvironmentObject var state: AppState
    @ObservedObject private var catalog = RemoteCatalog.shared
    @State private var selectedCategory = "all"
    @State private var query = ""

    private var categories: [DealCategory] {
        dealCategories(from: catalog.deals)
    }

    private var visibleDeals: [CatalogDeal] {
        let term = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let base = catalog.deals.filter { $0.active ?? true }
        return base
            .filter { selectedCategory == "all" || $0.cat == selectedCategory }
            .filter { term.isEmpty || $0.searchBlob.contains(term) }
            .sorted(by: dealPrioritySort)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                header
                categoryRail
                search
                if visibleDeals.isEmpty {
                    emptyState
                } else {
                    LazyVStack(spacing: 11) {
                        ForEach(visibleDeals) { deal in
                            Button {
                                Haptics.tap()
                                state.discoverPath.append(.deal(deal.id))
                            } label: {
                                DealPreviewCard(deal: deal)
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
        .background(MF.canvas.ignoresSafeArea())
        .navigationTitle("Deals")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            if catalog.deals.isEmpty {
                await catalog.refresh()
            }
        }
        .refreshable {
            await catalog.refresh()
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 13) {
            HStack(spacing: 9) {
                Image(systemName: "giftcard.fill")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(MF.emberDeep)
                    .frame(width: 40, height: 40)
                    .background(MF.emberTint)
                    .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
                Eyebrow(text: "Deals · \(catalog.deals.count) aktiv", color: MF.emberDeep)
            }

            Text("Gründer-Deals & Credits")
                .font(.system(size: 28, weight: .heavy))
                .foregroundStyle(MF.ink)
                .fixedSize(horizontal: false, vertical: true)
            Text("Rabatte, Tools, Legal-, Buchhaltungs- und Marketing-Angebote aus dem Web-Katalog.")
                .font(.system(size: 14.5))
                .foregroundStyle(MF.smoke)
                .lineSpacing(3)

            if let lastUpdated = catalog.lastUpdated {
                Label("Aktualisiert \(lastUpdated.formatted(.dateTime.day().month().hour().minute()))", systemImage: "arrow.triangle.2.circlepath")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(MF.faint)
            }
        }
        .padding(16)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(MF.border, lineWidth: 1))
        .warmShadow()
    }

    private var categoryRail: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                categoryChip(label: "Alle", icon: "✨", count: catalog.deals.count, id: "all")
                ForEach(categories) { category in
                    categoryChip(label: category.label, icon: category.icon, count: category.count, id: category.id)
                }
            }
            .padding(.vertical, 1)
        }
    }

    private func categoryChip(label: String, icon: String, count: Int, id: String) -> some View {
        let selected = selectedCategory == id
        return Button {
            Haptics.select()
            selectedCategory = id
        } label: {
            HStack(spacing: 5) {
                Text(icon)
                    .font(.system(size: 12))
                Text("\(label) · \(count)")
            }
            .font(.system(size: 12.5, weight: .bold))
            .foregroundStyle(selected ? MF.emberDeep : MF.smoke)
            .padding(.horizontal, 13)
            .frame(height: 36)
            .background(selected ? MF.emberTint : MF.surface)
            .clipShape(Capsule())
            .overlay(Capsule().stroke(selected ? MF.ember.opacity(0.55) : MF.border, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }

    private var search: some View {
        HStack(spacing: 9) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(MF.faint)
            TextField("Suche: Buchhaltung, Website, Marketing ...", text: $query)
                .font(.system(size: 14))
        }
        .padding(.horizontal, 14)
        .frame(height: 46)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(MF.border, lineWidth: 1))
    }

    private var emptyState: some View {
        VStack(spacing: 11) {
            if catalog.isRefreshing {
                ProgressView()
                    .controlSize(.regular)
                    .tint(MF.ember)
            } else {
                Image(systemName: "giftcard")
                    .font(.system(size: 26, weight: .semibold))
                    .foregroundStyle(MF.faint)
            }
            Text(catalog.isRefreshing ? "Deals laden" : "Keine Deals gefunden")
                .font(.system(size: 16, weight: .bold))
                .foregroundStyle(MF.ink)
            Text(catalog.lastError ?? "Passe Suche oder Kategorie an. Der Katalog kommt aus public/deals.json der Webversion.")
                .font(.system(size: 13))
                .foregroundStyle(MF.smoke)
                .multilineTextAlignment(.center)
            if !catalog.isRefreshing {
                Button {
                    Haptics.tap()
                    Task { await catalog.refresh() }
                } label: {
                    Label("Neu laden", systemImage: "arrow.clockwise")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(MF.emberDeep)
                        .padding(.horizontal, 13)
                        .frame(height: 36)
                        .background(MF.emberTint)
                        .clipShape(Capsule())
                }
                .buttonStyle(.plain)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(24)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(MF.border, lineWidth: 1))
    }
}

struct DealDetailView: View {
    @ObservedObject private var catalog = RemoteCatalog.shared
    @Environment(\.openURL) private var openURL
    let dealId: String

    private var deal: CatalogDeal? {
        catalog.deals.first { $0.id == dealId }
    }

    var body: some View {
        if let deal {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    hero(deal)
                    valueCard(deal)
                    detailBlock(title: "Was du bekommst", text: deal.cleanDescription ?? "Details stehen auf der Anbieter-Seite.")
                    detailBlock(title: "Für wen", text: deal.cleanEligibility ?? "Gründer, kleine Unternehmen und Teams; Details auf der offiziellen Website prüfen.")
                    detailBlock(title: "Laufzeit", text: deal.cleanDuration ?? "Siehe Website.")
                    if !deal.displayTags.isEmpty {
                        tags(deal)
                    }
                }
                .padding(20)
                .padding(.bottom, 118)
            }
            .scrollIndicators(.hidden)
            .safeAreaInset(edge: .bottom) {
                stickyCTA(deal)
            }
            .background(MF.canvas.ignoresSafeArea())
            .navigationTitle(deal.categoryLabel)
            .navigationBarTitleDisplayMode(.inline)
        } else {
            ContentUnavailableView("Deal nicht gefunden", systemImage: "giftcard")
                .background(MF.canvas.ignoresSafeArea())
                .task {
                    if catalog.deals.isEmpty {
                        await catalog.refresh()
                    }
                }
        }
    }

    private func hero(_ deal: CatalogDeal) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            RemoteBannerTile(
                url: deal.bannerImageURL,
                height: 96,
                colors: [MF.ember, MF.indigo]
            )
                .overlay(alignment: .bottomLeading) {
                    RemoteLogoTile(
                        url: deal.logoImageURL,
                        size: 58,
                        cornerRadius: 16,
                        background: MF.surface,
                        fallbackText: deal.displayLogo,
                        fallbackSystemImage: nil,
                        fallbackColor: MF.emberDeep
                    )
                    .overlay(RoundedRectangle(cornerRadius: 16).stroke(.white.opacity(0.5), lineWidth: 1))
                    .padding(16)
                    .offset(y: 30)
                }
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Eyebrow(text: "\(deal.categoryIcon) \(deal.categoryLabel)", color: MF.emberDeep)
                    Spacer()
                    DealBadgeView(deal: deal)
                }
                .padding(.top, 28)
                Text(deal.product)
                    .font(.system(size: 27, weight: .heavy))
                    .foregroundStyle(MF.ink)
                    .fixedSize(horizontal: false, vertical: true)
                Text(deal.company)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(MF.smoke)
            }
            .padding(17)
        }
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 22).stroke(deal.isEpic ? MF.ember.opacity(0.35) : MF.border, lineWidth: 1))
        .warmShadow(large: true)
    }

    private func valueCard(_ deal: CatalogDeal) -> some View {
        HStack(spacing: 10) {
            dealMetric("Wert", deal.cleanValue ?? "Deal", "Vergünstigung")
            dealMetric("Kategorie", deal.categoryLabel, deal.categoryIcon)
            dealMetric("Status", deal.badgeText, deal.isEpic ? "Top" : "aktiv")
        }
    }

    private func dealMetric(_ label: String, _ value: String, _ sub: String) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.system(size: 14.5, weight: .heavy))
                .foregroundStyle(label == "Wert" ? MF.emberDeep : MF.ink)
                .lineLimit(1)
                .minimumScaleFactor(0.68)
            Text(label)
                .font(.system(size: 11.5, weight: .bold))
                .foregroundStyle(MF.smoke)
            Text(sub)
                .font(.system(size: 10.5, weight: .semibold))
                .foregroundStyle(MF.faint)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(MF.border, lineWidth: 1))
        .warmShadow()
    }

    private func detailBlock(title: String, text: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(MF.smoke)
            Text(text)
                .font(.system(size: 14.5))
                .foregroundStyle(MF.inkSoft)
                .lineSpacing(3)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(15)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(MF.border, lineWidth: 1))
    }

    private func tags(_ deal: CatalogDeal) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Tags")
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(MF.smoke)
            FlowLayout(spacing: 7) {
                ForEach(deal.displayTags, id: \.self) { tag in
                    Text(tag)
                        .font(.system(size: 11.5, weight: .bold))
                        .foregroundStyle(MF.indigoInk)
                        .padding(.horizontal, 10)
                        .frame(height: 28)
                        .background(MF.indigoTint)
                        .clipShape(Capsule())
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(15)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(MF.border, lineWidth: 1))
    }

    private func stickyCTA(_ deal: CatalogDeal) -> some View {
        VStack(spacing: 0) {
            Rectangle()
                .fill(LinearGradient(colors: [.clear, MF.canvas], startPoint: .top, endPoint: .bottom))
                .frame(height: 18)
            HStack(spacing: 10) {
                Button {
                    Haptics.tap()
                    if let url = deal.actionURL {
                        openURL(url)
                    }
                } label: {
                    Label("Angebot ansehen", systemImage: "arrow.up.right")
                        .font(.system(size: 14, weight: .heavy))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 52)
                        .background(MF.emberGrad)
                        .clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))
                }
                .buttonStyle(.plain)
                .disabled(deal.actionURL == nil)
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 12)
            .background(MF.canvas)
        }
    }
}

private func dealCategories(from deals: [CatalogDeal]) -> [DealCategory] {
    var seen: [String: DealCategory] = [:]
    for deal in deals where deal.active ?? true {
        if let current = seen[deal.cat] {
            seen[deal.cat] = DealCategory(id: current.id, label: current.label, icon: current.icon, count: current.count + 1)
        } else {
            seen[deal.cat] = DealCategory(id: deal.cat, label: deal.categoryLabel, icon: deal.categoryIcon, count: 1)
        }
    }
    return seen.values.sorted { $0.count == $1.count ? $0.label < $1.label : $0.count > $1.count }
}

private func dealPrioritySort(_ lhs: CatalogDeal, _ rhs: CatalogDeal) -> Bool {
    let left = dealRank(lhs)
    let right = dealRank(rhs)
    if left != right { return left > right }
    return lhs.product < rhs.product
}

private func dealRank(_ deal: CatalogDeal) -> Int {
    var score = 0
    switch deal.tier?.lowercased() {
    case "epic": score += 90
    case "big": score += 70
    case "good": score += 50
    default: score += 30
    }
    switch deal.badgeStyle {
    case "epic": score += 20
    case "premium", "hot": score += 10
    default: break
    }
    if deal.cat == "cloud" || deal.cat == "ai" { score += 5 }
    return score
}

private func fallbackDealCategoryLabel(_ id: String) -> String {
    switch id {
    case "cloud": "Cloud & Infra"
    case "saas": "SaaS"
    case "legal": "Legal"
    case "ai": "AI"
    case "marketing": "Marketing"
    case "hr": "HR & Team"
    case "community": "Community"
    default: id.capitalized
    }
}

private func fallbackDealCategoryIcon(_ id: String) -> String {
    switch id {
    case "cloud": "☁️"
    case "saas": "🧰"
    case "legal": "⚖️"
    case "ai": "✨"
    case "marketing": "📣"
    case "hr": "👥"
    case "community": "🤝"
    default: "🎁"
    }
}

private extension CatalogDeal {
    var displayLogo: String {
        clean(logo) ?? categoryIcon
    }

    var logoImageURL: URL? {
        if let resolved = RemoteAssetURL.resolve(logoUrl) {
            return resolved
        }
        guard let raw = clean(logo),
              raw.hasPrefix("http://") || raw.hasPrefix("https://") || raw.hasPrefix("/") || raw.contains("/")
        else { return nil }
        return RemoteAssetURL.resolve(raw)
    }

    var bannerImageURL: URL? {
        RemoteAssetURL.resolve(bannerUrl)
    }

    var categoryIcon: String {
        clean(catIcon) ?? fallbackDealCategoryIcon(cat)
    }

    var categoryLabel: String {
        clean(catLabel) ?? fallbackDealCategoryLabel(cat)
    }

    var cleanValue: String? { clean(value) }
    var cleanDescription: String? { clean(desc) }
    var cleanEligibility: String? { clean(eligibility) }
    var cleanDuration: String? { clean(duration) }

    var badgeText: String {
        clean(badge) ?? (isEpic ? "EPIC" : "Deal")
    }

    var badgeStyle: String {
        (tier ?? badge ?? "").lowercased()
    }

    var isEpic: Bool {
        badgeStyle == "epic"
    }

    var displayTags: [String] {
        (tags ?? []).compactMap { clean($0) }
    }

    var actionURL: URL? {
        if let claim = clean(claimUrl), let url = URL(string: claim) { return url }
        if let urlString = clean(url), let url = URL(string: urlString) { return url }
        return nil
    }

    var searchBlob: String {
        [
            company,
            product,
            cat,
            categoryLabel,
            cleanValue ?? "",
            cleanDescription ?? "",
            displayTags.joined(separator: " "),
        ]
        .joined(separator: " ")
        .lowercased()
    }

    private func clean(_ value: String?) -> String? {
        guard let value else { return nil }
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }
}

// ─── Partner-Marktplatz ──────────────────────────────────────

struct PartnerPreviewCard: View {
    let partner: PartnerOffer

    var body: some View {
        let hue = MF.services[partner.serviceId] ?? MF.services["growth"]!
        HStack(alignment: .top, spacing: 12) {
            RemoteLogoTile(
                url: partner.logoURL,
                size: 42,
                cornerRadius: 12,
                background: hue.tint,
                fallbackText: nil,
                fallbackSystemImage: partner.service?.icon ?? "sparkles",
                fallbackColor: hue.hue
            )

            VStack(alignment: .leading, spacing: 7) {
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(partner.name)
                            .font(.system(size: 14.5, weight: .bold))
                            .foregroundStyle(MF.ink)
                            .lineLimit(1)
                        Text("\(partner.firm) · \(partner.city)")
                            .font(.system(size: 12))
                            .foregroundStyle(MF.smoke)
                            .lineLimit(1)
                    }
                    Spacer(minLength: 8)
                    PartnerFitBadge(value: partner.fit, tint: hue.tint, ink: hue.ink)
                }

                Text(partner.blurb)
                    .font(.system(size: 12.5))
                    .foregroundStyle(MF.inkSoft)
                    .lineSpacing(2)
                    .lineLimit(2)

                FlowLayout(spacing: 6) {
                    ForEach(partner.specialties.prefix(3), id: \.label) { item in
                        Text(item.label)
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(hue.ink)
                            .padding(.horizontal, 9)
                            .frame(height: 26)
                            .background(hue.tint.opacity(0.75))
                            .clipShape(Capsule())
                    }
                    Text("Co-Pilot Match")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(MF.indigoInk)
                        .padding(.horizontal, 9)
                        .frame(height: 26)
                        .background(MF.indigoTint)
                        .clipShape(Capsule())
                }
            }

            Image(systemName: "chevron.right")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(MF.faint)
                .padding(.top, 4)
        }
        .padding(14)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(MF.border, lineWidth: 1))
        .warmShadow()
    }
}

struct PartnerIndexView: View {
    @EnvironmentObject var state: AppState
    let serviceId: String
    @State private var query = ""

    private var service: ServiceInfo? {
        serviceId == "all" ? nil : serviceCatalog.first { $0.id == serviceId }
    }

    private var hue: MF.ServiceHue {
        MF.services[serviceId] ?? MF.services["growth"]!
    }

    private var titleText: String {
        if let service {
            return "\(service.label)-Partner"
        }
        return "Partner-Marktplatz"
    }

    private var accentText: String {
        if serviceId == "growth" { return "einsatzbereit" }
        if serviceId == "all" { return "kuratiert" }
        return "vorgeprüft"
    }

    private var partnerServices: [ServiceInfo] {
        serviceCatalog.filter { !state.partners(for: $0.id).isEmpty }
    }

    private var visiblePartners: [PartnerOffer] {
        let term = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let base = state.partners(for: serviceId)
        guard !term.isEmpty else { return base }
        return base.filter { partner in
            [
                partner.name,
                partner.firm,
                partner.city,
                partner.blurb,
                partner.serviceLabel,
                partner.specialties.map(\.label).joined(separator: " "),
            ]
            .joined(separator: " ")
            .lowercased()
            .contains(term)
        }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                header
                categoryRail
                search
                if visiblePartners.isEmpty {
                    emptyState
                } else {
                    VStack(spacing: 11) {
                        ForEach(visiblePartners) { partner in
                            Button {
                                Haptics.tap()
                                state.discoverPath.append(.partner(partner.id))
                            } label: {
                                PartnerPreviewCard(partner: partner)
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
        .background(MF.canvas.ignoresSafeArea())
        .navigationTitle(service?.label ?? "Partner")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 13) {
            HStack(spacing: 9) {
                Image(systemName: service?.icon ?? "square.grid.2x2.fill")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(hue.hue)
                    .frame(width: 38, height: 38)
                    .background(hue.tint)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                Eyebrow(text: "\(service?.label ?? "Marketplace") · \(visiblePartners.count) kuratiert")
            }

            Text(titleText)
                .font(.system(size: 28, weight: .heavy))
                .foregroundStyle(MF.ink)
                .fixedSize(horizontal: false, vertical: true)
            Text("\(accentText.capitalized).")
                .font(.system(size: 28, weight: .heavy))
                .foregroundStyle(hue.hue)

            Text(service?.blurb ?? "Kuratierte Partner für Kapital, Growth, Mentoring, Talent und Steuer. Der Co-Pilot kann jedes Gespräch mit deinem Profil, Unterlagen und Kalender vorbereiten.")
                .font(.system(size: 14.5))
                .foregroundStyle(MF.smoke)
                .lineSpacing(3)
        }
        .padding(16)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(MF.border, lineWidth: 1))
        .warmShadow()
    }

    private var categoryRail: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                categoryChip(label: "Alle", id: "all")
                ForEach(partnerServices) { service in
                    categoryChip(label: service.label, id: service.id)
                }
            }
            .padding(.vertical, 1)
        }
    }

    private func categoryChip(label: String, id: String) -> some View {
        let selected = serviceId == id
        let chipHue = MF.services[id] ?? MF.services["growth"]!
        return Button {
            Haptics.select()
            state.discoverPath = [.partners(id)]
        } label: {
            Text(label)
                .font(.system(size: 12.5, weight: .bold))
                .foregroundStyle(selected ? chipHue.ink : MF.smoke)
                .padding(.horizontal, 13)
                .frame(height: 36)
                .background(selected ? chipHue.tint : MF.surface)
                .clipShape(Capsule())
                .overlay(Capsule().stroke(selected ? chipHue.hue : MF.border, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }

    private var search: some View {
        HStack(spacing: 9) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(MF.faint)
            TextField("Partner, Thema oder Stadt suchen", text: $query)
                .font(.system(size: 14))
        }
        .padding(.horizontal, 14)
        .frame(height: 46)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(MF.border, lineWidth: 1))
    }

    private var emptyState: some View {
        let stateText: (String, String, String, Bool) = {
            switch state.partnerLoadState {
            case .loading:
                return ("arrow.triangle.2.circlepath", "Live-Partner laden", "Die Partnerangebote werden aus Supabase geladen.", true)
            case .failed(let message):
                return ("exclamationmark.triangle.fill", "Live-Partner fehlgeschlagen", "\(message) · Versuch es erneut.", false)
            default:
                return ("tray", "Keine Live-Partner gefunden", "Passe die Suche an oder prüfe, ob in Supabase aktive Partnerangebote freigegeben sind.", false)
            }
        }()

        return VStack(spacing: 11) {
            if stateText.3 {
                ProgressView()
                    .controlSize(.regular)
                    .tint(MF.indigo)
            } else {
                Image(systemName: stateText.0)
                    .font(.system(size: 26, weight: .semibold))
                    .foregroundStyle(MF.faint)
            }
            Text(stateText.1)
                .font(.system(size: 16, weight: .bold))
                .foregroundStyle(MF.ink)
            Text(stateText.2)
                .font(.system(size: 13))
                .foregroundStyle(MF.smoke)
                .multilineTextAlignment(.center)
            if !stateText.3 {
                Button {
                    Haptics.tap()
                    Task { await state.refreshPartnerOffers() }
                } label: {
                    Label("Neu laden", systemImage: "arrow.clockwise")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(MF.indigoInk)
                        .padding(.horizontal, 13)
                        .frame(height: 36)
                        .background(MF.indigoTint)
                        .clipShape(Capsule())
                }
                .buttonStyle(.plain)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(24)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(MF.border, lineWidth: 1))
    }
}

struct PartnerDetailView: View {
    @EnvironmentObject var state: AppState
    @Environment(\.openURL) private var openURL
    let partnerId: String

    private var partner: PartnerOffer? {
        state.partner(id: partnerId)
    }

    private let slots = ["Di 14:00", "Mi 10:30", "Mi 16:00", "Do 09:00", "Do 15:30", "Fr 11:00"]

    var body: some View {
        if let partner {
            let hue = MF.services[partner.serviceId] ?? MF.services["growth"]!
            ZStack(alignment: .bottom) {
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        hero(partner, hue: hue)
                        stats(partner, hue: hue)
                        whyCard(partner, hue: hue)
                        specialties(partner, hue: hue)
                        packages(partner, hue: hue)
                        slotsGrid(partner, hue: hue)
                        vouches(partner)
                        trustNote(hue: hue)
                    }
                    .padding(20)
                    .padding(.bottom, 118)
                }
                .scrollIndicators(.hidden)
                stickyActions(partner, hue: hue)
            }
            .background(MF.canvas.ignoresSafeArea())
            .navigationTitle(partner.serviceLabel)
            .navigationBarTitleDisplayMode(.inline)
        } else {
            ContentUnavailableView("Partner nicht gefunden", systemImage: "person.crop.circle.badge.questionmark")
                .background(MF.canvas.ignoresSafeArea())
        }
    }

    private func hero(_ partner: PartnerOffer, hue: MF.ServiceHue) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            RemoteBannerTile(
                url: partner.bannerURL,
                height: 92,
                colors: [hue.hue, hue.ink]
            )
            VStack(alignment: .leading, spacing: 11) {
                HStack(spacing: 9) {
                    RemoteLogoTile(
                        url: partner.logoURL,
                        size: 42,
                        cornerRadius: 13,
                        background: hue.tint,
                        fallbackText: nil,
                        fallbackSystemImage: partner.service?.icon ?? "sparkles",
                        fallbackColor: hue.ink
                    )
                    VStack(alignment: .leading, spacing: 2) {
                        Eyebrow(text: "\(partner.serviceLabel) · verifizierter Match", color: hue.ink)
                        Text(partner.firm)
                            .font(.system(size: 12.5, weight: .semibold))
                            .foregroundStyle(MF.smoke)
                            .lineLimit(1)
                    }
                    Spacer()
                    PartnerFitBadge(value: partner.fit, tint: hue.tint, ink: hue.ink)
                }
                Text(partner.name)
                    .font(.system(size: 25, weight: .heavy))
                    .foregroundStyle(MF.ink)
                    .fixedSize(horizontal: false, vertical: true)
                Label(partner.city, systemImage: "mappin.and.ellipse")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(MF.smoke)
                Text(partner.blurb)
                    .font(.system(size: 14.5))
                    .foregroundStyle(MF.inkSoft)
                    .lineSpacing(3)
            }
            .padding(17)
        }
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 22).stroke(MF.border, lineWidth: 1))
        .warmShadow(large: true)
    }

    private func stats(_ partner: PartnerOffer, hue: MF.ServiceHue) -> some View {
        HStack(spacing: 10) {
            partnerStat("Fit", "\(partner.fit)", "Co-Pilot", hue: hue)
            partnerStat("Pakete", "\(partner.packages.count)", "buchbar", hue: hue)
            partnerStat("Fokus", "\(partner.specialties.count)", "Bereiche", hue: hue)
        }
    }

    private func partnerStat(_ label: String, _ value: String, _ sub: String, hue: MF.ServiceHue) -> some View {
        VStack(spacing: 3) {
            Text(value)
                .font(.system(size: 18, weight: .heavy))
                .foregroundStyle(label == "Fit" ? hue.ink : MF.ink)
            Text(label)
                .font(.system(size: 11.5, weight: .bold))
                .foregroundStyle(MF.smoke)
            Text(sub)
                .font(.system(size: 10.5, weight: .semibold))
                .foregroundStyle(MF.faint)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(MF.border, lineWidth: 1))
        .warmShadow()
    }

    private func whyCard(_ partner: PartnerOffer, hue: MF.ServiceHue) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                Image(systemName: "sparkle")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 24, height: 24)
                    .background(MF.indigoGrad)
                    .clipShape(Circle())
                Text("Co-Pilot · warum dieses Match")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(MF.indigoInk)
            }
            ForEach(partner.why, id: \.self) { reason in
                HStack(alignment: .top, spacing: 9) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(hue.hue)
                        .padding(.top, 1)
                    Text(reason)
                        .font(.system(size: 13.5))
                        .foregroundStyle(MF.inkSoft)
                        .lineSpacing(3)
                }
            }
        }
        .padding(16)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(MF.border, lineWidth: 1))
        .warmShadow()
    }

    private func specialties(_ partner: PartnerOffer, hue: MF.ServiceHue) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            MSectionHead(text: "Fokusbereiche")
            VStack(spacing: 12) {
                ForEach(partner.specialties, id: \.label) { specialty in
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text(specialty.label)
                                .font(.system(size: 13.5, weight: .semibold))
                                .foregroundStyle(MF.ink)
                            Spacer()
                            Text("\(Int((specialty.level * 100).rounded()))%")
                                .font(.mfMono(10.5))
                                .foregroundStyle(MF.faint)
                        }
                        ProgressView(value: specialty.level)
                            .tint(hue.hue)
                            .background(MF.surfaceSoft)
                            .clipShape(Capsule())
                    }
                }
            }
            .padding(15)
            .background(MF.surface)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(MF.border, lineWidth: 1))
        }
    }

    private func packages(_ partner: PartnerOffer, hue: MF.ServiceHue) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            MSectionHead(text: "Pakete")
            VStack(spacing: 10) {
                ForEach(partner.packages, id: \.name) { package in
                    VStack(alignment: .leading, spacing: 6) {
                        HStack(alignment: .firstTextBaseline) {
                            Text(package.name)
                                .font(.system(size: 14.5, weight: .bold))
                                .foregroundStyle(MF.ink)
                            Spacer()
                            Text(package.price)
                                .font(.system(size: 12.5, weight: .bold))
                                .foregroundStyle(hue.ink)
                        }
                        Text(package.desc)
                            .font(.system(size: 12.8))
                            .foregroundStyle(MF.smoke)
                            .lineSpacing(3)
                    }
                    .padding(14)
                    .background(MF.surface)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 14).stroke(MF.border, lineWidth: 1))
                }
            }
        }
    }

    private func slotsGrid(_ partner: PartnerOffer, hue: MF.ServiceHue) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            MSectionHead(text: "Nächster Schritt")
            LazyVGrid(columns: [.init(.flexible()), .init(.flexible()), .init(.flexible())], spacing: 8) {
                ForEach(slots, id: \.self) { slot in
                    Button {
                        Haptics.success()
                        state.addPlannerItem(
                            title: "Partnergespräch · \(partner.name)",
                            note: "Briefing mit Co-Pilot vorbereiten: \(partner.blurb)",
                            dueLabel: slot,
                            kind: .meeting,
                            target: .startup
                        )
                        state.open(.screen(.calendar))
                    } label: {
                        Text(slot)
                            .font(.system(size: 12.5, weight: .bold))
                            .foregroundStyle(hue.ink)
                            .frame(maxWidth: .infinity)
                            .frame(height: 42)
                            .background(hue.tint.opacity(0.8))
                            .clipShape(RoundedRectangle(cornerRadius: 11, style: .continuous))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding(15)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(MF.border, lineWidth: 1))
    }

    private func vouches(_ partner: PartnerOffer) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            MSectionHead(text: "Network-Vouches")
            ForEach(partner.vouches, id: \.quote) { vouch in
                VStack(alignment: .leading, spacing: 8) {
                    Text("\"\(vouch.quote)\"")
                        .font(.system(size: 14.5, weight: .semibold))
                        .foregroundStyle(MF.inkSoft)
                        .lineSpacing(3)
                    Text("\(vouch.from) · \(vouch.role)")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(MF.smoke)
                }
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(MF.surface)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 14).stroke(MF.border, lineWidth: 1))
            }
        }
    }

    private func trustNote(hue: MF.ServiceHue) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: "shield.checkered")
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(hue.hue)
            Text("Profil aus kuratierten Partnerdaten gebaut. Der Co-Pilot priorisiert Fit, Phase, offene Unterlagen und die nächste Aktion.")
                .font(.system(size: 12.5))
                .foregroundStyle(MF.smoke)
                .lineSpacing(3)
        }
        .padding(14)
        .background(MF.surfaceSoft)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private func stickyActions(_ partner: PartnerOffer, hue: MF.ServiceHue) -> some View {
        VStack(spacing: 8) {
            Button {
                Haptics.tap()
                prepareWithCopilot(partner)
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "sparkles")
                        .font(.system(size: 14, weight: .bold))
                    Text("Co-Pilot vorbereiten")
                        .font(.system(size: 15.5, weight: .bold))
                }
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .frame(height: 50)
                .background(MF.indigoGrad)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            }
            .buttonStyle(.plain)

            Button {
                Haptics.tap()
                if let url = partner.primaryURL {
                    openURL(url)
                } else {
                    prepareWithCopilot(partner)
                }
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "calendar.badge.plus")
                        .font(.system(size: 14, weight: .bold))
                    Text("Gespräch anfragen")
                        .font(.system(size: 15.5, weight: .bold))
                }
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .frame(height: 50)
                .background(LinearGradient(colors: [hue.hue, hue.ink], startPoint: .topLeading, endPoint: .bottomTrailing))
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 20)
        .padding(.top, 12)
        .padding(.bottom, 10)
        .background(.ultraThinMaterial)
        .overlay(alignment: .top) { Rectangle().fill(MF.borderSoft).frame(height: 1) }
    }

    private func prepareWithCopilot(_ partner: PartnerOffer) {
        let packages = partner.packages.map { "- \($0.name): \($0.desc)" }.joined(separator: "\n")
        let why = partner.why.map { "- \($0)" }.joined(separator: "\n")
        state.queueCopilotPrompt(
            """
            PARTNER-KONTEXT
            Bereite ein Partnergespräch aus der App vor.

            Partner: \(partner.name)
            Firma: \(partner.firm)
            Kategorie: \(partner.serviceLabel)
            Stadt: \(partner.city)
            Angebot: \(partner.blurb)
            Pakete:
            \(packages)

            Warum Match:
            \(why)

            Bitte gib mir eine Gesprächsagenda, die 5 wichtigsten Fragen, welche Unterlagen ich vorher prüfen soll und welchen Kalendereintrag du daraus machen würdest.
            """,
            title: "Partner: \(partner.name)"
        )
    }
}

struct PartnerFitBadge: View {
    let value: Int
    let tint: Color
    let ink: Color

    var body: some View {
        VStack(spacing: 0) {
            Text("\(value)")
                .font(.system(size: 14.5, weight: .heavy))
                .foregroundStyle(ink)
            Text("Fit")
                .font(.system(size: 9.5, weight: .bold))
                .foregroundStyle(ink.opacity(0.75))
        }
        .frame(width: 44, height: 44)
        .background(tint)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

// ─── Event-Karte ──────────────────────────────────────────────

struct EventCard: View {
    let event: CommunityEvent
    let registered: Bool

    var body: some View {
        let hue = MF.services[event.serviceId] ?? MF.services["growth"]!
        VStack(spacing: 0) {
            EventBannerView(event: event, height: 112, compact: true)

            HStack(spacing: 13) {
                VStack(spacing: 1) {
                    Text(event.dateLabel.split(separator: " ").last.map(String.init) ?? "")
                        .font(.system(size: 16, weight: .heavy))
                        .foregroundStyle(hue.ink)
                    Text(event.dateLabel.split(separator: ",").first.map(String.init) ?? "")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(hue.ink.opacity(0.7))
                }
                .frame(width: 52, height: 52)
                .background(hue.tint)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

                VStack(alignment: .leading, spacing: 3) {
                    Text(event.title)
                        .font(.system(size: 14.5, weight: .bold))
                        .foregroundStyle(MF.ink)
                        .lineLimit(1)
                    Text("\(event.city) · \(event.timeLabel)")
                        .font(.system(size: 12)).foregroundStyle(MF.smoke)
                    if registered {
                        HStack(spacing: 4) {
                            Image(systemName: "checkmark.circle.fill").font(.system(size: 10))
                            Text("Angemeldet").font(.system(size: 11, weight: .bold))
                        }
                        .foregroundStyle(Color(hex: 0x1C7038))
                    } else {
                        Text("\(event.spotsLeft) Plätze frei")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(hue.ink)
                    }
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(MF.faint)
            }
            .padding(13)
        }
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(MF.border, lineWidth: 1))
        .warmShadow()
    }
}

private struct EventBannerView: View {
    let event: CommunityEvent
    let height: CGFloat
    var compact = false

    var body: some View {
        let hue = MF.services[event.serviceId] ?? MF.services["growth"]!
        ZStack(alignment: .bottomLeading) {
            if let url = event.bannerURL {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFill()
                    case .failure:
                        placeholder(hue: hue)
                    case .empty:
                        ProgressView()
                            .tint(.white)
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                            .background(LinearGradient(colors: [hue.hue, hue.ink], startPoint: .topLeading, endPoint: .bottomTrailing))
                    @unknown default:
                        placeholder(hue: hue)
                    }
                }
            } else {
                placeholder(hue: hue)
            }

            LinearGradient(
                colors: [.clear, .black.opacity(0.5)],
                startPoint: .center,
                endPoint: .bottom
            )

            HStack(spacing: 8) {
                Image(systemName: "calendar")
                    .font(.system(size: compact ? 11 : 13, weight: .bold))
                Text(event.kind.uppercased())
                    .font(.mfMono(compact ? 9 : 10))
                    .kerning(1.2)
            }
            .foregroundStyle(.white)
            .padding(.horizontal, compact ? 9 : 11)
            .frame(height: compact ? 26 : 30)
            .background(.black.opacity(0.28))
            .clipShape(Capsule())
            .padding(compact ? 10 : 14)
        }
        .frame(maxWidth: .infinity)
        .frame(height: height)
        .clipped()
    }

    private func placeholder(hue: MF.ServiceHue) -> some View {
        ZStack {
            LinearGradient(colors: [hue.hue, hue.ink], startPoint: .topLeading, endPoint: .bottomTrailing)
            Image(systemName: "photo.on.rectangle.angled")
                .font(.system(size: compact ? 24 : 34, weight: .semibold))
                .foregroundStyle(.white.opacity(0.82))
        }
    }
}

// ─── Event-Detail — öffnen, alles sehen, anmelden ─────────────

struct EventDetailView: View {
    @EnvironmentObject var state: AppState
    let eventId: String

    private var event: CommunityEvent? { state.events.first { $0.id == eventId } }
    private var registered: Bool { state.registeredEvents.contains(eventId) }

    var body: some View {
        if let event {
            let hue = MF.services[event.serviceId] ?? MF.services["growth"]!
            ZStack(alignment: .bottom) {
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        // Hero: optionales Live-Banner oben, Infos darunter.
                        VStack(alignment: .leading, spacing: 0) {
                            EventBannerView(event: event, height: 164)
                            VStack(alignment: .leading, spacing: 8) {
                                Text(event.kind.uppercased())
                                    .font(.mfMono(10)).kerning(1.4)
                                    .foregroundStyle(hue.ink)
                                    .padding(.horizontal, 10).padding(.vertical, 5)
                                    .background(hue.tint)
                                    .clipShape(Capsule())
                                Text(event.title)
                                    .font(.system(size: 23, weight: .bold))
                                    .foregroundStyle(MF.ink)
                                Text("Von \(event.host)")
                                    .font(.system(size: 12.5)).foregroundStyle(MF.smoke)
                            }
                            .padding(18)
                        }
                        .background(MF.surface)
                        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: 22).stroke(MF.border, lineWidth: 1))
                        .warmShadow(large: true)

                        // Fakten
                        HStack(spacing: 10) {
                            eventStat(icon: "calendar", top: event.dateLabel, sub: event.timeLabel)
                            eventStat(icon: "mappin.and.ellipse", top: event.city, sub: event.venue)
                            eventStat(icon: "person.2.fill",
                                      top: "\(event.spotsLeft) frei",
                                      sub: "von \(event.spots) Plätzen",
                                      accent: event.spotsLeft <= 12 ? hue.ink : nil)
                        }

                        Text(event.blurb)
                            .font(.system(size: 14.5))
                            .foregroundStyle(MF.inkSoft)
                            .lineSpacing(4)

                        MSectionHead(text: "Ablauf")
                        VStack(alignment: .leading, spacing: 0) {
                            ForEach(Array(event.agenda.enumerated()), id: \.offset) { idx, item in
                                HStack(alignment: .top, spacing: 11) {
                                    Circle().fill(hue.hue).frame(width: 7, height: 7)
                                        .padding(.top, 6)
                                    Text(item)
                                        .font(.system(size: 13.5)).foregroundStyle(MF.ink)
                                }
                                .padding(.vertical, 8)
                                if idx < event.agenda.count - 1 {
                                    Divider().overlay(MF.borderSoft)
                                }
                            }
                        }
                        .padding(.horizontal, 15).padding(.vertical, 6)
                        .background(MF.surface)
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: 16).stroke(MF.border, lineWidth: 1))

                        if registered {
                            HStack(spacing: 9) {
                                Image(systemName: "checkmark.seal.fill")
                                    .foregroundStyle(Color(hex: 0x1C7038))
                                Text("Du bist angemeldet — wir sehen uns dort!")
                                    .font(.system(size: 13.5, weight: .semibold))
                                    .foregroundStyle(Color(hex: 0x1C7038))
                            }
                            .frame(maxWidth: .infinity)
                            .padding(14)
                            .background(Color(hex: 0xDBF1E1))
                            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                        }
                    }
                    .padding(20)
                    .padding(.bottom, 110)
                }
                .scrollIndicators(.hidden)

                // Sticky CTA in Service-Farbe (Design: MAdvisor-CTA)
                Button {
                    state.toggleRegistration(for: event)
                } label: {
                    HStack(spacing: 9) {
                        Image(systemName: registered ? "xmark.circle" : "calendar.badge.plus")
                            .font(.system(size: 15, weight: .semibold))
                        Text(registered ? "Abmelden" : "Jetzt anmelden")
                            .font(.system(size: 16, weight: .bold))
                    }
                    .foregroundStyle(registered ? MF.smoke : .white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 54)
                    .background {
                        if registered {
                            AnyView(MF.surface)
                        } else {
                            AnyView(LinearGradient(colors: [hue.hue, hue.ink],
                                                   startPoint: .topLeading, endPoint: .bottomTrailing))
                        }
                    }
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 16)
                        .stroke(registered ? MF.border : .clear, lineWidth: 1))
                    .shadow(color: registered ? .clear : hue.hue.opacity(0.5), radius: 13, y: 6)
                }
                .buttonStyle(.plain)
                .padding(.horizontal, 20)
                .padding(.bottom, 12)
            }
            .background(MF.canvas.ignoresSafeArea())
            .navigationTitle(event.kind)
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private func eventStat(icon: String, top: String, sub: String, accent: Color? = nil) -> some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 13)).foregroundStyle(MF.faint)
            Text(top)
                .font(.system(size: 12.5, weight: .heavy))
                .foregroundStyle(accent ?? MF.ink)
                .lineLimit(1).minimumScaleFactor(0.8)
            Text(sub)
                .font(.system(size: 9.5, weight: .semibold))
                .foregroundStyle(MF.faint)
                .lineLimit(1).minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12).padding(.horizontal, 6)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(MF.border, lineWidth: 1))
        .warmShadow()
    }
}
