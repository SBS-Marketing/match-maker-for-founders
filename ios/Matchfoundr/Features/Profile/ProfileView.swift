// Profil — 4. Tab nach Design: eigenes Profil, jederzeit editierbar,
// plus Wege zu Chats, Events, Premium.

import SwiftUI

enum ProfileRoute: Hashable {
    case company
    case documents
}

struct ProfileView: View {
    @EnvironmentObject var state: AppState
    @State private var editing = false
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
                        MSectionHead(text: "KI-Nutzung")
                        aiUsageCard
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
                }
            }
            .sheet(isPresented: $editing) {
                ProfileEditSheet()
                    .presentationDetents([.large])
                    .presentationCornerRadius(26)
            }
        }
        .tint(MF.emberDeep)
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
            accountRow(icon: "scope", label: "Founder Radar") {
                state.open(.screen(.radar))
            }
            Divider().overlay(MF.borderSoft).padding(.leading, 52)
            accountRow(icon: "calendar", label: "Kalender & Plan",
                       badge: state.plannerItems.filter { !$0.done }.count) {
                state.open(.screen(.calendar))
            }
            Divider().overlay(MF.borderSoft).padding(.leading, 52)
            accountRow(icon: "person.3.fill", label: "Startup Workspace") {
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
            accountRow(icon: "rectangle.portrait.and.arrow.right", label: "Abmelden") {
                Task { await state.signOut() }
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

    private func accountRow(icon: String, label: String, badge: Int = 0,
                            action: @escaping () -> Void) -> some View {
        Button {
            Haptics.tap()
            action()
        } label: {
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(MF.emberDeep)
                    .frame(width: 30, height: 30)
                    .background(MF.emberTint)
                    .clipShape(RoundedRectangle(cornerRadius: 9, style: .continuous))
                Text(label)
                    .font(.system(size: 14.5, weight: .semibold))
                    .foregroundStyle(MF.ink)
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
                    field("Rolle") { editField($role, placeholder: "z.B. Gründerin") }
                    field("Pitch (\(pitch.count)/140)") {
                        editField($pitch, placeholder: "Dein Satz", axis: .vertical)
                            .onChange(of: pitch) { _, v in
                                if v.count > 140 { pitch = String(v.prefix(140)) }
                            }
                    }
                    field("Headline") {
                        editField($headline, placeholder: "Product Founder · sucht Tech Co-Founder")
                    }
                    field("Über mich") {
                        editField($about, placeholder: "Was baust du, was treibt dich an, wen suchst du?", axis: .vertical)
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
