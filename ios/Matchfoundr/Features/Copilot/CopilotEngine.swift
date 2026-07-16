// Co-Pilot Engine — kontextbewusst: liest Founder-Memory, Unterlagen,
// Kalender, Matches und Firmenprofil und kann App-Aktionen auslösen.

import Foundation

enum CopilotEngine {

    @MainActor
    static func answer(
        for message: String,
        state: AppState,
        history: [CopilotMessage]
    ) async -> CopilotMessage {
        let localText = message.lowercased()
        if requiresNativeControl(localText) {
            return localAnswer(for: message, state: state)
        }

        do {
            try await SupabaseService.shared.pingFunction("copilot")
            let request = CopilotCloudRequest(
                message: message,
                extra: CopilotCloudExtra(
                    surface: "/co-pilot",
                    memory: state.copilotFacts,
                    history: history.suffix(6).map {
                        CopilotCloudTurn(role: $0.mine ? "user" : "assistant", content: $0.text)
                    },
                    onboarding: state.copilotOnboardingContext()
                )
            )
            let response: CopilotCloudResponse = try await SupabaseService.shared.invokeFunction(
                "copilot",
                body: request
            )
            guard let answer = response.answer?.trimmingCharacters(in: .whitespacesAndNewlines),
                  !answer.isEmpty else {
                throw URLError(.badServerResponse)
            }
            let newFacts = response.newFacts ?? []
            let quickActions = Array((response.quickActions ?? []).prefix(4))
            return CopilotMessage(
                mine: false,
                text: answer,
                actions: cloudActions(for: answer, quickActions: quickActions, newFacts: newFacts, state: state),
                navigation: (response.navigation ?? []).compactMap(nativeNav(from:)),
                quickReplies: quickActions.filter { nativeAction(from: $0, answer: answer, newFacts: newFacts, state: state) == nil },
                memory: state.founderMemory,
                source: .cloud
            )
        } catch {
            return liveUnavailableAnswer(error, state: state, retryPrompt: message)
        }
    }

    @MainActor
    private static func liveUnavailableAnswer(_ error: Error, state: AppState, retryPrompt: String) -> CopilotMessage {
        let reason = liveErrorReason(error)
        var actions: [CopilotAction] = [
            action("Erneut versuchen", "arrow.clockwise", .askCopilot(retryPrompt)),
            action("Backend prüfen", "server.rack", .refreshBackend),
        ]
        if !state.partners.isEmpty {
            actions.append(action("Partner öffnen", "person.crop.circle.badge.checkmark", .open(.screen(.partners("all")))))
        }
        return CopilotMessage(
            mine: false,
            text:
            """
            Fehlgeschlagen. Die Verbindung zur Live-KI wurde nicht sauber erreicht.

            Grund: \(reason)

            Versuch es gleich erneut. Wenn es wieder scheitert, liegt es sehr wahrscheinlich an der Supabase Function `copilot` oder am Provider-Call dahinter.
            """,
            actions: actions,
            memory: state.founderMemory,
            source: .local
        )
    }

    private static func liveErrorReason(_ error: Error) -> String {
        let nsError = error as NSError
        if nsError.domain == NSURLErrorDomain, nsError.code == NSURLErrorTimedOut {
            return "Die Anfrage hat länger als 120 Sekunden gedauert."
        }
        if nsError.domain == NSURLErrorDomain, nsError.code == NSURLErrorCannotConnectToHost {
            return "Die Supabase Function `copilot` war nicht erreichbar."
        }
        return error.localizedDescription
    }

    @MainActor
    static func localAnswer(for message: String, state: AppState) -> CopilotMessage {
        let m = message.lowercased()
        let memory = state.founderMemory
        let partner = memory.partnerTerm
        let openDocs = memory.openDocumentsText
        let nextPlan = memory.openPlannerItems.prefix(3).enumerated().map { "\($0.offset + 1). \($0.element)" }.joined(separator: "\n")

        if isStartupStartRequest(m) {
            if state.hasStartupWorkspace {
                return CopilotMessage(
                    mine: false,
                    text: "Dein Startup Workspace läuft schon. Nächster sinnvoller Schritt: Teamlücke klären, Profil schärfen oder einen Kalenderblock setzen.",
                    actions: [
                        action("Startup öffnen", "building.2.fill", .open(.screen(.startup))),
                        action("Termin eintragen", "calendar.badge.plus", .addSmartPlannerItem(
                            title: "Startup Workspace scharfstellen",
                            note: "Teamlücke, Profil und nächsten Beweis prüfen.",
                            dueLabel: "Heute",
                            kind: .profile,
                            target: .startup,
                            assigneeName: state.profile?.name
                        )),
                        action("Firmenprofil", "building.columns.fill", .open(.screen(.company))),
                    ],
                    memory: memory,
                    source: .local
                )
            }

            return CopilotMessage(
                mine: false,
                text: "Kurz: Starte erst den Workspace, dann füllen wir Profil, Team und Plan. Nicht vorher alles zerdenken.",
                actions: [
                    startupFoundingAction(state: state),
                    action("Gründer entdecken", "magnifyingglass", .open(.screen(.swipe))),
                    action("Startup öffnen", "building.2.fill", .open(.screen(.startup))),
                ],
                memory: memory,
                source: .local
            )
        }

        if isMemoryUpdateRequest(m) {
            return CopilotMessage(
                mine: false,
                text:
                """
                Speichern würde ich:
                \(memoryFactCandidate(from: message))
                """,
                actions: [
                    action("Memory speichern", "brain.head.profile", .rememberFact(memoryFactCandidate(from: message))),
                    action("Memory zeigen", "doc.text.magnifyingglass", .askCopilot("Was weißt du über mein Vorhaben?")),
                ],
                memory: memory,
                source: .local
            )
        }

        if matches(m, "was weißt", "was weisst", "memory", "verzeichnis", "gedächtnis", "gedaechtnis", "idee", "über mich", "ueber mich") {
            return CopilotMessage(
                mine: false,
                text:
                """
                Mein aktuelles Verzeichnis zu dir:

                \(memory.founderName) · \(memory.role)
                \(memory.compactSummary)

                Idee: \(memory.idea)

                Offen sind gerade: \(openDocs). Dein nächster sauberer Schritt ist: \(memory.nextStep).

                Dieses Bild aktualisiert sich aus deinem Profil, Firmenprofil, Unterlagen, Kalender, Events und Matches. Wenn du dort etwas änderst, antworte ich beim nächsten Mal mit dem neuen Stand.
                """,
                actions: [
                    action("Kalender öffnen", "calendar", .open(.screen(.calendar))),
                    action("Firmenprofil", "building.2.fill", .open(.screen(.company))),
                    action("Unterlagen", "folder.fill", .open(.screen(.documents))),
                ],
                memory: memory,
                source: .local
            )
        }

        if m.contains("onboarding-ki-analyse") {
            return onboardingAnalysisAnswer(state: state)
        }

        if isCalendarContext(m) {
            return calendarContextAnswer(for: message, state: state)
        }

        if isPartnerContext(m) {
            return partnerContextAnswer(for: message, state: state)
        }

        if isServicePartnerRequest(m) {
            return partnerRecommendationAnswer(for: m, state: state)
        }

        if isCofounderOSRequest(m) {
            return cofounderOSAnswer(state: state)
        }

        if isFounderRadarRequest(m) {
            return founderRadarAnswer(state: state)
        }

        if matches(m, "kalender", "termin", "woche", "plan", "roadmap", "to-do", "todo", "nächste schritte", "naechste schritte", "was soll ich") {
            let planText = nextPlan.isEmpty ? "Ich baue dir den Plan aus deinem aktuellen Profil neu." : nextPlan
            return CopilotMessage(
                mine: false,
                text:
                """
                Ich würde es nicht komplizierter machen:

                \(planText)
                """,
                actions: [
                    action("Plan neu bauen", "wand.and.stars", .rebuildPlanner),
                    action("Kalender öffnen", "calendar", .open(.screen(.calendar))),
                    action("15-Min-Check-in setzen", "calendar.badge.plus", .addPlannerItem(
                        title: "15-Minuten Gründer-Check-in",
                        note: "Kurz prüfen: Was ist seit gestern klarer, was blockiert, wer muss angesprochen werden?",
                        dueLabel: "Morgen",
                        kind: .meeting,
                        target: .pilot
                    )),
                ],
                navigation: [.init(label: "Startkosten-Guide", destination: .guide("startkosten-rechnen"))]
            )
        }

        if matches(m, "unterlagen", "dokument", "ideenpapier", "finanzplan", "innovation", "förder", "foerder", "zuschuss", "stipendium", "exist") {
            let missing = memory.openDocuments.isEmpty ? "Dein Unterlagenpaket ist gerade komplett markiert." : "Es fehlen noch: \(openDocs)."
            return CopilotMessage(
                mine: false,
                text:
                """
                Für \(memory.ventureName) ist der wichtigste Hebel nicht irgendein Guide, sondern ein belastbarer Nachweis-Stapel.

                \(missing)

                Ich kann dir aus deinem Firmenprofil sofort einen ersten Arbeitsentwurf für Ideenpapier und Innovationsbeschreibung schreiben. Danach sollte der Finanzplan als nächster Kalendereintrag folgen, weil Förderung ohne Zahlen schnell weich wird.
                """,
                actions: [
                    action("Entwurf erstellen", "doc.text.fill", .generateDocumentDraft),
                    action("Unterlagen öffnen", "folder.fill", .open(.screen(.documents))),
                    action("Finanzplan einplanen", "calendar.badge.plus", .addPlannerItem(
                        title: "Finanzplan grob rechnen",
                        note: "12 Monate Kosten, private Lebenshaltung, Mittelverwendung und erster Umsatzpfad.",
                        dueLabel: "Diese Woche",
                        kind: .funding,
                        target: .documents
                    )),
                ],
                navigation: [
                    .init(label: "Förder-Landkarte", destination: .guide("foerderung-kleine-gruendungen")),
                    .init(label: "Startkosten rechnen", destination: .guide("startkosten-rechnen")),
                ]
            )
        }

        if matches(m, "firmenprofil", "firma", "unternehmen", "profil bearbeiten", "profil", "seite", "veröffentlichen", "veroeffentlichen") {
            let publicState = state.companyProfile.isPublished ? "Dein Profil ist bereits veröffentlicht." : "Dein Profil ist noch nicht veröffentlicht."
            return CopilotMessage(
                mine: false,
                text:
                """
                \(publicState)

                Ich würde das Firmenprofil als Arbeitskarte für Matches behandeln: Hero-Satz, aktueller Stand, Teamlücke und klare CTA. Gerade bei \(memory.ventureName) muss ein Match in 10 Sekunden verstehen, ob es operativ helfen kann.

                Wenn du willst, öffne ich den Builder oder setze den Profil-Link direkt auf veröffentlicht.
                """,
                actions: [
                    action("Builder öffnen", "building.2.fill", .open(.screen(.company))),
                    action("Profil-Link setzen", "paperplane.fill", .publishCompanyProfile),
                    action("Profil-Review einplanen", "calendar.badge.plus", .addPlannerItem(
                        title: "Firmenprofil auf Match-Klarheit prüfen",
                        note: "Hero, Teamlücke, Stand und CTA so lesen, als wärst du ein fremdes Match.",
                        dueLabel: "Heute",
                        kind: .profile,
                        target: .company
                    )),
                ]
            )
        }

        if isMatchMessageRequest(m) {
            if let selected = selectedMatch(in: m, state: state) {
                return draftMessageForMatch(selected.id, state: state)
            }
            return matchMessageSelection(state: state)
        }

        if matches(m, "match", "co-founder", "cofounder", "mitgründer", "mitgruender", "partner", "team") {
            return matchOverview(state: state, partner: partner)
        }

        if matches(m, "gewerbe", "anmeld", "selbständig machen", "selbstaendig machen", "offiziell", "freiberufl") {
            return CopilotMessage(
                mine: false,
                text:
                """
                Für \(memory.ventureName) würde ich offiziell starten, sobald du zwei Dinge sauber hast: ersten Angebotskern und grobe Kostenrechnung.

                Gewerbeamt, Finanzamt-Fragebogen und IHK/HWK sind machbar. Kritischer ist die Frage: Willst du jetzt schon Rechnungen schreiben oder erst validieren? Ich setze dir gern einen Mini-Plan in den Kalender.
                """,
                actions: [
                    action("Gewerbe-Plan setzen", "calendar.badge.plus", .addPlannerItem(
                        title: "Gewerbe-Start vorbereiten",
                        note: "Angebot, Kleinunternehmerregelung, Steuer-Unterkonto und erste Rechnungsvorlage prüfen.",
                        dueLabel: "Nach Kostencheck",
                        kind: .legal,
                        target: .guides
                    )),
                    action("Kalender öffnen", "calendar", .open(.screen(.calendar))),
                ],
                navigation: [.init(label: "Gewerbe anmelden", destination: .guide("gewerbe-anmelden"))]
            )
        }

        if matches(m, "gmbh", "gbr", "rechtsform", "recht", "vertrag", "haftung", "anwalt") {
            return CopilotMessage(
                mine: false,
                text:
                """
                Für den nächsten Schritt reicht meistens eine klare Reihenfolge: Risiko prüfen, Rollen schriftlich festhalten, dann Rechtsform entscheiden.

                Bei \(memory.ventureName) würde ich erst klären, ob du Verträge, Mietfläche, Mitarbeitende oder IP-Risiko hast. Wenn ja, gehört ein Rechtscheck in den Kalender, nicht nur ein Guide-Lesezeichen.
                """,
                actions: [
                    action("Rechtscheck planen", "calendar.badge.plus", .addPlannerItem(
                        title: "Rechtsform und Haftung prüfen",
                        note: "Risiken, Rollen, IP, Beteiligung und GbR/GmbH-Entscheidung sauber notieren.",
                        dueLabel: "Diese Woche",
                        kind: .legal,
                        target: .guides
                    )),
                    action("Advisor öffnen", "checkmark.seal.fill", .open(.screen(.events))),
                ],
                navigation: [
                    .init(label: "Rechtsform wählen", destination: .guide("rechtsform-waehlen")),
                    .init(label: "Mitgründer & Vertrag", destination: .guide("cofounder-finden")),
                ]
            )
        }

        if matches(m, "startkosten", "was kostet", "kapitalbedarf", "budget", "runway", "investor", "kapital", "kredit") {
            return CopilotMessage(
                mine: false,
                text:
                """
                Für \(memory.ventureName) rechne ich zuerst nicht Investor, sondern Klarheit:

                Einmalkosten + 6 × (Monatskosten + private Lebenshaltung) − vorsichtige Umsatzschätzung.

                Danach weißt du, ob Förderung, Kredit, Erspartes oder Partnerkapital überhaupt relevant sind. Ich kann dir den Kostencheck in den Kalender legen und die passenden Unterlagen öffnen.
                """,
                actions: [
                    action("Kostencheck planen", "calendar.badge.plus", .addPlannerItem(
                        title: "Startkosten und Runway rechnen",
                        note: "Einmalkosten, laufende Kosten, private Lebenshaltung und realistische Umsatzannahme.",
                        dueLabel: "Heute",
                        kind: .funding,
                        target: .documents
                    )),
                    action("Unterlagen öffnen", "folder.fill", .open(.screen(.documents))),
                ],
                navigation: [
                    .init(label: "Startkosten rechnen", destination: .guide("startkosten-rechnen")),
                    .init(label: "Förder-Landkarte", destination: .guide("foerderung-kleine-gruendungen")),
                ]
            )
        }

        if matches(m, "kunden", "akquise", "auftrag", "reichweite", "marketing", "sichtbar") {
            return CopilotMessage(
                mine: false,
                text:
                """
                Bei \(memory.ventureName) würde ich Sichtbarkeit nicht abstrakt starten. Nimm eine kleine Zielgruppe, eine konkrete Nachfrage und einen Beweis.

                Praktisch: 10 warme Kontakte, 3 kurze Problemgespräche, 1 öffentliches Profil, 1 Follow-up-Termin. Das lässt sich besser steuern als „Marketing machen".
                """,
                actions: [
                    action("Akquise-Sprint planen", "calendar.badge.plus", .addPlannerItem(
                        title: "10 warme Kontakte ansprechen",
                        note: "Nicht um Auftrag bitten, sondern um Empfehlung und Problemfeedback.",
                        dueLabel: "Nächste 7 Tage",
                        kind: .focus,
                        target: .calendar
                    )),
                    action("Firmenprofil öffnen", "building.2.fill", .open(.screen(.company))),
                ],
                navigation: [.init(label: "Die ersten 10 Kunden", destination: .guide("erste-kunden"))]
            )
        }

        return CopilotMessage(
            mine: false,
            text:
            """
            Ich gehe von deinem aktuellen Stand aus: \(memory.compactSummary).

            Der sinnvolle nächste Schritt ist gerade: \(memory.nextStep).

            Sag mir ruhig konkret „Plane meine Woche", „Was fehlt im Profil?", „Welche Unterlagen fehlen?" oder „Formuliere eine Nachricht". Ich kann dann nicht nur antworten, sondern Kalender, Unterlagen, Profil, Swipe und Chats direkt mitsteuern.
            """,
            actions: [
                action("Plan neu bauen", "wand.and.stars", .rebuildPlanner),
                action("Memory zeigen", "brain.head.profile", .open(.screen(.calendar))),
                action("Unterlagen öffnen", "folder.fill", .open(.screen(.documents))),
            ],
            memory: memory,
            source: .local
        )
    }

    @MainActor
    static func draftMessageForMatch(_ matchID: String, state: AppState) -> CopilotMessage {
        guard let match = state.matches.first(where: { $0.id == matchID }) else {
            return matchMessageSelection(state: state)
        }

        let memory = state.founderMemory
        let firstName = match.card.name.split(separator: " ").first.map(String.init) ?? match.card.name
        let skills = match.card.skills.prefix(2).joined(separator: " + ")
        let fitReason = skills.isEmpty ? match.card.role : "\(match.card.role) · \(skills)"
        let lastInbound = match.messages.last(where: { !$0.mine })?.text

        let draft: String
        if let lastInbound, !lastInbound.isEmpty {
            draft =
            """
            Hi \(firstName), danke dir für die Nachricht. Ich baue gerade \(memory.ventureName) und glaube, dass dein Profil bei \(fitReason) gut zu der Lücke passt, die ich gerade schließen will. Lass uns diese Woche 15 Minuten sprechen und ehrlich abgleichen: Rolle, Verfügbarkeit und ob wir beide wirklich Tempo reinbekommen.
            """
        } else {
            draft =
            """
            Hi \(firstName), ich baue gerade \(memory.ventureName) und dein Profil ist mir wegen \(fitReason) aufgefallen. Ich suche nicht nur Feedback, sondern jemanden, der operativ mitdenken kann. Hast du diese Woche 15 Minuten für einen kurzen Abgleich zu Problem, Rolle und Verfügbarkeit?
            """
        }

        return CopilotMessage(
            mine: false,
            text:
            """
            Ich würde \(match.card.name) so anschreiben:

            „\(draft)"

            Warum so: kurz, konkret, mit Bezug auf \(match.card.role) und ohne zu verkaufen. Erst prüfen, ob Rollen und Tempo passen.
            """,
            actions: [
                action("In Chat öffnen", "bubble.left.and.bubble.right.fill", .openMatchChat(match.id)),
                action("Jetzt senden", "paperplane.fill", .sendMatchMessage(matchID: match.id, text: draft)),
                action("Anderes Match", "person.2.fill", .askCopilot("Nachricht an anderes Match schreiben")),
                action("Follow-up planen", "calendar.badge.plus", .addPlannerItem(
                    title: "\(match.card.name) nachfassen",
                    note: "Wenn keine Antwort kommt: freundlich nach 2 Tagen mit konkretem 15-Minuten-Vorschlag nachfassen.",
                    dueLabel: "In 2 Tagen",
                    kind: .match,
                    target: .chats
                )),
            ],
            memory: memory,
            source: .local
        )
    }

    @MainActor
    private static func matchMessageSelection(state: AppState) -> CopilotMessage {
        let matches = recentMatches(state.matches)
        guard !matches.isEmpty else {
            return CopilotMessage(
                mine: false,
                text:
                """
                Ich kann dir die Nachricht schreiben, brauche dafür aber ein konkretes Match.

                Du hast gerade noch keine Matches im Chatbereich. Geh kurz ins Swipe-Deck, dann kann ich danach mit Profil, Rolle und Chatverlauf eine passende erste Nachricht bauen.
                """,
                actions: [
                    action("Swipe öffnen", "person.2.fill", .open(.screen(.swipe))),
                    action("Chats öffnen", "bubble.left.and.bubble.right.fill", .open(.screen(.chats))),
                ],
                source: .local
            )
        }

        if matches.count == 1, let only = matches.first {
            return draftMessageForMatch(only.id, state: state)
        }

        let shown = Array(matches.prefix(4))
        let moreText = matches.count > shown.count
            ? "\n\nIch zeige dir die \(shown.count) aktuellsten Matches. Die restlichen findest du in Chats."
            : ""

        return CopilotMessage(
            mine: false,
            text:
            """
            Für welches Match soll ich die Nachricht schreiben?\(moreText)
            """,
            actions: shown.map { match in
                action(matchChoiceLabel(match), "person.crop.circle.fill", .draftMatchMessage(match.id))
            } + (matches.count > shown.count
                 ? [action("Alle Chats", "bubble.left.and.bubble.right.fill", .open(.screen(.chats)))]
                 : []),
            source: .local
        )
    }

    @MainActor
    private static func matchOverview(state: AppState, partner: String) -> CopilotMessage {
        let matches = recentMatches(state.matches)
        guard !matches.isEmpty else {
            return CopilotMessage(
                mine: false,
                text:
                """
                Noch keine aktiven Matches. Wenn du willst, bringe ich dich direkt ins Swipe-Deck und wir suchen nach \(partner), die wirklich eine Lücke in deinem Vorhaben schließen.
                """,
                actions: [
                    action("Swipe öffnen", "person.2.fill", .open(.screen(.swipe))),
                    action("\(partner)-Guide", "book.fill", .open(.guide("cofounder-finden"))),
                ],
                source: .local
            )
        }

        let lines = matches.prefix(4).map { match in
            "- \(match.card.name): \(match.card.role), \(match.card.matchPercent)% Fit"
        }.joined(separator: "\n")
        let topCandidate = state.cofounderCandidates().first
        let topLine = topCandidate.map { "\($0.card.name) ist aktuell die stärkste Trial-Hypothese: \($0.total) Score, Test: \($0.testSprint)" }
            ?? "Ich brauche erst ein paar Profile oder Matches, um eine belastbare Trial-Hypothese zu bauen."

        return CopilotMessage(
            mine: false,
            text:
            """
            Ich würde Co-Founder-Suche nicht als Swipe-Spiel behandeln, sondern als Trial-Prozess.

            Deine stärksten aktuellen Matches:

            \(lines)

            \(topLine)

            Der nächste sinnvolle Schritt ist: Scorecard öffnen, Top-Kandidat prüfen, dann einen 15-Minuten-Call und 7-Tage-Test statt endloser Chaterei starten.
            """,
            actions: [
                action("Co-Founder OS", "person.2.fill", .open(.screen(.cofounderDesk))),
                action("Nachricht schreiben", "square.and.pencil", .askCopilot("Schreib mir eine Nachricht an ein Match")),
                action("Chats öffnen", "bubble.left.and.bubble.right.fill", .open(.screen(.chats))),
                action("Swipe öffnen", "person.2.fill", .open(.screen(.swipe))),
            ],
            source: .local
        )
    }

    @MainActor
    private static func cofounderOSAnswer(state: AppState) -> CopilotMessage {
        let candidates = state.cofounderCandidates()
        let gap = state.cofounderGapTitle()
        let lines = candidates.prefix(3).map { candidate in
            "- \(candidate.card.name): \(candidate.total) Score · \(candidate.card.role) · \(candidate.testSprint)"
        }.joined(separator: "\n")
        let top = candidates.first

        var actions: [CopilotAction] = [
            action("Co-Founder OS öffnen", "person.2.fill", .open(.screen(.cofounderDesk))),
            action("Swipe öffnen", "rectangle.stack.person.crop.fill", .open(.screen(.swipe))),
        ]
        if let top {
            actions.insert(action("Trial für \(top.card.name)", "checklist.checked", .startCofounderTrial(top.id)), at: 1)
        }

        return CopilotMessage(
            mine: false,
            text:
            """
            Ich würde deine Suche als Founder Due Diligence führen.

            Aktuelle Lücke: \(gap)

            \(lines.isEmpty ? "Noch keine belastbare Shortlist. Öffne Swipe, damit ich Profile in eine Scorecard übersetzen kann." : "Aktuelle Shortlist:\n\(lines)")

            Mein Vorschlag: Nicht weiter allgemein suchen, sondern den besten Kandidaten in einen kleinen 7-Tage-Test bringen. So prüfst du Arbeitsstil, Tempo und Verlässlichkeit statt nur Sympathie.
            """,
            actions: actions,
            quickReplies: [
                "Welche Red Flags soll ich prüfen?",
                "Schreib die erste Nachricht",
                "Was ist ein guter Trial Sprint?",
            ],
            memory: state.founderMemory,
            source: .local
        )
    }

    static let quickPrompts = [
        "Was weißt du über mein Vorhaben?",
        "Zeig mir mein Founder Radar",
        "Plane meine nächsten 7 Tage",
        "Baue meine Co-Founder Scorecard",
        "Welche Unterlagen fehlen mir?",
        "Zeig mir Growth-Partner",
        "Formuliere eine Nachricht an ein Match",
    ]

    private static func action(_ label: String, _ icon: String, _ command: CopilotCommand) -> CopilotAction {
        CopilotAction(label: label, icon: icon, command: command)
    }

    private static func isMatchMessageRequest(_ text: String) -> Bool {
        let wantsText = matches(
            text,
            "nachricht", "anschreiben", "formulier", "formuliere", "schreib", "schreibe",
            "text", "dm", "kontaktieren", "erstkontakt"
        )
        let matchContext = matches(text, "match", "co-founder", "cofounder", "mitgründer", "mitgruender", "partner", "team")
        return wantsText && matchContext
    }

    private static func isCalendarContext(_ text: String) -> Bool {
        text.contains("kalender-kontext") || text.contains("termin-kontext")
    }

    private static func isCofounderOSRequest(_ text: String) -> Bool {
        let cofounder = matches(text, "co-founder", "cofounder", "mitgründer", "mitgruender", "founder")
        let process = matches(text, "scorecard", "trial", "shortlist", "suche", "finden", "due diligence", "test")
        return cofounder && process
    }

    private static func isFounderRadarRequest(_ text: String) -> Bool {
        let radar = matches(text, "founder radar", "radar", "board brief", "board-brief", "readiness", "score", "risiko", "risk", "chance")
        let founderContext = matches(text, "founder", "startup", "vorhaben", "idee", "gründer", "gruender", "team", "investor", "board")
        let analysisIntent = matches(text, "bewerte", "analysiere", "einschätzung", "einschaetzung", "was fehlt", "nächster move", "naechster move")
        return radar || (founderContext && analysisIntent)
    }

    private static func isPartnerContext(_ text: String) -> Bool {
        text.contains("partner-kontext")
    }

    private static func isServicePartnerRequest(_ text: String) -> Bool {
        let serviceNeed = serviceHint(in: text) != nil
        let partnerNeed = matches(text, "partner", "anbieter", "dienstleister", "experte", "expertin", "agentur", "desk", "marketplace")
        return serviceNeed && partnerNeed
    }

    @MainActor
    private static func partnerRecommendationAnswer(for text: String, state: AppState) -> CopilotMessage {
        let serviceId = serviceHint(in: text) ?? "growth"
        let partners = state.partners(for: serviceId)
        let service = serviceCatalog.first { $0.id == serviceId }
        let label = service?.label ?? serviceId.capitalized

        guard !partners.isEmpty else {
            let liveReason: String = {
                switch state.partnerLoadState {
                case .loading:
                    return "Die Partnerangebote werden gerade live geladen."
                case .failed(let message):
                    return "Live-Partnerdaten sind nicht erreichbar: \(message)"
                case .loaded:
                    return "In Supabase sind aktuell keine aktiven Partnerangebote fuer \(label) freigegeben."
                case .idle:
                    return "Die Live-Partnerdaten wurden noch nicht geladen."
                }
            }()

            return CopilotMessage(
                mine: false,
                text:
                """
                Für \(label) habe ich gerade keine Live-Partner in der App.

                \(liveReason)

                Ich kann dich trotzdem in Entdecken bringen oder die Live-Daten neu laden lassen. Ohne Live-Daten zeige ich keinen Ersatzbestand an.
                """,
                actions: [
                    action("Live neu laden", "arrow.clockwise", .refreshPartners),
                    action("\(label) öffnen", "square.grid.2x2.fill", .open(.screen(.partners(serviceId)))),
                    action("Entdecken öffnen", "magnifyingglass", .open(.tab(.discover))),
                ],
                memory: state.founderMemory,
                source: .local
            )
        }

        let top = Array(partners.prefix(3))
        let lines = top.map { "- \($0.name): \($0.fit)% Fit · \($0.blurb)" }.joined(separator: "\n")
        var actions = top.map { partner in
            action(partner.name, "person.crop.circle.badge.checkmark", .open(.screen(.partner(partner.id))))
        }
        actions.append(action("\(label) öffnen", service?.icon ?? "square.grid.2x2.fill", .open(.screen(.partners(serviceId)))))

        return CopilotMessage(
            mine: false,
            text:
            """
            Ich würde für \(label) mit diesen Partnern starten:

            \(lines)

            Der nächste sinnvolle Schritt ist nicht nur „Kontakt aufnehmen", sondern vorher kurz klären: Ziel, aktueller Stand, offene Unterlagen und welche Entscheidung nach dem Gespräch fallen soll. Ich kann jedes Profil mit deinem Gründer-Verzeichnis als Briefing vorbereiten.
            """,
            actions: actions,
            quickReplies: [
                "Bereite das erste Gespräch vor",
                "Was sollte ich vorher fertig machen?",
                "Lege mir einen Termin dafür an",
            ],
            memory: state.founderMemory,
            source: .local
        )
    }

    @MainActor
    private static func founderRadarAnswer(state: AppState) -> CopilotMessage {
        let brief = state.currentFounderRadarBrief()
        let signalLines = brief.signals.prefix(4).map {
            "- \($0.label): \($0.score)/100 · \($0.note)"
        }.joined(separator: "\n")
        let moveLines = brief.moves.prefix(3).enumerated().map { index, move in
            "\(index + 1). \(move.title) · \(move.successMetric)"
        }.joined(separator: "\n")

        var actions: [CopilotAction] = [
            action("Founder Radar öffnen", "scope", .open(.screen(.radar))),
            action("Live neu berechnen", "arrow.clockwise", .refreshFounderRadar),
            action("Board-Brief durchgehen", "brain.head.profile", .askCopilot(brief.copilotPrompt)),
        ]

        if let firstMove = brief.moves.first {
            actions.append(
                action("Ersten Move planen", "calendar.badge.plus", .addPlannerItem(
                    title: firstMove.title,
                    note: "\(firstMove.reason)\nErfolgskriterium: \(firstMove.successMetric)",
                    dueLabel: firstMove.dueLabel,
                    kind: firstMove.kind,
                    target: firstMove.target
                ))
            )
        }

        return CopilotMessage(
            mine: false,
            text:
            """
            Dein Founder Radar sagt gerade: \(brief.verdict)

            Score: \(brief.overallScore)/100 · \(brief.scoreLabel)
            Primäres Risiko: \(brief.primaryRisk)
            Versteckte Chance: \(brief.hiddenOpportunity)

            Signale:
            \(signalLines)

            Nächste Moves:
            \(moveLines)

            Die harte Board-Frage ist: \(brief.investorQuestion)
            """,
            actions: actions,
            quickReplies: [
                "Plane daraus meine Woche",
                "Welche Annahme ist am riskantesten?",
                "Mach den ersten Move konkret",
            ],
            memory: state.founderMemory,
            source: brief.source == .live ? .cloud : .local
        )
    }

    @MainActor
    private static func partnerContextAnswer(for message: String, state: AppState) -> CopilotMessage {
        let memory = state.founderMemory
        let rawPartner = contextLine(in: message, prefixes: ["Partner:"])?.replacingOccurrences(of: "Partner:", with: "").trimmingCharacters(in: .whitespacesAndNewlines)
        let partner = rawPartner.flatMap { name in
            state.partners.first { $0.name.localizedCaseInsensitiveContains(name) || name.localizedCaseInsensitiveContains($0.name) }
        }
        let partnerName = partner?.name ?? rawPartner ?? "den ausgewählten Partner"
        let serviceLabel = partner?.serviceLabel ?? contextLine(in: message, prefixes: ["Kategorie:"])?.replacingOccurrences(of: "Kategorie:", with: "").trimmingCharacters(in: .whitespacesAndNewlines) ?? "Partner"

        var actions: [CopilotAction] = [
            action("Termin einplanen", "calendar.badge.plus", .addPlannerItem(
                title: "Partnergespräch · \(partnerName)",
                note: "Agenda, offene Unterlagen und Zielentscheidung vorab klären.",
                dueLabel: "Diese Woche",
                kind: .meeting,
                target: .startup
            )),
            action("Kalender öffnen", "calendar", .open(.screen(.calendar))),
            action("Unterlagen prüfen", "folder.fill", .open(.screen(.documents))),
        ]
        if let partner {
            actions.insert(action("Partnerprofil", "person.crop.circle.badge.checkmark", .open(.screen(.partner(partner.id)))), at: 0)
        }

        return CopilotMessage(
            mine: false,
            text:
            """
            Ich bereite \(partnerName) als \(serviceLabel)-Gespräch für \(memory.ventureName) vor.

            Agenda:
            1. In 60 Sekunden erklären, was du baust und wo du gerade stehst.
            2. Die eine Lücke benennen, die der Partner schließen soll.
            3. Offene Unterlagen prüfen: \(memory.openDocumentsText).
            4. Am Ende eine konkrete Entscheidung festlegen: Test, Sprint, nächster Call oder nein.

            Fragen:
            - Welches Ergebnis ist nach 7 bis 14 Tagen realistisch?
            - Welche Daten oder Unterlagen braucht ihr vorab?
            - Was kostet der kleinste sinnvolle Test?
            - Wer ist auf Partnerseite operativ zuständig?
            - Woran merken wir, dass es nicht passt?

            Ich würde dazu direkt einen Kalenderpunkt setzen und vorher Unterlagen/Firmenprofil kurz prüfen.
            """,
            actions: actions,
            quickReplies: [
                "Mach daraus eine Mail",
                "Welche Unterlagen fehlen konkret?",
                "Plane den Vorbereitungsslot",
            ],
            memory: memory,
            source: .local
        )
    }

    @MainActor
    private static func onboardingAnalysisAnswer(state: AppState) -> CopilotMessage {
        let memory = state.founderMemory
        let openDocs = memory.openDocumentsText
        let matches = memory.bestMatches.prefix(3).joined(separator: "\n")

        return CopilotMessage(
            mine: false,
            text:
            """
            Deine KI-Gründeranalyse ist fertig.

            Kurzdiagnose: \(memory.compactSummary). Der Hebel ist nicht mehr nur Idee sammeln, sondern die nächste beweisbare Bewegung: \(memory.nextStep).

            Risiken der nächsten 14 Tage:
            1. Zu lange am Profil feilen, ohne mit passenden Menschen zu sprechen.
            2. Unterlagen bleiben offen: \(openDocs).
            3. Team-Lücke wird nicht konkret genug benannt.

            Beste Team-Lücke: Suche jemanden, der deine Rolle ergänzt und sofort operativ an einem kleinen Ergebnis mitarbeitet. Gute Signale wären:
            \(matches.isEmpty ? "- Noch keine belastbaren Matches. Erst Swipe-Deck füllen und Gespräch starten." : matches)

            Meine nächsten App-Aktionen: Plan neu bauen, Firmenprofil schärfen, erstes passendes Match anschreiben.
            """,
            actions: [
                action("Plan neu bauen", "wand.and.stars", .rebuildPlanner),
                action("Firmenprofil", "building.2.fill", .open(.screen(.company))),
                action("Match anschreiben", "square.and.pencil", .askCopilot("Formuliere eine Nachricht an ein Match")),
                action("Unterlagen", "folder.fill", .open(.screen(.documents))),
            ],
            quickReplies: [
                "Mach daraus einen 7-Tage-Plan",
                "Welche Teamrolle fehlt mir?",
                "Was sollte ins Firmenprofil?",
            ],
            memory: memory,
            source: .local
        )
    }

    @MainActor
    private static func calendarContextAnswer(for message: String, state: AppState) -> CopilotMessage {
        let memory = state.founderMemory
        let focus = contextLine(in: message, prefixes: ["Termin:", "Datum:"]) ?? "deinen ausgewählten Kalender-Kontext"
        let openPlan = memory.openPlannerItems.prefix(3).enumerated().map { index, item in
            "\(index + 1). \(item)"
        }.joined(separator: "\n")
        let teamNames = state.startupTeamMembers.prefix(3).map(\.name).joined(separator: ", ")
        let teamText = teamNames.isEmpty ? "Noch kein Team hinterlegt." : "Team-Kontext ist dabei: \(teamNames)."

        return CopilotMessage(
            mine: false,
            text:
            """
            Ich habe den Kontext zu \(focus) mitgenommen.

            Meine Lesart: Der Termin sollte nicht isoliert stehen, sondern auf \(memory.nextStep) einzahlen. \(teamText)

            Für jetzt würde ich es so anfassen:

            \(openPlan.isEmpty ? "1. Einen konkreten nächsten Schritt festlegen.\n2. Zuständigkeit im Startup Workspace klären.\n3. Den nächsten Kalenderblock setzen." : openPlan)

            Wenn du willst, kann ich daraus direkt den Plan neu bauen, den Startup Workspace öffnen oder dich zurück in den Kalender bringen.
            """,
            actions: [
                action("Plan neu bauen", "wand.and.stars", .rebuildPlanner),
                action("Startup öffnen", "person.3.fill", .open(.screen(.startup))),
                action("Kalender öffnen", "calendar", .open(.screen(.calendar))),
                action("Unterlagen prüfen", "folder.fill", .open(.screen(.documents))),
            ],
            quickReplies: [
                "Mach daraus einen Tagesplan",
                "Wer aus dem Team sollte das übernehmen?",
                "Welche Nachricht sollte ich dazu senden?",
            ],
            memory: memory,
            source: .local
        )
    }

    private static func contextLine(in message: String, prefixes: [String]) -> String? {
        message
            .components(separatedBy: .newlines)
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .first { line in prefixes.contains { line.hasPrefix($0) } }
    }

    private static func requiresNativeControl(_ text: String) -> Bool {
        isMatchMessageRequest(text)
            || isPartnerContext(text)
            || isServicePartnerRequest(text)
            || isCofounderOSRequest(text)
            || isFounderRadarRequest(text)
            || isMemoryUpdateRequest(text)
            || isFastAppControlRequest(text)
    }

    private static func isFastAppControlRequest(_ text: String) -> Bool {
        isStartupStartRequest(text)
            || matches(text, "kalender", "termin", "plane", "planen", "woche planen", "eintragen")
            || matches(text, "unterlagen", "dokument", "finanzplan", "ideenpapier")
            || matches(text, "firmenprofil", "firma", "profil bearbeiten", "profil öffnen", "profil oeffnen")
    }

    private static func isStartupStartRequest(_ text: String) -> Bool {
        let startup = matches(text, "startup", "start up", "workspace", "firma", "vorhaben")
        let start = matches(text, "gründen", "gruenden", "starten", "anlegen", "erstellen", "founden", "öffnen", "oeffnen")
        return startup && start
    }

    private static func isMemoryUpdateRequest(_ text: String) -> Bool {
        matches(text, "merk dir", "merke dir", "speicher", "speichere", "notier", "notiere", "memory anpassen", "verzeichnis anpassen")
    }

    private static func memoryFactCandidate(from message: String) -> String {
        var text = message.trimmingCharacters(in: .whitespacesAndNewlines)
        let removable = ["merk dir", "merke dir", "speicher", "speichere", "notier", "notiere", "bitte", ":"]
        for token in removable {
            text = text.replacingOccurrences(of: token, with: "", options: [.caseInsensitive])
        }
        text = text.trimmingCharacters(in: .whitespacesAndNewlines)
        return text.isEmpty ? message.trimmingCharacters(in: .whitespacesAndNewlines) : text
    }

    private static func serviceHint(in text: String) -> String? {
        if matches(text, "growth", "gtm", "marketing", "kunden", "akquise", "outbound", "sales", "launch", "reichweite") {
            return "growth"
        }
        if matches(text, "kapital", "investor", "angel", "kredit", "kfw", "finanzierung", "pre-seed", "runde") {
            return "capital"
        }
        if matches(text, "steuer", "buchhaltung", "datev", "ust", "lohn", "forschungszulage") {
            return "tax"
        }
        if matches(text, "mentor", "mentoren", "advisor", "sparring", "office hour", "operator") {
            return "mentor"
        }
        if matches(text, "talent", "hiring", "hire", "mitarbeiter", "recruiting", "engineer", "fractional") {
            return "talent"
        }
        return nil
    }

    @MainActor
    private static func selectedMatch(in text: String, state: AppState) -> Match? {
        recentMatches(state.matches).first { match in
            let name = match.card.name.lowercased()
            let firstName = name.split(separator: " ").first.map(String.init) ?? name
            return text.contains(name) || text.contains(firstName)
        }
    }

    private static func recentMatches(_ matches: [Match]) -> [Match] {
        matches.sorted { lhs, rhs in
            let lhsDate = lhs.messages.last?.at ?? .distantPast
            let rhsDate = rhs.messages.last?.at ?? .distantPast
            if lhsDate == rhsDate {
                return lhs.card.matchPercent > rhs.card.matchPercent
            }
            return lhsDate > rhsDate
        }
    }

    private static func matchChoiceLabel(_ match: Match) -> String {
        "\(match.card.name) · \(match.card.matchPercent)%"
    }

    private static func defaultActions(for answer: String) -> [CopilotAction] {
        let lower = answer.lowercased()
        if matches(lower, "unterlagen", "ideenpapier", "finanzplan", "antrag") {
            return [
                action("Unterlagen öffnen", "folder.fill", .open(.screen(.documents))),
                action("Kalender öffnen", "calendar", .open(.screen(.calendar))),
            ]
        }
        if matches(lower, "founder radar", "board brief", "readiness", "risiko", "score") {
            return [
                action("Founder Radar", "scope", .open(.screen(.radar))),
                action("Live neu berechnen", "arrow.clockwise", .refreshFounderRadar),
            ]
        }
        if matches(lower, "match", "co-founder", "mitgründer", "mitgruender", "anschreiben") {
            return [
                action("Co-Founder OS", "person.2.fill", .open(.screen(.cofounderDesk))),
                action("Chats öffnen", "bubble.left.and.bubble.right.fill", .open(.screen(.chats))),
            ]
        }
        if matches(lower, "firmenprofil", "profil", "seite", "landingpage") {
            return [
                action("Firmenprofil", "building.2.fill", .open(.screen(.company))),
                action("Plan öffnen", "calendar", .open(.screen(.calendar))),
            ]
        }
        return [
            action("Kalender öffnen", "calendar", .open(.screen(.calendar))),
            action("Memory zeigen", "brain.head.profile", .open(.screen(.calendar))),
        ]
    }

    @MainActor
    private static func cloudActions(for answer: String, quickActions: [String], newFacts: [String], state: AppState) -> [CopilotAction] {
        var actions = defaultActions(for: answer)

        for quickAction in quickActions {
            if let action = nativeAction(from: quickAction, answer: answer, newFacts: newFacts, state: state) {
                actions.insert(action, at: 0)
            }
        }

        if let fact = newFacts.first {
            actions.insert(action("Memory speichern", "brain.head.profile", .rememberFact(fact)), at: 0)
        }

        if !state.hasStartupWorkspace && matches(answer.lowercased(), "startup", "workspace", "gründen", "gruenden", "firma", "vorhaben") {
            actions.append(startupFoundingAction(state: state))
        }

        return dedupeActions(actions)
    }

    @MainActor
    private static func nativeAction(from label: String, answer: String, newFacts: [String], state: AppState) -> CopilotAction? {
        let lower = label.lowercased()
        if matches(lower, "termin", "kalender", "eintrag", "eintragen", "planen", "slot") {
            return action("Termin eintragen", "calendar.badge.plus", .addSmartPlannerItem(
                title: inferredPlannerTitle(from: label, answer: answer),
                note: inferredPlannerNote(from: answer),
                dueLabel: inferredDueLabel(from: "\(label)\n\(answer)"),
                kind: inferredPlannerKind(from: "\(label)\n\(answer)"),
                target: inferredPlannerTarget(from: "\(label)\n\(answer)"),
                assigneeName: state.profile?.name
            ))
        }
        if matches(lower, "memory", "merken", "speichern", "verzeichnis") {
            let fact = newFacts.first ?? inferredFact(from: answer, state: state)
            return action("Memory speichern", "brain.head.profile", .rememberFact(fact))
        }
        if matches(lower, "startup gründen", "startup gruenden", "workspace gründen", "workspace gruenden", "firma anlegen", "vorhaben anlegen") {
            return startupFoundingAction(state: state)
        }
        if matches(lower, "firmenprofil", "profil", "builder", "seite") {
            return action("Firmenprofil öffnen", "building.2.fill", .open(.screen(.company)))
        }
        if matches(lower, "unterlagen", "dokument", "ideenpapier", "finanzplan") {
            return action("Unterlagen öffnen", "folder.fill", .open(.screen(.documents)))
        }
        if matches(lower, "match", "nachricht", "anschreiben", "chat") {
            return action("Nachricht schreiben", "square.and.pencil", .askCopilot("Formuliere eine Nachricht an ein Match"))
        }
        if matches(lower, "partner", "growth", "kapital", "steuer", "mentor", "talent") {
            return action("Partner öffnen", "person.crop.circle.badge.checkmark", .open(.screen(.partners(serviceHint(in: lower) ?? "all"))))
        }
        return nil
    }

    @MainActor
    private static func startupFoundingAction(state: AppState) -> CopilotAction {
        let profile = state.profile
        let name = profile?.pitch.isEmpty == false ? profile!.pitch : state.companyProfile.name
        let category = profile?.industry.label ?? state.companyProfile.category
        let stage = state.companyProfile.stage.isEmpty ? "Idee" : state.companyProfile.stage
        let city = state.companyProfile.city.isEmpty ? (profile?.plz ?? "DACH") : state.companyProfile.city
        let idea = profile?.pitch.isEmpty == false ? profile!.pitch : state.founderMemory.idea
        return action("Startup gründen", "building.2.fill", .foundStartup(
            name: name,
            category: category,
            stage: stage,
            city: city,
            idea: idea
        ))
    }

    private static func dedupeActions(_ actions: [CopilotAction]) -> [CopilotAction] {
        var labels = Set<String>()
        var result: [CopilotAction] = []
        for action in actions where labels.insert(action.label).inserted {
            result.append(action)
        }
        return Array(result.prefix(5))
    }

    private static func inferredPlannerTitle(from label: String, answer: String) -> String {
        let clean = label.trimmingCharacters(in: .whitespacesAndNewlines)
        if clean.count > 6, !matches(clean.lowercased(), "termin", "kalender", "planen") {
            return String(clean.prefix(54))
        }
        if matches(answer.lowercased(), "partner", "gespräch", "gespraech") { return "Partnergespräch vorbereiten" }
        if matches(answer.lowercased(), "match", "co-founder", "mitgründer", "mitgruender") { return "Match-Gespräch vorbereiten" }
        if matches(answer.lowercased(), "unterlagen", "finanzplan", "ideenpapier") { return "Unterlagen-Fokusblock" }
        return "Co-Pilot Empfehlung umsetzen"
    }

    private static func inferredPlannerNote(from answer: String) -> String {
        let oneLine = answer
            .replacingOccurrences(of: "\n", with: " ")
            .split(separator: " ")
            .joined(separator: " ")
        return String(oneLine.prefix(180))
    }

    private static func inferredDueLabel(from text: String) -> String {
        let lower = text.lowercased()
        if matches(lower, "morgen") { return "Morgen" }
        if matches(lower, "2 tage", "zwei tage", "nach 2") { return "In 2 Tagen" }
        if matches(lower, "woche", "7 tage", "sieben tage") { return "Diese Woche" }
        return "Heute"
    }

    private static func inferredPlannerKind(from text: String) -> PlannerItemKind {
        let lower = text.lowercased()
        if matches(lower, "finanz", "förder", "foerder", "kapital") { return .funding }
        if matches(lower, "unterlagen", "dokument", "ideenpapier") { return .document }
        if matches(lower, "recht", "vertrag", "gmbh", "gbr") { return .legal }
        if matches(lower, "profil", "seite", "startup") { return .profile }
        if matches(lower, "match", "co-founder", "mitgründer", "mitgruender") { return .match }
        if matches(lower, "call", "gespräch", "gespraech", "meeting", "termin") { return .meeting }
        return .focus
    }

    private static func inferredPlannerTarget(from text: String) -> PlannerTarget? {
        let lower = text.lowercased()
        if matches(lower, "unterlagen", "dokument", "finanzplan", "ideenpapier") { return .documents }
        if matches(lower, "profil", "firma", "startup") { return .company }
        if matches(lower, "match", "nachricht", "chat") { return .chats }
        if matches(lower, "recht", "guide") { return .guides }
        return .calendar
    }

    @MainActor
    private static func inferredFact(from answer: String, state: AppState) -> String {
        let memory = state.founderMemory
        let clean = answer
            .replacingOccurrences(of: "\n", with: " ")
            .split(separator: " ")
            .joined(separator: " ")
        return "\(memory.ventureName): \(String(clean.prefix(140)))"
    }

    private static func nativeNav(from nav: CopilotCloudNav) -> CopilotNav? {
        guard let destination = nativeDestination(for: nav.to) else { return nil }
        return CopilotNav(label: nav.label, destination: destination)
    }

    private static func nativeDestination(for route: String) -> CopilotDestination? {
        let clean = route.split(separator: "?").first.map(String.init) ?? route
        if clean.hasPrefix("/guides/") {
            return .guide(String(clean.dropFirst("/guides/".count)))
        }
        switch clean {
        case "/radar", "/founder-radar", "/board", "/board-brief":
            return .screen(.radar)
        case "/heute", "/plan", "/kalender":
            return .screen(.calendar)
        case "/guides":
            return .screen(.guides)
        case "/co-founder":
            return .screen(.cofounderDesk)
        case "/discover":
            return .screen(.swipe)
        case "/matches":
            return .screen(.chats)
        case "/firma":
            return .screen(.company)
        case "/unterlagen", "/foerderung":
            return .screen(.documents)
        case "/co-pilot":
            return .screen(.copilot)
        case "/profile":
            return .tab(.profile)
        case "/marketplace":
            return .screen(.partners("all"))
        case "/steuer":
            return .screen(.partners("tax"))
        case "/mentoren":
            return .screen(.partners("mentor"))
        case "/talent":
            return .screen(.partners("talent"))
        case "/growth":
            return .screen(.partners("growth"))
        case "/kapital":
            return .screen(.partners("capital"))
        case "/recht":
            return .tab(.discover)
        default:
            return nil
        }
    }

    private static func matches(_ text: String, _ needles: String...) -> Bool {
        needles.contains { text.contains($0) }
    }
}
