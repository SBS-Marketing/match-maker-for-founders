// Startup Workspace — zentrale Arbeitsfläche für Team, Plan, Unterlagen und Zusammenarbeit.

import SwiftUI

struct StartupWorkspaceView: View {
    @EnvironmentObject private var state: AppState
    @State private var showingTeamSheet = false
    @State private var showingStartupDraft = false
    @State private var draftName = ""
    @State private var draftIdea = ""
    @State private var draftCategory = ""
    @State private var draftStage = "Idee"
    @State private var draftCity = ""

    private var memory: FounderMemorySnapshot { state.founderMemory }
    private var teamItems: [PlannerItem] {
        state.plannerItems
            .filter { !$0.done }
            .filter { $0.assigneeName != nil || $0.target == .startup || $0.kind == .meeting }
            .prefix(5)
            .map { $0 }
    }
    private var openDocuments: [FounderDocument] {
        state.documents.filter { !$0.done }
    }

    var body: some View {
        VStack(spacing: 0) {
            MShellTop(title: "Startup", subtitle: state.hasStartupWorkspace ? state.companyProfile.name : "Noch kein Workspace") {
                if state.hasStartupWorkspace {
                    Button {
                        showingTeamSheet = true
                    } label: {
                        Image(systemName: "person.badge.plus")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(.white)
                            .frame(width: 38, height: 38)
                            .background(MF.emberGrad)
                            .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
                    }
                    .buttonStyle(.plain)
                }
            }

            ScrollView {
                if state.hasStartupWorkspace {
                    VStack(alignment: .leading, spacing: 16) {
                        commandCard
                        MSectionHead(text: "Team", action: "Hinzufügen") { showingTeamSheet = true }
                        teamSection
                        MSectionHead(text: "Zusammenarbeit", action: "Termin") {
                            state.open(.screen(.calendar))
                        }
                        collaborationSection
                        MSectionHead(text: "Startup-Akten")
                        filesSection
                    }
                    .padding(20)
                    .padding(.bottom, 90)
                } else {
                    emptyStartupLauncher
                        .padding(20)
                        .padding(.bottom, 90)
                }
            }
            .scrollIndicators(.hidden)
        }
        .background(MF.canvas.ignoresSafeArea())
        .onAppear { prepareStartupDraftIfNeeded() }
        .sheet(isPresented: $showingTeamSheet) {
            StartupTeamSheet(
                matches: state.matches,
                members: state.startupTeamMembers,
                onAddMatch: { state.addTeamMember(from: $0) },
                onAddManual: { name, role, focus in
                    state.addTeamMember(name: name, role: role, focus: focus)
                }
            )
            .presentationDetents([.medium, .large])
            .presentationCornerRadius(26)
        }
        .sheet(isPresented: $showingStartupDraft) {
            startupFoundingSheet
                .presentationDetents([.large])
                .presentationCornerRadius(26)
        }
    }

    private var emptyStartupLauncher: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 10) {
                Image(systemName: "building.2.crop.circle")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 42, height: 42)
                    .background(.white.opacity(0.16))
                    .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
                VStack(alignment: .leading, spacing: 2) {
                    Text("Startup starten")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(.white)
                    Text("Noch kein Workspace")
                        .font(.system(size: 12.5, weight: .semibold))
                        .foregroundStyle(.white.opacity(0.72))
                }
                Spacer()
            }

            Text("Gründe dein eigenes Vorhaben oder entdecke erst passende Gründer.")
                .font(.system(size: 22, weight: .bold))
                .foregroundStyle(.white)
                .fixedSize(horizontal: false, vertical: true)

            Button {
                Haptics.tap()
                prepareStartupDraftIfNeeded()
                showingStartupDraft = true
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "plus")
                    Text("Eigenes gründen")
                        .font(.system(size: 14.5, weight: .bold))
                }
                .foregroundStyle(MF.indigoInk)
                .frame(maxWidth: .infinity)
                .frame(height: 44)
                .background(.white)
                .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
            }
            .buttonStyle(.plain)

            HStack(spacing: 9) {
                whiteAction("Entdecken", "magnifyingglass") { state.open(.screen(.swipe)) }
                whiteAction("Co-Pilot", "sparkles") {
                    state.queueCopilotPrompt("Hilf mir in 3 kurzen Schritten zu entscheiden: eigenes Startup gründen oder erst Gründer entdecken.", title: "Startup Entscheidung")
                }
            }
        }
        .padding(18)
        .background(MF.indigoGrad)
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        .indigoGlow()
    }

    private var startupFoundingSheet: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    startupDraftCard
                    startupPreviewCard
                }
                .padding(20)
                .padding(.bottom, 20)
            }
            .background(MF.canvas.ignoresSafeArea())
            .navigationTitle("Startup gründen")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Fertig") {
                        showingStartupDraft = false
                    }
                }
            }
        }
    }

    private var startupDraftCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            MSectionHead(text: "Eigenes Startup gründen")
            TextField("Name oder Arbeitstitel", text: $draftName)
                .startupFieldStyle()
            TextField("Was baut ihr und für wen?", text: $draftIdea, axis: .vertical)
                .lineLimit(2...5)
                .startupFieldStyle()
            HStack(spacing: 10) {
                TextField("Kategorie", text: $draftCategory)
                    .startupFieldStyle()
                TextField("Phase", text: $draftStage)
                    .startupFieldStyle()
            }
            TextField("Ort / Region", text: $draftCity)
                .startupFieldStyle()

            FlowLayout(spacing: 8) {
                draftChip("Idee") { draftStage = "Idee" }
                draftChip("MVP") { draftStage = "MVP" }
                draftChip("Pilot") { draftStage = "Pilot" }
                draftChip("Teamlücke") {
                    state.queueCopilotPrompt("Welche Teamlücke hat mein Startup und wen sollte ich suchen?", title: "Teamlücke")
                }
            }

            MFPrimaryButton(title: "Startup gründen", icon: "building.2.fill") {
                state.foundStartup(
                    name: draftName,
                    category: draftCategory,
                    stage: draftStage,
                    city: draftCity,
                    idea: draftIdea
                )
                showingStartupDraft = false
            }
            .disabled(startupDraftIsEmpty)
            .opacity(startupDraftIsEmpty ? 0.55 : 1)
        }
        .warmCard(padding: 16, radius: 18)
    }

    private var startupPreviewCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            MSectionHead(text: "Vorschau")
            HStack(alignment: .top, spacing: 13) {
                ZStack {
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .fill(MF.emberGrad)
                    Image(systemName: "photo.on.rectangle.angled")
                        .font(.system(size: 24, weight: .semibold))
                        .foregroundStyle(.white.opacity(0.9))
                }
                .frame(width: 82, height: 82)

                VStack(alignment: .leading, spacing: 5) {
                    Text(draftName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "Arbeitstitel" : draftName)
                        .font(.system(size: 17, weight: .heavy))
                        .foregroundStyle(MF.ink)
                    Text("\(draftStage) · \(draftCity.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "DACH" : draftCity)")
                        .font(.system(size: 12.5, weight: .semibold))
                        .foregroundStyle(MF.emberDeep)
                    Text(draftIdea.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "Beschreibe kurz Problem, Zielgruppe und den nächsten Beweis." : draftIdea)
                        .font(.system(size: 12.5))
                        .foregroundStyle(MF.smoke)
                        .lineLimit(4)
                }
            }

            Text("Nach dem Gründen kannst du die Seite im Firmenprofil-Builder weiter schärfen und später visuelle Assets ergänzen.")
                .font(.system(size: 12.5))
                .foregroundStyle(MF.faint)
                .fixedSize(horizontal: false, vertical: true)
        }
        .warmCard(padding: 16, radius: 18)
    }

    private var startupDraftIsEmpty: Bool {
        draftName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && draftIdea.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    private func draftChip(_ title: String, assign: @escaping () -> Void) -> some View {
        Button {
            Haptics.select()
            assign()
        } label: {
            Text(title)
                .font(.system(size: 12.5, weight: .bold))
                .foregroundStyle(MF.indigoInk)
                .padding(.horizontal, 12)
                .frame(height: 34)
                .background(MF.indigoTint)
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }

    private func prepareStartupDraftIfNeeded() {
        guard !state.hasStartupWorkspace else { return }
        if draftIdea.isEmpty {
            draftIdea = state.profile?.pitch ?? ""
        }
        if draftCategory.isEmpty {
            draftCategory = state.profile?.industry.label ?? ""
        }
        if draftCity.isEmpty {
            draftCity = state.profile?.plz ?? ""
        }
    }

    private var commandCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 10) {
                Image(systemName: "building.2.crop.circle")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 42, height: 42)
                    .background(.white.opacity(0.16))
                    .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
                VStack(alignment: .leading, spacing: 2) {
                    Text("Startup OS")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(.white)
                    Text(memory.compactSummary)
                        .font(.system(size: 12.5))
                        .foregroundStyle(.white.opacity(0.74))
                        .lineLimit(1)
                }
                Spacer()
            }

            Text(memory.nextStep)
                .font(.system(size: 22, weight: .bold))
                .foregroundStyle(.white)
                .fixedSize(horizontal: false, vertical: true)

            HStack(spacing: 9) {
                metric("Team", "\(state.startupTeamMembers.count)")
                metric("Plan", "\(state.plannerItems.filter { !$0.done }.count)")
                metric("Docs", "\(state.documents.filter { $0.done }.count)/\(state.documents.count)")
            }

            HStack(spacing: 9) {
                whiteAction("Kalender", "calendar") { state.open(.screen(.calendar)) }
                whiteAction("Co-Pilot", "sparkles") { state.open(.screen(.copilot)) }
            }
        }
        .padding(18)
        .background(MF.indigoGrad)
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        .indigoGlow()
    }

    private func metric(_ title: String, _ value: String) -> some View {
        VStack(spacing: 2) {
            Text(value)
                .font(.system(size: 18, weight: .heavy))
                .foregroundStyle(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Text(title)
                .font(.system(size: 10.5, weight: .semibold))
                .foregroundStyle(.white.opacity(0.64))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .background(.white.opacity(0.12))
        .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
    }

    private func whiteAction(_ title: String, _ icon: String, action: @escaping () -> Void) -> some View {
        Button {
            Haptics.tap()
            action()
        } label: {
            HStack(spacing: 7) {
                Image(systemName: icon)
                Text(title)
                    .font(.system(size: 13.5, weight: .bold))
            }
            .foregroundStyle(MF.indigoInk)
            .frame(maxWidth: .infinity)
            .frame(height: 42)
            .background(.white)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
        .buttonStyle(.plain)
    }

    private var teamSection: some View {
        VStack(spacing: 10) {
            ForEach(state.startupTeamMembers) { member in
                HStack(spacing: 12) {
                    MFAvatar(name: member.name, service: member.sourceMatchID == nil ? "capital" : "talent", size: 42)
                    VStack(alignment: .leading, spacing: 3) {
                        Text(member.name)
                            .font(.system(size: 14.5, weight: .bold))
                            .foregroundStyle(MF.ink)
                        Text("\(member.role) · \(member.focus)")
                            .font(.system(size: 12.5))
                            .foregroundStyle(MF.smoke)
                            .lineLimit(1)
                    }
                    Spacer()
                }
                .padding(14)
                .background(MF.surface)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 16).stroke(MF.border, lineWidth: 1))
            }
        }
    }

    private var collaborationSection: some View {
        VStack(spacing: 10) {
            if teamItems.isEmpty {
                workspaceAction(
                    icon: "calendar.badge.plus",
                    title: "Team-Termin anlegen",
                    text: "Lege Check-ins, Förder-Deadlines oder Match-Gespräche mit Verantwortlichen an."
                ) {
                    state.open(.screen(.calendar))
                }
            } else {
                ForEach(teamItems) { item in
                    let assignee = item.assigneeName ?? "Team"
                    workspaceAction(
                        icon: item.kind.icon,
                        title: item.title,
                        text: "\(item.dueLabel) · \(assignee) · \(item.kind.label)"
                    ) {
                        if let target = item.target {
                            state.open(target.destination)
                        } else {
                            state.open(.screen(.calendar))
                        }
                    }
                }
            }
        }
    }

    private var filesSection: some View {
        VStack(spacing: 10) {
            workspaceAction(
                icon: "building.2.fill",
                title: "Firmenprofil",
                text: state.companyProfile.isPublished ? "Öffentlich · /s/\(state.companyProfile.publishedSlug ?? "preview")" : "Hero, Team, Fortschritt und CTA vorbereiten"
            ) {
                state.open(.screen(.company))
            }

            workspaceAction(
                icon: "folder.fill",
                title: "Unterlagen",
                text: openDocuments.isEmpty ? "Alles markiert" : "\(openDocuments.count) offene Nachweise"
            ) {
                state.open(.screen(.documents))
            }

            workspaceAction(
                icon: "bubble.left.and.bubble.right.fill",
                title: "Matches & Team-Kommunikation",
                text: "\(state.matches.count) Matches · Co-Pilot kann Nachrichten vorbereiten"
            ) {
                state.open(.screen(.chats))
            }
        }
    }

    private func workspaceAction(icon: String, title: String, text: String, action: @escaping () -> Void) -> some View {
        Button {
            Haptics.tap()
            action()
        } label: {
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(MF.indigoInk)
                    .frame(width: 40, height: 40)
                    .background(MF.indigoTint)
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
}

private struct StartupTeamSheet: View {
    @Environment(\.dismiss) private var dismiss
    let matches: [Match]
    let members: [StartupTeamMember]
    let onAddMatch: (Match) -> Void
    let onAddManual: (String, String, String) -> Void

    @State private var name = ""
    @State private var role = ""
    @State private var focus = ""

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    MSectionHead(text: "Aus Matches")
                    FlowLayout(spacing: 8) {
                        ForEach(matches.filter { match in
                            !members.contains { $0.sourceMatchID == match.id || $0.name == match.card.name }
                        }.prefix(4)) { match in
                            Button {
                                onAddMatch(match)
                            } label: {
                                Text(match.card.name)
                                    .font(.system(size: 12.5, weight: .bold))
                                    .foregroundStyle(MF.indigoInk)
                                    .padding(.horizontal, 12)
                                    .frame(height: 34)
                                    .background(MF.indigoTint)
                                    .clipShape(Capsule())
                            }
                            .buttonStyle(.plain)
                        }
                    }

                    VStack(alignment: .leading, spacing: 12) {
                        MSectionHead(text: "Manuell")
                        field("Name", text: $name)
                        field("Rolle", text: $role)
                        field("Fokus", text: $focus, axis: .vertical)
                        MFPrimaryButton(title: "Zum Team hinzufügen", icon: "person.badge.plus") {
                            onAddManual(name, role, focus)
                            name = ""
                            role = ""
                            focus = ""
                        }
                    }
                    .warmCard()
                }
                .padding(20)
            }
            .background(MF.canvas.ignoresSafeArea())
            .navigationTitle("Team")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Fertig") { dismiss() }
                }
            }
        }
    }

    private func field(_ label: String, text: Binding<String>, axis: Axis = .horizontal) -> some View {
        TextField(label, text: text, axis: axis)
            .font(.system(size: 14.5))
            .lineLimit(axis == .vertical ? 2...4 : 1...1)
            .padding(.horizontal, 12)
            .padding(.vertical, 11)
            .background(MF.surfaceSoft)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

private extension View {
    func startupFieldStyle() -> some View {
        self
            .font(.system(size: 14.5))
            .foregroundStyle(MF.ink)
            .tint(MF.indigo)
            .padding(.horizontal, 12)
            .padding(.vertical, 11)
            .background(MF.surfaceSoft)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}
