// Heute — nach Design-Spec MHeute: EINE fokale Ember-Karte,
// Agenda-Strip (3 Karten mit Service-Farbband oben), Aktivitäts-Feed.
// Feed-Zeilen mit Match führen direkt in den Chat.

import SwiftUI

struct TodayView: View {
    @EnvironmentObject var state: AppState
    @State private var focusDone = false

    var body: some View {
        NavigationStack(path: $state.todayPath) {
            VStack(spacing: 0) {
                todayTopBar

                ScrollView {
                    VStack(alignment: .leading, spacing: 18) {
                        greetingHeader
                        deinTagCard
                        focalCard
                        businessPulse
                        launchGuideCard
                    }
                    .padding(20)
                    .padding(.bottom, 90)
                }
                .scrollIndicators(.hidden)
            }
            .background(MF.canvas.ignoresSafeArea())
            .navigationDestination(for: TodayRoute.self) { route in
                switch route {
                case .chats: ChatsListView()
                case .chat(let id): ChatDetailView(matchId: id)
                case .calendar: PlannerView()
                case .kanban: KanbanView()
                case .startup: StartupWorkspaceView()
                case .radar: FounderRadarView()
                }
            }
            .toolbar(.hidden, for: .navigationBar)
        }
        .tint(MF.emberDeep)
    }

    private var todayTopBar: some View {
        ZStack {
            HStack {
                Button {
                    Haptics.tap()
                    state.open(.screen(.copilot))
                } label: {
                    Image(systemName: "sparkles")
                        .font(.system(size: 17, weight: .bold))
                        .foregroundStyle(MF.indigoInk)
                        .frame(width: 42, height: 42)
                        .background(MF.indigoTint)
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)

                Spacer()

                Button {
                    Haptics.tap()
                    state.open(.screen(.chats))
                } label: {
                    ZStack(alignment: .topTrailing) {
                        Image(systemName: "paperplane.fill")
                            .font(.system(size: 17, weight: .bold))
                            .foregroundStyle(MF.ink)
                            .frame(width: 42, height: 42)
                            .background(MF.surface)
                            .clipShape(Circle())
                            .overlay(Circle().stroke(MF.border, lineWidth: 1))
                        if unreadCount > 0 {
                            Text("\(min(unreadCount, 9))")
                                .font(.system(size: 10, weight: .heavy))
                                .foregroundStyle(.white)
                                .frame(width: 18, height: 18)
                                .background(MF.ember)
                                .clipShape(Circle())
                                .offset(x: 2, y: -2)
                        }
                    }
                }
                .buttonStyle(.plain)
            }

            HStack(spacing: 0) {
                Text("match")
                    .foregroundStyle(MF.ink)
                Text("foundr")
                    .foregroundStyle(MF.ember)
            }
            .font(.system(size: 22, weight: .heavy))
        }
        .padding(.horizontal, 20)
        .padding(.top, 6)
        .padding(.bottom, 12)
        .background(MF.canvas)
        .overlay(alignment: .bottom) { Rectangle().fill(MF.borderSoft).frame(height: 1) }
    }

    private var unreadCount: Int {
        state.matches.reduce(0) { total, match in
            total + match.unread
        }
    }

    // ═══════════════════ Design mfx-heute: Begrüßung · Dein Tag · Business-Puls

    private var greetingHeader: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(Date.now.formatted(.dateTime.weekday(.wide).day().month(.wide)))
                .font(.system(size: 12.5, weight: .semibold))
                .foregroundStyle(MF.faint)
            Text(greetingLine)
                .font(.system(size: 27, weight: .heavy))
                .tracking(-0.8)
                .foregroundStyle(MF.ink)
        }
        .padding(.top, 2)
    }

    private var greetingLine: String {
        let hour = Calendar.current.component(.hour, from: .now)
        let salut = hour < 11 ? "Guten Morgen" : hour < 18 ? "Hallo" : "Guten Abend"
        let name = state.profile?.name.split(separator: " ").first.map(String.init) ?? "Founder"
        return "\(salut), \(name)"
    }

    /// Die drei Dinge, die nur DU heute bewegen kannst: Termin · Antwort · Frist.
    private struct AgendaRow: Identifiable {
        let id: String
        let kind: String
        let when: String
        let title: String
        let sub: String
        let cta: String
        let hue: Color
        let tint: Color
        let action: () -> Void
    }

    private var agendaRows: [AgendaRow] {
        var rows: [AgendaRow] = []
        if let meeting = state.plannerItems.first(where: { !$0.done && $0.kind == .meeting }) {
            rows.append(AgendaRow(
                id: "meeting", kind: "Termin", when: meeting.dueLabel,
                title: meeting.title, sub: meeting.note.isEmpty ? "Aus deinem Kalender" : meeting.note,
                cta: "Öffnen", hue: MF.indigo, tint: MF.indigoTint
            ) { state.todayPath.append(.calendar) })
        }
        if let waiting = state.matches.first(where: { $0.unread > 0 }) {
            rows.append(AgendaRow(
                id: "reply", kind: "Antwort", when: "Offen",
                title: "\(waiting.card.name) wartet auf dich",
                sub: waiting.messages.last?.text ?? "Neue Nachricht",
                cta: "Antworten", hue: MF.ember, tint: MF.emberTint
            ) { state.todayPath.append(.chat(waiting.id)) })
        }
        if let task = state.plannerItems.first(where: { !$0.done && $0.kind != .meeting }) {
            rows.append(AgendaRow(
                id: "frist", kind: "Frist", when: task.dueLabel,
                title: task.title, sub: task.note.isEmpty ? "Nächster offener Schritt" : task.note,
                cta: "Öffnen", hue: MF.emberDeep, tint: MF.emberTint
            ) { state.todayPath.append(.calendar) })
        }
        return Array(rows.prefix(3))
    }

    @ViewBuilder
    private var deinTagCard: some View {
        let rows = agendaRows
        if !rows.isEmpty {
            VStack(spacing: 0) {
                HStack(spacing: 9) {
                    Image(systemName: "calendar")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(MF.ink)
                    Text("Dein Tag")
                        .font(.system(size: 17.5, weight: .heavy))
                        .tracking(-0.4)
                        .foregroundStyle(MF.ink)
                    Text("· \(rows.count) offen")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(MF.faint)
                    Spacer()
                    Button {
                        Haptics.tap()
                        state.todayPath.append(.calendar)
                    } label: {
                        Text("Kalender")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(MF.ember)
                    }
                    .buttonStyle(.plain)
                }
                .padding(.horizontal, 16)
                .padding(.top, 16)
                .padding(.bottom, 12)

                ForEach(rows) { row in
                    Button {
                        Haptics.tap()
                        row.action()
                    } label: {
                        HStack(spacing: 13) {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(row.kind.uppercased())
                                    .font(.mfMono(9))
                                    .tracking(1.1)
                                    .foregroundStyle(row.hue)
                                Text(row.when)
                                    .font(.system(size: 15, weight: .bold))
                                    .tracking(-0.3)
                                    .foregroundStyle(MF.ink)
                                    .lineLimit(1)
                            }
                            .frame(width: 62, alignment: .leading)
                            Rectangle().fill(MF.borderSoft).frame(width: 1, height: 34)
                            VStack(alignment: .leading, spacing: 1) {
                                Text(row.title)
                                    .font(.system(size: 14.5, weight: .bold))
                                    .foregroundStyle(MF.ink)
                                    .lineLimit(1)
                                Text(row.sub)
                                    .font(.system(size: 12.5))
                                    .foregroundStyle(MF.smoke)
                                    .lineLimit(1)
                            }
                            Spacer(minLength: 0)
                            Text(row.cta)
                                .font(.system(size: 12.5, weight: .bold))
                                .foregroundStyle(row.hue)
                                .padding(.horizontal, 13)
                                .padding(.vertical, 7)
                                .background(row.tint)
                                .clipShape(Capsule())
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 13)
                        .overlay(alignment: .top) {
                            Rectangle().fill(MF.borderSoft).frame(height: 1)
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
            .background(MF.surface)
            .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 24).stroke(MF.border, lineWidth: 1))
            .warmShadow()
        }
    }

    /// Die Zahlen, die zählen — drei Kacheln.
    private var businessPulse: some View {
        VStack(alignment: .leading, spacing: 12) {
            MSectionHead(text: "Business-Puls", action: "Details") {
                state.tab = .profile
            }
            HStack(spacing: 10) {
                pulseTile("bubble.left.and.bubble.right.fill", "\(state.matches.count)", "Aktive Gespräche", MF.indigoTint, MF.indigo) {
                    state.open(.screen(.chats))
                }
                pulseTile("eye.fill", "\(28 + state.matches.count * 5)", "Profil-Aufrufe", MF.surfaceSoft, MF.ink) {
                    state.tab = .profile
                }
                pulseTile("checkmark.seal.fill", "3", "Förderungen passend", MF.emberTint, MF.emberDeep) {
                    state.open(.screen(.documents))
                }
            }
        }
    }

    private func pulseTile(_ icon: String, _ num: String, _ label: String, _ tint: Color, _ ink: Color, action: @escaping () -> Void) -> some View {
        Button {
            Haptics.tap()
            action()
        } label: {
            VStack(alignment: .leading, spacing: 9) {
                Image(systemName: icon)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(ink)
                    .frame(width: 30, height: 30)
                    .background(tint)
                    .clipShape(RoundedRectangle(cornerRadius: 9, style: .continuous))
                VStack(alignment: .leading, spacing: 3) {
                    Text(num)
                        .font(.system(size: 22, weight: .heavy))
                        .tracking(-0.6)
                        .foregroundStyle(MF.ink)
                    Text(label)
                        .font(.system(size: 11.5, weight: .medium))
                        .foregroundStyle(MF.smoke)
                        .lineLimit(2, reservesSpace: true)
                        .multilineTextAlignment(.leading)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 12)
            .padding(.vertical, 13)
            .background(MF.surface)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(MF.border, lineWidth: 1))
            .warmShadow()
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private var launchGuideCard: some View {
        if !state.isLaunchGuideComplete, let step = state.nextLaunchGuideStep {
            let hue = MF.services[step.serviceId] ?? MF.services["cofounder"]!
            VStack(alignment: .leading, spacing: 14) {
                HStack(alignment: .top, spacing: 12) {
                    Image(systemName: "map.fill")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(MF.emberDeep)
                        .frame(width: 40, height: 40)
                        .background(MF.emberTint)
                        .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))

                    VStack(alignment: .leading, spacing: 4) {
                        HStack(spacing: 6) {
                            Text("Start-Assistent")
                                .font(.system(size: 12.5, weight: .heavy))
                                .foregroundStyle(MF.emberDeep)
                            Text("\(state.launchGuideCompletedCount)/\(state.launchGuideSteps.count)")
                                .font(.mfMono(11))
                                .foregroundStyle(MF.faint)
                        }
                        Text(step.title)
                            .font(.system(size: 20, weight: .heavy))
                            .foregroundStyle(MF.ink)
                            .fixedSize(horizontal: false, vertical: true)
                        Text(step.detail)
                            .font(.system(size: 13.5))
                            .foregroundStyle(MF.smoke)
                            .lineSpacing(3)
                    }
                }

                GeometryReader { proxy in
                    ZStack(alignment: .leading) {
                        Capsule().fill(MF.borderSoft)
                        Capsule()
                            .fill(MF.emberGrad)
                            .frame(width: max(14, proxy.size.width * state.launchGuideProgress))
                    }
                }
                .frame(height: 7)

                HStack(spacing: 8) {
                    Button {
                        Haptics.tap()
                        state.startLaunchGuideStep(step)
                    } label: {
                        Label(step.actionTitle, systemImage: step.icon)
                            .font(.system(size: 13.5, weight: .bold))
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 44)
                            .background(LinearGradient(colors: [hue.hue, hue.ink], startPoint: .topLeading, endPoint: .bottomTrailing))
                            .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
                    }
                    .buttonStyle(.plain)

                    Button {
                        Haptics.tap()
                        state.startAppTour()
                    } label: {
                        Image(systemName: "list.bullet.rectangle")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(MF.ink)
                            .frame(width: 44, height: 44)
                            .background(MF.surfaceSoft)
                            .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
                    }
                    .buttonStyle(.plain)
                }

                launchGuideMiniSteps
            }
            .padding(16)
            .background(MF.surface)
            .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 20).stroke(MF.border, lineWidth: 1))
            .warmShadow()
        }
    }

    private var launchGuideMiniSteps: some View {
        VStack(spacing: 7) {
            ForEach(state.launchGuideSteps.prefix(4)) { item in
                HStack(spacing: 8) {
                    Image(systemName: item.completed ? "checkmark.circle.fill" : "circle")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(item.completed ? MF.emberDeep : MF.faint)
                    Text(item.title)
                        .font(.system(size: 12.5, weight: .semibold))
                        .foregroundStyle(item.completed ? MF.faint : MF.inkSoft)
                        .lineLimit(1)
                    Spacer()
                }
            }
        }
        .padding(11)
        .background(MF.surfaceSoft)
        .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
    }

    private var momentumCard: some View {
        let score = founderMomentumScore
        let progress = CGFloat(score) / 100
        let nextWin = state.plannerItems.first(where: { !$0.done })?.title ?? state.currentFounderRadarBrief().investorQuestion
        let activeMatches = state.matches.filter { !$0.messages.isEmpty }.count
        let doneDocuments = state.documents.filter(\.done).count
        let totalDocuments = max(state.documents.count, 1)

        return VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top, spacing: 14) {
                VStack(alignment: .leading, spacing: 7) {
                    HStack(spacing: 8) {
                        Image(systemName: "chart.line.uptrend.xyaxis")
                            .font(.system(size: 13, weight: .bold))
                        Text("Business Fortschritt")
                            .font(.system(size: 12.5, weight: .bold))
                    }
                    .foregroundStyle(MF.emberDeep)

                    Text(momentumHeadline)
                        .font(.system(size: 21, weight: .bold))
                        .foregroundStyle(MF.ink)
                        .fixedSize(horizontal: false, vertical: true)

                    Text("Nächster Win: \(nextWin)")
                        .font(.system(size: 13.5))
                        .foregroundStyle(MF.smoke)
                        .lineLimit(2)
                }

                Spacer(minLength: 8)

                VStack(spacing: 2) {
                    Text("\(score)")
                        .font(.system(size: 28, weight: .heavy, design: .rounded))
                        .foregroundStyle(MF.emberDeep)
                    Text("Score")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(MF.faint)
                }
                .frame(width: 68, height: 68)
                .background(MF.emberTint)
                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            }

            GeometryReader { proxy in
                ZStack(alignment: .leading) {
                    Capsule().fill(MF.borderSoft)
                    Capsule()
                        .fill(MF.emberGrad)
                        .frame(width: max(12, proxy.size.width * progress))
                }
            }
            .frame(height: 8)

            HStack(spacing: 8) {
                momentumMetric("\(state.plannerItems.filter { !$0.done }.count)", "offen", "calendar")
                momentumMetric("\(doneDocuments)/\(totalDocuments)", "Unterlagen", "doc.text.fill")
                momentumMetric("\(activeMatches)", "Gespräche", "bubble.left.and.bubble.right.fill")
            }

            HStack(spacing: 10) {
                Button {
                    Haptics.tap()
                    state.todayPath.append(.calendar)
                } label: {
                    Label("Plan öffnen", systemImage: "calendar")
                        .font(.system(size: 14.5, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 46)
                        .background(MF.ink)
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
                .buttonStyle(.plain)

                Button {
                    state.queueCopilotPrompt(todaySortingPrompt, title: "Heute ordnen")
                } label: {
                    Label("Tag ordnen", systemImage: "sparkles")
                        .font(.system(size: 14.5, weight: .bold))
                        .foregroundStyle(MF.indigoInk)
                        .frame(maxWidth: .infinity)
                        .frame(height: 46)
                        .background(MF.indigoTint)
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(17)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 22).stroke(MF.border, lineWidth: 1))
        .warmShadow()
    }

    private var workspaceMap: some View {
        LazyVGrid(columns: [
            GridItem(.flexible(), spacing: 10),
            GridItem(.flexible(), spacing: 10)
        ], spacing: 10) {
            ForEach(workspaceShortcuts) { shortcut in
                workspaceTile(shortcut)
            }
        }
    }

    private var workspaceShortcuts: [TodayWorkspaceShortcut] {
        let radar = state.currentFounderRadarBrief()
        let openDocs = state.documents.filter { !$0.done }.count
        let openPlan = state.plannerItems.filter { !$0.done }.count
        let unread = state.matches.reduce(0) { total, match in
            total + match.messages.filter { !$0.mine }.count
        }
        let topCandidate = state.cofounderCandidates().first

        return [
            .init(
                id: "radar",
                title: "Radar",
                subtitle: "\(radar.scoreLabel) · Risiko",
                badge: "\(radar.overallScore)",
                icon: "scope",
                serviceId: "capital",
                destination: .screen(.radar)
            ),
            .init(
                id: "calendar",
                title: "Plan",
                subtitle: "\(openPlan) offene Schritte",
                badge: openPlan == 0 ? "klar" : "\(openPlan)",
                icon: "calendar",
                serviceId: "legal",
                destination: .screen(.calendar)
            ),
            .init(
                id: "startup",
                title: "Business",
                subtitle: "\(state.startupTeamMembers.count) Rollen",
                badge: state.companyProfile.stage,
                icon: "person.3.fill",
                serviceId: "cofounder",
                destination: .screen(.startup)
            ),
            .init(
                id: "cofounder",
                title: "Partner",
                subtitle: topCandidate.map { "\($0.card.name) · \($0.total)" } ?? "Hilfe & Mitstreiter",
                badge: topCandidate == nil ? "neu" : "fit",
                icon: "person.2.fill",
                serviceId: "talent",
                destination: .screen(.cofounderDesk)
            ),
            .init(
                id: "chats",
                title: "Chats",
                subtitle: "\(state.matches.count) Matches",
                badge: unread == 0 ? "0" : "\(unread)",
                icon: "bubble.left.and.bubble.right.fill",
                serviceId: "mentor",
                destination: .screen(.chats)
            ),
            .init(
                id: "documents",
                title: "Unterlagen",
                subtitle: openDocs == 0 ? "komplett" : "\(openDocs) offen",
                badge: "\(state.documents.filter(\.done).count)/\(max(state.documents.count, 1))",
                icon: "folder.fill",
                serviceId: "funding",
                destination: .screen(.documents)
            ),
            .init(
                id: "company",
                title: "Firma",
                subtitle: state.companyProfile.isPublished ? "öffentlich" : "intern",
                badge: state.companyProfile.isPublished ? "live" : "draft",
                icon: "building.2.fill",
                serviceId: "growth",
                destination: .screen(.company)
            ),
            .init(
                id: "pilot",
                title: "Co-Pilot",
                subtitle: "\(state.copilotSessions.count) Themen",
                badge: "KI",
                icon: "sparkles",
                serviceId: "capital",
                destination: .screen(.copilot)
            ),
        ]
    }

    private var founderMomentumScore: Int {
        let doneDocs = state.documents.filter(\.done).count
        let activeMatches = state.matches.filter { !$0.messages.isEmpty }.count
        let donePlanner = state.plannerItems.filter(\.done).count
        let published = state.companyProfile.isPublished ? 8 : 0
        let events = state.registeredEvents.count * 4
        return min(100, 32 + doneDocs * 7 + activeMatches * 6 + donePlanner * 5 + published + events)
    }

    private var momentumHeadline: String {
        switch founderMomentumScore {
        case 80...:
            return "Du bist im Präsentationsmodus."
        case 62...:
            return "Guter Druck. Ein klarer Beweis fehlt noch."
        case 45...:
            return "Heute reicht ein sauberer Fortschritt."
        default:
            return "Erst ordnen, dann Tempo aufnehmen."
        }
    }

    private var todaySortingPrompt: String {
        """
        Ordne meinen heutigen Gründungstag aus der App heraus.

        Bitte nutze mein Profil, Business-Radar, offene Kalenderpunkte, Unterlagen, Kontakte und Team.
        Gib mir genau drei Prioritäten in einfacher Sprache, sag was ich ignorieren kann, und schlage konkrete App-Aktionen vor.
        """
    }

    private func momentumMetric(_ value: String, _ label: String, _ icon: String) -> some View {
        HStack(spacing: 7) {
            Image(systemName: icon)
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(MF.emberDeep)
            VStack(alignment: .leading, spacing: 0) {
                Text(value)
                    .font(.system(size: 13, weight: .heavy))
                    .foregroundStyle(MF.ink)
                    .lineLimit(1)
                    .minimumScaleFactor(0.75)
                Text(label)
                    .font(.system(size: 10.5, weight: .semibold))
                    .foregroundStyle(MF.faint)
                    .lineLimit(1)
                    .minimumScaleFactor(0.75)
            }
        }
        .frame(maxWidth: .infinity, minHeight: 46, alignment: .leading)
        .padding(.horizontal, 10)
        .background(MF.surfaceSoft)
        .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
    }

    private func workspaceTile(_ shortcut: TodayWorkspaceShortcut) -> some View {
        let hue = MF.services[shortcut.serviceId] ?? MF.services["cofounder"]!
        return Button {
            Haptics.tap()
            state.open(shortcut.destination)
        } label: {
            VStack(alignment: .leading, spacing: 10) {
                HStack(spacing: 8) {
                    Image(systemName: shortcut.icon)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(hue.ink)
                        .frame(width: 34, height: 34)
                        .background(hue.tint)
                        .clipShape(RoundedRectangle(cornerRadius: 11, style: .continuous))
                    Spacer()
                    Text(shortcut.badge)
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(hue.ink)
                        .lineLimit(1)
                        .minimumScaleFactor(0.65)
                        .padding(.horizontal, 8)
                        .frame(height: 24)
                        .background(hue.tint)
                        .clipShape(Capsule())
                }

                VStack(alignment: .leading, spacing: 3) {
                    Text(shortcut.title)
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(MF.ink)
                        .lineLimit(1)
                    Text(shortcut.subtitle)
                        .font(.system(size: 12.3))
                        .foregroundStyle(MF.smoke)
                        .lineLimit(1)
                        .minimumScaleFactor(0.75)
                }
            }
            .padding(13)
            .frame(maxWidth: .infinity, minHeight: 112, alignment: .topLeading)
            .background(MF.surface)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(MF.border, lineWidth: 1))
            .warmShadow()
        }
        .buttonStyle(.plain)
    }

    private var radarEntry: some View {
        let brief = state.currentFounderRadarBrief()
        return Button {
            Haptics.tap()
            state.todayPath.append(.radar)
        } label: {
            HStack(spacing: 13) {
                ZStack {
                    Circle()
                        .stroke(MF.indigoTint, lineWidth: 5)
                    Circle()
                        .trim(from: 0, to: CGFloat(brief.overallScore) / 100)
                        .stroke(MF.indigo, style: StrokeStyle(lineWidth: 5, lineCap: .round))
                        .rotationEffect(.degrees(-90))
                    Text("\(brief.overallScore)")
                        .font(.system(size: 13, weight: .heavy, design: .rounded))
                        .foregroundStyle(MF.indigoInk)
                }
                .frame(width: 48, height: 48)

                VStack(alignment: .leading, spacing: 3) {
                    Text("Business Radar")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(MF.ink)
                    Text("\(brief.scoreLabel) · \(brief.primaryRisk)")
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
            .clipShape(RoundedRectangle(cornerRadius: 17, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 17).stroke(MF.border, lineWidth: 1))
            .warmShadow()
        }
        .buttonStyle(.plain)
    }

    private var startupEntry: some View {
        Button {
            Haptics.tap()
            state.todayPath.append(.startup)
        } label: {
            HStack(spacing: 12) {
                Image(systemName: "building.2.crop.circle")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(MF.indigoInk)
                    .frame(width: 44, height: 44)
                    .background(MF.indigoTint)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                VStack(alignment: .leading, spacing: 3) {
                    Text("Business Workspace")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(MF.ink)
                    Text("\(state.startupTeamMembers.count) Rollen · \(state.plannerItems.filter { !$0.done }.count) offene Schritte · Unterlagen")
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
            .clipShape(RoundedRectangle(cornerRadius: 17, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 17).stroke(MF.border, lineWidth: 1))
            .warmShadow()
        }
        .buttonStyle(.plain)
    }

    private var cofounderTrialEntry: some View {
        let candidates = state.cofounderCandidates()
        let top = candidates.first
        return Button {
            Haptics.tap()
            state.open(.screen(.cofounderDesk))
        } label: {
            HStack(spacing: 12) {
                Image(systemName: "person.2.fill")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(MF.emberDeep)
                    .frame(width: 44, height: 44)
                    .background(MF.emberTint)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                VStack(alignment: .leading, spacing: 3) {
                    Text("Partner-Check")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(MF.ink)
                    Text(top.map { "\($0.card.name) · \($0.total) Score · Test-Gespräch bereit" } ?? "Hilfe, Partner, Shortlist und nächstes Gespräch")
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
            .clipShape(RoundedRectangle(cornerRadius: 17, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 17).stroke(MF.border, lineWidth: 1))
            .warmShadow()
        }
        .buttonStyle(.plain)
    }

    // ─── Fokale Karte — die eine Ember-Fläche des Screens ─────
    private var focalCard: some View {
        let venture = state.profile?.industry.ventureTerm ?? "Vorhaben"
        return VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 8) {
                Image(systemName: "sparkle")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.95))
                Text("Dein nächster Schritt · Co-Pilot")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.8))
            }
            .padding(.bottom, 10)

            Text(focusDone
                 ? "Stark. Der nächste Schritt wartet morgen."
                 : "Rechne heute deine Startkosten durch.")
                .font(.system(size: 22, weight: .bold))
                .foregroundStyle(.white)
                .fixedSize(horizontal: false, vertical: true)

            Text(focusDone
                 ? "Erledigt abgehakt — dein \(venture) ist einen Schritt weiter."
                 : "Drei Töpfe, eine Formel — danach weißt du, was dein \(venture) wirklich braucht.")
                .font(.system(size: 14))
                .foregroundStyle(.white.opacity(0.85))
                .lineSpacing(3)
                .padding(.top, 8)
                .padding(.bottom, 16)

            HStack(spacing: 9) {
                Button {
                    Haptics.tap()
                    state.open(.guide("startkosten-rechnen"))
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "book.fill")
                            .font(.system(size: 13, weight: .semibold))
                        Text("Loslegen")
                            .font(.system(size: 14.5, weight: .bold))
                    }
                    .foregroundStyle(MF.emberDeep)
                    .frame(maxWidth: .infinity)
                    .frame(height: 46)
                    .background(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                .buttonStyle(.plain)

                Button {
                    Haptics.success()
                    withAnimation(.easeOut(duration: 0.25)) { focusDone.toggle() }
                } label: {
                    Text(focusDone ? "Zurück" : "Erledigt")
                        .font(.system(size: 14.5, weight: .semibold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 18)
                        .frame(height: 46)
                        .background(.white.opacity(0.14))
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: 12)
                            .stroke(.white.opacity(0.3), lineWidth: 1))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(MF.emberGrad)
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        .emberGlow()
    }

    // ─── Agenda-Strip: 3 Karten mit 3px Service-Farbband oben ─
    private var agendaStrip: some View {
        HStack(spacing: 10) {
            ForEach(Array(state.plannerItems.filter { !$0.done }.prefix(3))) { item in
                let hue = MF.services[item.kind.serviceId] ?? MF.services["cofounder"]!
                Button {
                    Haptics.tap()
                    if let target = item.target {
                        state.open(target.destination)
                    } else {
                        state.todayPath.append(.calendar)
                    }
                } label: {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(item.dueLabel)
                            .font(.system(size: 13, weight: .bold))
                            .foregroundStyle(MF.ink)
                            .lineLimit(1)
                            .minimumScaleFactor(0.75)
                        Text(item.title)
                            .font(.system(size: 11.5))
                            .foregroundStyle(MF.smoke)
                            .lineLimit(2)
                            .multilineTextAlignment(.leading)
                    }
                    .padding(13)
                    .frame(maxWidth: .infinity, minHeight: 72, alignment: .topLeading)
                    .background(MF.surface)
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .overlay(alignment: .top) {
                        UnevenRoundedRectangle(topLeadingRadius: 16, topTrailingRadius: 16)
                            .fill(hue.hue)
                            .frame(height: 3)
                    }
                    .overlay(RoundedRectangle(cornerRadius: 16).stroke(MF.border, lineWidth: 1))
                    .warmShadow()
                }
                .buttonStyle(.plain)
            }
        }
    }

    // ─── Aktivitäts-Feed: weiße Karte, Hairline-Zeilen ────────
    @ViewBuilder
    private var activityFeed: some View {
        let items = activityItems
        VStack(spacing: 0) {
            if items.isEmpty {
                VStack(spacing: 10) {
                    Image(systemName: "tray")
                        .font(.system(size: 24, weight: .semibold))
                        .foregroundStyle(MF.faint)
                    Text("Noch keine Aktivität")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(MF.ink)
                    Text("Sobald echte Matches, Nachrichten oder Plan-Schritte entstehen, landen sie hier.")
                        .font(.system(size: 13))
                        .foregroundStyle(MF.smoke)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding(22)
            } else {
                ForEach(Array(items.enumerated()), id: \.element.id) { idx, item in
                let hue = MF.services[item.serviceId] ?? MF.services["cofounder"]!
                Button {
                    Haptics.tap()
                    if let matchId = item.matchId {
                        state.tab = .today
                        state.todayPath = [.chat(matchId)]
                    } else if let destination = item.destination {
                        state.open(destination)
                    } else {
                        state.open(.screen(.copilot))
                    }
                } label: {
                    HStack(alignment: .top, spacing: 12) {
                        Text(initials(item.name))
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(hue.ink)
                            .frame(width: 40, height: 40)
                            .background(hue.tint)
                            .clipShape(Circle())

                        VStack(alignment: .leading, spacing: 3) {
                            HStack(spacing: 7) {
                                Text(item.name)
                                    .font(.system(size: 14.5, weight: .bold))
                                    .foregroundStyle(MF.ink)
                                if item.hot {
                                    Circle().fill(MF.ember).frame(width: 6, height: 6)
                                }
                                Spacer()
                                Text(item.time)
                                    .font(.system(size: 11.5))
                                    .foregroundStyle(MF.faint)
                            }
                            HStack(spacing: 7) {
                                Circle().fill(hue.hue).frame(width: 7, height: 7)
                                Text(serviceShort(item.serviceId))
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundStyle(hue.ink)
                                Text("· \(item.status)")
                                    .font(.system(size: 12))
                                    .foregroundStyle(MF.faint)
                            }
                            Text(item.note)
                                .font(.system(size: 13.5))
                                .foregroundStyle(MF.smoke)
                                .lineLimit(2)
                                .multilineTextAlignment(.leading)
                        }
                    }
                    .padding(.horizontal, 15)
                    .padding(.vertical, 14)
                }
                .buttonStyle(.plain)
                    if idx < items.count - 1 {
                    Divider().overlay(MF.borderSoft).padding(.leading, 15)
                }
            }
            }
        }
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(MF.border, lineWidth: 1))
        .warmShadow()
    }

    private var activityItems: [TodayActivityItem] {
        let matchItems = state.matches
            .filter { !$0.messages.isEmpty || $0.unread > 0 }
            .prefix(3)
            .map { match in
                TodayActivityItem(
                    id: "match-\(match.id)",
                    serviceId: "cofounder",
                    name: match.card.name,
                    status: match.unread > 0 ? "Neue Nachricht" : "Match",
                    note: match.lastPreview,
                    time: "jetzt",
                    hot: match.unread > 0,
                    matchId: match.id,
                    destination: nil
                )
            }
        let remaining = max(0, 4 - matchItems.count)
        let planItems = state.plannerItems
            .filter { !$0.done }
            .prefix(remaining)
            .map { item in
                TodayActivityItem(
                    id: "plan-\(item.id.uuidString)",
                    serviceId: item.kind.serviceId,
                    name: item.kind.label,
                    status: item.dueLabel,
                    note: item.title,
                    time: item.dueLabel,
                    hot: item.dueLabel == "Heute",
                    matchId: nil,
                    destination: item.target?.destination
                )
            }
        return Array(matchItems) + Array(planItems)
    }

    private func initials(_ name: String) -> String {
        String(name.split(separator: " ").prefix(2).compactMap(\.first)).uppercased()
    }

    private func serviceShort(_ id: String) -> String {
        serviceCatalog.first { $0.id == id }?.label.split(separator: " ").first.map(String.init) ?? "Info"
    }
}

private struct TodayActivityItem: Identifiable {
    let id: String
    let serviceId: String
    let name: String
    let status: String
    let note: String
    let time: String
    let hot: Bool
    let matchId: String?
    let destination: CopilotDestination?
}

private struct TodayWorkspaceShortcut: Identifiable {
    let id: String
    let title: String
    let subtitle: String
    let badge: String
    let icon: String
    let serviceId: String
    let destination: CopilotDestination
}
