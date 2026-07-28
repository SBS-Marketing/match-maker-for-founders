// Co-Pilot — nach Design-Spec MCoPilot: Indigo-Signalfarbe,
// User-Bubble 18/18/5/18 mit Glow, Assistant mit Sparkle-Avatar + Label
// und Karte 5/18/18/18, Prompt-Chips, weißes Input-Dock mit Indigo-Send.

import SwiftUI
import Supabase
import MessageUI

/// Eine vom Backend nachgereichte Nachricht (Hintergrund-Recherche).
private struct CopilotFollowUpRow: Decodable {
    let sessionID: UUID
    let role: String
    let content: String
    let modelUsed: String?
    let sources: [CopilotSource]?

    enum CodingKeys: String, CodingKey {
        case sessionID = "session_id"
        case modelUsed = "model_used"
        case role, content, sources
    }
}

private struct CopilotExecutionStatusRow: Decodable {
    let status: String
    let progressText: String?
    let currentStep: Int
    let maxSteps: Int

    enum CodingKeys: String, CodingKey {
        case progressText = "progress_text"
        case currentStep = "current_step"
        case maxSteps = "max_steps"
        case status
    }
}

private struct CopilotExecutionDisplay {
    let text: String
    let currentStep: Int
    let maxSteps: Int
}

private struct CopilotEmailEditorContext: Identifiable {
    let messageID: UUID
    let draft: CopilotEmailDraft

    var id: UUID { draft.id }
}

private struct CopilotSourcesContext: Identifiable {
    let id = UUID()
    let sources: [CopilotSource]
}

private enum CopilotFeatureRequest {
    case foundationCheck

    static func parse(_ text: String) -> Self? {
        let normalized = text
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .folding(options: [.caseInsensitive, .diacriticInsensitive], locale: Locale(identifier: "de_DE"))
            .lowercased()

        if normalized == "ki-grundungscheck"
            || normalized.contains("onboarding-grundungscheck") {
            return .foundationCheck
        }
        return nil
    }

    var title: String {
        switch self {
        case .foundationCheck: "KI-Gründungscheck"
        }
    }

    var subtitle: String {
        switch self {
        case .foundationCheck: "Profil, Risiken und nächste Schritte"
        }
    }

    var icon: String {
        switch self {
        case .foundationCheck: "checkmark.seal.fill"
        }
    }
}

private struct CopilotExecutionIndicator: View {
    let status: CopilotExecutionDisplay
    @State private var isSpinning = false
    @State private var isBreathing = false

    private var progress: Double {
        guard status.maxSteps > 0 else { return 0 }
        return min(1, max(0, Double(status.currentStep) / Double(status.maxSteps)))
    }

    var body: some View {
        HStack(spacing: 13) {
            ZStack {
                Circle()
                    .stroke(MF.indigoTint, lineWidth: 3)
                Circle()
                    .trim(from: 0.08, to: 0.62)
                    .stroke(
                        MF.indigo,
                        style: StrokeStyle(lineWidth: 3, lineCap: .round)
                    )
                    .rotationEffect(.degrees(isSpinning ? 360 : 0))
                Image(systemName: "doc.text.magnifyingglass")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(MF.indigo)
                    .scaleEffect(isBreathing ? 1 : 0.9)
            }
            .frame(width: 42, height: 42)

            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 7) {
                    Text("Recherche läuft")
                        .font(.system(size: 13.5, weight: .bold))
                        .foregroundStyle(MF.ink)
                    Text(status.currentStep > 0
                         ? "\(status.currentStep)/\(max(status.maxSteps, 1))"
                         : "Start")
                        .font(.mfMono(9))
                        .foregroundStyle(MF.indigoInk)
                        .padding(.horizontal, 7)
                        .frame(height: 21)
                        .background(MF.indigoTint)
                        .clipShape(Capsule())
                }

                Text(status.text)
                    .font(.system(size: 11.5, weight: .medium))
                    .foregroundStyle(MF.smoke)
                    .lineLimit(2)
                    .fixedSize(horizontal: false, vertical: true)

                ProgressView(value: progress)
                    .tint(MF.indigo)
                    .scaleEffect(x: 1, y: 0.75, anchor: .center)
            }
        }
        .padding(.horizontal, 13)
        .padding(.vertical, 11)
        .frame(maxWidth: 330, alignment: .leading)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 15, style: .continuous)
                .stroke(MF.border, lineWidth: 1)
        )
        .warmShadow()
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Recherche läuft. \(status.text)")
        .onAppear {
            isSpinning = true
            isBreathing = true
        }
        .animation(.linear(duration: 1.25).repeatForever(autoreverses: false), value: isSpinning)
        .animation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true), value: isBreathing)
    }
}

private struct CopilotContextCard {
    enum Kind {
        case appointment
        case calendar

        var icon: String {
            switch self {
            case .appointment: "calendar.badge.clock"
            case .calendar: "calendar.day.timeline.left"
            }
        }

        var label: String {
            switch self {
            case .appointment: "Termin-Auftrag"
            case .calendar: "Kalender-Auftrag"
            }
        }
    }

    let kind: Kind
    let title: String
    let metadata: [String]
    let summary: String?

    static func parse(_ text: String) -> CopilotContextCard? {
        let lines = text
            .components(separatedBy: .newlines)
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
        guard let marker = lines.first(where: { !$0.isEmpty }) else { return nil }

        func value(_ key: String) -> String? {
            let prefix = "\(key):"
            guard let line = lines.first(where: { $0.hasPrefix(prefix) }) else { return nil }
            let result = line.dropFirst(prefix.count).trimmingCharacters(in: .whitespaces)
            return result.isEmpty ? nil : result
        }

        if marker == "TERMIN-KONTEXT" {
            let title = value("Termin") ?? "Termin gemeinsam prüfen"
            let metadata = [value("Datum"), value("Status"), value("Art")]
                .compactMap { $0 }
                .filter { !$0.isEmpty }
            return CopilotContextCard(
                kind: .appointment,
                title: title,
                metadata: metadata,
                summary: value("Notiz")
            )
        }

        if marker == "KALENDER-KONTEXT" {
            let firstEntry = lines
                .drop { $0 != "Ausgewählte Einträge:" }
                .dropFirst()
                .first { !$0.isEmpty }
                .map { String($0.drop(while: { $0 == "-" || $0 == " " })) }
            return CopilotContextCard(
                kind: .calendar,
                title: "Tagesplan gemeinsam prüfen",
                metadata: [value("Datum")].compactMap { $0 },
                summary: firstEntry
            )
        }

        return nil
    }
}

private struct IMessageTypingIndicator: View {
    @State private var isAnimating = false

    var body: some View {
        HStack(spacing: 5) {
            ForEach(0..<3, id: \.self) { index in
                Circle()
                    .fill(MF.faint)
                    .frame(width: 7, height: 7)
                    .scaleEffect(isAnimating ? 1 : 0.58)
                    .opacity(isAnimating ? 1 : 0.45)
                    .animation(
                        .easeInOut(duration: 0.58)
                            .repeatForever(autoreverses: true)
                            .delay(Double(index) * 0.16),
                        value: isAnimating
                    )
            }
        }
        .frame(width: 49, height: 34)
        .background(MF.surface)
        .clipShape(UnevenRoundedRectangle(
            topLeadingRadius: 17,
            bottomLeadingRadius: 4,
            bottomTrailingRadius: 17,
            topTrailingRadius: 17
        ))
        .overlay(
            UnevenRoundedRectangle(
                topLeadingRadius: 17,
                bottomLeadingRadius: 4,
                bottomTrailingRadius: 17,
                topTrailingRadius: 17
            )
            .stroke(MF.border, lineWidth: 1)
        )
        .warmShadow()
        .accessibilityLabel("Co-Pilot schreibt")
        .onAppear { isAnimating = true }
        .onDisappear { isAnimating = false }
    }
}

struct CopilotView: View {
    @EnvironmentObject var state: AppState
    @State private var messages: [CopilotMessage] = []
    @State private var input = ""
    @State private var thinkingSessionID: UUID?
    @State private var backgroundWorkTokens: [UUID: Set<UUID>] = [:]
    @State private var completedBackgroundWorkCredits: [UUID: Int] = [:]
    @State private var executionDisplay: [UUID: CopilotExecutionDisplay] = [:]
    @State private var showingSessions = false
    @State private var showWorkspace = true
    @State private var showMeeting = false
    @State private var emailEditor: CopilotEmailEditorContext?
    @State private var sourcesSheet: CopilotSourcesContext?
    @FocusState private var inputFocused: Bool

    var body: some View {
        VStack(spacing: 0) {
            MShellTop(title: "Co-Pilot", subtitle: state.activeCopilotSessionTitle()) {
                HStack(spacing: 8) {
                    headerButton("square.and.pencil") {
                        startNewSession()
                    }
                    headerButton("tray.full") {
                        inputFocused = false
                        showingSessions = true
                    }
                    headerButton("chevron.down") {
                        inputFocused = false
                        state.minimizeCopilot()
                    }
                }
            }

            if inWorkspace {
                workspaceHome
            } else {
                sessionBar

                ScrollViewReader { proxy in
                    ScrollView {
                        VStack(spacing: 14) {
                            if messages.isEmpty { welcome }
                            ForEach(messages) { msg in
                                bubble(msg).id(msg.id)
                            }
                            if isThinkingForCurrentSession {
                                thinkingBubble.id("copilot-typing")
                            }
                        }
                        .padding(.horizontal, 18)
                        .padding(.vertical, 16)
                    }
                    .scrollIndicators(.hidden)
                    .scrollDismissesKeyboard(.interactively)
                    .simultaneousGesture(TapGesture().onEnded {
                        inputFocused = false
                    })
                    .onChange(of: messages.count) { _, _ in
                        if isThinkingForCurrentSession {
                            withAnimation { proxy.scrollTo("copilot-typing", anchor: .bottom) }
                        } else if let last = messages.last {
                            withAnimation { proxy.scrollTo(last.id, anchor: .bottom) }
                        }
                    }
                }

                inputDock
            }
        }
        .background(MF.canvas.ignoresSafeArea())
        .sheet(isPresented: $showMeeting) {
            NavigationStack { MeetingView() }
                .presentationDetents([.large])
                .presentationCornerRadius(26)
        }
        .sheet(item: $emailEditor) { context in
            CopilotEmailDraftEditor(
                initialDraft: context.draft,
                gmailConnected: state.connectedAccount(for: .gmail)?.isConnected == true,
                onSave: { draft in
                    saveEmailDraft(draft, messageID: context.messageID)
                },
                onSent: { draft in
                    saveEmailDraft(draft, messageID: context.messageID)
                    appendAssistant(CopilotMessage(
                        mine: false,
                        text: "E-Mail an \(draft.to) gesendet.",
                        source: .local
                    ))
                }
            )
        }
        .sheet(item: $sourcesSheet) { context in
            CopilotSourcesSheet(sources: context.sources)
                .presentationDetents([.medium, .large])
                .presentationCornerRadius(24)
        }
        .onAppear {
            loadActiveSession()
            runPendingCopilotPrompt()
        }
        .task(id: state.isAuthenticated) {
            guard state.isAuthenticated else { return }
            await observeFollowUps()
        }
        .task(id: state.activeCopilotSessionID) {
            guard state.isAuthenticated, let sessionID = state.activeCopilotSessionID else { return }
            let cutoff = state.copilotMessages(for: sessionID)
                .map(\.createdAt)
                .max()?
                .addingTimeInterval(-5)
            _ = await syncExecutionFollowUps(
                for: sessionID,
                after: cutoff,
                affectsBackgroundWork: false
            )
        }
        .onChange(of: state.activeCopilotSessionID) { _, _ in
            loadActiveSession()
        }
        .onChange(of: state.pendingCopilotPrompt) { _, _ in
            runPendingCopilotPrompt()
        }
        .sheet(isPresented: $showingSessions) {
            CopilotSessionsSheet(
                sessions: state.copilotSessions,
                activeID: state.activeCopilotSessionID,
                onSelect: openSession,
                onNew: startNewSession,
                onDelete: deleteSession
            )
            .presentationDetents([.medium, .large])
            .presentationCornerRadius(26)
        }
        .toolbar {
            ToolbarItemGroup(placement: .keyboard) {
                Spacer()
                Button("Fertig") {
                    inputFocused = false
                }
                .font(.system(size: 15, weight: .semibold))
            }
        }
    }

    private var isThinkingForCurrentSession: Bool {
        guard let sessionID = state.activeCopilotSessionID else { return false }
        return thinkingSessionID == sessionID || backgroundWorkTokens[sessionID]?.isEmpty == false
    }

    private var executionDisplayForCurrentSession: CopilotExecutionDisplay? {
        guard
            let sessionID = state.activeCopilotSessionID,
            backgroundWorkTokens[sessionID]?.isEmpty == false
        else { return nil }
        return executionDisplay[sessionID]
    }

    // ═══════════════════════════════════ WORKSPACE (Design mfx-copilot)
    // Landing: Was kann ich erledigen · laufende Aufgaben · Meeting · weiter im Gespräch.

    private var inWorkspace: Bool {
        showWorkspace && messages.isEmpty && !isThinkingForCurrentSession
            && state.pendingCopilotPrompt == nil
    }

    private struct PilotSkill: Identifiable {
        let id: String
        let icon: String
        let label: String
        let desc: String
        let question: String
        let prompt: String
        let choices: [CopilotChoice]
    }

    private static let pilotSkills: [PilotSkill] = [
        .init(id: "fund", icon: "checkmark.seal.fill", label: "Förderung finden", desc: "Passende Töpfe",
              question: "Welche Art von Förderung sollen wir zuerst prüfen?",
              prompt: "Welche Förderprogramme passen zu meinem Vorhaben? Prüfe meine Branche und Region.",
              choices: [
                .init(id: "fund-start", label: "Gründungszuschuss", detail: "Agentur, Einstieg, Voraussetzungen", prompt: "Prüfe für mein Vorhaben Gründungszuschuss, Einstiegsgeld und regionale Start-Hilfen. Sag mir konkret, was ich als Erstes tun muss.", icon: "person.crop.circle.badge.checkmark"),
                .init(id: "fund-region", label: "Regionale Förderung", detail: "Land, Kommune, Kammer", prompt: "Suche passende regionale Förderungen für meine Branche und PLZ. Gib mir Quellen und nächste Schritte.", icon: "mappin.and.ellipse"),
                .init(id: "fund-invest", label: "Investition & Kredit", detail: "KfW, Bank, Mikrokredit", prompt: "Prüfe, welche Kredit- oder Investitionsförderung zu meinem Vorhaben passt und welche Unterlagen die Bank sehen will.", icon: "banknote.fill"),
              ]),
        .init(id: "plan", icon: "book.fill", label: "Businessplan", desc: "Entwurf in 1 Std",
              question: "Wofür brauchst du den Businessplan?",
              prompt: "Hilf mir, einen Businessplan-Entwurf für mein Vorhaben zu erstellen.",
              choices: [
                .init(id: "plan-bank", label: "Für Bank & Förderung", detail: "Tragfähigkeit, Zahlen, Nachweise", prompt: "Erstelle mit mir einen bankfähigen Businessplan für mein Vorhaben. Starte mit den fehlenden Pflichtteilen und frage mich Schritt für Schritt ab.", icon: "building.columns.fill"),
                .init(id: "plan-self", label: "Als Fahrplan für mich", detail: "klarer 30-Tage-Plan", prompt: "Baue mir aus meiner Idee einen einfachen Businessplan als persönlichen Fahrplan. Fokus: Angebot, Zielkunden, erste Einnahmen, nächste 30 Tage.", icon: "map.fill"),
                .init(id: "plan-invest", label: "Für Investoren", detail: "Pitch, Wachstum, Markt", prompt: "Bereite meinen Businessplan investorentauglich vor: Problem, Lösung, Markt, Geschäftsmodell, Wachstum und offene Risiken.", icon: "chart.line.uptrend.xyaxis"),
              ]),
        .init(id: "legal", icon: "lock.fill", label: "Rechtsform", desc: "GmbH vs. Einzel",
              question: "Was willst du gerade entscheiden?",
              prompt: "Welche Rechtsform passt zu mir — GmbH oder Einzelunternehmen?",
              choices: [
                .init(id: "legal-solo", label: "Einzelunternehmen prüfen", detail: "schnell starten, einfache Pflichten", prompt: "Prüfe, ob ein Einzelunternehmen für mein Vorhaben reicht. Erkläre Risiken, Anmeldung, Steuern und wann ich wechseln sollte.", icon: "person.fill"),
                .init(id: "legal-gbr", label: "Mit Partner gründen", detail: "GbR, Verträge, Rollen", prompt: "Ich gründe mit mindestens einer weiteren Person. Vergleiche GbR, UG und GmbH für uns und nenne die wichtigsten Vertragsregeln.", icon: "person.2.fill"),
                .init(id: "legal-risk", label: "Haftung minimieren", detail: "UG/GmbH sinnvoll?", prompt: "Bewerte mein Haftungsrisiko und sag mir, ob UG oder GmbH sinnvoll ist. Berücksichtige kleine Unternehmen und Kosten.", icon: "shield.fill"),
              ]),
        .init(id: "hire", icon: "person.2.fill", label: "Hilfe finden", desc: "Partner & erste Hilfe",
              question: "Welche Unterstützung suchst du?",
              prompt: "Was fehlt meinem Team am meisten und wie finde ich den ersten Mitstreiter?",
              choices: [
                .init(id: "help-cofounder", label: "Co-Founder", detail: "langfristig mitgründen", prompt: "Hilf mir zu entscheiden, ob ich wirklich einen Co-Founder brauche. Frag mich 3 Dinge ab und gib dann ein Suchprofil aus.", icon: "person.2.fill"),
                .init(id: "help-service", label: "Dienstleister", detail: "Website, Buchhaltung, Design", prompt: "Welche Dienstleister brauche ich zuerst und woran erkenne ich gute Angebote? Priorisiere nach Nutzen und Kosten.", icon: "wrench.and.screwdriver.fill"),
                .init(id: "help-chamber", label: "Kammer/Beratung", detail: "IHK/HWK/Ansprechpartner", prompt: "Finde heraus, welche Kammer oder Beratungsstelle für mein Vorhaben zuständig ist und welche Fragen ich dort stellen soll.", icon: "building.2.fill"),
              ]),
        .init(id: "cost", icon: "bolt.fill", label: "Finanzplan", desc: "Start-Budget",
              question: "Was sollen wir zuerst rechnen?",
              prompt: "Rechne meine Startkosten durch und baue einen ersten Finanzplan.",
              choices: [
                .init(id: "cost-start", label: "Gründungskosten", detail: "einmalige Kosten", prompt: "Erstelle eine realistische Gründungskostenliste für mein Vorhaben und frage fehlende Kostenpositionen Schritt für Schritt ab.", icon: "receipt.fill"),
                .init(id: "cost-month", label: "Monatliche Fixkosten", detail: "Miete, Tools, Personal", prompt: "Baue mir eine monatliche Fixkostenübersicht und sag mir, ab welchem Umsatz mein Geschäft tragfähig wird.", icon: "calendar"),
                .init(id: "cost-price", label: "Preise kalkulieren", detail: "Stundensatz oder Paketpreis", prompt: "Hilf mir, meine Preise zu kalkulieren. Nutze Kosten, Zeitaufwand, Marge und Zielkunden.", icon: "tag.fill"),
              ]),
        .init(id: "msg", icon: "arrowshape.turn.up.left.fill", label: "Nachricht", desc: "Match anschreiben",
              question: "Wen willst du anschreiben?",
              prompt: "Schreib mir einen starken ersten Aufschlag für mein bestes Match.",
              choices: [
                .init(id: "msg-match", label: "Ein Match", detail: "persönlicher Einstieg", prompt: "Hilf mir, eine konkrete Nachricht an ein Match zu schreiben. Zeige mir erst passende Matches zur Auswahl, falls mehrere da sind.", icon: "bubble.left.and.bubble.right.fill"),
                .init(id: "msg-partner", label: "Partner/Ansprechpartner", detail: "IHK, HWK, Dienstleister", prompt: "Formuliere eine kurze, professionelle Anfrage an einen Ansprechpartner oder Partner. Frag mich vorher, an wen sie geht.", icon: "paperplane.fill"),
                .init(id: "msg-followup", label: "Follow-up", detail: "nach Meeting oder Erstkontakt", prompt: "Schreibe ein Follow-up nach einem Gespräch. Frag mich nach Kontext, Ziel und gewünschtem nächsten Schritt.", icon: "arrowshape.turn.up.left.fill"),
              ]),
    ]

    private var lastSessionWithContent: CopilotSession? {
        state.copilotSessions.first { !$0.messages.isEmpty }
    }

    private var workspaceHome: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                // Hero: direkte Frage + Eingabe
                VStack(alignment: .leading, spacing: 0) {
                    HStack(spacing: 8) {
                        Image(systemName: "sparkles").font(.system(size: 13, weight: .bold)).foregroundStyle(.white)
                        Text("Womit kann ich helfen")
                            .font(.mfMono(10)).tracking(1.4).textCase(.uppercase)
                            .foregroundStyle(.white.opacity(0.85))
                    }
                    Text("Erledige heute einen echten Schritt deiner Gründung.")
                        .font(.system(size: 23, weight: .heavy)).tracking(-0.6)
                        .foregroundStyle(.white)
                        .padding(.top, 12)
                        .fixedSize(horizontal: false, vertical: true)
                    Button {
                        Haptics.tap()
                        showWorkspace = false
                        inputFocused = true
                    } label: {
                        HStack(spacing: 10) {
                            Text("Frag mich alles…")
                                .font(.system(size: 14.5))
                                .foregroundStyle(.white.opacity(0.8))
                            Spacer(minLength: 0)
                            Image(systemName: "arrow.up")
                                .font(.system(size: 15, weight: .heavy))
                                .foregroundStyle(MF.indigo)
                                .frame(width: 34, height: 34)
                                .background(MF.surface)
                                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                        }
                        .padding(.leading, 15)
                        .padding(.vertical, 7)
                        .padding(.trailing, 7)
                        .background(.white.opacity(0.16))
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: 14).stroke(.white.opacity(0.28), lineWidth: 1))
                    }
                    .buttonStyle(.plain)
                    .padding(.top, 16)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(20)
                .background(MF.indigoGrad)
                .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
                .indigoGlow()

                // Start-Assistent
                VStack(alignment: .leading, spacing: 13) {
                    Text("Start-Assistent")
                        .font(.system(size: 16, weight: .heavy)).tracking(-0.3)
                        .foregroundStyle(MF.ink)
                    LazyVGrid(columns: [GridItem(.flexible(), spacing: 11), GridItem(.flexible())], spacing: 11) {
                        ForEach(Self.pilotSkills) { s in
                            Button {
                                Haptics.tap()
                                startAssistantFlow(s)
                            } label: {
                                VStack(alignment: .leading, spacing: 11) {
                                    Image(systemName: s.icon)
                                        .font(.system(size: 18, weight: .semibold))
                                        .foregroundStyle(MF.indigoInk)
                                        .frame(width: 40, height: 40)
                                        .background(MF.indigoTint)
                                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(s.label)
                                            .font(.system(size: 14.5, weight: .bold))
                                            .foregroundStyle(MF.ink)
                                        Text(s.desc)
                                            .font(.system(size: 12))
                                            .foregroundStyle(MF.smoke)
                                    }
                                }
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(14)
                                .background(MF.surface)
                                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                                .overlay(RoundedRectangle(cornerRadius: 18).stroke(MF.border, lineWidth: 1))
                                .warmShadow()
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }

                // Woran wir arbeiten — Board-Karten in Arbeit
                let working = KanbanStore.shared.cards(in: .doing).prefix(2)
                if !working.isEmpty {
                    VStack(alignment: .leading, spacing: 13) {
                        HStack {
                            Text("Woran wir arbeiten")
                                .font(.system(size: 16, weight: .heavy)).tracking(-0.3)
                                .foregroundStyle(MF.ink)
                            Spacer()
                            Button {
                                state.open(.screen(.kanban))
                                state.minimizeCopilot()
                            } label: {
                                Text("Alle").font(.system(size: 13.5, weight: .semibold)).foregroundStyle(MF.emberDeep)
                            }
                            .buttonStyle(.plain)
                        }
                        ForEach(Array(working)) { card in
                            Button {
                                state.open(.screen(.kanban))
                                state.minimizeCopilot()
                            } label: {
                                HStack(spacing: 12) {
                                    Image(systemName: "book.fill")
                                        .font(.system(size: 17, weight: .semibold))
                                        .foregroundStyle(MF.emberDeep)
                                        .frame(width: 40, height: 40)
                                        .background(MF.emberTint)
                                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                                    VStack(alignment: .leading, spacing: 1) {
                                        Text(card.title)
                                            .font(.system(size: 15, weight: .bold))
                                            .foregroundStyle(MF.ink)
                                            .lineLimit(1)
                                        Text("In Arbeit auf deinem Board")
                                            .font(.system(size: 12.5))
                                            .foregroundStyle(MF.smoke)
                                    }
                                    Spacer(minLength: 0)
                                    Image(systemName: "chevron.right")
                                        .font(.system(size: 13, weight: .bold))
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
                }

                // Extras — Meeting aufnehmen
                VStack(alignment: .leading, spacing: 13) {
                    Text("Extras")
                        .font(.system(size: 16, weight: .heavy)).tracking(-0.3)
                        .foregroundStyle(MF.ink)
                    Button {
                        Haptics.tap()
                        showMeeting = true
                    } label: {
                        HStack(spacing: 14) {
                            Image(systemName: "mic.fill")
                                .font(.system(size: 21, weight: .semibold))
                                .foregroundStyle(.white)
                                .frame(width: 48, height: 48)
                                .background(MF.indigoGrad)
                                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                                .indigoGlow()
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Meeting aufnehmen")
                                    .font(.system(size: 15.5, weight: .bold))
                                    .foregroundStyle(MF.ink)
                                Text("Ich fasse zusammen & mache Aufgaben daraus")
                                    .font(.system(size: 12.5))
                                    .foregroundStyle(MF.smoke)
                            }
                            Spacer(minLength: 0)
                            Image(systemName: "chevron.right")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundStyle(MF.faint)
                        }
                        .padding(16)
                        .background(MF.surface)
                        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: 18).stroke(MF.border, lineWidth: 1))
                        .warmShadow()
                    }
                    .buttonStyle(.plain)
                }

                // Weiter im Gespräch
                if let session = lastSessionWithContent {
                    Button {
                        Haptics.tap()
                        showWorkspace = false
                        openSession(session.id)
                    } label: {
                        HStack(spacing: 12) {
                            Image(systemName: "arrowshape.turn.up.left.fill")
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundStyle(.white)
                                .frame(width: 38, height: 38)
                                .background(MF.indigoGrad)
                                .clipShape(RoundedRectangle(cornerRadius: 11, style: .continuous))
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Weiter im Gespräch")
                                    .font(.system(size: 12, weight: .bold))
                                    .foregroundStyle(MF.indigoInk)
                                Text(session.title)
                                    .font(.system(size: 13.5))
                                    .foregroundStyle(MF.inkSoft)
                                    .lineLimit(1)
                            }
                            Spacer(minLength: 0)
                            Image(systemName: "chevron.right")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundStyle(MF.indigoInk)
                        }
                        .padding(14)
                        .background(MF.indigoTint)
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 16)
            .padding(.bottom, 30)
        }
        .scrollIndicators(.hidden)
    }

    private var sessionBar: some View {
        HStack(spacing: 10) {
            Button {
                inputFocused = false
                showingSessions = true
            } label: {
                HStack(spacing: 9) {
                    Image(systemName: "clock.arrow.circlepath")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(MF.indigoInk)
                        .frame(width: 30, height: 30)
                        .background(MF.indigoTint)
                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                    VStack(alignment: .leading, spacing: 1) {
                        Text(state.activeCopilotSessionTitle())
                            .font(.system(size: 13.5, weight: .bold))
                            .foregroundStyle(MF.ink)
                            .lineLimit(1)
                        Text("\(messages.count) Nachrichten")
                            .font(.system(size: 11.5, weight: .semibold))
                            .foregroundStyle(MF.faint)
                    }
                    Spacer()
                    Image(systemName: "chevron.down")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(MF.faint)
                }
            }
            .buttonStyle(.plain)

            Button {
                startNewSession()
            } label: {
                Image(systemName: "plus")
                    .font(.system(size: 13, weight: .heavy))
                    .foregroundStyle(.white)
                    .frame(width: 38, height: 38)
                    .background(MF.indigoGrad)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(MF.surface)
        .overlay(alignment: .bottom) { Rectangle().fill(MF.borderSoft).frame(height: 1) }
    }

    private func headerButton(_ icon: String, action: @escaping () -> Void) -> some View {
        Button {
            Haptics.tap()
            action()
        } label: {
            Image(systemName: icon)
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(MF.indigoInk)
                .frame(width: 38, height: 38)
                .background(MF.indigoTint)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
        .buttonStyle(.plain)
    }

    private var welcome: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Ich bin dein Co-Pilot.")
                .font(.system(size: 15, weight: .bold)).foregroundStyle(MF.ink)
            Text("Ich arbeite mit deinem Profil, Firmenprofil, Unterlagen, Kalender, Events und Matches. Frag mich nicht nur etwas — lass mich einen nächsten Schritt in der App ausführen.")
                .font(.system(size: 13.5)).foregroundStyle(MF.smoke)
                .lineSpacing(3)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(MF.surfaceSoft)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    // ─── Bubbles nach Spec ────────────────────────────────────
    @ViewBuilder
    private func bubble(_ msg: CopilotMessage) -> some View {
        if msg.mine {
            HStack {
                Spacer(minLength: 32)
                if let context = CopilotContextCard.parse(msg.text) {
                    contextCard(context)
                } else if let feature = CopilotFeatureRequest.parse(msg.text) {
                    featureRequestCard(feature)
                } else if let skill = Self.pilotSkills.first(where: { $0.label == msg.text }) {
                    HStack(spacing: 8) {
                        Image(systemName: skill.icon)
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(.white.opacity(0.85))
                            .frame(width: 24, height: 24)
                            .background(.white.opacity(0.18))
                            .clipShape(RoundedRectangle(cornerRadius: 7, style: .continuous))
                        Text(msg.text)
                            .font(.system(size: 14.5, weight: .bold))
                            .foregroundStyle(.white)
                    }
                    .padding(.horizontal, 13).padding(.vertical, 9)
                    .background(MF.indigoGrad)
                    .clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))
                    .indigoGlow()
                } else {
                    Text(msg.text)
                        .font(.system(size: 14.5))
                        .foregroundStyle(.white)
                        .lineSpacing(3)
                        .padding(.horizontal, 15).padding(.vertical, 11)
                        .background(MF.indigoGrad)
                        .clipShape(UnevenRoundedRectangle(
                            topLeadingRadius: 18, bottomLeadingRadius: 18,
                            bottomTrailingRadius: 5, topTrailingRadius: 18))
                        .indigoGlow()
                }
            }
        } else {
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 7) {
                    Image(systemName: "sparkle")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(.white)
                        .frame(width: 22, height: 22)
                        .background(MF.indigoGrad)
                        .clipShape(Circle())
                    Text("Co-Pilot")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(MF.smoke)
                    Text(msg.source.label)
                        .font(.mfMono(9))
                        .foregroundStyle(msg.source == .cloud ? MF.indigoInk : MF.faint)
                        .padding(.horizontal, 7)
                        .frame(height: 18)
                        .background(msg.source == .cloud ? MF.indigoTint : MF.surfaceSoft)
                        .clipShape(Capsule())
                }
                VStack(alignment: .leading, spacing: 11) {
                    let renderedEmailDraft = (msg.emailDraft ?? CopilotEmailDraft.legacy(from: msg.text))
                        .map(personalizedEmailDraft)
                    if let win = msg.celebratedWin {
                        HStack(spacing: 9) {
                            Text("🎉").font(.system(size: 16))
                            VStack(alignment: .leading, spacing: 1) {
                                Text("Meilenstein")
                                    .font(.mfMono(9))
                                    .tracking(1)
                                    .textCase(.uppercase)
                                    .foregroundStyle(MF.emberDeep)
                                Text(win)
                                    .font(.system(size: 13, weight: .bold))
                                    .foregroundStyle(MF.ink)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                            Spacer(minLength: 0)
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 9)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(MF.emberTint)
                        .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 13).stroke(MF.ember.opacity(0.4), lineWidth: 1)
                        )
                    }
                    CopilotMarkdownText(
                        markdown: renderedEmailDraft == nil
                            ? assistantDisplayText(msg)
                            : "Der E-Mail-Entwurf ist fertig. Du kannst ihn direkt bearbeiten oder versenden."
                    )
                    if let emailDraft = renderedEmailDraft {
                        emailDraftCard(emailDraft, messageID: msg.id)
                    }
                    if let source = primaryLinkSource(for: msg),
                       let urlString = source.url,
                       let url = URL(string: urlString) {
                        primaryLinkButton(source, url: url)
                    }
                    if !msg.sources.isEmpty {
                        sourceCollectionButton(msg.sources)
                    }
                    if !msg.actions.isEmpty {
                        FlowLayout(spacing: 7) {
                            ForEach(msg.actions) { action in
                                Button {
                                    Haptics.tap()
                                    handle(action)
                                } label: {
                                    HStack(spacing: 6) {
                                        Image(systemName: action.icon)
                                            .font(.system(size: 11, weight: .bold))
                                        Text(action.label)
                                            .font(.system(size: 12.5, weight: .semibold))
                                            .lineLimit(1)
                                            .truncationMode(.tail)
                                    }
                                    .frame(maxWidth: 250, alignment: .leading)
                                    .foregroundStyle(MF.indigoInk)
                                    .padding(.horizontal, 12).padding(.vertical, 8)
                                    .background(MF.indigoTint)
                                    .clipShape(Capsule())
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                    let displayChoices = msg.choices.isEmpty
                        ? msg.quickReplies.map {
                            CopilotChoice(id: $0, label: $0, prompt: $0, icon: "circle")
                        }
                        : msg.choices
                    if !displayChoices.isEmpty {
                        choiceList(displayChoices)
                    }
                    if !msg.navigation.isEmpty {
                        FlowLayout(spacing: 7) {
                            ForEach(msg.navigation) { nav in
                                Button {
                                    Haptics.tap()
                                    state.open(nav.destination)
                                    if nav.destination != .screen(.copilot) {
                                        state.minimizeCopilot()
                                    }
                                } label: {
                                    HStack(spacing: 5) {
                                        Text(nav.label)
                                            .font(.system(size: 12.5, weight: .semibold))
                                            .lineLimit(1)
                                            .truncationMode(.tail)
                                        Image(systemName: "arrow.right")
                                            .font(.system(size: 9, weight: .bold))
                                    }
                                    .frame(maxWidth: 250, alignment: .leading)
                                    .foregroundStyle(MF.indigoInk)
                                    .padding(.horizontal, 13).padding(.vertical, 8)
                                    .background(MF.surfaceSoft)
                                    .overlay(Capsule().stroke(MF.border, lineWidth: 1))
                                    .clipShape(Capsule())
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }
                .padding(.horizontal, 15).padding(.vertical, 12)
                .background(MF.surface)
                .clipShape(UnevenRoundedRectangle(
                    topLeadingRadius: 5, bottomLeadingRadius: 18,
                    bottomTrailingRadius: 18, topTrailingRadius: 18))
                .overlay(UnevenRoundedRectangle(
                    topLeadingRadius: 5, bottomLeadingRadius: 18,
                    bottomTrailingRadius: 18, topTrailingRadius: 18)
                    .stroke(MF.border, lineWidth: 1))
                .warmShadow()
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.trailing, 36)
        }
    }

    private func featureRequestCard(_ feature: CopilotFeatureRequest) -> some View {
        HStack(spacing: 12) {
            Image(systemName: feature.icon)
                .font(.system(size: 17, weight: .bold))
                .foregroundStyle(MF.indigoInk)
                .frame(width: 40, height: 40)
                .background(MF.indigoTint)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

            VStack(alignment: .leading, spacing: 3) {
                Text("FEATURE GESTARTET")
                    .font(.mfMono(9))
                    .foregroundStyle(MF.indigoInk)
                Text(feature.title)
                    .font(.system(size: 14.5, weight: .bold))
                    .foregroundStyle(MF.ink)
                Text(feature.subtitle)
                    .font(.system(size: 12))
                    .foregroundStyle(MF.smoke)
                    .lineLimit(2)
            }

            Spacer(minLength: 4)

            Image(systemName: "arrow.right")
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(MF.indigo)
        }
        .padding(13)
        .frame(maxWidth: 310, alignment: .leading)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(MF.indigo.opacity(0.25), lineWidth: 1)
        )
        .warmShadow()
    }

    private func contextCard(_ context: CopilotContextCard) -> some View {
        VStack(alignment: .leading, spacing: 11) {
            HStack(alignment: .top, spacing: 11) {
                Image(systemName: context.kind.icon)
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 38, height: 38)
                    .background(MF.indigoGrad)
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                VStack(alignment: .leading, spacing: 3) {
                    Text(context.kind.label)
                        .font(.mfMono(9))
                        .textCase(.uppercase)
                        .foregroundStyle(MF.indigoInk)
                    Text(context.title)
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(MF.ink)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 0)
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(MF.indigo)
            }

            if !context.metadata.isEmpty {
                FlowLayout(spacing: 6) {
                    ForEach(context.metadata, id: \.self) { item in
                        Text(item)
                            .font(.system(size: 10.5, weight: .semibold))
                            .foregroundStyle(MF.smoke)
                            .lineLimit(1)
                            .padding(.horizontal, 9)
                            .frame(height: 27)
                            .background(MF.surfaceSoft)
                            .clipShape(Capsule())
                    }
                }
            }

            if let summary = context.summary, !summary.isEmpty {
                Text(summary)
                    .font(.system(size: 12.5))
                    .foregroundStyle(MF.smoke)
                    .lineLimit(3)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(14)
        .frame(maxWidth: 340, alignment: .leading)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(MF.indigo.opacity(0.22), lineWidth: 1))
        .warmShadow()
    }

    private func emailDraftCard(_ draft: CopilotEmailDraft, messageID: UUID) -> some View {
        Button {
            Haptics.tap()
            inputFocused = false
            emailEditor = CopilotEmailEditorContext(messageID: messageID, draft: draft)
        } label: {
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 10) {
                    Image(systemName: "envelope.fill")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(width: 34, height: 34)
                        .background(MF.indigoGrad)
                        .clipShape(RoundedRectangle(cornerRadius: 9, style: .continuous))
                    VStack(alignment: .leading, spacing: 2) {
                        Text("E-Mail-Entwurf")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(MF.ink)
                        Text(draft.to.isEmpty ? "Empfänger noch eintragen" : draft.to)
                            .font(.system(size: 11.5, weight: .medium))
                            .foregroundStyle(draft.to.isEmpty ? MF.emberDeep : MF.smoke)
                            .lineLimit(1)
                    }
                    Spacer(minLength: 0)
                    Image(systemName: "chevron.right")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(MF.faint)
                }

                VStack(alignment: .leading, spacing: 5) {
                    Text(draft.subject)
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(MF.ink)
                        .lineLimit(2)
                    Text(draft.body)
                        .font(.system(size: 12.5))
                        .foregroundStyle(MF.smoke)
                        .lineLimit(4)
                        .lineSpacing(2)
                }

                HStack(spacing: 6) {
                    Image(systemName: "pencil")
                        .font(.system(size: 10.5, weight: .bold))
                    Text("Bearbeiten & senden")
                        .font(.system(size: 12.5, weight: .bold))
                }
                .foregroundStyle(MF.indigoInk)
            }
            .padding(13)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(MF.surfaceSoft)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(MF.indigo.opacity(0.22), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
        .accessibilityLabel("E-Mail-Entwurf bearbeiten und senden")
    }

    private func personalizedEmailDraft(_ input: CopilotEmailDraft) -> CopilotEmailDraft {
        var draft = input
        let memory = state.founderMemory
        let founderName = [
            state.profile?.name,
            state.authUser?.displayName,
            memory.founderName,
        ]
        .compactMap { meaningfulIdentity($0) }
        .first ?? ""
        let ventureName = [
            state.companyProfile.name,
            memory.ventureName,
        ]
        .compactMap { meaningfulVentureName($0) }
        .first ?? ""

        let replacements = [
            "[Dein Name]": founderName,
            "[dein Name]": founderName,
            "[Name]": founderName,
            "[Dein Unternehmen]": ventureName,
            "[dein Unternehmen]": ventureName,
            "[Art deines Handwerksbetriebs, z.B. Elektrikerbetrieb, Tischlerei, Bäckerei]": memory.industry,
            "[kurze Erwähnung eines spezifischen Details aus deinem Founder-Profil, z.B. meiner Geschäftsidee, meinem Geschäftsmodell, meiner Zielgruppe]":
                ventureName.isEmpty
                    ? "meinem Vorhaben im Bereich \(memory.industry)"
                    : "meinem Vorhaben \(ventureName) im Bereich \(memory.industry)",
            "[Nenne 1-2 konkrete Fragen oder Bereiche, die dich interessieren, z.B. die Eintragung in die Handwerksrolle, Fördermöglichkeiten, rechtliche Rahmenbedingungen]":
                "die nächsten Anmeldeschritte, mögliche Förderungen und die für meinen Betrieb geltenden Voraussetzungen",
        ]
        for (placeholder, value) in replacements {
            draft.subject = draft.subject.replacingOccurrences(of: placeholder, with: value)
            draft.body = draft.body.replacingOccurrences(of: placeholder, with: value)
        }

        draft.subject = replaceRemainingEmailPlaceholders(
            in: draft.subject,
            founderName: founderName,
            ventureName: ventureName,
            location: memory.location
        )
        draft.body = replaceRemainingEmailPlaceholders(
            in: draft.body,
            founderName: founderName,
            ventureName: ventureName,
            location: memory.location
        )
        draft.body = cleanGeneratedEmailBody(
            draft.body,
            founderName: founderName,
            ventureName: ventureName
        )
        return draft
    }

    private func meaningfulIdentity(_ value: String?) -> String? {
        let clean = value?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let normalized = clean
            .lowercased()
            .folding(options: .diacriticInsensitive, locale: Locale(identifier: "de_DE"))
        guard clean.count >= 2,
              !clean.contains("@"),
              !["founder", "grunder", "grunderin", "noch kein name", "user"].contains(normalized)
        else { return nil }
        return clean
    }

    private func meaningfulVentureName(_ value: String?) -> String? {
        let clean = value?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let normalized = clean
            .lowercased()
            .folding(options: .diacriticInsensitive, locale: Locale(identifier: "de_DE"))
        guard clean.count >= 2,
              !["vorhaben", "idee", "business", "kleine grundung"].contains(normalized)
        else { return nil }
        return clean
    }

    private func replaceRemainingEmailPlaceholders(
        in value: String,
        founderName: String,
        ventureName: String,
        location: String
    ) -> String {
        guard let regex = try? NSRegularExpression(pattern: #"\[([^\]]+)\]"#) else {
            return value
        }
        let source = value as NSString
        var result = value
        let matches = regex.matches(
            in: value,
            range: NSRange(location: 0, length: source.length)
        )
        for match in matches.reversed() {
            let hint = source.substring(with: match.range(at: 1))
                .lowercased()
                .folding(options: .diacriticInsensitive, locale: Locale(identifier: "de_DE"))
            let replacement: String
            if hint.contains("name") {
                replacement = founderName
            } else if hint.contains("betrieb") || hint.contains("unternehmen") || hint.contains("geschaft") {
                replacement = ventureName
            } else if hint.contains("stadt") || hint.contains("ort") {
                replacement = location
            } else if hint.contains("frage") || hint.contains("bereich") {
                replacement = "die nächsten Anmeldeschritte und passenden Fördermöglichkeiten"
            } else {
                replacement = ""
            }
            result = (result as NSString).replacingCharacters(in: match.range, with: replacement)
        }
        return result
    }

    private func cleanGeneratedEmailBody(
        _ value: String,
        founderName: String,
        ventureName: String
    ) -> String {
        var lines = value.components(separatedBy: .newlines)
        if let stop = lines.firstIndex(where: isEmailMetadataBoundary) {
            lines = Array(lines[..<stop])
        }

        let closingIndex = lines.firstIndex(where: { line in
            let clean = normalizedEmailLine(line)
            return clean.hasPrefix("mit freundlichen grussen")
                || clean.hasPrefix("viele grusse")
                || clean.hasPrefix("beste grusse")
        })
        if let closingIndex {
            lines = Array(lines[...closingIndex])
            while lines.last?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == true {
                lines.removeLast()
            }
            if !founderName.isEmpty || !ventureName.isEmpty {
                lines.append("")
            }
            if !founderName.isEmpty {
                lines.append(founderName)
            }
            if !ventureName.isEmpty, ventureName.caseInsensitiveCompare(founderName) != .orderedSame {
                lines.append(ventureName)
            }
        } else {
            lines.removeAll(where: { line in
                let clean = normalizedEmailLine(line)
                return clean == "founder"
                    || clean == "grunder"
                    || clean == "sent from my iphone"
                    || clean.hasPrefix("meinem vorhaben ")
            })
        }

        var compact: [String] = []
        for line in lines {
            let trimmed = line.trimmingCharacters(in: .whitespaces)
            if trimmed.isEmpty, compact.last?.isEmpty == true { continue }
            if !trimmed.isEmpty,
               let last = compact.last,
               normalizedEmailLine(last) == normalizedEmailLine(trimmed) {
                continue
            }
            compact.append(trimmed)
        }
        while compact.last?.isEmpty == true {
            compact.removeLast()
        }
        return compact.joined(separator: "\n")
    }

    private func isEmailMetadataBoundary(_ line: String) -> Bool {
        let clean = normalizedEmailLine(line)
        return clean == "---"
            || clean.hasPrefix("wichtige hinweise")
            || clean.hasPrefix("quellen:")
            || clean.hasPrefix("du kannst die e-mail")
            || clean.hasPrefix("du kannst die email")
            || clean.hasPrefix("fertig zum offnen")
    }

    private func normalizedEmailLine(_ value: String) -> String {
        value
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .lowercased()
            .folding(options: .diacriticInsensitive, locale: Locale(identifier: "de_DE"))
    }

    @ViewBuilder
    private var thinkingBubble: some View {
        HStack {
            if thinkingSessionID == state.activeCopilotSessionID {
                IMessageTypingIndicator()
            } else if let executionDisplayForCurrentSession {
                CopilotExecutionIndicator(status: executionDisplayForCurrentSession)
            }
            Spacer()
        }
    }

    private func choiceList(_ choices: [CopilotChoice]) -> some View {
        VStack(spacing: 8) {
            ForEach(choices) { choice in
                Button {
                    Haptics.select()
                    send(choice.prompt, displayText: choice.label)
                } label: {
                    HStack(spacing: 12) {
                        ZStack {
                            Circle()
                                .stroke(MF.faint.opacity(0.7), lineWidth: 2)
                                .frame(width: 22, height: 22)
                            Image(systemName: choice.icon)
                                .font(.system(size: 9, weight: .bold))
                                .foregroundStyle(MF.indigoInk.opacity(0.85))
                        }
                        VStack(alignment: .leading, spacing: 2) {
                            Text(choice.label)
                                .font(.system(size: 14.5, weight: .bold))
                                .foregroundStyle(MF.ink)
                                .fixedSize(horizontal: false, vertical: true)
                            if let detail = choice.detail, !detail.isEmpty {
                                Text(detail)
                                    .font(.system(size: 12))
                                    .foregroundStyle(MF.smoke)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                        }
                        Spacer(minLength: 0)
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 12)
                    .background(MF.surfaceSoft)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 14).stroke(MF.border, lineWidth: 1))
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func sourceCollectionButton(_ sources: [CopilotSource]) -> some View {
        Button {
            Haptics.tap()
            inputFocused = false
            sourcesSheet = CopilotSourcesContext(sources: Array(sources.prefix(8)))
        } label: {
            HStack(spacing: 10) {
                Image(systemName: "books.vertical.fill")
                    .font(.system(size: 12.5, weight: .bold))
                    .foregroundStyle(MF.indigoInk)
                    .frame(width: 31, height: 31)
                    .background(MF.indigoTint)
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                VStack(alignment: .leading, spacing: 1) {
                    Text("Quellen")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(MF.ink)
                    Text(sources.count == 1 ? "1 Nachweis ansehen" : "\(sources.count) Nachweise ansehen")
                        .font(.system(size: 10.5, weight: .medium))
                        .foregroundStyle(MF.smoke)
                }
                Spacer(minLength: 0)
                Image(systemName: "chevron.right")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(MF.faint)
            }
            .padding(10)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(MF.surfaceSoft)
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .stroke(MF.border, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }

    private func primaryLinkButton(_ source: CopilotSource, url: URL) -> some View {
        Link(destination: url) {
            HStack(spacing: 10) {
                Image(systemName: "link")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 32, height: 32)
                    .background(.white.opacity(0.16))
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                VStack(alignment: .leading, spacing: 2) {
                    Text(sourceDisplayTitle(source))
                        .font(.system(size: 13.5, weight: .bold))
                        .foregroundStyle(.white)
                        .lineLimit(1)
                    Text("Link öffnen")
                        .font(.system(size: 10.5, weight: .semibold))
                        .foregroundStyle(.white.opacity(0.78))
                }
                Spacer(minLength: 0)
                Image(systemName: "arrow.up.right")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(.white)
            }
            .padding(10)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(MF.indigo)
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
        }
    }

    private func primaryLinkSource(for message: CopilotMessage) -> CopilotSource? {
        guard userAskedForLink(before: message) else { return nil }
        return message.sources.first(where: { source in
            guard let raw = source.url else { return false }
            return URL(string: raw) != nil
        })
    }

    private func userAskedForLink(before message: CopilotMessage) -> Bool {
        guard let messageIndex = messages.firstIndex(where: { $0.id == message.id }) else {
            return false
        }
        for previous in messages[..<messageIndex].reversed() where previous.mine {
            let text = previous.text
                .lowercased()
                .folding(options: .diacriticInsensitive, locale: Locale(identifier: "de_DE"))
            return ["link", "url", "website", "webseite", "homepage", "seite offnen"]
                .contains(where: text.contains)
        }
        return false
    }

    private func assistantDisplayText(_ message: CopilotMessage) -> String {
        guard primaryLinkSource(for: message) != nil else { return message.text }
        let source = message.text as NSString
        guard let detector = try? NSDataDetector(
            types: NSTextCheckingResult.CheckingType.link.rawValue
        ) else {
            return message.text
        }
        var clean = message.text
        let matches = detector.matches(
            in: message.text,
            range: NSRange(location: 0, length: source.length)
        )
        for match in matches.reversed() {
            clean = (clean as NSString).replacingCharacters(in: match.range, with: "")
        }
        clean = clean
            .components(separatedBy: .newlines)
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty && $0 != ":" && $0 != "-" }
            .joined(separator: "\n")
        return clean.count >= 8 ? clean : "Hier ist der passende Link."
    }

    private func sourceDisplayTitle(_ source: CopilotSource) -> String {
        let title = source.title.trimmingCharacters(in: .whitespacesAndNewlines)
        if !title.isEmpty, !looksLikeURL(title) {
            return shortened(title, maxLength: 34)
        }

        let rawURL = (source.url ?? title).trimmingCharacters(in: .whitespacesAndNewlines)
        if let compact = compactURLLabel(rawURL) {
            return compact
        }
        return shortened(title.isEmpty ? "Quelle" : title, maxLength: 34)
    }

    private func compactURLLabel(_ raw: String) -> String? {
        guard !raw.isEmpty else { return nil }
        let normalized = raw.contains("://") ? raw : "https://\(raw)"
        guard let components = URLComponents(string: normalized),
              let host = components.host?.replacingOccurrences(of: "www.", with: ""),
              !host.isEmpty
        else { return nil }

        let cleanSegments = components.path
            .split(separator: "/")
            .map(String.init)
            .filter { !$0.isEmpty }
        guard let last = cleanSegments.last else {
            return shortened(host, maxLength: 30)
        }

        let shortHost = shortened(host, maxLength: 22)
        let shortLast = shortened(last, maxLength: 14)
        return "\(shortHost)/.../\(shortLast)"
    }

    private func looksLikeURL(_ value: String) -> Bool {
        let lower = value.lowercased()
        return lower.hasPrefix("http://")
            || lower.hasPrefix("https://")
            || lower.hasPrefix("www.")
            || lower.contains(".de/")
            || lower.contains(".com/")
            || lower.contains(".org/")
            || lower.contains(".net/")
    }

    private func shortened(_ value: String, maxLength: Int) -> String {
        guard value.count > maxLength, maxLength > 3 else { return value }
        return "\(value.prefix(maxLength - 3))..."
    }

    // ─── Input-Dock (Spec: weiße Pille, 38px Indigo-Send) ─────
    private var inputDock: some View {
        HStack(spacing: 10) {
            TextField("Frag den Co-Pilot…", text: $input, axis: .vertical)
                .font(.system(size: 14.5))
                .lineLimit(1...4)
                .focused($inputFocused)
                .submitLabel(.send)
                .onSubmit { send(nil) }
                .padding(.leading, 16)
            Button { send(nil) } label: {
                Image(systemName: "paperplane.fill")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 38, height: 38)
                    .background(MF.indigoGrad)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
            .buttonStyle(.plain)
            .disabled(input.trimmingCharacters(in: .whitespaces).isEmpty || thinkingSessionID != nil)
            .opacity(input.trimmingCharacters(in: .whitespaces).isEmpty || thinkingSessionID != nil ? 0.4 : 1)
        }
        .padding(8)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(MF.border, lineWidth: 1))
        .warmShadow(large: true)
        .padding(.horizontal, 16)
        .padding(.bottom, 10)
    }

    private func startAssistantFlow(_ skill: PilotSkill) {
        inputFocused = false
        showWorkspace = false
        let sessionID = state.ensureCopilotSession()
        if state.activeCopilotSessionID != sessionID {
            state.switchCopilotSession(sessionID)
        }

        let userMessage = CopilotMessage(mine: true, text: skill.label)
        state.appendCopilotMessage(userMessage, to: sessionID)

        let assistantMessage = CopilotMessage(
            mine: false,
            text: skill.question,
            choices: skill.choices,
            memory: state.founderMemory,
            source: .local
        )
        state.appendCopilotMessage(assistantMessage, to: sessionID)

        withAnimation(.easeOut(duration: 0.25)) {
            messages = state.copilotMessages(for: sessionID)
        }
    }

    private func send(_ preset: String?, displayText: String? = nil) {
        let text = (preset ?? input).trimmingCharacters(in: .whitespaces)
        let visibleText = (displayText ?? text).trimmingCharacters(in: .whitespacesAndNewlines)
        inputFocused = false
        guard !text.isEmpty, thinkingSessionID == nil else { return }
        Haptics.tap()
        let sessionID = state.ensureCopilotSession()
        if state.activeCopilotSessionID != sessionID {
            state.switchCopilotSession(sessionID)
        }
        guard state.registerAIUsage(for: text) != nil else {
            input = ""
            let blocked = aiLimitMessage(state.currentAIUsage())
            messages.append(blocked)
            state.appendCopilotMessage(blocked, to: sessionID)
            state.paywall = .aiUsage
            return
        }
        input = ""
        let userMessage = CopilotMessage(mine: true, text: visibleText.isEmpty ? text : visibleText)
        messages.append(userMessage)
        state.appendCopilotMessage(userMessage, to: sessionID)
        let history = state.copilotMessages(for: sessionID)
        thinkingSessionID = sessionID
        Task { @MainActor in
            let answer = await CopilotEngine.answer(
                for: text,
                state: state,
                history: history,
                sessionID: sessionID
            )
            appendCopilotResponse(answer, to: sessionID)
            if answer.backgroundWorkPending {
                beginBackgroundWork(for: sessionID)
            }
            thinkingSessionID = nil
            if state.activeCopilotSessionID == sessionID {
                withAnimation(.easeOut(duration: 0.25)) {
                    messages = state.copilotMessages(for: sessionID)
                }
            }
            runPendingCopilotPrompt()
        }
    }

    // ─── Nachgereichte Antworten (Poke-Prinzip) ──────────────────
    // Recherchiert der Co-Pilot im Hintergrund, schreibt das Backend das
    // Ergebnis als eigene Zeile in copilot_messages. Hier hängen wir sie
    // live an den Chat an — der Founder muss nichts tun.
    private func observeFollowUps() async {
        guard state.isAuthenticated else { return }
        let channel = Backend.client.channel("copilot-followups")
        let inserts = channel.postgresChange(
            InsertAction.self,
            schema: "public",
            table: "copilot_messages"
        )
        do {
            try await channel.subscribeWithError()
        } catch {
            print("[Copilot] Realtime subscription failed: \(error.localizedDescription)")
            return
        }
        defer { Task { await channel.unsubscribe() } }

        for await insert in inserts {
            guard
                let row = try? insert.decodeRecord(
                    as: CopilotFollowUpRow.self,
                    decoder: JSONDecoder()
                ),
                row.role == "assistant"
            else { continue }
            await MainActor.run {
                _ = appendFollowUp(row, affectsBackgroundWork: true)
            }
        }
    }

    @MainActor
    private func syncExecutionFollowUps(
        for sessionID: UUID,
        after: Date?,
        affectsBackgroundWork: Bool
    ) async -> Bool {
        do {
            let columns = "session_id,role,content,model_used,sources"
            let rows: [CopilotFollowUpRow]
            if let after {
                rows = try await Backend.client
                    .from("copilot_messages")
                    .select(columns)
                    .eq("session_id", value: sessionID.uuidString)
                    .eq("model_used", value: "execution-agent")
                    .gte("created_at", value: ISO8601DateFormatter().string(from: after))
                    .order("created_at", ascending: true)
                    .limit(30)
                    .execute()
                    .value
            } else {
                rows = try await Backend.client
                    .from("copilot_messages")
                    .select(columns)
                    .eq("session_id", value: sessionID.uuidString)
                    .eq("model_used", value: "execution-agent")
                    .order("created_at", ascending: true)
                    .limit(60)
                    .execute()
                    .value
            }

            var appended = false
            for row in rows where row.role == "assistant" {
                appended = appendFollowUp(
                    row,
                    affectsBackgroundWork: affectsBackgroundWork
                ) || appended
            }
            return appended
        } catch {
            print("[Copilot] Follow-up sync failed: \(error.localizedDescription)")
            return false
        }
    }

    @MainActor
    private func refreshExecutionStatus(for sessionID: UUID) async {
        do {
            let rows: [CopilotExecutionStatusRow] = try await Backend.client
                .from("copilot_execution_jobs")
                .select("status,progress_text,current_step,max_steps")
                .eq("session_id", value: sessionID.uuidString)
                .order("created_at", ascending: false)
                .limit(1)
                .execute()
                .value
            guard let row = rows.first else { return }

            let text: String
            switch row.status {
            case "queued":
                text = row.progressText ?? "Der Auftrag wird vorbereitet."
            case "running":
                text = row.progressText ?? "Quellen werden geprüft."
            case "completed", "no_result":
                text = "Das Ergebnis wird in den Chat übernommen."
            case "failed":
                text = "Die Recherche konnte nicht abgeschlossen werden."
            default:
                text = row.progressText ?? "Recherche läuft."
            }
            executionDisplay[sessionID] = CopilotExecutionDisplay(
                text: text,
                currentStep: row.currentStep,
                maxSteps: row.maxSteps
            )
        } catch {
            print("[Copilot] Execution status failed: \(error.localizedDescription)")
        }
    }

    @MainActor
    @discardableResult
    private func appendFollowUp(
        _ row: CopilotFollowUpRow,
        affectsBackgroundWork: Bool
    ) -> Bool {
        if row.modelUsed == "execution-status" {
            if affectsBackgroundWork { finishBackgroundWork(for: row.sessionID) }
            return false
        }

        // Die normale HTTP-Antwort wird ebenfalls gespeichert und kann über
        // Realtime zurückkommen. Nur echte Execution-Ergebnisse gehören hierher.
        guard row.modelUsed == "execution-agent" else { return false }
        if affectsBackgroundWork { finishBackgroundWork(for: row.sessionID) }

        let text = row.content.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return false }
        let known = state.copilotMessages(for: row.sessionID)
        guard !known.contains(where: { $0.text == text }) else { return false }

        let message = CopilotMessage(
            mine: false,
            text: text,
            sources: Array((row.sources ?? []).prefix(5)),
            source: .cloud
        )
        state.appendCopilotMessage(message, to: row.sessionID)
        if state.activeCopilotSessionID == row.sessionID {
            messages = state.copilotMessages(for: row.sessionID)
            Haptics.select()
        }
        return true
    }

    @MainActor
    private func beginBackgroundWork(for sessionID: UUID) {
        let credits = completedBackgroundWorkCredits[sessionID, default: 0]
        if credits > 0 {
            completedBackgroundWorkCredits[sessionID] = credits - 1
            return
        }

        let token = UUID()
        let startedAt = Date().addingTimeInterval(-5)
        backgroundWorkTokens[sessionID, default: []].insert(token)
        executionDisplay[sessionID] = CopilotExecutionDisplay(
            text: "Der Auftrag wird vorbereitet.",
            currentStep: 0,
            maxSteps: 4
        )
        Task {
            for _ in 0..<60 {
                try? await Task.sleep(for: .seconds(3))
                guard backgroundWorkTokens[sessionID]?.contains(token) == true else { return }
                await refreshExecutionStatus(for: sessionID)
                let delivered = await syncExecutionFollowUps(
                    for: sessionID,
                    after: startedAt,
                    affectsBackgroundWork: true
                )
                if delivered { return }
            }

            await MainActor.run {
                backgroundWorkTokens[sessionID]?.remove(token)
                if backgroundWorkTokens[sessionID]?.isEmpty == true {
                    backgroundWorkTokens[sessionID] = nil
                    executionDisplay[sessionID] = nil
                }
            }
        }
    }

    @MainActor
    private func finishBackgroundWork(for sessionID: UUID) {
        guard var tokens = backgroundWorkTokens[sessionID], let token = tokens.first else {
            completedBackgroundWorkCredits[sessionID, default: 0] += 1
            return
        }
        tokens.remove(token)
        backgroundWorkTokens[sessionID] = tokens.isEmpty ? nil : tokens
        if tokens.isEmpty {
            executionDisplay[sessionID] = nil
        }
    }

    private func appendCopilotResponse(_ answer: CopilotMessage, to sessionID: UUID) {
        let question = answer.followUpQuestion?
            .trimmingCharacters(in: .whitespacesAndNewlines)
        guard answer.quickReplies.count >= 2, let question, !question.isEmpty else {
            var cleanAnswer = answer
            cleanAnswer.quickReplies = []
            cleanAnswer.followUpQuestion = nil
            state.appendCopilotMessage(cleanAnswer, to: sessionID)
            return
        }

        var mainAnswer = answer
        let replies = answer.quickReplies
        mainAnswer.quickReplies = []
        state.appendCopilotMessage(mainAnswer, to: sessionID)

        let wizard = CopilotMessage(
            mine: false,
            text: question,
            choices: replies.map { CopilotChoice(id: $0, label: $0, prompt: $0, icon: "circle") },
            source: answer.source,
            createdAt: .now
        )
        state.appendCopilotMessage(wizard, to: sessionID)
    }

    private func handle(_ action: CopilotAction) {
        switch action.command {
        case .askCopilot(let prompt):
            send(prompt)
        case .draftMatchMessage(let matchID):
            appendAssistant(CopilotEngine.draftMessageForMatch(matchID, state: state))
        case .previewSlackPost(let channelID, let channel, let text):
            appendAssistant(slackPreviewMessage(channelID: channelID, channel: channel, text: text))
        case .postToSlack(let channelID, let channel, let text):
            postToSlack(channelID: channelID, channel: channel, text: text)
        default:
            state.execute(action)
            if let confirmation = confirmationMessage(for: action) {
                appendAssistant(confirmation)
            }
            if shouldMinimizeAfter(action) {
                state.minimizeCopilot()
            }
        }
    }

    private func slackPreviewMessage(channelID: String, channel: String, text: String) -> CopilotMessage {
        let preview: String
        if text.count > 900 {
            preview = String(text.prefix(900)).trimmingCharacters(in: .whitespacesAndNewlines) + "…"
        } else {
            preview = text
        }
        return CopilotMessage(
            mine: false,
            text:
            """
            Ich habe den Slack-Post vorbereitet.

            Ziel: \(channel)

            \(preview)
            """,
            actions: [
                CopilotAction(
                    label: "Jetzt posten",
                    icon: "paperplane.fill",
                    command: .postToSlack(channelID: channelID, channel: channel, text: text)
                ),
                CopilotAction(
                    label: "Text ändern",
                    icon: "pencil",
                    command: .askCopilot("Passe diesen Slack-Post nochmal an:\n\(text)")
                )
            ],
            memory: state.founderMemory,
            source: .local
        )
    }

    private func postToSlack(channelID: String, channel: String, text: String) {
        appendAssistant(CopilotMessage(
            mine: false,
            text: "Ich sende den bestätigten Slack-Post an \(channel)…",
            memory: state.founderMemory,
            source: .local
        ))

        Task { @MainActor in
            do {
                let response = try await SupabaseService.shared.postSlackMessage(
                    channelID: channelID,
                    channel: channel,
                    text: text
                )
                let postedChannel = response.channel ?? channel
                appendAssistant(CopilotMessage(
                    mine: false,
                    text: "Gepostet in \(postedChannel).",
                    memory: state.founderMemory,
                    source: .local
                ))
            } catch {
                appendAssistant(slackPostFailedMessage(channelID: channelID, channel: channel, text: text, error: error))
            }
        }
    }

    private func slackPostFailedMessage(channelID: String, channel: String, text: String, error: Error) -> CopilotMessage {
        CopilotMessage(
            mine: false,
            text:
            """
            Slack-Post fehlgeschlagen.

            Grund: \(error.localizedDescription)

            Prüfe kurz die Slack-Verknüpfung oder versuch es erneut.
            """,
            actions: [
                CopilotAction(
                    label: "Erneut posten",
                    icon: "arrow.clockwise",
                    command: .postToSlack(channelID: channelID, channel: channel, text: text)
                ),
                CopilotAction(
                    label: "Verknüpfungen",
                    icon: "link",
                    command: .open(.tab(.profile))
                )
            ],
            memory: state.founderMemory,
            source: .local
        )
    }

    private func shouldMinimizeAfter(_ action: CopilotAction) -> Bool {
        switch action.command {
        case .open(let destination):
            return destination != .screen(.copilot)
        case .openMatchChat, .sendMatchMessage, .rebuildPlanner, .generateDocumentDraft, .exportDocumentPDF,
             .publishCompanyProfile, .refreshFounderRadar, .addPlannerItem, .addSmartPlannerItem, .foundStartup,
             .addKanbanCard:
            return true
        case .askCopilot, .draftMatchMessage, .startCofounderTrial, .refreshBackend, .refreshPartners,
             .toggleDocument, .rememberFact, .previewSlackPost, .postToSlack:
            return false
        }
    }

    private func confirmationMessage(for action: CopilotAction) -> CopilotMessage? {
        switch action.command {
        case .addPlannerItem(let title, _, let dueLabel, _, _):
            return CopilotMessage(mine: false, text: "Erledigt. Ich habe „\(title)” für \(dueLabel) in den Kalender gelegt.", memory: state.founderMemory, source: .local)
        case .addKanbanCard(let title, _):
            return CopilotMessage(mine: false, text: "Erledigt. „\(title)” liegt jetzt als Karte auf deinem Board.", memory: state.founderMemory, source: .local)
        case .addSmartPlannerItem(let title, _, let dueLabel, _, _, _):
            return CopilotMessage(mine: false, text: "Erledigt. „\(title)” steht jetzt für \(dueLabel) im Kalender und ist als Co-Pilot-Schritt markiert.", memory: state.founderMemory, source: .local)
        case .rememberFact(let fact):
            return CopilotMessage(mine: false, text: "Gespeichert im Business-Memory:\n\(fact)", memory: state.founderMemory, source: .local)
        case .foundStartup(let name, _, _, _, _):
            let title = name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? state.companyProfile.name : name
            return CopilotMessage(mine: false, text: "Business Workspace ist angelegt: \(title). Ich habe auch den ersten Profil-Check in den Kalender gelegt.", memory: state.founderMemory, source: .local)
        case .publishCompanyProfile:
            return CopilotMessage(mine: false, text: "Profil-Link ist gesetzt. Du kannst die Vorschau jetzt im Firmenprofil prüfen.", memory: state.founderMemory, source: .local)
        case .rebuildPlanner:
            return CopilotMessage(mine: false, text: "Plan neu aufgebaut. Ich habe den Kalender geöffnet, damit du die nächsten Schritte direkt prüfen kannst.", memory: state.founderMemory, source: .local)
        case .generateDocumentDraft:
            return CopilotMessage(mine: false, text: "Entwurf erstellt. Ich öffne die Unterlagen und bleibe unten rechts, damit wir dort weiterarbeiten können.", memory: state.founderMemory, source: .local)
        case .exportDocumentPDF:
            return CopilotMessage(mine: false, text: "PDF erstellt, sofern ein Entwurf vorhanden war. Du findest sie in den Unterlagen unter Dateien.", memory: state.founderMemory, source: .local)
        case .open(.screen(.documents)):
            return CopilotMessage(mine: false, text: "Ich öffne die Unterlagen. Du kannst dort hochladen, bearbeiten oder eine PDF erzeugen; ich bleibe als kleiner Button erreichbar.", memory: state.founderMemory, source: .local)
        case .open(.screen(.calendar)):
            return CopilotMessage(mine: false, text: "Ich öffne den Kalender. Ich bleibe unten rechts erreichbar, falls du den Termin direkt mit mir durchgehen willst.", memory: state.founderMemory, source: .local)
        case .open(.screen(.startup)):
            return CopilotMessage(mine: false, text: "Ich öffne den Business-Bereich und bleibe als kleiner Button erreichbar.", memory: state.founderMemory, source: .local)
        default:
            return nil
        }
    }

    private func appendAssistant(_ message: CopilotMessage) {
        let sessionID = state.ensureCopilotSession()
        appendCopilotResponse(message, to: sessionID)
        if state.activeCopilotSessionID == sessionID {
            withAnimation(.easeOut(duration: 0.25)) {
                messages = state.copilotMessages(for: sessionID)
            }
        }
    }

    private func saveEmailDraft(_ draft: CopilotEmailDraft, messageID: UUID) {
        guard let sessionID = state.activeCopilotSessionID else { return }
        state.updateCopilotEmailDraft(draft, messageID: messageID, sessionID: sessionID)
        messages = state.copilotMessages(for: sessionID)
    }

    private func aiLimitMessage(_ usage: AIUsageSnapshot) -> CopilotMessage {
        CopilotMessage(
            mine: false,
            text:
            """
            Dein \(usage.planName)-KI-Budget ist gerade voll.

            Heute übrig: \(usage.remainingToday) Tokens
            Diese Woche übrig: \(usage.remainingThisWeek) Tokens

            Damit die KI-Kosten kontrollierbar bleiben, stoppe ich vor dem Senden. Pro hebt das Limit deutlich an und schaltet die tiefere Gründeranalyse frei.
            """,
            source: .local
        )
    }

    private func loadActiveSession() {
        messages = state.activeCopilotMessages()
        input = ""
        inputFocused = false
    }

    private func runPendingCopilotPrompt() {
        guard thinkingSessionID == nil,
              let prompt = state.pendingCopilotPrompt,
              !prompt.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return
        }
        state.pendingCopilotPrompt = nil
        loadActiveSession()
        if let feature = CopilotFeatureRequest.parse(prompt) {
            send(prompt, displayText: feature.title)
        } else {
            send(prompt)
        }
    }

    private func startNewSession() {
        inputFocused = false
        let id = state.startCopilotSession()
        messages = state.copilotMessages(for: id)
        showingSessions = false
    }

    private func openSession(_ id: UUID) {
        inputFocused = false
        state.switchCopilotSession(id)
        messages = state.copilotMessages(for: id)
        showingSessions = false
    }

    private func deleteSession(_ id: UUID) {
        state.deleteCopilotSession(id)
        loadActiveSession()
    }
}

private struct CopilotMarkdownText: View {
    private struct NormalizedContent {
        let text: String
        let wasTruncated: Bool
    }

    private enum Block {
        case paragraph(String)
        case heading(String, level: Int)
        case ordered(Int, String)
        case bullet(String)
        case table(headers: [String], rows: [[String]])
        case divider
    }

    let markdown: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            ForEach(blocks.indices, id: \.self) { index in
                blockView(blocks[index])
            }
            if normalizedContent.wasTruncated {
                HStack(alignment: .top, spacing: 8) {
                    Image(systemName: "exclamationmark.circle.fill")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(MF.emberDeep)
                    Text("Die Live-Antwort wurde unvollständig übertragen. Bitte versuche die Frage erneut.")
                        .font(.system(size: 12.5, weight: .medium))
                        .foregroundStyle(MF.inkSoft)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .padding(.top, 3)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    @ViewBuilder
    private func blockView(_ block: Block) -> some View {
        switch block {
        case let .paragraph(text):
            Text(inlineMarkdown(text))
                .font(.system(size: 14.5))
                .foregroundStyle(MF.inkSoft)
                .lineSpacing(3.5)
                .fixedSize(horizontal: false, vertical: true)

        case let .heading(text, level):
            Text(inlineMarkdown(text))
                .font(.system(size: level == 1 ? 18 : 15.5, weight: .bold))
                .foregroundStyle(MF.ink)
                .fixedSize(horizontal: false, vertical: true)

        case let .ordered(number, text):
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text("\(number).")
                    .font(.system(size: 14.5, weight: .semibold))
                    .foregroundStyle(MF.inkSoft)
                    .frame(width: 21, alignment: .trailing)
                Text(inlineMarkdown(text))
                    .font(.system(size: 14.5))
                    .foregroundStyle(MF.inkSoft)
                    .lineSpacing(3.5)
                    .fixedSize(horizontal: false, vertical: true)
            }

        case let .bullet(text):
            HStack(alignment: .firstTextBaseline, spacing: 9) {
                Circle()
                    .fill(MF.indigo)
                    .frame(width: 5, height: 5)
                    .padding(.top, 7)
                Text(inlineMarkdown(text))
                    .font(.system(size: 14.5))
                    .foregroundStyle(MF.inkSoft)
                    .lineSpacing(3.5)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(.leading, 4)

        case let .table(headers, rows):
            VStack(alignment: .leading, spacing: 0) {
                ForEach(rows.indices, id: \.self) { rowIndex in
                    VStack(alignment: .leading, spacing: 8) {
                        ForEach(headers.indices, id: \.self) { columnIndex in
                            let value = columnIndex < rows[rowIndex].count
                                ? rows[rowIndex][columnIndex]
                                : ""
                            if !value.isEmpty {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(inlineMarkdown(headers[columnIndex]))
                                        .font(.system(size: 10.5, weight: .bold))
                                        .foregroundStyle(MF.indigoInk)
                                    Text(inlineMarkdown(value))
                                        .font(.system(size: 13.5))
                                        .foregroundStyle(MF.inkSoft)
                                        .fixedSize(horizontal: false, vertical: true)
                                }
                            }
                        }
                    }
                    .padding(.vertical, 9)

                    if rowIndex < rows.count - 1 {
                        Divider().overlay(MF.border)
                    }
                }
            }
            .padding(.horizontal, 11)
            .background(MF.surfaceSoft)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(MF.border, lineWidth: 1)
            )

        case .divider:
            Divider()
                .overlay(MF.border)
                .padding(.vertical, 2)
        }
    }

    private var blocks: [Block] {
        let lines = normalizedContent.text
            .replacingOccurrences(of: "\r\n", with: "\n")
            .components(separatedBy: "\n")
        var result: [Block] = []
        var paragraph: [String] = []

        func flushParagraph() {
            guard !paragraph.isEmpty else { return }
            result.append(.paragraph(paragraph.joined(separator: " ")))
            paragraph.removeAll(keepingCapacity: true)
        }

        var lineIndex = 0
        while lineIndex < lines.count {
            let line = lines[lineIndex].trimmingCharacters(in: .whitespacesAndNewlines)
            guard !line.isEmpty else {
                flushParagraph()
                lineIndex += 1
                continue
            }

            if let headers = tableCells(in: line),
               lineIndex + 1 < lines.count,
               isTableSeparator(lines[lineIndex + 1]) {
                flushParagraph()
                lineIndex += 2
                var rows: [[String]] = []
                while lineIndex < lines.count {
                    let rowLine = lines[lineIndex]
                        .trimmingCharacters(in: .whitespacesAndNewlines)
                    guard !rowLine.isEmpty,
                          let cells = tableCells(in: rowLine),
                          !isTableSeparator(rowLine) else {
                        break
                    }
                    rows.append(cells)
                    lineIndex += 1
                }
                if rows.isEmpty {
                    result.append(.paragraph(headers.joined(separator: " · ")))
                } else {
                    result.append(.table(headers: headers, rows: rows))
                }
                continue
            } else if line == "---" {
                flushParagraph()
                result.append(.divider)
            } else if let heading = heading(in: line) {
                flushParagraph()
                result.append(.heading(heading.text, level: heading.level))
            } else if let item = orderedItem(in: line) {
                flushParagraph()
                result.append(.ordered(item.number, item.text))
            } else if let item = bulletItem(in: line) {
                flushParagraph()
                result.append(.bullet(item))
            } else {
                paragraph.append(line)
            }
            lineIndex += 1
        }

        flushParagraph()
        return result
    }

    private var normalizedContent: NormalizedContent {
        let trimmed = markdown.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.hasPrefix("```json") || trimmed.hasPrefix("{"),
              trimmed.contains("\"antwort\"") else {
            return NormalizedContent(text: markdown, wasTruncated: false)
        }

        let unfenced = stripJSONFence(trimmed)
        if let data = unfenced.data(using: .utf8),
           let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let answer = object["antwort"] as? String,
           !answer.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return NormalizedContent(text: answer, wasTruncated: false)
        }

        guard let partial = partialJSONStringField("antwort", in: unfenced),
              !partial.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return NormalizedContent(text: markdown, wasTruncated: false)
        }
        return NormalizedContent(
            text: lastCompleteSentence(in: partial),
            wasTruncated: true
        )
    }

    private func stripJSONFence(_ text: String) -> String {
        var lines = text.components(separatedBy: .newlines)
        if lines.first?.trimmingCharacters(in: .whitespacesAndNewlines)
            .lowercased()
            .hasPrefix("```json") == true {
            lines.removeFirst()
        }
        if lines.last?.trimmingCharacters(in: .whitespacesAndNewlines) == "```" {
            lines.removeLast()
        }
        return lines.joined(separator: "\n").trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func partialJSONStringField(_ field: String, in source: String) -> String? {
        guard let fieldRange = source.range(of: "\"\(field)\""),
              let colon = source[fieldRange.upperBound...].firstIndex(of: ":"),
              let openingQuote = source[colon...].firstIndex(of: "\"") else {
            return nil
        }

        var escapedValue = ""
        var isEscaped = false
        var index = source.index(after: openingQuote)
        while index < source.endIndex {
            let character = source[index]
            if isEscaped {
                escapedValue.append("\\")
                escapedValue.append(character)
                isEscaped = false
            } else if character == "\\" {
                isEscaped = true
            } else if character == "\"" {
                break
            } else {
                escapedValue.append(character)
            }
            index = source.index(after: index)
        }

        guard let data = "\"\(escapedValue)\"".data(using: .utf8),
              let decoded = try? JSONDecoder().decode(String.self, from: data) else {
            return escapedValue
                .replacingOccurrences(of: "\\n", with: "\n")
                .replacingOccurrences(of: "\\\"", with: "\"")
        }
        return decoded
    }

    private func lastCompleteSentence(in text: String) -> String {
        let clean = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let boundary = clean.lastIndex(where: { ".!?".contains($0) }) else {
            return clean
        }
        return String(clean[...boundary]).trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func tableCells(in line: String) -> [String]? {
        guard line.contains("|") else { return nil }
        var cells = line
            .split(separator: "|", omittingEmptySubsequences: false)
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
        if cells.first?.isEmpty == true { cells.removeFirst() }
        if cells.last?.isEmpty == true { cells.removeLast() }
        return cells.count >= 2 ? cells : nil
    }

    private func isTableSeparator(_ line: String) -> Bool {
        guard let cells = tableCells(in: line) else { return false }
        return cells.allSatisfy { cell in
            let compact = cell.filter { !$0.isWhitespace }
            return compact.filter { $0 == "-" }.count >= 3
                && compact.allSatisfy { $0 == "-" || $0 == ":" }
        }
    }

    private func heading(in line: String) -> (text: String, level: Int)? {
        let markerCount = line.prefix { $0 == "#" }.count
        guard markerCount > 0, markerCount <= 3 else { return nil }
        let remainder = String(line.dropFirst(markerCount))
        guard remainder.first?.isWhitespace == true else { return nil }
        return (
            remainder.trimmingCharacters(in: .whitespacesAndNewlines),
            markerCount
        )
    }

    private func orderedItem(in line: String) -> (number: Int, text: String)? {
        guard let dot = line.firstIndex(of: ".") else { return nil }
        let numberText = line[..<dot]
        guard !numberText.isEmpty,
              numberText.count <= 3,
              numberText.allSatisfy(\.isNumber),
              let number = Int(numberText) else {
            return nil
        }
        let remainder = line[line.index(after: dot)...]
        guard remainder.first?.isWhitespace == true else { return nil }
        return (
            number,
            remainder.trimmingCharacters(in: .whitespacesAndNewlines)
        )
    }

    private func bulletItem(in line: String) -> String? {
        guard let marker = line.first, marker == "*" || marker == "-" || marker == "•" else {
            return nil
        }
        let remainder = line.dropFirst()
        guard remainder.first?.isWhitespace == true else { return nil }
        return remainder.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func inlineMarkdown(_ text: String) -> AttributedString {
        (try? AttributedString(
            markdown: text,
            options: .init(interpretedSyntax: .inlineOnlyPreservingWhitespace)
        )) ?? AttributedString(text)
    }
}

private struct CopilotSourcesSheet: View {
    @Environment(\.dismiss) private var dismiss
    let sources: [CopilotSource]

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 0) {
                    ForEach(sources.indices, id: \.self) { index in
                        sourceRow(sources[index])
                        if index < sources.count - 1 {
                            Divider()
                                .padding(.leading, 50)
                        }
                    }
                }
                .padding(.horizontal, 18)
                .padding(.vertical, 10)
            }
            .background(MF.canvas.ignoresSafeArea())
            .navigationTitle("Quellen")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 13, weight: .bold))
                    }
                    .accessibilityLabel("Schließen")
                }
            }
        }
    }

    @ViewBuilder
    private func sourceRow(_ source: CopilotSource) -> some View {
        if let raw = source.url, let url = URL(string: raw) {
            Link(destination: url) {
                rowContent(source, url: url)
            }
        } else {
            rowContent(source, url: nil)
        }
    }

    private func rowContent(_ source: CopilotSource, url: URL?) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: source.type.localizedCaseInsensitiveContains("web")
                  ? "globe"
                  : "doc.text.fill")
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(MF.indigoInk)
                .frame(width: 36, height: 36)
                .background(MF.indigoTint)
                .clipShape(RoundedRectangle(cornerRadius: 9, style: .continuous))

            VStack(alignment: .leading, spacing: 4) {
                Text(displayTitle(source))
                    .font(.system(size: 14.5, weight: .bold))
                    .foregroundStyle(MF.ink)
                    .fixedSize(horizontal: false, vertical: true)
                if let host = url?.host?.replacingOccurrences(of: "www.", with: "") {
                    Text(host)
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(MF.indigoInk)
                        .lineLimit(1)
                }
                if let snippet = source.snippet?.trimmingCharacters(in: .whitespacesAndNewlines),
                   !snippet.isEmpty {
                    Text(snippet)
                        .font(.system(size: 12.5))
                        .foregroundStyle(MF.smoke)
                        .lineLimit(3)
                        .lineSpacing(2)
                }
            }
            Spacer(minLength: 0)
            if url != nil {
                Image(systemName: "arrow.up.right")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(MF.faint)
                    .padding(.top, 4)
            }
        }
        .padding(.vertical, 14)
        .contentShape(Rectangle())
    }

    private func displayTitle(_ source: CopilotSource) -> String {
        let title = source.title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !title.isEmpty, !title.lowercased().hasPrefix("http") else {
            return source.url
                .flatMap(URL.init(string:))?
                .host?
                .replacingOccurrences(of: "www.", with: "")
                ?? "Quelle"
        }
        return title
    }
}

private struct CopilotEmailDraftEditor: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL

    @State private var draft: CopilotEmailDraft
    @State private var showingNativeComposer = false
    @State private var showingSendConfirmation = false
    @State private var isSending = false
    @State private var statusMessage: String?
    @State private var sendSucceeded = false
    @State private var gmailDirectAvailable = false

    let gmailConnected: Bool
    let onSave: (CopilotEmailDraft) -> Void
    let onSent: (CopilotEmailDraft) -> Void

    init(
        initialDraft: CopilotEmailDraft,
        gmailConnected: Bool,
        onSave: @escaping (CopilotEmailDraft) -> Void,
        onSent: @escaping (CopilotEmailDraft) -> Void
    ) {
        _draft = State(initialValue: initialDraft)
        self.gmailConnected = gmailConnected
        self.onSave = onSave
        self.onSent = onSent
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                ScrollView {
                    VStack(alignment: .leading, spacing: 18) {
                        HStack(spacing: 12) {
                            Image(systemName: "envelope.fill")
                                .font(.system(size: 18, weight: .bold))
                                .foregroundStyle(.white)
                                .frame(width: 44, height: 44)
                                .background(MF.indigoGrad)
                                .clipShape(RoundedRectangle(cornerRadius: 11, style: .continuous))
                            VStack(alignment: .leading, spacing: 3) {
                                Text("Versandfertiger Entwurf")
                                    .font(.system(size: 17, weight: .bold))
                                    .foregroundStyle(MF.ink)
                                Text("Prüfen, ändern und erst dann senden")
                                    .font(.system(size: 12.5))
                                    .foregroundStyle(MF.smoke)
                            }
                        }

                        mailField("An", icon: "person.fill") {
                            TextField("name@firma.de", text: $draft.to)
                                .textInputAutocapitalization(.never)
                                .keyboardType(.emailAddress)
                                .textContentType(.emailAddress)
                        }

                        mailField("Betreff", icon: "text.alignleft") {
                            TextField("Betreff", text: $draft.subject, axis: .vertical)
                                .lineLimit(1...3)
                        }

                        VStack(alignment: .leading, spacing: 9) {
                            Label("Nachricht", systemImage: "doc.text.fill")
                                .font(.system(size: 12.5, weight: .bold))
                                .foregroundStyle(MF.smoke)
                            TextEditor(text: $draft.body)
                                .font(.system(size: 15))
                                .foregroundStyle(MF.ink)
                                .scrollContentBackground(.hidden)
                                .frame(minHeight: 330)
                                .padding(11)
                                .background(MF.surface)
                                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                                        .stroke(MF.border, lineWidth: 1)
                                )
                        }

                        if let statusMessage {
                            Label(
                                statusMessage,
                                systemImage: sendSucceeded ? "checkmark.circle.fill" : "exclamationmark.triangle.fill"
                            )
                            .font(.system(size: 12.5, weight: .semibold))
                            .foregroundStyle(sendSucceeded ? Color.green : MF.emberDeep)
                            .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                    .padding(18)
                    .padding(.bottom, 12)
                }
                .scrollDismissesKeyboard(.interactively)

                VStack(spacing: 9) {
                    Button {
                        openInMail()
                    } label: {
                        Label("Mit Mail senden", systemImage: "envelope.open.fill")
                            .font(.system(size: 14.5, weight: .bold))
                            .foregroundStyle(MF.indigoInk)
                            .frame(maxWidth: .infinity)
                            .frame(height: 46)
                            .background(MF.indigoTint)
                            .clipShape(RoundedRectangle(cornerRadius: 11, style: .continuous))
                    }
                    .buttonStyle(.plain)

                    if gmailConnected && gmailDirectAvailable {
                        Button {
                            showingSendConfirmation = true
                        } label: {
                            HStack(spacing: 8) {
                                if isSending {
                                    ProgressView()
                                        .tint(.white)
                                } else {
                                    Image(systemName: sendSucceeded ? "checkmark" : "paperplane.fill")
                                }
                                Text(sendSucceeded ? "Gesendet" : "Direkt über Gmail senden")
                            }
                            .font(.system(size: 14.5, weight: .bold))
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 48)
                            .background(sendSucceeded ? Color.green : MF.indigo)
                            .clipShape(RoundedRectangle(cornerRadius: 11, style: .continuous))
                        }
                        .buttonStyle(.plain)
                        .disabled(!canSendDirectly || isSending || sendSucceeded)
                        .opacity(!canSendDirectly || isSending ? 0.48 : 1)
                    } else {
                        Text("Für Direktversand kannst du Gmail unter Profil verbinden.")
                            .font(.system(size: 11.5, weight: .medium))
                            .foregroundStyle(MF.faint)
                            .frame(maxWidth: .infinity, alignment: .center)
                    }
                }
                .padding(.horizontal, 18)
                .padding(.top, 12)
                .padding(.bottom, 10)
                .background(MF.surface)
                .overlay(alignment: .top) {
                    Rectangle().fill(MF.borderSoft).frame(height: 1)
                }
            }
            .background(MF.canvas.ignoresSafeArea())
            .navigationTitle("E-Mail")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Schließen") {
                        onSave(cleanDraft)
                        dismiss()
                    }
                }
                ToolbarItemGroup(placement: .keyboard) {
                    Spacer()
                    Button("Fertig") {
                        hideKeyboard()
                    }
                    .font(.system(size: 15, weight: .semibold))
                }
            }
            .onDisappear {
                onSave(cleanDraft)
            }
            .task {
                guard gmailConnected else { return }
                let capabilities = try? await SupabaseService.shared.fetchMCPActionCapabilities()
                gmailDirectAvailable = capabilities?.actions.contains("gmail_send") == true
            }
            .alert("E-Mail jetzt senden?", isPresented: $showingSendConfirmation) {
                Button("Abbrechen", role: .cancel) {}
                Button("Senden") {
                    sendThroughGmail()
                }
            } message: {
                Text("Die E-Mail wird über dein verbundenes Gmail-Konto direkt an \(cleanDraft.to) gesendet.")
            }
            .sheet(isPresented: $showingNativeComposer) {
                NativeMailComposer(draft: cleanDraft) { result in
                    showingNativeComposer = false
                    if result == .sent {
                        sendSucceeded = true
                        statusMessage = "Über Mail gesendet."
                        onSent(cleanDraft)
                    }
                }
            }
        }
    }

    private var cleanDraft: CopilotEmailDraft {
        var value = draft
        value.to = value.to.trimmingCharacters(in: .whitespacesAndNewlines)
        value.subject = value.subject.trimmingCharacters(in: .whitespacesAndNewlines)
        value.body = value.body.trimmingCharacters(in: .whitespacesAndNewlines)
        return value
    }

    private var canSendDirectly: Bool {
        let value = cleanDraft
        return value.to.contains("@") && value.subject.count >= 2 && value.body.count >= 3
    }

    private func mailField<Content: View>(
        _ label: String,
        icon: String,
        @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: 9) {
            Label(label, systemImage: icon)
                .font(.system(size: 12.5, weight: .bold))
                .foregroundStyle(MF.smoke)
            content()
                .font(.system(size: 15))
                .foregroundStyle(MF.ink)
                .padding(.horizontal, 12)
                .frame(minHeight: 46)
                .background(MF.surface)
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .stroke(MF.border, lineWidth: 1)
                )
        }
    }

    private func openInMail() {
        let value = cleanDraft
        onSave(value)
        hideKeyboard()
        if MFMailComposeViewController.canSendMail() {
            showingNativeComposer = true
            return
        }

        var components = URLComponents()
        components.scheme = "mailto"
        components.path = value.to
        components.queryItems = [
            URLQueryItem(name: "subject", value: value.subject),
            URLQueryItem(name: "body", value: value.body),
        ]
        if let url = components.url {
            openURL(url)
        } else {
            statusMessage = "Mail konnte nicht geöffnet werden."
        }
    }

    private func sendThroughGmail() {
        let value = cleanDraft
        guard canSendDirectly else { return }
        onSave(value)
        isSending = true
        statusMessage = nil
        Task { @MainActor in
            do {
                _ = try await SupabaseService.shared.sendGmailMessage(
                    to: value.to,
                    subject: value.subject,
                    body: value.body
                )
                isSending = false
                sendSucceeded = true
                statusMessage = "E-Mail wurde über Gmail gesendet."
                Haptics.success()
                onSent(value)
            } catch {
                isSending = false
                sendSucceeded = false
                statusMessage = "Versand fehlgeschlagen: \(error.localizedDescription)"
                Haptics.heavy()
            }
        }
    }

    private func hideKeyboard() {
        UIApplication.shared.sendAction(
            #selector(UIResponder.resignFirstResponder),
            to: nil,
            from: nil,
            for: nil
        )
    }
}

private struct NativeMailComposer: UIViewControllerRepresentable {
    let draft: CopilotEmailDraft
    let onFinish: (MFMailComposeResult) -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(onFinish: onFinish)
    }

    func makeUIViewController(context: Context) -> MFMailComposeViewController {
        let controller = MFMailComposeViewController()
        controller.mailComposeDelegate = context.coordinator
        if !draft.to.isEmpty {
            controller.setToRecipients([draft.to])
        }
        controller.setSubject(draft.subject)
        controller.setMessageBody(draft.body, isHTML: false)
        return controller
    }

    func updateUIViewController(_ uiViewController: MFMailComposeViewController, context: Context) {}

    final class Coordinator: NSObject, MFMailComposeViewControllerDelegate {
        let onFinish: (MFMailComposeResult) -> Void

        init(onFinish: @escaping (MFMailComposeResult) -> Void) {
            self.onFinish = onFinish
        }

        func mailComposeController(
            _ controller: MFMailComposeViewController,
            didFinishWith result: MFMailComposeResult,
            error: Error?
        ) {
            controller.dismiss(animated: true) {
                self.onFinish(result)
            }
        }
    }
}

private struct CopilotSessionsSheet: View {
    let sessions: [CopilotSession]
    let activeID: UUID?
    let onSelect: (UUID) -> Void
    let onNew: () -> Void
    let onDelete: (UUID) -> Void

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 12) {
                    if sessions.isEmpty {
                        emptyState
                    } else {
                        ForEach(sessions) { session in
                            sessionRow(session)
                        }
                    }
                }
                .padding(18)
                .padding(.bottom, 20)
            }
            .background(MF.canvas.ignoresSafeArea())
            .navigationTitle("KI-Sessions")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        onNew()
                    } label: {
                        Image(systemName: "square.and.pencil")
                            .font(.system(size: 14, weight: .bold))
                    }
                }
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "tray")
                .font(.system(size: 30, weight: .semibold))
                .foregroundStyle(MF.indigo)
            Text("Noch keine gespeicherten Themen")
                .font(.system(size: 17, weight: .bold))
                .foregroundStyle(MF.ink)
            Text("Starte ein neues Thema, dann bleibt der Verlauf hier erhalten.")
                .font(.system(size: 13.5))
                .foregroundStyle(MF.smoke)
                .multilineTextAlignment(.center)
            Button {
                onNew()
            } label: {
                Label("Neues Thema", systemImage: "plus")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 16)
                    .frame(height: 42)
                    .background(MF.indigoGrad)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
            .buttonStyle(.plain)
        }
        .frame(maxWidth: .infinity)
        .padding(24)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(MF.border, lineWidth: 1))
        .warmShadow()
    }

    private func sessionRow(_ session: CopilotSession) -> some View {
        HStack(spacing: 10) {
            Button {
                onSelect(session.id)
            } label: {
                HStack(spacing: 11) {
                    Image(systemName: activeID == session.id ? "checkmark.circle.fill" : "bubble.left.and.bubble.right.fill")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(activeID == session.id ? MF.indigo : MF.faint)
                        .frame(width: 34, height: 34)
                        .background(activeID == session.id ? MF.indigoTint : MF.surfaceSoft)
                        .clipShape(RoundedRectangle(cornerRadius: 11, style: .continuous))
                    VStack(alignment: .leading, spacing: 4) {
                        Text(session.title)
                            .font(.system(size: 15, weight: .bold))
                            .foregroundStyle(MF.ink)
                            .lineLimit(1)
                        Text(session.preview)
                            .font(.system(size: 12.5))
                            .foregroundStyle(MF.smoke)
                            .lineLimit(2)
                        Text("\(session.messages.count) Nachrichten · \(dateLabel(session.updatedAt))")
                            .font(.system(size: 11.5, weight: .semibold))
                            .foregroundStyle(MF.faint)
                    }
                    Spacer(minLength: 0)
                }
            }
            .buttonStyle(.plain)

            Button {
                onDelete(session.id)
            } label: {
                Image(systemName: "trash")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(MF.faint)
                    .frame(width: 34, height: 34)
                    .background(MF.surfaceSoft)
                    .clipShape(RoundedRectangle(cornerRadius: 11, style: .continuous))
            }
            .buttonStyle(.plain)
        }
        .padding(12)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(MF.border, lineWidth: 1))
    }

    private func dateLabel(_ date: Date) -> String {
        if Calendar.current.isDateInToday(date) {
            return date.formatted(date: .omitted, time: .shortened)
        }
        return date.formatted(date: .abbreviated, time: .omitted)
    }
}
