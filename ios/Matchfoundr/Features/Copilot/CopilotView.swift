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
    @State private var showWorkspace = true
    @State private var showMeeting = false
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
        }
        .background(MF.canvas.ignoresSafeArea())
        .sheet(isPresented: $showMeeting) {
            NavigationStack { MeetingView() }
                .presentationDetents([.large])
                .presentationCornerRadius(26)
        }
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

    private static let readyPrompts: [(label: String, prompt: String)] = [
        ("Was kostet die Gründung?", "Schätze meine Gründungskosten und frage nur die fehlenden Zahlen ab."),
        ("Welche Förderung passt?", "Prüfe Förderungen für mein Vorhaben, meine Region und meine Branche."),
        ("Was fehlt als Nächstes?", "Analysiere mein Profil, Unterlagen und Kalender und gib mir den sinnvollsten nächsten Schritt."),
        ("Nachricht schreiben", "Hilf mir, eine Nachricht an ein Match oder einen Ansprechpartner zu schreiben.")
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
                                .background(.white)
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
                if let skill = Self.pilotSkills.first(where: { $0.label == msg.text }) {
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
                    Text(msg.text)
                        .font(.system(size: 14.5))
                        .foregroundStyle(MF.inkSoft)
                        .lineSpacing(3.5)
                    if let memory = msg.memory {
                        memoryInline(memory)
                    }
                    if !msg.sources.isEmpty {
                        sourceChips(msg.sources)
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

    private func sourceChips(_ sources: [CopilotSource]) -> some View {
        FlowLayout(spacing: 7) {
            ForEach(sources.prefix(5)) { source in
                if let url = source.url.flatMap(URL.init(string:)) {
                    Link(destination: url) {
                        sourceChip(source)
                    }
                } else {
                    sourceChip(source)
                }
            }
        }
        .padding(.top, 1)
    }

    private func sourceChip(_ source: CopilotSource) -> some View {
        HStack(spacing: 6) {
            Image(systemName: source.type.localizedCaseInsensitiveContains("web") ? "globe" : "doc.text.fill")
                .font(.system(size: 10.5, weight: .bold))
            Text(sourceDisplayTitle(source))
                .font(.system(size: 11.5, weight: .bold))
                .lineLimit(1)
                .truncationMode(.tail)
                .minimumScaleFactor(0.75)
        }
        .foregroundStyle(MF.smoke)
        .padding(.horizontal, 10)
        .frame(maxWidth: 230, alignment: .leading)
        .frame(height: 30)
        .background(Color(hex: 0xEFE6D6))
        .overlay(Capsule().stroke(Color(hex: 0xD9CBB6), lineWidth: 1))
        .clipShape(Capsule())
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

    // ─── Prompt-Chips (Spec: IndigoTint-Pillen) ───────────────
    private var promptChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(Self.readyPrompts, id: \.label) { item in
                    Button {
                        send(item.prompt, displayText: item.label)
                    } label: {
                        Text(item.label)
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
        startThinkingCopyLoop(for: sessionID)
        Task { @MainActor in
            let answer = await CopilotEngine.answer(for: text, state: state, history: history)
            appendCopilotResponse(answer, to: sessionID)
            thinkingSessionID = nil
            if state.activeCopilotSessionID == sessionID {
                withAnimation(.easeOut(duration: 0.25)) {
                    messages = state.copilotMessages(for: sessionID)
                }
            }
            runPendingCopilotPrompt()
        }
    }

    private func appendCopilotResponse(_ answer: CopilotMessage, to sessionID: UUID) {
        guard !answer.quickReplies.isEmpty else {
            state.appendCopilotMessage(answer, to: sessionID)
            return
        }

        var mainAnswer = answer
        let replies = answer.quickReplies
        mainAnswer.quickReplies = []
        state.appendCopilotMessage(mainAnswer, to: sessionID)

        let wizard = CopilotMessage(
            mine: false,
            text: wizardPrompt(for: answer.text, replies: replies),
            choices: replies.map { CopilotChoice(id: $0, label: $0, prompt: $0, icon: "circle") },
            memory: answer.memory,
            source: answer.source,
            createdAt: .now
        )
        state.appendCopilotMessage(wizard, to: sessionID)
    }

    private func wizardPrompt(for answer: String, replies: [String]) -> String {
        let combined = ([answer] + replies).joined(separator: " ").lowercased()
        if combined.contains("skill-partner") || combined.contains("partner auf augenhöhe") {
            return "Wie willst du dich aktuell positionieren?"
        }
        if combined.contains("solo") || combined.contains("co-founder") || combined.contains("cofounder") {
            return "Welche Richtung passt gerade eher?"
        }
        if combined.contains("budget") || combined.contains("kosten") {
            return "Womit soll ich weiterrechnen?"
        }
        if combined.contains("heute") || combined.contains("woche") || combined.contains("wann") {
            return "Wann soll ich den nächsten Schritt einordnen?"
        }
        return "Wähle kurz eine Richtung, dann frage ich weiter."
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
            if shouldMinimizeAfter(action) {
                state.minimizeCopilot()
            }
        }
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
             .toggleDocument, .rememberFact:
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
