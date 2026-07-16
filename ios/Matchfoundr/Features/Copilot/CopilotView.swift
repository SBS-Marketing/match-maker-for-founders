// Co-Pilot — nach Design-Spec MCoPilot: Indigo-Signalfarbe,
// User-Bubble 18/18/5/18 mit Glow, Assistant mit Sparkle-Avatar + Label
// und Karte 5/18/18/18, Prompt-Chips, weißes Input-Dock mit Indigo-Send.

import SwiftUI

struct CopilotView: View {
    @EnvironmentObject var state: AppState
    @State private var messages: [CopilotMessage] = []
    @State private var input = ""
    @State private var thinkingSessionID: UUID?
    @State private var thinkingPhrase = "Prüfe die KI-Verbindung..."
    @State private var showingSessions = false
    @FocusState private var inputFocused: Bool

    private static let thinkingPhrases = [
        "Prüfe die KI-Verbindung...",
        "Denke nach...",
        "Schaue ins Archiv...",
        "Verbinde Profil, Kalender und Matches...",
        "Überlege noch ein wenig...",
        "Was würde Yoda machen?",
        "Sortiere die nächsten Schritte...",
        "Frage die Live-KI..."
    ]

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
                }
            }

            sessionBar

            ScrollViewReader { proxy in
                ScrollView {
                    VStack(spacing: 14) {
                        if messages.isEmpty {
                            memoryPanel
                            welcome
                        }
                        ForEach(messages) { msg in
                            bubble(msg).id(msg.id)
                        }
                        if isThinkingForCurrentSession { thinkingBubble }
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
                    if let last = messages.last {
                        withAnimation { proxy.scrollTo(last.id, anchor: .bottom) }
                    }
                }
            }

            promptChips
            inputDock
        }
        .background(MF.canvas.ignoresSafeArea())
        .onAppear {
            loadActiveSession()
            runPendingCopilotPrompt()
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
        thinkingSessionID == state.activeCopilotSessionID
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

    private var memoryPanel: some View {
        let memory = state.founderMemory
        return VStack(alignment: .leading, spacing: 13) {
            HStack(spacing: 10) {
                Image(systemName: "brain.head.profile")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 38, height: 38)
                    .background(MF.indigoGrad)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                VStack(alignment: .leading, spacing: 2) {
                    Text("Aktuelles Gründer-Verzeichnis")
                        .font(.system(size: 14.5, weight: .bold))
                        .foregroundStyle(MF.ink)
                    Text(memory.compactSummary)
                        .font(.system(size: 12.5))
                        .foregroundStyle(MF.smoke)
                        .lineLimit(1)
                }
                Spacer()
            }
            Text(memory.nextStep)
                .font(.system(size: 16, weight: .bold))
                .foregroundStyle(MF.ink)
                .fixedSize(horizontal: false, vertical: true)
            HStack(spacing: 8) {
                miniMetric("Unterlagen", "\(memory.completedDocuments)/\(memory.totalDocuments)")
                miniMetric("Plan", "\(state.plannerItems.filter { !$0.done }.count) offen")
                miniMetric("Matches", "\(state.matches.count)")
            }
        }
        .padding(15)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(MF.border, lineWidth: 1))
        .warmShadow()
    }

    // ─── Bubbles nach Spec ────────────────────────────────────
    @ViewBuilder
    private func bubble(_ msg: CopilotMessage) -> some View {
        if msg.mine {
            HStack {
                Spacer(minLength: 60)
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
                    Text(msg.text)
                        .font(.system(size: 14.5))
                        .foregroundStyle(MF.inkSoft)
                        .lineSpacing(3.5)
                    if let memory = msg.memory {
                        memoryInline(memory)
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
                                    }
                                    .foregroundStyle(MF.indigoInk)
                                    .padding(.horizontal, 12).padding(.vertical, 8)
                                    .background(MF.indigoTint)
                                    .clipShape(Capsule())
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                    if !msg.quickReplies.isEmpty {
                        FlowLayout(spacing: 7) {
                            ForEach(msg.quickReplies, id: \.self) { reply in
                                Button {
                                    send(reply)
                                } label: {
                                    HStack(spacing: 5) {
                                        Image(systemName: "checkmark.circle.fill")
                                            .font(.system(size: 10, weight: .bold))
                                        Text(reply)
                                            .font(.system(size: 12.5, weight: .semibold))
                                            .lineLimit(1)
                                    }
                                    .foregroundStyle(MF.indigoInk)
                                    .padding(.horizontal, 12).padding(.vertical, 8)
                                    .background(MF.indigoTint.opacity(0.65))
                                    .clipShape(Capsule())
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                    if !msg.navigation.isEmpty {
                        FlowLayout(spacing: 7) {
                            ForEach(msg.navigation) { nav in
                                Button {
                                    Haptics.tap()
                                    state.open(nav.destination)
                                } label: {
                                    HStack(spacing: 5) {
                                        Text(nav.label)
                                            .font(.system(size: 12.5, weight: .semibold))
                                        Image(systemName: "arrow.right")
                                            .font(.system(size: 9, weight: .bold))
                                    }
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

    private var thinkingBubble: some View {
        HStack {
            HStack(spacing: 8) {
                ProgressView().controlSize(.small).tint(MF.indigo)
                Text(thinkingPhrase)
                    .font(.system(size: 12.5))
                    .foregroundStyle(MF.smoke)
                    .contentTransition(.opacity)
            }
            .padding(.horizontal, 15).padding(.vertical, 11)
            .background(MF.surface)
            .clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))
            Spacer()
        }
    }

    private func miniMetric(_ label: String, _ value: String) -> some View {
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

    private func memoryInline(_ memory: FounderMemorySnapshot) -> some View {
        VStack(alignment: .leading, spacing: 5) {
            HStack(spacing: 6) {
                Image(systemName: "brain.head.profile")
                    .font(.system(size: 10, weight: .bold))
                Text("Memory")
                    .font(.system(size: 11.5, weight: .bold))
            }
            .foregroundStyle(MF.indigoInk)
            Text("\(memory.compactSummary) · \(memory.documentProgress)")
                .font(.system(size: 12.5))
                .foregroundStyle(MF.smoke)
                .lineLimit(2)
        }
        .padding(11)
        .background(MF.indigoTint.opacity(0.7))
        .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
    }

    // ─── Prompt-Chips (Spec: IndigoTint-Pillen) ───────────────
    private var promptChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(CopilotEngine.quickPrompts, id: \.self) { prompt in
                    Button {
                        send(prompt)
                    } label: {
                        Text(prompt)
                            .font(.system(size: 12.5, weight: .semibold))
                            .foregroundStyle(MF.indigoInk)
                            .padding(.horizontal, 13).padding(.vertical, 8)
                            .background(MF.indigoTint)
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 16)
        }
        .padding(.bottom, 10)
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

    private func send(_ preset: String?) {
        let text = (preset ?? input).trimmingCharacters(in: .whitespaces)
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
        let userMessage = CopilotMessage(mine: true, text: text)
        messages.append(userMessage)
        state.appendCopilotMessage(userMessage, to: sessionID)
        let history = state.copilotMessages(for: sessionID)
        thinkingSessionID = sessionID
        startThinkingCopyLoop(for: sessionID)
        Task { @MainActor in
            let answer = await CopilotEngine.answer(for: text, state: state, history: history)
            state.appendCopilotMessage(answer, to: sessionID)
            thinkingSessionID = nil
            if state.activeCopilotSessionID == sessionID {
                withAnimation(.easeOut(duration: 0.25)) {
                    messages = state.copilotMessages(for: sessionID)
                }
            }
            runPendingCopilotPrompt()
        }
    }

    private func startThinkingCopyLoop(for sessionID: UUID) {
        Task { @MainActor in
            var index = Int.random(in: 0..<Self.thinkingPhrases.count)
            while thinkingSessionID == sessionID {
                withAnimation(.easeOut(duration: 0.2)) {
                    thinkingPhrase = Self.thinkingPhrases[index % Self.thinkingPhrases.count]
                }
                index += 1
                try? await Task.sleep(for: .seconds(2.4))
            }
        }
    }

    private func handle(_ action: CopilotAction) {
        switch action.command {
        case .askCopilot(let prompt):
            send(prompt)
        case .draftMatchMessage(let matchID):
            appendAssistant(CopilotEngine.draftMessageForMatch(matchID, state: state))
        default:
            state.execute(action)
            if let confirmation = confirmationMessage(for: action) {
                appendAssistant(confirmation)
            }
        }
    }

    private func confirmationMessage(for action: CopilotAction) -> CopilotMessage? {
        switch action.command {
        case .addPlannerItem(let title, _, let dueLabel, _, _):
            return CopilotMessage(mine: false, text: "Erledigt. Ich habe „\(title)” für \(dueLabel) in den Kalender gelegt.", memory: state.founderMemory, source: .local)
        case .addSmartPlannerItem(let title, _, let dueLabel, _, _, _):
            return CopilotMessage(mine: false, text: "Erledigt. „\(title)” steht jetzt für \(dueLabel) im Kalender und ist als Co-Pilot-Schritt markiert.", memory: state.founderMemory, source: .local)
        case .rememberFact(let fact):
            return CopilotMessage(mine: false, text: "Gespeichert im Gründer-Verzeichnis:\n\(fact)", memory: state.founderMemory, source: .local)
        case .foundStartup(let name, _, _, _, _):
            let title = name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? state.companyProfile.name : name
            return CopilotMessage(mine: false, text: "Startup Workspace ist angelegt: \(title). Ich habe auch den ersten Profil-Check in den Kalender gelegt.", memory: state.founderMemory, source: .local)
        case .publishCompanyProfile:
            return CopilotMessage(mine: false, text: "Profil-Link ist gesetzt. Du kannst die Vorschau jetzt im Firmenprofil prüfen.", memory: state.founderMemory, source: .local)
        case .rebuildPlanner:
            return CopilotMessage(mine: false, text: "Plan neu aufgebaut. Ich habe den Kalender geöffnet, damit du die nächsten Schritte direkt prüfen kannst.", memory: state.founderMemory, source: .local)
        default:
            return nil
        }
    }

    private func appendAssistant(_ message: CopilotMessage) {
        let sessionID = state.ensureCopilotSession()
        state.appendCopilotMessage(message, to: sessionID)
        if state.activeCopilotSessionID == sessionID {
            withAnimation(.easeOut(duration: 0.25)) {
                messages = state.copilotMessages(for: sessionID)
            }
        }
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
        send(prompt)
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
