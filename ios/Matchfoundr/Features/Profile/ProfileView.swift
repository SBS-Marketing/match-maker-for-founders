// Profil — 4. Tab nach Design: eigenes Profil, jederzeit editierbar,
// plus Wege zu Chats, Events, Premium.

import SwiftUI

enum ProfileRoute: Hashable {
    case company
    case documents
    case memory
}

struct ProfileView: View {
    @EnvironmentObject var state: AppState
    @Environment(\.openURL) private var openURL
    @State private var editing = false
    @State private var confirmingSignOut = false
    @State private var path: [ProfileRoute] = []

    var body: some View {
        NavigationStack(path: $path) {
            VStack(spacing: 0) {
                MShellTop(title: "Profil", subtitle: state.profile?.industry.label) {
                    Button {
                        Haptics.tap()
                        editing = true
                    } label: {
                        Text("Bearbeiten")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(MF.emberDeep)
                            .padding(.horizontal, 13).frame(height: 36)
                            .background(MF.emberTint)
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                }
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        heroCard
                        statsRow
                        MSectionHead(text: "App & Workspace")
                        workspaceRows
                        MSectionHead(text: "Meine Events")
                        myEvents
                        MSectionHead(text: "Verknüpfungen", action: "Aktualisieren") {
                            Task {
                                await state.refreshConnectedAccounts()
                                await state.refreshMorningReport()
                            }
                        }
                        integrationsCard
                        morningBriefingCard
                        MSectionHead(text: "MCP-Werkzeuge", action: "Co-Pilot") {
                            state.openMCPSetupInCopilot()
                        }
                        mcpConnectorsCard
                        MSectionHead(text: "KI-Nutzung")
                        aiUsageCard
                        memoryAccessCard
                        MSectionHead(text: "Konto")
                        accountRows
                    }
                    .padding(20)
                    .padding(.bottom, 90)
                }
                .scrollIndicators(.hidden)
            }
            .background(MF.canvas.ignoresSafeArea())
            .toolbar(.hidden, for: .navigationBar)
            .navigationDestination(for: ProfileRoute.self) { route in
                switch route {
                case .company: CompanyProfileView()
                case .documents: DocumentsView()
                case .memory: ProfileMemoryView()
                }
            }
            .sheet(isPresented: $editing) {
                ProfileEditSheet()
                    .presentationDetents([.large])
                    .presentationCornerRadius(26)
            }
        }
        .tint(MF.emberDeep)
        .task {
            await state.refreshConnectedAccounts(showLoading: false)
            await state.refreshMorningReport(showLoading: false)
        }
        .confirmationDialog("Abmelden?", isPresented: $confirmingSignOut, titleVisibility: .visible) {
            Button("Abmelden", role: .destructive) {
                Task { await state.signOut() }
            }
            Button("Abbrechen", role: .cancel) { }
        } message: {
            Text("Du kannst dich danach jederzeit wieder mit deinem Supabase-Konto anmelden.")
        }
    }

    // ─── Hero: Avatar, Name, Rolle, Pitch, Skills ─────────────
    private var heroCard: some View {
        let p = state.profile
        return VStack(alignment: .leading, spacing: 0) {
            bannerGradient
                .frame(height: 86)
            VStack(alignment: .leading, spacing: 6) {
                MFAvatar(name: p?.name ?? "F", size: 72)
                    .overlay(Circle().stroke(.white, lineWidth: 3))
                    .offset(y: -36)
                    .padding(.bottom, -30)
                Text(p?.name ?? "Founder")
                    .font(.system(size: 21, weight: .bold))
                    .foregroundStyle(MF.ink)
                HStack(spacing: 7) {
                    Circle().fill(MF.ember).frame(width: 8, height: 8)
                    Text(state.profileExtras.headline.isEmpty
                         ? "\(p?.role ?? "Founder") · \(p?.availability.label ?? "")"
                         : state.profileExtras.headline)
                        .font(.system(size: 13.5, weight: .semibold))
                        .foregroundStyle(MF.emberDeep)
                        .lineLimit(2)
                }
                if let pitch = p?.pitch, !pitch.isEmpty {
                    Text("„\(pitch)“")
                        .font(.system(size: 14, design: .serif)).italic()
                        .foregroundStyle(MF.smoke)
                        .lineSpacing(3)
                        .padding(.top, 7)
                }
                if !state.profileExtras.about.isEmpty && state.profileExtras.about != p?.pitch {
                    Text(state.profileExtras.about)
                        .font(.system(size: 13.5))
                        .foregroundStyle(MF.inkSoft)
                        .lineSpacing(3)
                        .padding(.top, 5)
                }
                if let skills = p?.skills, !skills.isEmpty {
                    FlowLayout(spacing: 7) {
                        ForEach(skills, id: \.self) { skill in
                            Text(skill)
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundStyle(MF.smoke)
                                .padding(.horizontal, 11).padding(.vertical, 6)
                                .background(MF.surfaceSoft)
                                .clipShape(Capsule())
                        }
                    }
                    .padding(.top, 9)
                }
                socialLinks
                    .padding(.top, 9)
                Button {
                    Haptics.tap()
                    path.append(.company)
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "building.2.fill")
                            .font(.system(size: 13, weight: .semibold))
                        Text("Firmenprofil öffnen")
                            .font(.system(size: 14, weight: .bold))
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.system(size: 11, weight: .bold))
                    }
                    .foregroundStyle(.white)
                    .padding(.horizontal, 14)
                    .frame(height: 44)
                    .background(MF.emberGrad)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
                .buttonStyle(.plain)
                .padding(.top, 12)
            }
            .padding(.horizontal, 18).padding(.bottom, 18)
        }
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 22).stroke(MF.border, lineWidth: 1))
        .warmShadow(large: true)
    }

    private var bannerGradient: some View {
        Group {
            switch state.profileExtras.bannerStyle {
            case .ember:
                MF.emberGrad
            case .indigo:
                MF.indigoGrad
            case .forest:
                LinearGradient(colors: [Color(hex: 0x2E9E50), Color(hex: 0x0B6B57)],
                               startPoint: .topLeading, endPoint: .bottomTrailing)
            }
        }
    }

    @ViewBuilder
    private var socialLinks: some View {
        let links: [(SocialKind, String)] = [
            (.website, state.profileExtras.websiteURL),
            (.linkedin, state.profileExtras.linkedinURL),
            (.github, state.profileExtras.githubURL),
        ].filter { !$0.1.trimmingCharacters(in: .whitespaces).isEmpty }
        if !links.isEmpty {
            FlowLayout(spacing: 7) {
                ForEach(links, id: \.0) { kind, _ in
                    HStack(spacing: 5) {
                        Image(systemName: kind.icon)
                            .font(.system(size: 10, weight: .semibold))
                        Text(kind.label)
                            .font(.system(size: 12, weight: .semibold))
                    }
                    .foregroundStyle(MF.emberDeep)
                    .padding(.horizontal, 11)
                    .frame(height: 31)
                    .background(MF.emberTint)
                    .clipShape(Capsule())
                }
            }
        }
    }

    private var statsRow: some View {
        HStack(spacing: 10) {
            stat(value: "\(state.matches.count)", label: "Matches")
            stat(value: state.isPremium ? "∞" : "\(state.swipesLeft)", label: "Swipes heute")
            stat(value: "\(state.registeredEvents.count)", label: "Events")
        }
    }

    private func stat(value: String, label: String) -> some View {
        VStack(spacing: 3) {
            Text(value)
                .font(.system(size: 18, weight: .heavy))
                .foregroundStyle(MF.ink)
            Text(label)
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(MF.faint)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 13)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(MF.border, lineWidth: 1))
        .warmShadow()
    }

    private var workspaceRows: some View {
        VStack(spacing: 0) {
            accountRow(icon: "scope", label: "Business Radar") {
                state.open(.screen(.radar))
            }
            Divider().overlay(MF.borderSoft).padding(.leading, 52)
            accountRow(icon: "calendar", label: "Kalender & Plan",
                       badge: state.plannerItems.filter { !$0.done }.count) {
                state.open(.screen(.calendar))
            }
            Divider().overlay(MF.borderSoft).padding(.leading, 52)
            accountRow(icon: "person.3.fill", label: "Business Workspace") {
                state.open(.screen(.startup))
            }
            Divider().overlay(MF.borderSoft).padding(.leading, 52)
            accountRow(icon: "building.2.fill", label: "Firmenprofil bearbeiten") {
                path.append(.company)
            }
            Divider().overlay(MF.borderSoft).padding(.leading, 52)
            accountRow(icon: "folder.fill", label: "Unterlagen & Förderpaket",
                       badge: state.documents.filter { !$0.done }.count) {
                path.append(.documents)
            }
            Divider().overlay(MF.borderSoft).padding(.leading, 52)
            accountRow(icon: "calendar.badge.plus", label: "Events & Partner") {
                state.open(.screen(.events))
            }
        }
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(MF.border, lineWidth: 1))
        .warmShadow()
    }

    // ─── Verknüpfungen & Morgenbriefing ──────────────────────
    private var integrationsCard: some View {
        VStack(spacing: 0) {
            ForEach(IntegrationProvider.allCases) { provider in
                integrationRow(provider)
                if provider != .whatsapp {
                    Divider().overlay(MF.borderSoft).padding(.leading, 58)
                }
            }

            if let message = state.integrationMessage {
                HStack(alignment: .top, spacing: 9) {
                    Image(systemName: message.contains("fehl") || message.contains("konnte") ? "exclamationmark.triangle.fill" : "checkmark.seal.fill")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(message.contains("fehl") || message.contains("konnte") ? MF.emberDeep : Color.green)
                    Text(message)
                        .font(.system(size: 12.2, weight: .semibold))
                        .foregroundStyle(MF.smoke)
                        .fixedSize(horizontal: false, vertical: true)
                    Spacer(minLength: 0)
                }
                .padding(12)
                .background(MF.surfaceSoft)
                .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
                .padding(.horizontal, 12)
                .padding(.bottom, 12)
            }
        }
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(MF.border, lineWidth: 1))
        .warmShadow()
    }

    private func integrationRow(_ provider: IntegrationProvider) -> some View {
        let connection = state.connectedAccount(for: provider)
        let hue = MF.services[provider.tintKey] ?? MF.services["capital"]!
        let isBusy = state.integrationBusyProvider == provider
        let isActive = connection?.isConnected == true
        let isPending = connection?.isPending == true
        return HStack(alignment: .center, spacing: 12) {
            Image(systemName: provider.icon)
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(hue.ink)
                .frame(width: 36, height: 36)
                .background(hue.tint)
                .clipShape(RoundedRectangle(cornerRadius: 11, style: .continuous))

            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 7) {
                    Text(provider.label)
                        .font(.system(size: 14.5, weight: .bold))
                        .foregroundStyle(MF.ink)
                    if let connection {
                        Text(connection.statusLabel)
                            .font(.system(size: 10.5, weight: .bold))
                            .foregroundStyle(isActive ? hue.ink : MF.faint)
                            .padding(.horizontal, 7)
                            .frame(height: 20)
                            .background(isActive ? hue.tint : MF.surfaceSoft)
                            .clipShape(Capsule())
                    }
                }
                Text(connection?.displayLabel ?? provider.detail)
                    .font(.system(size: 12.3, weight: .medium))
                    .foregroundStyle(MF.smoke)
                    .lineLimit(2)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 8)
            Button {
                if connection != nil {
                    Task { await state.disconnectIntegration(provider) }
                } else {
                    Task {
                        if let url = await state.integrationConnectURL(for: provider) {
                            openURL(url)
                        }
                    }
                }
            } label: {
                HStack(spacing: 6) {
                    if isBusy {
                        ProgressView()
                            .controlSize(.small)
                            .tint(connection == nil ? .white : hue.ink)
                    } else {
                        Image(systemName: connection == nil ? "link" : "xmark")
                            .font(.system(size: 11, weight: .bold))
                    }
                    Text(connection == nil ? (provider == .whatsapp ? "Anfragen" : "Verbinden") : "Trennen")
                        .font(.system(size: 12.3, weight: .bold))
                }
                .foregroundStyle(connection == nil ? .white : hue.ink)
                .padding(.horizontal, 11)
                .frame(height: 34)
                .background(connection == nil ? AnyShapeStyle(hue.hue) : AnyShapeStyle(hue.tint))
                .clipShape(Capsule())
            }
            .buttonStyle(.plain)
            .disabled(isBusy)
        }
        .padding(.horizontal, 15)
        .padding(.vertical, 13)
        .opacity(isPending ? 0.92 : 1)
    }

    private var morningBriefingCard: some View {
        let report = state.morningReport
        let isLoading = state.morningReportState == .loading
        return VStack(alignment: .leading, spacing: 13) {
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: "sunrise.fill")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(MF.emberDeep)
                    .frame(width: 42, height: 42)
                    .background(MF.emberTint)
                    .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
                VStack(alignment: .leading, spacing: 3) {
                    Text("Morgenbriefing")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(MF.ink)
                    Text(report?.formattedDate ?? "Taeglich um 8:00 · \(state.connectedIntegrationSummary)")
                        .font(.system(size: 12.5, weight: .semibold))
                        .foregroundStyle(MF.smoke)
                        .lineLimit(1)
                }
                Spacer()
                if isLoading {
                    ProgressView()
                        .controlSize(.small)
                        .tint(MF.ember)
                        .padding(.top, 9)
                }
            }

            Text(report?.content.safeFocus ?? "Verbinde Gmail und Kalender, dann bereitet der Co-Pilot morgens Mails, Antwortentwuerfe, Termine und deine naechsten Schritte vor.")
                .font(.system(size: 13.6, weight: .medium))
                .foregroundStyle(MF.inkSoft)
                .lineSpacing(3)
                .fixedSize(horizontal: false, vertical: true)

            if let report {
                HStack(spacing: 8) {
                    briefingMetric("\(report.content.wichtigeMails?.count ?? 0)", "Mails")
                    briefingMetric("\(report.content.draftVorschlaege?.count ?? 0)", "Entwürfe")
                    briefingMetric("\(report.content.erkannteTermine?.count ?? 0)", "Termine")
                }
            }

            if case .failed(let message) = state.morningReportState {
                Text(message)
                    .font(.system(size: 12.1, weight: .semibold))
                    .foregroundStyle(MF.emberDeep)
                    .lineLimit(2)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(10)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(MF.emberTint)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            }

            HStack(spacing: 8) {
                Button {
                    Task { await state.runMorningReportNow() }
                } label: {
                    HStack(spacing: 7) {
                        Image(systemName: "wand.and.stars")
                            .font(.system(size: 11, weight: .bold))
                        Text(report == nil ? "Jetzt erstellen" : "Neu erstellen")
                            .font(.system(size: 12.5, weight: .bold))
                    }
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 38)
                    .background(MF.emberGrad)
                    .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
                }
                .buttonStyle(.plain)
                .disabled(isLoading)

                Button {
                    Haptics.tap()
                    state.openMorningReportInCopilot()
                } label: {
                    HStack(spacing: 7) {
                        Image(systemName: "sparkles")
                            .font(.system(size: 11, weight: .bold))
                        Text("Durchgehen")
                            .font(.system(size: 12.5, weight: .bold))
                    }
                    .foregroundStyle(MF.indigoInk)
                    .frame(maxWidth: .infinity)
                    .frame(height: 38)
                    .background(MF.indigoTint)
                    .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(15)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(MF.border, lineWidth: 1))
        .warmShadow()
    }

    private var mcpConnectorsCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: "point.3.connected.trianglepath.dotted")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 42, height: 42)
                    .background(MF.indigoGrad)
                    .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))

                VStack(alignment: .leading, spacing: 3) {
                    Text("Co-Pilot Werkzeugkasten")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(MF.ink)
                    Text(state.connectedMCPConnectorSummary)
                        .font(.system(size: 12.5, weight: .semibold))
                        .foregroundStyle(MF.smoke)
                        .lineLimit(1)
                }
                Spacer()
                Text("\(state.mcpConnectorLinks.filter(\.isConnected).count)/\(MCPConnectorID.recommended.count)")
                    .font(.system(size: 12, weight: .heavy))
                    .foregroundStyle(MF.indigoInk)
                    .padding(.horizontal, 9)
                    .frame(height: 28)
                    .background(MF.indigoTint)
                    .clipShape(Capsule())
            }

            Text("Aktiviere die Werkzeuge, die der Co-Pilot bei Recherche, Unterlagen, Team, Shop, Buchhaltung oder lokaler Sichtbarkeit einplanen darf.")
                .font(.system(size: 13.2, weight: .medium))
                .foregroundStyle(MF.inkSoft)
                .lineSpacing(3)
                .fixedSize(horizontal: false, vertical: true)

            VStack(spacing: 0) {
                ForEach(Array(MCPConnectorID.recommended.enumerated()), id: \.element.id) { index, connector in
                    mcpConnectorRow(connector)
                    if index < MCPConnectorID.recommended.count - 1 {
                        Divider().overlay(MF.borderSoft).padding(.leading, 58)
                    }
                }
            }
            .background(MF.surfaceSoft)
            .clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))

            if let message = state.mcpConnectorMessage {
                HStack(alignment: .top, spacing: 9) {
                    Image(systemName: "checkmark.seal.fill")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(MF.indigoInk)
                    Text(message)
                        .font(.system(size: 12.2, weight: .semibold))
                        .foregroundStyle(MF.smoke)
                        .fixedSize(horizontal: false, vertical: true)
                    Spacer(minLength: 0)
                }
                .padding(12)
                .background(MF.indigoTint.opacity(0.7))
                .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
            }
        }
        .padding(15)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(MF.border, lineWidth: 1))
        .warmShadow()
    }

    private func mcpConnectorRow(_ connector: MCPConnectorID) -> some View {
        let link = state.mcpLink(for: connector)
        let isActive = link?.isConnected == true
        let hue = MF.services[connector.tintKey] ?? MF.services["capital"]!
        return HStack(alignment: .top, spacing: 12) {
            Image(systemName: connector.icon)
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(hue.ink)
                .frame(width: 36, height: 36)
                .background(hue.tint)
                .clipShape(RoundedRectangle(cornerRadius: 11, style: .continuous))

            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 7) {
                    Text(connector.label)
                        .font(.system(size: 14.3, weight: .bold))
                        .foregroundStyle(MF.ink)
                        .lineLimit(1)
                    Text(isActive ? "aktiv" : connector.category)
                        .font(.system(size: 10.5, weight: .bold))
                        .foregroundStyle(isActive ? hue.ink : MF.faint)
                        .padding(.horizontal, 7)
                        .frame(height: 20)
                        .background(isActive ? hue.tint : MF.surface)
                        .clipShape(Capsule())
                }

                Text(connector.detail)
                    .font(.system(size: 12.2, weight: .medium))
                    .foregroundStyle(MF.smoke)
                    .lineLimit(2)
                    .fixedSize(horizontal: false, vertical: true)

                FlowLayout(spacing: 6) {
                    ForEach(connector.tools, id: \.self) { tool in
                        Text(tool)
                            .font(.system(size: 10.8, weight: .bold))
                            .foregroundStyle(hue.ink)
                            .padding(.horizontal, 8)
                            .frame(height: 24)
                            .background(hue.tint.opacity(isActive ? 1 : 0.55))
                            .clipShape(Capsule())
                    }
                }
            }
            Spacer(minLength: 8)
            Button {
                Haptics.tap()
                state.toggleMCPConnector(connector)
            } label: {
                Image(systemName: isActive ? "xmark" : "plus")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(isActive ? hue.ink : .white)
                    .frame(width: 34, height: 34)
                    .background(isActive ? AnyShapeStyle(hue.tint) : AnyShapeStyle(hue.hue))
                    .clipShape(Capsule())
            }
            .buttonStyle(.plain)
            .accessibilityLabel(isActive ? "\(connector.label) trennen" : "\(connector.label) aktivieren")
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 12)
    }

    private func briefingMetric(_ value: String, _ label: String) -> some View {
        VStack(spacing: 2) {
            Text(value)
                .font(.system(size: 15, weight: .heavy))
                .foregroundStyle(MF.ink)
            Text(label)
                .font(.system(size: 10.5, weight: .semibold))
                .foregroundStyle(MF.faint)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 9)
        .background(MF.surfaceSoft)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private var aiUsageCard: some View {
        let usage = state.currentAIUsage()
        return VStack(alignment: .leading, spacing: 13) {
            HStack(spacing: 10) {
                Image(systemName: "sparkles")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 38, height: 38)
                    .background(MF.indigoGrad)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                VStack(alignment: .leading, spacing: 2) {
                    Text("\(usage.planName)-Kontingent")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(MF.ink)
                    Text(usage.trialLabel ?? "Limits schützen die KI-Kosten.")
                        .font(.system(size: 12.5, weight: .semibold))
                        .foregroundStyle(MF.smoke)
                }
                Spacer()
                if !state.isPremium {
                    Button {
                        state.paywall = .aiUsage
                    } label: {
                        Text("Pro testen")
                            .font(.system(size: 12.5, weight: .bold))
                            .foregroundStyle(MF.indigoInk)
                            .padding(.horizontal, 11)
                            .frame(height: 32)
                            .background(MF.indigoTint)
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                }
            }

            usageMeter(
                title: "Heute",
                used: usage.usedToday,
                limit: usage.dailyLimit,
                ratio: usage.dayRatio,
                remaining: usage.remainingToday
            )
            usageMeter(
                title: "Diese Woche",
                used: usage.usedThisWeek,
                limit: usage.weeklyLimit,
                ratio: usage.weekRatio,
                remaining: usage.remainingThisWeek
            )

            Text("Vorschlag: Standard 2k/8k Tokens, Pro 25k/120k Tokens. Harte Stops verhindern unerwartete KI-Kosten; später können wir zusätzlich Modellqualität nach Aufgabe staffeln.")
                .font(.system(size: 12.3))
                .foregroundStyle(MF.faint)
                .lineSpacing(2)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(15)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(MF.border, lineWidth: 1))
        .warmShadow()
    }

    private func usageMeter(title: String, used: Int, limit: Int, ratio: Double, remaining: Int) -> some View {
        VStack(alignment: .leading, spacing: 7) {
            HStack {
                Text(title)
                    .font(.system(size: 12.5, weight: .bold))
                    .foregroundStyle(MF.ink)
                Spacer()
                Text("\(remaining) übrig")
                    .font(.system(size: 11.5, weight: .semibold))
                    .foregroundStyle(MF.faint)
            }
            ProgressView(value: ratio)
                .tint(ratio > 0.82 ? MF.ember : MF.indigo)
            Text("\(used) / \(limit) Tokens")
                .font(.system(size: 11.5, weight: .semibold))
                .foregroundStyle(MF.smoke)
        }
        .padding(12)
        .background(MF.surfaceSoft)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private var memoryAccessCard: some View {
        Button {
            Haptics.tap()
            path.append(.memory)
        } label: {
            HStack(spacing: 12) {
                Image(systemName: "brain.head.profile")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 38, height: 38)
                    .background(MF.indigoGrad)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                VStack(alignment: .leading, spacing: 2) {
                    Text("Co-Pilot Memory")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(MF.ink)
                    Text("\(state.copilotFacts.count) gespeicherte Fakten · \(state.founderMemory.compactSummary)")
                        .font(.system(size: 12.5, weight: .semibold))
                        .foregroundStyle(MF.smoke)
                        .lineLimit(1)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(MF.faint)
            }
            .padding(15)
            .background(MF.surface)
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 18).stroke(MF.border, lineWidth: 1))
            .warmShadow()
        }
        .buttonStyle(.plain)
    }

    // ─── Angemeldete Events ───────────────────────────────────
    private var myEvents: some View {
        let mine = state.events.filter { state.registeredEvents.contains($0.id) }
        return Group {
            if mine.isEmpty {
                Button {
                    Haptics.tap()
                    state.open(.screen(.events))
                } label: {
                    HStack(spacing: 10) {
                        Image(systemName: "calendar.badge.plus")
                            .font(.system(size: 15)).foregroundStyle(MF.emberDeep)
                        Text("Noch nichts geplant — Events entdecken")
                            .font(.system(size: 13.5, weight: .semibold))
                            .foregroundStyle(MF.ink)
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(MF.faint)
                    }
                    .padding(14)
                    .background(MF.surface)
                    .clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 15).stroke(MF.border, lineWidth: 1))
                }
                .buttonStyle(.plain)
            } else {
                VStack(spacing: 10) {
                    ForEach(mine) { event in
                        Button {
                            Haptics.tap()
                            state.tab = .community
                            state.communityPath = [.event(event.id)]
                        } label: {
                            EventCard(event: event, registered: true)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }

    // ─── Konto-Zeilen ─────────────────────────────────────────
    private var accountRows: some View {
        VStack(spacing: 0) {
            backendRow
            Divider().overlay(MF.borderSoft).padding(.leading, 52)
            authAccountRow
            Divider().overlay(MF.borderSoft).padding(.leading, 52)
            accountRow(icon: "rectangle.portrait.and.arrow.right", label: "Abmelden", destructive: true) {
                confirmingSignOut = true
            }
            Divider().overlay(MF.borderSoft).padding(.leading, 52)
            accountRow(icon: "bolt.fill", label: state.isPremium ? "Premium aktiv" : "Premium testen") {
                if !state.isPremium { state.paywall = .swipes }
            }
            Divider().overlay(MF.borderSoft).padding(.leading, 52)
            accountRow(icon: "sparkles", label: "App-Tour starten") {
                state.startAppTour()
            }
            Divider().overlay(MF.borderSoft).padding(.leading, 52)
            accountRow(icon: "arrow.counterclockwise", label: "Onboarding neu starten") {
                state.restartOnboarding()
            }
        }
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(MF.border, lineWidth: 1))
        .warmShadow()
    }

    private var backendRow: some View {
        Button {
            Haptics.tap()
            Task { await state.refreshBackendStatus() }
        } label: {
            HStack(spacing: 12) {
                Image(systemName: state.backendStatus.icon)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(state.backendStatus.isOnline ? Color.green : MF.emberDeep)
                    .frame(width: 30, height: 30)
                    .background(state.backendStatus.isOnline ? Color.green.opacity(0.12) : MF.emberTint)
                    .clipShape(RoundedRectangle(cornerRadius: 9, style: .continuous))
                VStack(alignment: .leading, spacing: 2) {
                    Text(state.backendStatus.title)
                        .font(.system(size: 14.5, weight: .semibold))
                        .foregroundStyle(MF.ink)
                    Text(state.backendStatus.detail)
                        .font(.system(size: 11.5, weight: .medium))
                        .lineLimit(1)
                        .foregroundStyle(MF.smoke)
                }
                Spacer()
                Image(systemName: "arrow.clockwise")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(MF.faint)
            }
            .padding(.horizontal, 15).padding(.vertical, 13)
        }
        .buttonStyle(.plain)
    }

    private var authAccountRow: some View {
        HStack(spacing: 12) {
            Image(systemName: "person.crop.circle.badge.checkmark")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(MF.emberDeep)
                .frame(width: 30, height: 30)
                .background(MF.emberTint)
                .clipShape(RoundedRectangle(cornerRadius: 9, style: .continuous))
            VStack(alignment: .leading, spacing: 2) {
                Text("Supabase Konto")
                    .font(.system(size: 14.5, weight: .semibold))
                    .foregroundStyle(MF.ink)
                Text(state.authUser?.email ?? state.authUser?.displayName ?? "Angemeldet")
                    .font(.system(size: 11.5, weight: .medium))
                    .lineLimit(1)
                    .foregroundStyle(MF.smoke)
            }
            Spacer()
            Image(systemName: "key.fill")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(MF.faint)
        }
        .padding(.horizontal, 15).padding(.vertical, 13)
    }

    private func accountRow(icon: String, label: String, badge: Int = 0, destructive: Bool = false,
                            action: @escaping () -> Void) -> some View {
        let tint = destructive ? Color.red : MF.emberDeep
        let tintBackground = destructive ? Color.red.opacity(0.12) : MF.emberTint
        return Button {
            Haptics.tap()
            action()
        } label: {
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(tint)
                    .frame(width: 30, height: 30)
                    .background(tintBackground)
                    .clipShape(RoundedRectangle(cornerRadius: 9, style: .continuous))
                Text(label)
                    .font(.system(size: 14.5, weight: .semibold))
                    .foregroundStyle(destructive ? tint : MF.ink)
                Spacer()
                if badge > 0 {
                    Text("\(badge)")
                        .font(.system(size: 11, weight: .bold)).foregroundStyle(.white)
                        .frame(minWidth: 20).frame(height: 20)
                        .background(MF.ember)
                        .clipShape(Capsule())
                }
                Image(systemName: "chevron.right")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(MF.faint)
            }
            .padding(.horizontal, 15).padding(.vertical, 13)
        }
        .buttonStyle(.plain)
    }
}

struct ProfileMemoryView: View {
    @EnvironmentObject var state: AppState
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 0) {
            MShellTop(title: "Co-Pilot Memory", subtitle: "\(state.copilotFacts.count) gespeicherte Fakten") {
                HStack(spacing: 8) {
                    Button {
                        Haptics.tap()
                        dismiss()
                    } label: {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(MF.indigoInk)
                            .frame(width: 38, height: 38)
                            .background(MF.indigoTint)
                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }
                    .buttonStyle(.plain)

                    Button {
                        Haptics.tap()
                        state.open(.screen(.copilot))
                    } label: {
                        Image(systemName: "sparkles")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(MF.indigoInk)
                            .frame(width: 38, height: 38)
                            .background(MF.indigoTint)
                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }
                    .buttonStyle(.plain)
                }
            }

            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    overviewCard
                    MSectionHead(text: "Dynamisches Verzeichnis")
                    liveFactsCard
                    MSectionHead(text: "Gespeicherte Fakten")
                    storedFactsCard
                }
                .padding(20)
                .padding(.bottom, 90)
            }
            .scrollIndicators(.hidden)
        }
        .background(MF.canvas.ignoresSafeArea())
        .toolbar(.hidden, for: .navigationBar)
    }

    private var overviewCard: some View {
        let memory = state.founderMemory
        return VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 10) {
                Image(systemName: "brain.head.profile")
                    .font(.system(size: 17, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 44, height: 44)
                    .background(MF.indigoGrad)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                VStack(alignment: .leading, spacing: 2) {
                    Text(memory.founderName)
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(MF.ink)
                    Text(memory.compactSummary)
                        .font(.system(size: 12.5, weight: .semibold))
                        .foregroundStyle(MF.smoke)
                        .lineLimit(1)
                }
                Spacer()
            }
            Text(memory.idea)
                .font(.system(size: 14.5))
                .foregroundStyle(MF.inkSoft)
                .lineSpacing(3)
                .fixedSize(horizontal: false, vertical: true)
            HStack(spacing: 8) {
                memoryMetric("Unterlagen", memory.documentProgress)
                memoryMetric("Plan", "\(state.plannerItems.filter { !$0.done }.count) offen")
                memoryMetric("Matches", "\(state.matches.count)")
            }
        }
        .padding(16)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(MF.border, lineWidth: 1))
        .warmShadow()
    }

    private var liveFactsCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            ForEach(state.copilotLiveContextFacts(), id: \.self) { fact in
                factRow(fact, icon: "dot.scope", removable: false)
            }
        }
        .padding(14)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(MF.border, lineWidth: 1))
        .warmShadow()
    }

    private var storedFactsCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            if state.copilotFacts.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Noch nichts manuell gespeichert.")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(MF.ink)
                    Text("Wenn der Co-Pilot neue Fakten erkennt oder du auf „Memory speichern” tippst, tauchen sie hier auf.")
                        .font(.system(size: 12.5))
                        .foregroundStyle(MF.smoke)
                        .lineSpacing(2)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(14)
                .background(MF.surfaceSoft)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            } else {
                ForEach(Array(state.copilotFacts.enumerated()), id: \.offset) { index, fact in
                    factRow(fact, icon: "checkmark.circle.fill", removable: true) {
                        state.copilotFacts.remove(at: index)
                    }
                }
                Button {
                    Haptics.tap()
                    state.copilotFacts.removeAll()
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "trash")
                            .font(.system(size: 12, weight: .bold))
                        Text("Gespeichertes Memory leeren")
                            .font(.system(size: 13, weight: .bold))
                    }
                    .foregroundStyle(MF.emberDeep)
                    .padding(.horizontal, 12)
                    .frame(height: 36)
                    .background(MF.emberTint)
                    .clipShape(Capsule())
                }
                .buttonStyle(.plain)
                .padding(.top, 4)
            }
        }
        .padding(14)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(MF.border, lineWidth: 1))
        .warmShadow()
    }

    private func memoryMetric(_ label: String, _ value: String) -> some View {
        VStack(spacing: 2) {
            Text(value)
                .font(.system(size: 12.5, weight: .heavy))
                .foregroundStyle(MF.ink)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Text(label)
                .font(.system(size: 10.5, weight: .semibold))
                .foregroundStyle(MF.faint)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 9)
        .background(MF.surfaceSoft)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private func factRow(
        _ fact: String,
        icon: String,
        removable: Bool,
        remove: (() -> Void)? = nil
    ) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: icon)
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(MF.indigoInk)
                .frame(width: 28, height: 28)
                .background(MF.indigoTint)
                .clipShape(RoundedRectangle(cornerRadius: 9, style: .continuous))
            Text(fact)
                .font(.system(size: 13.2, weight: .medium))
                .foregroundStyle(MF.inkSoft)
                .lineSpacing(2)
                .fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 0)
            if removable, let remove {
                Button {
                    Haptics.tap()
                    remove()
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(MF.faint)
                        .frame(width: 28, height: 28)
                        .background(MF.surfaceSoft)
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)
            }
        }
    }
}

// ─── Profil bearbeiten (Sheet) ────────────────────────────────

struct ProfileEditSheet: View {
    @EnvironmentObject var state: AppState
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var role = ""
    @State private var pitch = ""
    @State private var plz = ""
    @State private var availability: Availability = .parttime
    @State private var skills: Set<String> = []
    @State private var headline = ""
    @State private var about = ""
    @State private var websiteURL = ""
    @State private var linkedinURL = ""
    @State private var githubURL = ""
    @State private var bannerStyle: ProfileExtras.BannerStyle = .ember

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    field("Name") { editField($name, placeholder: "Dein Name") }
                    field("Rolle") { editField($role, placeholder: "z.B. Friseur, Händler, Handwerkerin") }
                    field("Idee (\(pitch.count)/140)") {
                        editField($pitch, placeholder: "Was willst du anbieten?", axis: .vertical)
                            .onChange(of: pitch) { _, v in
                                if v.count > 140 { pitch = String(v.prefix(140)) }
                            }
                    }
                    field("Headline") {
                        editField($headline, placeholder: "Friseursalon · sucht Buchhaltung & Website-Hilfe")
                    }
                    field("Über mich") {
                        editField($about, placeholder: "Was bietest du an, für wen, und welche Hilfe brauchst du?", axis: .vertical)
                    }
                    field("PLZ") {
                        editField($plz, placeholder: "50667")
                            .onChange(of: plz) { _, v in
                                plz = String(v.filter(\.isNumber).prefix(5))
                            }
                    }
                    field("Cover") {
                        HStack(spacing: 8) {
                            ForEach(ProfileExtras.BannerStyle.allCases) { style in
                                MFChip(label: style.label, selected: bannerStyle == style) {
                                    bannerStyle = style
                                }
                            }
                        }
                    }
                    field("Verfügbarkeit") {
                        HStack(spacing: 8) {
                            ForEach(Availability.allCases, id: \.self) { a in
                                MFChip(label: a.label, selected: availability == a) {
                                    availability = a
                                }
                            }
                        }
                    }
                    field("Skills") {
                        FlowLayout(spacing: 8) {
                            ForEach(skillTags, id: \.self) { tag in
                                MFChip(label: tag, selected: skills.contains(tag)) {
                                    if skills.contains(tag) { skills.remove(tag) } else { skills.insert(tag) }
                                }
                            }
                        }
                    }
                    field("Links") {
                        VStack(spacing: 10) {
                            editField($websiteURL, placeholder: "Website")
                                .textInputAutocapitalization(.never)
                            editField($linkedinURL, placeholder: "LinkedIn")
                                .textInputAutocapitalization(.never)
                            editField($githubURL, placeholder: "GitHub")
                                .textInputAutocapitalization(.never)
                        }
                    }
                }
                .padding(20)
            }
            .scrollIndicators(.hidden)
            .scrollDismissesKeyboard(.interactively)
            .background(MF.canvas.ignoresSafeArea())
            .navigationTitle("Profil bearbeiten")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Abbrechen") { dismiss() }.tint(MF.smoke)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Speichern") { save() }
                        .font(.system(size: 15, weight: .bold))
                        .tint(MF.emberDeep)
                }
            }
        }
        .onAppear {
            guard let p = state.profile else { return }
            name = p.name; role = p.role; pitch = p.pitch; plz = p.plz
            availability = p.availability; skills = Set(p.skills)
            headline = state.profileExtras.headline
            about = state.profileExtras.about
            websiteURL = state.profileExtras.websiteURL
            linkedinURL = state.profileExtras.linkedinURL
            githubURL = state.profileExtras.githubURL
            bannerStyle = state.profileExtras.bannerStyle
        }
    }

    private func save() {
        guard var p = state.profile else { return }
        p.name = name; p.role = role; p.pitch = pitch; p.plz = plz
        p.availability = availability; p.skills = Array(skills)
        state.profile = p
        state.profileExtras = ProfileExtras(
            headline: headline.trimmingCharacters(in: .whitespacesAndNewlines),
            about: about.trimmingCharacters(in: .whitespacesAndNewlines),
            websiteURL: websiteURL.trimmingCharacters(in: .whitespacesAndNewlines),
            linkedinURL: linkedinURL.trimmingCharacters(in: .whitespacesAndNewlines),
            githubURL: githubURL.trimmingCharacters(in: .whitespacesAndNewlines),
            bannerStyle: bannerStyle
        )
        Haptics.success()
        dismiss()
    }

    private func field<C: View>(_ label: String, @ViewBuilder content: () -> C) -> some View {
        VStack(alignment: .leading, spacing: 7) {
            Eyebrow(text: label)
            content()
        }
    }

    private func editField(_ text: Binding<String>, placeholder: String,
                           axis: Axis = .horizontal) -> some View {
        TextField(placeholder, text: text, axis: axis)
            .font(.system(size: 15))
            .submitLabel(axis == .vertical ? .return : .done)
            .padding(.horizontal, 14).padding(.vertical, 12)
            .background(MF.surface)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(MF.border, lineWidth: 1))
    }
}
