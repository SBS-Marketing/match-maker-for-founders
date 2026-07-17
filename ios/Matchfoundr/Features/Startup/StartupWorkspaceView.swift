// Business Workspace — zentrale Arbeitsfläche für Betrieb, Plan, Unterlagen und Zusammenarbeit.

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
    @State private var showingPricingSheet = false
    @State private var monthlyCostsInput = "1200"
    @State private var privateIncomeInput = "2200"
    @State private var reserveInput = "25"
    @State private var workDaysInput = "18"
    @State private var billableHoursInput = "5"

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
    private var readinessItems: [BusinessReadinessItem] {
        let hasOffer = !state.companyProfile.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            || !(state.profile?.pitch.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ?? true)
        let pricingDone = state.documents.contains { $0.id == "pricing" && $0.done }
            || state.plannerItems.contains { $0.title.localizedCaseInsensitiveContains("preis") }
        let registrationDone = state.documents.contains { $0.id == "registration" && $0.done }
            || state.plannerItems.contains { $0.title.localizedCaseInsensitiveContains("gewerbe") || $0.title.localizedCaseInsensitiveContains("anmeldung") }
        let documentsStarted = state.documents.contains(where: \.done)
            || !state.documentAssets.isEmpty
            || !state.documentDraft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        let customerProof = state.matches.contains { !$0.messages.isEmpty }
            || state.plannerItems.contains { $0.title.localizedCaseInsensitiveContains("kund") || $0.note.localizedCaseInsensitiveContains("kund") }
        let visibility = state.companyProfile.isPublished || state.documentAssets.contains { $0.kind == .upload }

        return [
            .init(
                title: "Angebot in einem Satz",
                text: hasOffer ? "Kernangebot ist angelegt." : "Was verkaufst du, an wen und warum jetzt?",
                icon: "quote.bubble.fill",
                serviceId: "cofounder",
                done: hasOffer
            ) { state.open(.screen(.company)) },
            .init(
                title: "Preis & Mindestumsatz",
                text: pricingDone ? "Ein erster Preisanker ist im Plan." : "Rechne Kosten, privaten Bedarf und zahlbare Stunden.",
                icon: "eurosign.circle.fill",
                serviceId: "tax",
                done: pricingDone
            ) { showingPricingSheet = true },
            .init(
                title: "Anmeldung klären",
                text: registrationDone ? "Gewerbe/Genehmigung ist markiert." : "Gewerbe, Kammer, Erlaubnis oder Hygiene prüfen.",
                icon: "checkmark.seal.fill",
                serviceId: "legal",
                done: registrationDone
            ) { planRegistrationCheck() },
            .init(
                title: "Unterlagen begonnen",
                text: documentsStarted ? "Entwurf oder Upload liegt vor." : "Kurz-Businessplan, Kosten oder Nachweise starten.",
                icon: "folder.fill",
                serviceId: "funding",
                done: documentsStarted
            ) { state.open(.screen(.documents)) },
            .init(
                title: "Erste Kundenreaktion",
                text: customerProof ? "Kunden-/Kontaktgespräche sind im System." : "5 echte Gespräche schlagen jede Theorie.",
                icon: "person.2.wave.2.fill",
                serviceId: "growth",
                done: customerProof
            ) { planCustomerSprint() },
            .init(
                title: "Sichtbarkeit",
                text: visibility ? "Profil oder Material ist sichtbar." : "Profil, Bilder oder einfacher Link vorbereiten.",
                icon: "megaphone.fill",
                serviceId: "mentor",
                done: visibility
            ) { state.open(.screen(.company)) },
        ]
    }
    private var readinessScore: Int {
        guard !readinessItems.isEmpty else { return 0 }
        let done = readinessItems.filter(\.done).count
        return Int((Double(done) / Double(readinessItems.count) * 100).rounded())
    }
    private var openReadinessItems: [BusinessReadinessItem] {
        readinessItems.filter { !$0.done }
    }
    private var customerSprintPlanned: Bool {
        state.plannerItems.contains { item in
            item.title.localizedCaseInsensitiveContains("kundengespräche")
                || item.title.localizedCaseInsensitiveContains("zielkunden")
        }
    }
    private var pricing: BusinessPricingSnapshot {
        BusinessPricingSnapshot(
            monthlyCosts: parseMoney(monthlyCostsInput),
            privateIncome: parseMoney(privateIncomeInput),
            reservePercent: parseMoney(reserveInput),
            workDays: max(parseMoney(workDaysInput), 1),
            billableHoursPerDay: max(parseMoney(billableHoursInput), 1)
        )
    }

    var body: some View {
        VStack(spacing: 0) {
            MShellTop(title: "Business", subtitle: state.hasStartupWorkspace ? state.companyProfile.name : "Noch kein Business") {
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
                        MSectionHead(text: "Startklar-Check", action: "Co-Pilot") {
                            state.queueCopilotPrompt(readinessCopilotPrompt(), title: "Startklar-Check")
                        }
                        readinessSection
                        MSectionHead(text: "Zahlen & Kunden", action: customerSprintPlanned ? "Kalender" : "7 Tage") {
                            if customerSprintPlanned {
                                state.open(.screen(.calendar))
                            } else {
                                planCustomerSprint()
                            }
                        }
                        numbersAndCustomersSection
                        MSectionHead(text: "Team", action: "Hinzufügen") { showingTeamSheet = true }
                        teamSection
                        MSectionHead(text: "Zusammenarbeit", action: "Termin") {
                            state.open(.screen(.calendar))
                        }
                        collaborationSection
                        MSectionHead(text: "Business-Akten")
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
        .sheet(isPresented: $showingPricingSheet) {
            BusinessPricingSheet(
                monthlyCosts: $monthlyCostsInput,
                privateIncome: $privateIncomeInput,
                reservePercent: $reserveInput,
                workDays: $workDaysInput,
                billableHours: $billableHoursInput,
                snapshot: pricing,
                onSave: savePricingSnapshot,
                onAskCopilot: {
                    showingPricingSheet = false
                    state.queueCopilotPrompt(pricingCopilotPrompt(), title: "Preis & Mindestumsatz")
                }
            )
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
                    Text("Business starten")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(.white)
                    Text("Noch kein Business")
                        .font(.system(size: 12.5, weight: .semibold))
                        .foregroundStyle(.white.opacity(0.72))
                }
                Spacer()
            }

            Text("Starte ein echtes kleines Geschäft: Salon, Shop, Betrieb, Agentur oder deine erste Idee.")
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
                    Text("Business anlegen")
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
                whiteAction("Kontakte", "magnifyingglass") { state.open(.screen(.swipe)) }
                whiteAction("Co-Pilot", "sparkles") {
                    state.queueCopilotPrompt("Hilf mir in 3 kurzen Schritten zu entscheiden: eigenes kleines Business starten, erst Kosten klären oder erst passende Hilfe/Kontakte suchen.", title: "Business Start")
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
            .navigationTitle("Business anlegen")
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
            MSectionHead(text: "Eigenes Business anlegen")
            TextField("Name oder Arbeitstitel", text: $draftName)
                .startupFieldStyle()
            TextField("Was bietest du an und für wen?", text: $draftIdea, axis: .vertical)
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
                draftChip("Nebenbei") { draftStage = "Nebenbei testen" }
                draftChip("Bald eröffnen") { draftStage = "Vor Eröffnung" }
                draftChip("Hilfe gesucht") {
                    state.queueCopilotPrompt("Welche Hilfe brauche ich für mein kleines Business als Nächstes: Buchhaltung, Website, Anmeldung, Kunden oder Partner?", title: "Hilfe klären")
                }
            }

            MFPrimaryButton(title: "Business anlegen", icon: "building.2.fill") {
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

            Text("Danach kannst du Angebot, Preise, Standort, Bilder und Kontakt im Business-Profil weiter schärfen.")
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

    private var readinessSection: some View {
        VStack(alignment: .leading, spacing: 13) {
            HStack(alignment: .center, spacing: 12) {
                ZStack {
                    Circle()
                        .stroke(MF.borderSoft, lineWidth: 8)
                    Circle()
                        .trim(from: 0, to: CGFloat(readinessScore) / 100)
                        .stroke(MF.ember, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                        .rotationEffect(.degrees(-90))
                    Text("\(readinessScore)")
                        .font(.system(size: 18, weight: .heavy))
                        .foregroundStyle(MF.ink)
                }
                .frame(width: 64, height: 64)

                VStack(alignment: .leading, spacing: 4) {
                    Text(readinessScore >= 80 ? "Fast startklar" : "Noch nicht raten, sondern klären")
                        .font(.system(size: 17, weight: .heavy))
                        .foregroundStyle(MF.ink)
                    Text(openReadinessItems.first?.text ?? "Die wichtigsten Grundlagen sind sauber genug für den nächsten Praxistest.")
                        .font(.system(size: 12.5))
                        .foregroundStyle(MF.smoke)
                        .lineSpacing(2)
                }
                Spacer()
            }

            VStack(spacing: 8) {
                ForEach(readinessItems) { item in
                    readinessRow(item)
                }
            }
        }
        .warmCard(padding: 15, radius: 18)
    }

    private func readinessRow(_ item: BusinessReadinessItem) -> some View {
        let hue = MF.services[item.serviceId] ?? MF.services["cofounder"]!
        return Button {
            Haptics.tap()
            item.action()
        } label: {
            HStack(spacing: 11) {
                Image(systemName: item.done ? "checkmark" : item.icon)
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(item.done ? .white : hue.ink)
                    .frame(width: 34, height: 34)
                    .background(item.done ? AnyShapeStyle(MF.emberGrad) : AnyShapeStyle(hue.tint))
                    .clipShape(RoundedRectangle(cornerRadius: 11, style: .continuous))
                VStack(alignment: .leading, spacing: 2) {
                    Text(item.title)
                        .font(.system(size: 13.5, weight: .bold))
                        .foregroundStyle(MF.ink)
                    Text(item.text)
                        .font(.system(size: 11.8))
                        .foregroundStyle(MF.smoke)
                        .lineLimit(2)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 10.5, weight: .bold))
                    .foregroundStyle(MF.faint)
            }
            .padding(11)
            .background(MF.surfaceSoft)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
        .buttonStyle(.plain)
    }

    private var numbersAndCustomersSection: some View {
        VStack(spacing: 10) {
            workspaceAction(
                icon: "eurosign.circle.fill",
                title: "Preisrechner",
                text: "\(pricing.monthlyTargetFormatted) Mindestumsatz · ca. \(pricing.hourRateFormatted)/Std."
            ) {
                showingPricingSheet = true
            }

            workspaceAction(
                icon: customerSprintPlanned ? "checkmark.circle.fill" : "person.2.wave.2.fill",
                title: "7-Tage-Kunden-Sprint",
                text: customerSprintPlanned ? "Im Kalender angelegt" : "20 Zielkunden, 5 Gespräche, 1 Preis-Test"
            ) {
                if customerSprintPlanned {
                    state.open(.screen(.calendar))
                } else {
                    planCustomerSprint()
                }
            }

            workspaceAction(
                icon: "message.badge.waveform.fill",
                title: "Kontakttext schreiben",
                text: "Co-Pilot formuliert eine kurze Anfrage ohne Startup-Sprech"
            ) {
                state.queueCopilotPrompt(customerMessagePrompt(), title: "Kunden anschreiben")
            }
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
                    Text("Business OS")
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
                metric("Akten", "\(state.documents.filter { $0.done }.count)/\(state.documents.count)")
            }

            HStack(spacing: 9) {
                whiteAction("Kalender", "calendar") { state.open(.screen(.calendar)) }
                whiteAction("Board", "square.stack.3d.up.fill") { state.open(.screen(.kanban)) }
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
                title: "Nächsten Termin anlegen",
                text: "Lege Erledigungen, Förder-Deadlines, Kunden- oder Partnergespräche an."
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
                title: "Business-Profil",
                text: state.companyProfile.isPublished ? "Öffentlich · /s/\(state.companyProfile.publishedSlug ?? "preview")" : "Angebot, Standort, Bilder und Kontakt vorbereiten"
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
                title: "Kontakte & Gespräche",
                text: "\(state.matches.count) Kontakte · Co-Pilot kann Nachrichten vorbereiten"
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

    private func planRegistrationCheck() {
        state.addSmartPlannerItem(
            title: "Anmeldung und Pflichten prüfen",
            note: "Klären: Gewerbe ja/nein, Kammer, Erlaubnis, Hygiene/Zulassung, Versicherung und erster Steuer-Schritt.",
            dueLabel: "Diese Woche",
            kind: .legal,
            target: .documents
        )
        state.queueCopilotPrompt(
            "Prüfe mit mir für \(memory.ventureName), welche Anmeldung oder Genehmigung realistisch relevant ist. Nutze das Netz, um zuständige Kammer/Behörde/Anlaufstellen zu finden: Handwerkskammer oder IHK, Gewerbeamt, Finanzamt, Gesundheitsamt, Berufsgenossenschaft oder Innung falls relevant. Gib Quellen als Chips mit. Stelle mir maximal 3 Multiple-Choice-Fragen nacheinander und speichere danach die Entscheidung als Memory.",
            title: "Anmeldung klären"
        )
    }

    private func planCustomerSprint() {
        state.addSmartPlannerItem(
            title: "20 Zielkunden notieren",
            note: "Namen, Orte oder Gruppen sammeln: Wer könnte in den nächsten 30 Tagen wirklich zahlen oder Feedback geben?",
            dueLabel: "Heute",
            kind: .focus,
            target: .startup
        )
        state.addSmartPlannerItem(
            title: "5 Kundengespräche anbahnen",
            note: "Kurze Nachricht, konkrete Frage, 15 Minuten. Ziel ist Lernen, nicht perfekt verkaufen.",
            dueLabel: "Diese Woche",
            kind: .meeting,
            target: .chats
        )
        state.addSmartPlannerItem(
            title: "Angebotspreis live testen",
            note: "Einen einfachen Preis nennen und beobachten, ob echtes Interesse oder Ausweichen kommt.",
            dueLabel: "Nächste 7 Tage",
            kind: .focus,
            target: .documents
        )
        if let index = state.documents.firstIndex(where: { $0.id == "customer-proof" }) {
            state.documents[index].done = true
        }
        state.rememberCopilotFact("7-Tage-Kunden-Sprint geplant: 20 Zielkunden, 5 Gespräche, 1 Preis-Test.")
    }

    private func savePricingSnapshot() {
        let section = """


        Preis- und Mindestumsatz-Notiz
        - Monatliche Fixkosten: \(pricing.monthlyCostsFormatted)
        - Privater Bedarf: \(pricing.privateIncomeFormatted)
        - Reserve/Steuern: \(pricing.reservePercentFormatted)
        - Mindestumsatz: \(pricing.monthlyTargetFormatted)
        - Richtwert pro Tag: \(pricing.dayRateFormatted)
        - Richtwert pro abrechenbarer Stunde: \(pricing.hourRateFormatted)
        - Einfacher Testpreis: \(pricing.testOfferFormatted)
        """

        if state.documentDraft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            state.generateDocumentDraft()
        }
        state.documentDraft += section
        if let index = state.documents.firstIndex(where: { $0.id == "pricing" }) {
            state.documents[index].done = true
        }
        state.addSmartPlannerItem(
            title: "Preis mit 3 Zielkunden testen",
            note: "Mit \(pricing.testOfferFormatted) als einfachem Anker in echte Gespräche gehen und Reaktion notieren.",
            dueLabel: "Diese Woche",
            kind: .focus,
            target: .documents
        )
        state.rememberCopilotFact("Preisanker: Mindestumsatz \(pricing.monthlyTargetFormatted), Richtwert \(pricing.hourRateFormatted) pro abrechenbarer Stunde.")
        showingPricingSheet = false
    }

    private func readinessCopilotPrompt() -> String {
        let open = openReadinessItems.prefix(4).map { "- \($0.title): \($0.text)" }.joined(separator: "\n")
        return """
        STARTKLAR-CHECK
        Business: \(memory.compactSummary)
        Score: \(readinessScore)/100
        Offen:
        \(open.isEmpty ? "- Keine kritischen Lücken im Check." : open)

        Führe mich wie einen normalen kleinen Gründer, nicht wie ein VC-Startup. Stelle maximal eine Frage auf einmal, nutze Multiple Choice wenn sinnvoll, und schlage danach konkrete App-Aktionen vor: Preisrechner, Unterlagen, Kalender, Kunden-Sprint oder Business-Profil.
        """
    }

    private func pricingCopilotPrompt() -> String {
        """
        PREIS-CHECK
        Business: \(memory.compactSummary)
        Monatliche Fixkosten: \(pricing.monthlyCostsFormatted)
        Privater Bedarf: \(pricing.privateIncomeFormatted)
        Reserve/Steuern: \(pricing.reservePercentFormatted)
        Mindestumsatz: \(pricing.monthlyTargetFormatted)
        Richtwert pro Tag: \(pricing.dayRateFormatted)
        Richtwert pro Stunde: \(pricing.hourRateFormatted)

        Hilf mir, daraus ein realistisches erstes Angebot für kleine Kunden zu machen. Bitte nicht theoretisch: gib mir 2 Preisvarianten, 1 Risiko und eine Nachricht, mit der ich den Preis testen kann.
        """
    }

    private func customerMessagePrompt() -> String {
        """
        KUNDEN-SPRINT
        Business: \(memory.compactSummary)
        Idee: \(memory.idea)
        Schreibe mir eine kurze, normale Nachricht an einen möglichen ersten Kunden oder lokalen Kontakt. Kein Pitchdeck, kein Startup-Sprech. Ziel: 15 Minuten Feedback oder ein kleiner Testauftrag. Frage zuerst per Multiple Choice, ob die Nachricht an Kunde, Partner, Lieferant oder Bekannten gehen soll.
        """
    }

    private func parseMoney(_ value: String) -> Double {
        let normalized = value
            .replacingOccurrences(of: ".", with: "")
            .replacingOccurrences(of: ",", with: ".")
            .filter { "0123456789.".contains($0) }
        return Double(normalized) ?? 0
    }
}

private struct BusinessReadinessItem: Identifiable {
    let id = UUID()
    let title: String
    let text: String
    let icon: String
    let serviceId: String
    let done: Bool
    let action: () -> Void
}

private struct BusinessPricingSnapshot {
    var monthlyCosts: Double
    var privateIncome: Double
    var reservePercent: Double
    var workDays: Double
    var billableHoursPerDay: Double

    var monthlyBase: Double { monthlyCosts + privateIncome }
    var monthlyTarget: Double { monthlyBase * (1 + max(reservePercent, 0) / 100) }
    var dayRate: Double { monthlyTarget / max(workDays, 1) }
    var hourRate: Double { dayRate / max(billableHoursPerDay, 1) }
    var testOffer: Double { max(hourRate * 2, 49) }

    var monthlyCostsFormatted: String { euro(monthlyCosts) }
    var privateIncomeFormatted: String { euro(privateIncome) }
    var reservePercentFormatted: String { "\(Int(reservePercent.rounded()))%" }
    var monthlyTargetFormatted: String { euro(monthlyTarget) }
    var dayRateFormatted: String { euro(dayRate) }
    var hourRateFormatted: String { euro(hourRate) }
    var testOfferFormatted: String { euro(testOffer) }

    private func euro(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "EUR"
        formatter.maximumFractionDigits = value >= 100 ? 0 : 2
        formatter.locale = Locale(identifier: "de_DE")
        return formatter.string(from: NSNumber(value: value)) ?? "\(Int(value.rounded())) €"
    }
}

private struct BusinessPricingSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Binding var monthlyCosts: String
    @Binding var privateIncome: String
    @Binding var reservePercent: String
    @Binding var workDays: String
    @Binding var billableHours: String
    let snapshot: BusinessPricingSnapshot
    let onSave: () -> Void
    let onAskCopilot: () -> Void

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    header
                    inputGrid
                    resultCard
                    HStack(spacing: 10) {
                        MFGhostButton(title: "Co-Pilot", icon: "sparkles") {
                            onAskCopilot()
                        }
                        MFPrimaryButton(title: "In Plan speichern", icon: "checkmark") {
                            onSave()
                        }
                    }
                }
                .padding(20)
                .padding(.bottom, 24)
            }
            .background(MF.canvas.ignoresSafeArea())
            .navigationTitle("Preisrechner")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Fertig") { dismiss() }
                }
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 9) {
            Eyebrow(text: "Mindestumsatz", color: MF.emberDeep)
            Text("Was muss dein Business grob im Monat schaffen?")
                .font(.system(size: 24, weight: .heavy))
                .foregroundStyle(MF.ink)
                .fixedSize(horizontal: false, vertical: true)
            Text("Das ist kein Steuerberater-Ersatz, sondern ein schneller Realitätscheck für Preise, Angebote und Kundengespräche.")
                .font(.system(size: 13.5))
                .foregroundStyle(MF.smoke)
                .lineSpacing(3)
        }
        .warmCard(padding: 17, radius: 18)
    }

    private var inputGrid: some View {
        VStack(spacing: 10) {
            HStack(spacing: 10) {
                moneyField("Fixkosten", "Miete, Tools, Material", text: $monthlyCosts)
                moneyField("Privatbedarf", "Was du brauchst", text: $privateIncome)
            }
            HStack(spacing: 10) {
                moneyField("Reserve %", "Steuer/Puffer", text: $reservePercent)
                moneyField("Tage", "pro Monat", text: $workDays)
                moneyField("Std/Tag", "abrechenbar", text: $billableHours)
            }
        }
    }

    private func moneyField(_ title: String, _ subtitle: String, text: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(MF.ink)
            TextField(subtitle, text: text)
                .keyboardType(.decimalPad)
                .font(.system(size: 16, weight: .heavy))
                .foregroundStyle(MF.ink)
                .padding(.horizontal, 11)
                .frame(height: 44)
                .background(MF.surfaceSoft)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
        .frame(maxWidth: .infinity)
        .padding(12)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(MF.border, lineWidth: 1))
    }

    private var resultCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .firstTextBaseline) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Mindestumsatz")
                        .font(.system(size: 12.5, weight: .bold))
                        .foregroundStyle(.white.opacity(0.7))
                    Text(snapshot.monthlyTargetFormatted)
                        .font(.system(size: 32, weight: .heavy))
                        .foregroundStyle(.white)
                        .minimumScaleFactor(0.75)
                }
                Spacer()
                Image(systemName: "chart.line.uptrend.xyaxis")
                    .font(.system(size: 21, weight: .bold))
                    .foregroundStyle(.white.opacity(0.8))
            }

            HStack(spacing: 9) {
                resultMetric("Tag", snapshot.dayRateFormatted)
                resultMetric("Stunde", snapshot.hourRateFormatted)
                resultMetric("Test", snapshot.testOfferFormatted)
            }

            Text("Nutze den Testpreis als Gesprächsanker. Wenn Menschen sofort ausweichen, ist das ein Signal für Zielgruppe, Nutzen oder Paket.")
                .font(.system(size: 12.5))
                .foregroundStyle(.white.opacity(0.74))
                .lineSpacing(2)
        }
        .padding(18)
        .background(MF.indigoGrad)
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        .indigoGlow()
    }

    private func resultMetric(_ title: String, _ value: String) -> some View {
        VStack(spacing: 2) {
            Text(value)
                .font(.system(size: 14.5, weight: .heavy))
                .foregroundStyle(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.65)
            Text(title)
                .font(.system(size: 10.5, weight: .semibold))
                .foregroundStyle(.white.opacity(0.6))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .background(.white.opacity(0.12))
        .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
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
