import SwiftUI

struct OnboardingView: View {
    @EnvironmentObject private var state: AppState
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.openURL) private var openURL

    @State private var step: Step = .name
    @State private var direction = 1
    @State private var name = ""
    @State private var mode: FounderMode?
    @State private var pitch = ""
    @State private var industryID: String?
    @State private var region = ""
    @State private var selectedSkills: Set<String> = []
    @State private var availability: Availability?
    @State private var selectedFocus: Set<String> = []
    @State private var briefReady = false
    @State private var analysisPhase = 0
    @State private var selectedPlan: PlanChoice = .standard
    @State private var didPrefill = false
    @FocusState private var focusedField: InputField?

    private enum Step: Int, CaseIterable {
        case name
        case path
        case description
        case industry
        case location
        case skills
        case availability
        case focus
        case brief
        case connect
        case plan
    }

    private enum InputField {
        case name
        case pitch
        case region
    }

    private enum PlanChoice {
        case standard
        case pro
    }

    private struct FocusOption: Identifiable {
        let id: String
        let icon: String
        let title: String
    }

    private struct BriefItem: Identifiable {
        let id = UUID()
        let icon: String
        let tint: Color
        let title: String
        let detail: String
    }

    private var pageBackground: Color {
        colorScheme == .dark ? Color(hex: 0x0E0E10) : Color(hex: 0xF8F7F3)
    }

    private var elevatedBackground: Color {
        colorScheme == .dark ? Color(hex: 0x1B1B1E) : .white
    }

    private var primaryText: Color {
        colorScheme == .dark ? .white : MF.ink
    }

    private var secondaryText: Color {
        colorScheme == .dark ? Color.white.opacity(0.58) : MF.smoke
    }

    private var subtleBorder: Color {
        colorScheme == .dark ? Color.white.opacity(0.12) : MF.border
    }

    private var firstName: String {
        name.trimmingCharacters(in: .whitespacesAndNewlines)
            .split(separator: " ")
            .first
            .map(String.init) ?? ""
    }

    private var selectedIndustry: Industry? {
        industries.first { $0.id == industryID }
    }

    private var progress: Double {
        let lastRequiredStep = Step.focus.rawValue + 1
        let completed = min(step.rawValue + 1, lastRequiredStep)
        return Double(completed) / Double(lastRequiredStep)
    }

    private var canContinue: Bool {
        switch step {
        case .name:
            return !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        case .path:
            return mode != nil
        case .description:
            return pitch.trimmingCharacters(in: .whitespacesAndNewlines).count >= 4
        case .industry:
            return industryID != nil
        case .location:
            return region.trimmingCharacters(in: .whitespacesAndNewlines).count >= 2
        case .skills:
            return !selectedSkills.isEmpty
        case .availability:
            return availability != nil
        case .focus:
            return !selectedFocus.isEmpty
        case .brief:
            return briefReady
        case .connect, .plan:
            return true
        }
    }

    private var focusOptions: [FocusOption] {
        if mode == .skills {
            return [
                FocusOption(id: "opportunities", icon: "scope", title: "Passende Betriebe"),
                FocusOption(id: "positioning", icon: "text.quote", title: "Angebot schärfen"),
                FocusOption(id: "outreach", icon: "paperplane.fill", title: "Kontakte & Nachrichten"),
                FocusOption(id: "portfolio", icon: "doc.richtext.fill", title: "Referenzen & Unterlagen"),
                FocusOption(id: "planning", icon: "calendar", title: "Woche strukturieren"),
            ]
        }
        return [
            FocusOption(id: "plan", icon: "list.bullet.clipboard.fill", title: "Nächste Schritte"),
            FocusOption(id: "admin", icon: "building.columns.fill", title: "Ämter & Pflichten"),
            FocusOption(id: "money", icon: "eurosign.circle.fill", title: "Startkosten & Preise"),
            FocusOption(id: "customers", icon: "person.2.fill", title: "Erste Kunden"),
            FocusOption(id: "documents", icon: "doc.text.fill", title: "Unterlagen"),
            FocusOption(id: "partner", icon: "person.badge.plus", title: "Partner & Hilfe"),
        ]
    }

    var body: some View {
        ZStack {
            pageBackground.ignoresSafeArea()

            VStack(spacing: 0) {
                progressHeader

                ScrollView {
                    currentStep
                        .frame(maxWidth: 560, alignment: .leading)
                        .padding(.horizontal, 24)
                        .padding(.top, 22)
                        .padding(.bottom, 36)
                        .id(step)
                        .transition(
                            .asymmetric(
                                insertion: .move(edge: direction > 0 ? .trailing : .leading)
                                    .combined(with: .opacity),
                                removal: .move(edge: direction > 0 ? .leading : .trailing)
                                    .combined(with: .opacity)
                            )
                        )
                }
                .scrollDismissesKeyboard(.interactively)
                .scrollIndicators(.hidden)
            }
        }
        .safeAreaInset(edge: .bottom) {
            footer
        }
        .onAppear {
            prefillNameIfNeeded()
            focusCurrentField()
        }
        .onChange(of: step) { _, _ in
            focusCurrentField()
        }
        .task(id: step) {
            guard step == .brief, !briefReady else { return }
            analysisPhase = 0
            for phase in 1...3 {
                try? await Task.sleep(for: .milliseconds(520))
                guard !Task.isCancelled else { return }
                withAnimation(.easeInOut(duration: 0.24)) {
                    analysisPhase = phase
                }
            }
            try? await Task.sleep(for: .milliseconds(360))
            guard !Task.isCancelled else { return }
            Haptics.success()
            withAnimation(.easeOut(duration: 0.38)) {
                briefReady = true
            }
        }
        .task(id: step == .connect) {
            guard step == .connect else { return }
            await state.refreshConnectedAccounts(showLoading: false)
        }
    }

    private var progressHeader: some View {
        HStack(spacing: 14) {
            Button {
                goBack()
            } label: {
                Image(systemName: "chevron.left")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(primaryText)
                    .frame(width: 36, height: 36)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .opacity(step == .name ? 0 : 1)
            .disabled(step == .name)
            .accessibilityLabel("Zurück")

            GeometryReader { proxy in
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(subtleBorder)
                    Capsule()
                        .fill(MF.ember)
                        .frame(width: max(12, proxy.size.width * progress))
                }
            }
            .frame(height: 4)

            Text(progressLabel)
                .font(.system(size: 12, weight: .semibold, design: .monospaced))
                .foregroundStyle(secondaryText)
                .frame(width: 54, alignment: .trailing)
        }
        .frame(maxWidth: 560)
        .padding(.horizontal, 20)
        .padding(.top, 8)
        .frame(height: 52)
    }

    @ViewBuilder
    private var currentStep: some View {
        switch step {
        case .name:
            nameStep
        case .path:
            pathStep
        case .description:
            descriptionStep
        case .industry:
            industryStep
        case .location:
            locationStep
        case .skills:
            skillsStep
        case .availability:
            availabilityStep
        case .focus:
            focusStep
        case .brief:
            briefStep
        case .connect:
            connectStep
        case .plan:
            planStep
        }
    }

    private var nameStep: some View {
        VStack(alignment: .leading, spacing: 0) {
            assistantMark
            question(
                "Willkommen bei matchfoundr.",
                "Wie dürfen wir dich nennen?",
                helper: "Mehr brauche ich für den Anfang nicht."
            )

            onboardingField(
                placeholder: "Dein Vorname",
                text: $name,
                icon: "person.fill",
                field: .name,
                capitalization: .words
            )
            .padding(.top, 38)
        }
    }

    private var pathStep: some View {
        VStack(alignment: .leading, spacing: 0) {
            assistantMark
            question(
                firstName.isEmpty ? "Was ist dein nächster Schritt?" : "\(firstName), was ist dein nächster Schritt?",
                "Ich richte die App danach aus.",
                helper: nil
            )

            VStack(spacing: 10) {
                choiceRow(
                    icon: "storefront.fill",
                    title: "Eigenes Business starten",
                    subtitle: "Idee, Betrieb, Shop, Salon oder Agentur",
                    selected: mode == .idea
                ) {
                    mode = .idea
                    selectedSkills.removeAll()
                    selectedFocus.removeAll()
                }

                choiceRow(
                    icon: "hand.raised.fill",
                    title: "Mit meinen Skills einsteigen",
                    subtitle: "Ich suche ein Vorhaben, einen Betrieb oder Auftrag",
                    selected: mode == .skills
                ) {
                    mode = .skills
                    selectedSkills.removeAll()
                    selectedFocus.removeAll()
                }
            }
            .padding(.top, 30)
        }
    }

    private var descriptionStep: some View {
        VStack(alignment: .leading, spacing: 0) {
            assistantMark
            question(
                mode == .skills ? "Womit willst du anderen helfen?" : "Was willst du aufbauen?",
                mode == .skills
                    ? "Ein Satz reicht. Ich mache daraus später ein klares Angebot."
                    : "Beschreib es so, wie du es einem Freund sagen würdest.",
                helper: nil
            )

            VStack(alignment: .leading, spacing: 10) {
                TextField(
                    mode == .skills
                        ? "z. B. Buchhaltung für kleine Betriebe"
                        : "z. B. einen mobilen Friseursalon",
                    text: $pitch,
                    axis: .vertical
                )
                .focused($focusedField, equals: .pitch)
                .font(.system(size: 18, weight: .medium))
                .foregroundStyle(primaryText)
                .tint(MF.ember)
                .textInputAutocapitalization(.sentences)
                .lineLimit(3...7)
                .padding(16)
                .background(elevatedBackground)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .stroke(focusedField == .pitch ? MF.ember : subtleBorder, lineWidth: 1)
                )

                Text("\(pitch.trimmingCharacters(in: .whitespacesAndNewlines).count) Zeichen")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(secondaryText)
            }
            .padding(.top, 34)
        }
    }

    private var industryStep: some View {
        VStack(alignment: .leading, spacing: 0) {
            assistantMark
            question(
                "Wo passt das am ehesten rein?",
                "Nicht perfekt nachdenken. Das lässt sich später ändern.",
                helper: nil
            )

            FlowLayout(spacing: 9) {
                ForEach(industries) { industry in
                    choiceChip(
                        iconText: industry.emoji,
                        title: industry.label,
                        selected: industryID == industry.id
                    ) {
                        industryID = industry.id
                    }
                }
            }
            .padding(.top, 30)
        }
    }

    private var locationStep: some View {
        VStack(alignment: .leading, spacing: 0) {
            assistantMark
            question(
                "Wo soll das stattfinden?",
                "Ort oder PLZ reichen.",
                helper: "Damit finde ich passende Kammern, Förderstellen, Events und Partner in deiner Nähe."
            )

            onboardingField(
                placeholder: "z. B. 44139 Dortmund",
                text: $region,
                icon: "mappin.and.ellipse",
                field: .region,
                capitalization: .words
            )
            .padding(.top, 34)
        }
    }

    private var skillsStep: some View {
        VStack(alignment: .leading, spacing: 0) {
            assistantMark
            question(
                mode == .skills ? "Was kannst du richtig gut?" : "Was bringst du schon mit?",
                "Wähle bis zu vier.",
                helper: mode == .idea
                    ? "Damit suche ich Ergänzung statt Kopien von dir."
                    : "Damit sehen Betriebe sofort, wo du helfen kannst."
            )

            FlowLayout(spacing: 9) {
                ForEach(skillTags, id: \.self) { skill in
                    choiceChip(
                        iconText: nil,
                        title: skill,
                        selected: selectedSkills.contains(skill)
                    ) {
                        toggle(skill, in: &selectedSkills, limit: 4)
                    }
                }
            }
            .padding(.top, 30)
        }
    }

    private var availabilityStep: some View {
        VStack(alignment: .leading, spacing: 0) {
            assistantMark
            question(
                "Wie viel Raum hat das gerade?",
                "Eine ehrliche Antwort macht Vorschläge besser.",
                helper: nil
            )

            VStack(spacing: 10) {
                ForEach(Availability.allCases, id: \.rawValue) { value in
                    choiceRow(
                        icon: availabilityIcon(value),
                        title: value.label,
                        subtitle: value.sub,
                        selected: availability == value
                    ) {
                        availability = value
                    }
                }
            }
            .padding(.top, 30)
        }
    }

    private var focusStep: some View {
        VStack(alignment: .leading, spacing: 0) {
            assistantMark
            question(
                "Was soll ich dir zuerst abnehmen?",
                "Wähle bis zu drei. Ich nutze das für deinen Startplan und spätere Vorschläge.",
                helper: nil
            )

            FlowLayout(spacing: 9) {
                ForEach(focusOptions) { option in
                    iconChoiceChip(option, selected: selectedFocus.contains(option.id)) {
                        toggle(option.id, in: &selectedFocus, limit: 3)
                    }
                }
            }
            .padding(.top, 30)
        }
    }

    private var briefStep: some View {
        Group {
            if briefReady {
                VStack(alignment: .leading, spacing: 0) {
                    HStack(spacing: 10) {
                        Image(systemName: "checkmark")
                            .font(.system(size: 14, weight: .heavy))
                            .foregroundStyle(.white)
                            .frame(width: 30, height: 30)
                            .background(Color(hex: 0x2E9B63))
                            .clipShape(Circle())
                        Text("Startprofil bereit")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundStyle(Color(hex: 0x2E9B63))
                    }

                    Text("Ich habe deinen Start sortiert.")
                        .font(.system(size: 34, weight: .bold))
                        .foregroundStyle(primaryText)
                        .padding(.top, 22)

                    Text(briefSummary)
                        .font(.system(size: 16))
                        .foregroundStyle(secondaryText)
                        .lineSpacing(4)
                        .padding(.top, 12)

                    VStack(spacing: 0) {
                        ForEach(Array(startBrief.enumerated()), id: \.element.id) { index, item in
                            briefRow(number: index + 1, item: item)
                            if index < startBrief.count - 1 {
                                Divider()
                                    .overlay(subtleBorder)
                                    .padding(.leading, 54)
                            }
                        }
                    }
                    .padding(.top, 28)

                    Label(
                        mode == .skills
                            ? "Ich halte dich im Skill-Partner-Modus und starte kein Business für dich."
                            : "Diese Reihenfolge landet direkt auf deiner Heute-Seite.",
                        systemImage: "checkmark.shield.fill"
                    )
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(secondaryText)
                    .padding(.top, 24)
                }
                .transition(.opacity.combined(with: .scale(scale: 0.98)))
            } else {
                analysisView
            }
        }
    }

    private var analysisView: some View {
        VStack(alignment: .leading, spacing: 0) {
            ZStack {
                Circle()
                    .stroke(subtleBorder, lineWidth: 1)
                    .frame(width: 66, height: 66)
                    .scaleEffect(analysisPhase.isMultiple(of: 2) ? 1 : 1.12)
                MFLogo(size: 24)
            }
            .animation(.easeInOut(duration: 0.5), value: analysisPhase)

            Text("Einen Moment.\nIch sortiere das.")
                .font(.system(size: 34, weight: .bold))
                .foregroundStyle(primaryText)
                .padding(.top, 26)

            VStack(alignment: .leading, spacing: 16) {
                analysisLine("Vorhaben verstehen", complete: analysisPhase >= 1)
                analysisLine("Region und Branche einordnen", complete: analysisPhase >= 2)
                analysisLine("Ersten Ablauf bauen", complete: analysisPhase >= 3)
            }
            .padding(.top, 34)
        }
    }

    private var connectStep: some View {
        VStack(alignment: .leading, spacing: 0) {
            assistantMark
            question(
                "Soll ich in deinem Alltag mitarbeiten?",
                "Optional. Du kannst alles später im Profil verbinden oder wieder trennen.",
                helper: nil
            )

            VStack(spacing: 10) {
                integrationRow(.gmail)
                integrationRow(.googleCalendar)
            }
            .padding(.top, 30)

            if let message = state.integrationMessage, !message.isEmpty {
                Text(message)
                    .font(.system(size: 13))
                    .foregroundStyle(secondaryText)
                    .padding(.top, 16)
            }

            VStack(alignment: .leading, spacing: 8) {
                Label("Warum erst jetzt?", systemImage: "lock.shield.fill")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(primaryText)
                Text("Du hast zuerst gesehen, wofür matchfoundr die Zugriffe nutzt. Keine Verbindung ist nötig, um die App zu starten.")
                    .font(.system(size: 13))
                    .foregroundStyle(secondaryText)
                    .lineSpacing(3)
            }
            .padding(.top, 26)
        }
    }

    private var planStep: some View {
        VStack(alignment: .leading, spacing: 0) {
            assistantMark
            question(
                "Wie möchtest du starten?",
                "Die Kern-App bleibt in Standard nutzbar.",
                helper: nil
            )

            VStack(spacing: 12) {
                planChoice(
                    .standard,
                    title: "Standard",
                    price: "Kostenlos",
                    detail: "Startplan, Matching, Community, Kalender und begrenzte KI-Nutzung."
                )
                planChoice(
                    .pro,
                    title: "Pro",
                    price: "3 Tage kostenlos",
                    detail: "Persönlicher KI-Gründungscheck, mehr Co-Pilot-Nutzung und Hintergrundaufgaben."
                )
            }
            .padding(.top, 30)

            Text(selectedPlan == .pro
                 ? "Kein Kauf in diesem Schritt. Der KI-Check startet nach dem Öffnen der App."
                 : "Du kannst Pro später im Profil testen.")
                .font(.system(size: 12.5))
                .foregroundStyle(secondaryText)
                .lineSpacing(3)
                .padding(.top, 16)
        }
    }

    private var footer: some View {
        VStack(spacing: 0) {
            if step == .connect {
                Button("Ohne Verknüpfung weiter") {
                    advance()
                }
                .font(.system(size: 13.5, weight: .semibold))
                .foregroundStyle(secondaryText)
                .padding(.bottom, 10)
            }

            Button {
                if step == .plan {
                    finish()
                } else {
                    advance()
                }
            } label: {
                HStack(spacing: 8) {
                    Text(footerTitle)
                        .font(.system(size: 16.5, weight: .bold))
                    Image(systemName: step == .plan ? "checkmark" : "arrow.right")
                        .font(.system(size: 14, weight: .bold))
                }
                .foregroundStyle(canContinue ? .white : secondaryText.opacity(0.55))
                .frame(maxWidth: .infinity)
                .frame(height: 52)
                .background(canContinue ? MF.ember : subtleBorder)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
            .buttonStyle(.plain)
            .disabled(!canContinue)
        }
        .frame(maxWidth: 560)
        .padding(.horizontal, 20)
        .padding(.top, 10)
        .padding(.bottom, 8)
        .background(.ultraThinMaterial)
        .overlay(alignment: .top) {
            Rectangle()
                .fill(subtleBorder)
                .frame(height: 0.5)
        }
    }

    private var footerTitle: String {
        switch step {
        case .brief:
            "Werkzeuge einrichten"
        case .connect:
            "Weiter"
        case .plan:
            selectedPlan == .pro ? "Pro testen und starten" : "Kostenlos starten"
        default:
            "Weiter"
        }
    }

    private var assistantMark: some View {
        HStack(spacing: 9) {
            MFLogo(size: 19)
            Text("Co-Pilot")
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(secondaryText)
        }
        .padding(.bottom, 20)
    }

    private func question(_ title: String, _ subtitle: String, helper: String?) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(.system(size: 32, weight: .bold))
                .foregroundStyle(primaryText)
                .fixedSize(horizontal: false, vertical: true)

            Text(subtitle)
                .font(.system(size: 16))
                .foregroundStyle(secondaryText)
                .lineSpacing(3)
                .fixedSize(horizontal: false, vertical: true)

            if let helper {
                Text(helper)
                    .font(.system(size: 13.5, weight: .medium))
                    .foregroundStyle(MF.ember)
                    .lineSpacing(3)
                    .padding(.top, 2)
            }
        }
    }

    private func onboardingField(
        placeholder: String,
        text: Binding<String>,
        icon: String,
        field: InputField,
        capitalization: TextInputAutocapitalization
    ) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(focusedField == field ? MF.ember : secondaryText)
                .frame(width: 22)

            TextField(placeholder, text: text)
                .focused($focusedField, equals: field)
                .font(.system(size: 17, weight: .medium))
                .foregroundStyle(primaryText)
                .tint(MF.ember)
                .textInputAutocapitalization(capitalization)
                .submitLabel(.continue)
                .onSubmit {
                    if canContinue { advance() }
                }
        }
        .padding(.horizontal, 16)
        .frame(height: 56)
        .background(elevatedBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(focusedField == field ? MF.ember : subtleBorder, lineWidth: 1)
        )
    }

    private func choiceRow(
        icon: String,
        title: String,
        subtitle: String,
        selected: Bool,
        action: @escaping () -> Void
    ) -> some View {
        Button {
            Haptics.select()
            action()
        } label: {
            HStack(spacing: 14) {
                Image(systemName: icon)
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(selected ? .white : secondaryText)
                    .frame(width: 38, height: 38)
                    .background(selected ? MF.ember : subtleBorder)
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

                VStack(alignment: .leading, spacing: 3) {
                    Text(title)
                        .font(.system(size: 15.5, weight: .bold))
                        .foregroundStyle(primaryText)
                    Text(subtitle)
                        .font(.system(size: 13))
                        .foregroundStyle(secondaryText)
                        .fixedSize(horizontal: false, vertical: true)
                }

                Spacer(minLength: 8)

                Image(systemName: selected ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 21, weight: .medium))
                    .foregroundStyle(selected ? MF.ember : subtleBorder)
            }
            .padding(14)
            .background(elevatedBackground)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(selected ? MF.ember : subtleBorder, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }

    private func choiceChip(
        iconText: String?,
        title: String,
        selected: Bool,
        action: @escaping () -> Void
    ) -> some View {
        Button {
            Haptics.select()
            action()
        } label: {
            HStack(spacing: 7) {
                if let iconText {
                    Text(iconText)
                        .font(.system(size: 15))
                }
                Text(title)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(selected ? .white : primaryText)
                    .fixedSize(horizontal: true, vertical: false)
                if selected {
                    Image(systemName: "checkmark")
                        .font(.system(size: 10, weight: .heavy))
                        .foregroundStyle(.white)
                }
            }
            .padding(.horizontal, 13)
            .frame(height: 40)
            .background(selected ? MF.ember : elevatedBackground)
            .clipShape(Capsule())
            .overlay(Capsule().stroke(selected ? MF.ember : subtleBorder, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }

    private func iconChoiceChip(
        _ option: FocusOption,
        selected: Bool,
        action: @escaping () -> Void
    ) -> some View {
        Button {
            Haptics.select()
            action()
        } label: {
            HStack(spacing: 8) {
                Image(systemName: option.icon)
                    .font(.system(size: 13, weight: .semibold))
                Text(option.title)
                    .font(.system(size: 14, weight: .semibold))
                    .fixedSize(horizontal: true, vertical: false)
                if selected {
                    Image(systemName: "checkmark")
                        .font(.system(size: 10, weight: .heavy))
                }
            }
            .foregroundStyle(selected ? .white : primaryText)
            .padding(.horizontal, 13)
            .frame(height: 42)
            .background(selected ? MF.ember : elevatedBackground)
            .clipShape(Capsule())
            .overlay(Capsule().stroke(selected ? MF.ember : subtleBorder, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }

    private func analysisLine(_ text: String, complete: Bool) -> some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .stroke(complete ? Color(hex: 0x2E9B63) : subtleBorder, lineWidth: 1.5)
                    .frame(width: 24, height: 24)
                if complete {
                    Image(systemName: "checkmark")
                        .font(.system(size: 10, weight: .heavy))
                        .foregroundStyle(Color(hex: 0x2E9B63))
                }
            }
            Text(text)
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(complete ? primaryText : secondaryText)
        }
        .animation(.easeOut(duration: 0.24), value: complete)
    }

    private func briefRow(number: Int, item: BriefItem) -> some View {
        HStack(alignment: .top, spacing: 14) {
            ZStack {
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .fill(item.tint.opacity(colorScheme == .dark ? 0.22 : 0.12))
                    .frame(width: 40, height: 40)
                Image(systemName: item.icon)
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(item.tint)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("\(number). \(item.title)")
                    .font(.system(size: 15.5, weight: .bold))
                    .foregroundStyle(primaryText)
                Text(item.detail)
                    .font(.system(size: 13.5))
                    .foregroundStyle(secondaryText)
                    .lineSpacing(3)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(.vertical, 14)
    }

    private func integrationRow(_ provider: IntegrationProvider) -> some View {
        let account = state.connectedAccount(for: provider)
        let connected = account?.isConnected == true
        let busy = state.integrationBusyProvider == provider

        return HStack(spacing: 13) {
            Image(systemName: provider.icon)
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(connected ? Color(hex: 0x2E9B63) : secondaryText)
                .frame(width: 40, height: 40)
                .background(subtleBorder)
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

            VStack(alignment: .leading, spacing: 3) {
                Text(provider.label)
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(primaryText)
                Text(connected ? (account?.displayLabel ?? "Verbunden") : integrationPurpose(provider))
                    .font(.system(size: 12.5))
                    .foregroundStyle(secondaryText)
                    .lineLimit(2)
            }

            Spacer(minLength: 8)

            Button {
                Task {
                    if let url = await state.integrationConnectURL(for: provider) {
                        openURL(url)
                    }
                }
            } label: {
                Group {
                    if busy {
                        ProgressView()
                            .tint(MF.ember)
                    } else {
                        Text(connected ? "Verbunden" : "Verbinden")
                            .font(.system(size: 12.5, weight: .bold))
                            .foregroundStyle(connected ? Color(hex: 0x2E9B63) : .white)
                    }
                }
                .frame(width: 82, height: 34)
                .background(connected ? subtleBorder : MF.ember)
                .clipShape(Capsule())
            }
            .buttonStyle(.plain)
            .disabled(connected || busy)
        }
        .padding(13)
        .background(elevatedBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(subtleBorder, lineWidth: 1))
    }

    private func planChoice(
        _ choice: PlanChoice,
        title: String,
        price: String,
        detail: String
    ) -> some View {
        let selected = selectedPlan == choice
        return Button {
            Haptics.select()
            selectedPlan = choice
        } label: {
            HStack(alignment: .top, spacing: 13) {
                Image(systemName: selected ? "largecircle.fill.circle" : "circle")
                    .font(.system(size: 22))
                    .foregroundStyle(selected ? MF.ember : subtleBorder)

                VStack(alignment: .leading, spacing: 6) {
                    HStack(alignment: .firstTextBaseline) {
                        Text(title)
                            .font(.system(size: 17, weight: .bold))
                            .foregroundStyle(primaryText)
                        Spacer()
                        Text(price)
                            .font(.system(size: 13, weight: .bold))
                            .foregroundStyle(choice == .pro ? MF.ember : secondaryText)
                    }
                    Text(detail)
                        .font(.system(size: 13.5))
                        .foregroundStyle(secondaryText)
                        .lineSpacing(3)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            .padding(16)
            .background(elevatedBackground)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(selected ? MF.ember : subtleBorder, lineWidth: selected ? 1.5 : 1)
            )
        }
        .buttonStyle(.plain)
    }

    private var briefSummary: String {
        let industry = selectedIndustry?.label ?? "dein Bereich"
        let place = region.trimmingCharacters(in: .whitespacesAndNewlines)
        if mode == .skills {
            return "\(pitch.trimmingCharacters(in: .whitespacesAndNewlines)) · \(industry) · \(place). Daraus ergibt sich dieser erste Einsatzplan:"
        }
        return "\(pitch.trimmingCharacters(in: .whitespacesAndNewlines)) · \(industry) · \(place). Daraus ergibt sich diese erste Reihenfolge:"
    }

    private var startBrief: [BriefItem] {
        if mode == .skills {
            return [
                BriefItem(
                    icon: "text.quote",
                    tint: MF.ember,
                    title: "Angebot in einen klaren Satz bringen",
                    detail: "Aus deinem Können wird ein konkretes Ergebnis, das ein kleiner Betrieb sofort versteht."
                ),
                BriefItem(
                    icon: "scope",
                    tint: Color(hex: 0x3D63D8),
                    title: "Passende Vorhaben in \(cleanRegion) finden",
                    detail: "Nur Betriebe und Gründer anzeigen, zu denen Branche, Skills und Zeit wirklich passen."
                ),
                BriefItem(
                    icon: "paperplane.fill",
                    tint: Color(hex: 0x2E9B63),
                    title: "Erstes Gespräch vorbereiten",
                    detail: "Eine persönliche Nachricht mit klarem Nutzen statt einer allgemeinen Bewerbung."
                ),
            ]
        }

        let firstFocus = focusOptions.first { selectedFocus.contains($0.id) }
        let firstTitle = firstFocus.map { "\($0.title) konkret klären" } ?? "Nächsten Schritt festlegen"

        return [
            BriefItem(
                icon: firstFocus?.icon ?? "list.bullet.clipboard.fill",
                tint: MF.ember,
                title: firstTitle,
                detail: firstFocusDetail(firstFocus?.id)
            ),
            BriefItem(
                icon: "building.columns.fill",
                tint: Color(hex: 0x3D63D8),
                title: "\(localAuthorityLabel) und Pflichten prüfen",
                detail: "Für \(selectedIndustry?.label ?? "deine Branche") in \(cleanRegion), mit offiziellen Quellen statt allgemeiner Listen."
            ),
            BriefItem(
                icon: "person.2.fill",
                tint: Color(hex: 0x2E9B63),
                title: "Ein echtes Signal holen",
                detail: "Ein Kundengespräch, Partnerkontakt oder Testtermin zeigt schneller als Planung, was wirklich trägt."
            ),
        ]
    }

    private var cleanRegion: String {
        let clean = region.trimmingCharacters(in: .whitespacesAndNewlines)
        return clean.isEmpty ? "deiner Region" : clean
    }

    private var progressLabel: String {
        switch step {
        case .brief:
            "Plan"
        case .connect:
            "Optional"
        case .plan:
            "Start"
        default:
            "\(step.rawValue + 1)/\(Step.focus.rawValue + 1)"
        }
    }

    private var localAuthorityLabel: String {
        switch industryID {
        case "handwerk":
            return "Handwerkskammer"
        case "gastro", "lokal", "beauty":
            return "Gewerbeamt"
        case "gesundheit":
            return "Zulassung"
        default:
            return "IHK/Gewerbeamt"
        }
    }

    private func firstFocusDetail(_ id: String?) -> String {
        switch id {
        case "admin":
            "Anmeldung, Genehmigungen und regionale Ansprechpartner in die richtige Reihenfolge bringen."
        case "money":
            "Einmalkosten, laufende Kosten und Preisuntergrenze als erste belastbare Zahlen erfassen."
        case "customers":
            "Eine kleine Zielgruppe wählen und drei konkrete Gespräche vorbereiten."
        case "documents":
            "Das erste wirklich benötigte Dokument gemeinsam erstellen, statt sechs leere Vorlagen anzulegen."
        case "partner":
            "Klären, welche Lücke wirklich fehlt, bevor du wahllos nach einem Co-Founder suchst."
        default:
            "Aus der Idee wird ein überschaubarer Ablauf für die nächsten sieben Tage."
        }
    }

    private func integrationPurpose(_ provider: IntegrationProvider) -> String {
        switch provider {
        case .gmail:
            "Wichtige Mails und Entwürfe im Morgenbriefing"
        case .googleCalendar:
            "Termine vorbereiten und auf Bestätigung eintragen"
        case .whatsapp:
            "Nachrichten-Signale aus Kunden- und Team-Chats"
        }
    }

    private func availabilityIcon(_ value: Availability) -> String {
        switch value {
        case .fulltime:
            "sun.max.fill"
        case .parttime:
            "clock.fill"
        case .weekend:
            "moon.stars.fill"
        }
    }

    private func toggle(_ value: String, in selection: inout Set<String>, limit: Int) {
        if selection.contains(value) {
            selection.remove(value)
        } else if selection.count < limit {
            selection.insert(value)
        } else {
            Haptics.heavy()
        }
    }

    private func prefillNameIfNeeded() {
        guard !didPrefill else { return }
        didPrefill = true
        let suggested = state.authUser?.displayName.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        if !suggested.isEmpty, !suggested.contains("@") {
            name = suggested
        }
    }

    private func focusCurrentField() {
        focusedField = nil
        let target: InputField?
        switch step {
        case .name:
            target = .name
        case .description:
            target = .pitch
        case .location:
            target = .region
        default:
            target = nil
        }
        guard let target else { return }
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(280))
            focusedField = target
        }
    }

    private func advance() {
        guard canContinue else {
            Haptics.heavy()
            return
        }
        focusedField = nil
        guard let next = Step(rawValue: step.rawValue + 1) else { return }
        direction = 1
        Haptics.tap()
        withAnimation(.easeOut(duration: 0.28)) {
            step = next
        }
    }

    private func goBack() {
        guard let previous = Step(rawValue: step.rawValue - 1) else { return }
        focusedField = nil
        direction = -1
        Haptics.select()
        withAnimation(.easeOut(duration: 0.28)) {
            step = previous
        }
    }

    private func finish() {
        guard let mode,
              let industryID,
              let availability
        else {
            Haptics.heavy()
            return
        }

        let cleanName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        let cleanPitch = pitch.trimmingCharacters(in: .whitespacesAndNewlines)
        let cleanLocation = region.trimmingCharacters(in: .whitespacesAndNewlines)
        let profile = MyProfile(
            mode: mode,
            industryId: industryID,
            skills: selectedSkills.sorted(),
            name: cleanName,
            role: mode == .skills ? "Skill-Partner:in" : "Gründer:in",
            pitch: cleanPitch,
            plz: cleanLocation,
            availability: availability,
            birthdate: nil
        )

        let focusLabels = focusOptions
            .filter { selectedFocus.contains($0.id) }
            .map(\.title)
        state.mergeCopilotFacts([
            "Onboarding: Arbeitsmodus \(mode == .skills ? "Skill-Partner" : "eigenes Business").",
            "Onboarding: Der Co-Pilot soll zuerst bei \(focusLabels.joined(separator: ", ")) helfen.",
            "Onboarding: Verfügbare Zeit \(availability.label).",
        ])
        state.recordAchievement("Startprofil eingerichtet.")

        let usePro = selectedPlan == .pro
        if usePro {
            state.activateTrial(days: 3)
        }
        state.completeOnboarding(
            with: profile,
            launchAIAnalysis: usePro,
            showAppTourAfter: false
        )
    }
}

/// Einfaches Flow-Layout für Tags und kompakte Auswahl-Chips.
struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        layout(proposal: proposal, subviews: subviews).size
    }

    func placeSubviews(
        in bounds: CGRect,
        proposal: ProposedViewSize,
        subviews: Subviews,
        cache: inout ()
    ) {
        let result = layout(proposal: proposal, subviews: subviews)
        for (index, position) in result.positions.enumerated() {
            subviews[index].place(
                at: CGPoint(x: bounds.minX + position.x, y: bounds.minY + position.y),
                proposal: .unspecified
            )
        }
    }

    private func layout(
        proposal: ProposedViewSize,
        subviews: Subviews
    ) -> (size: CGSize, positions: [CGPoint]) {
        let proposedWidth = proposal.width ?? 0
        let hasFiniteWidth = proposedWidth.isFinite && proposedWidth > 0
        let maxWidth = hasFiniteWidth ? proposedWidth : CGFloat.greatestFiniteMagnitude
        var positions: [CGPoint] = []
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0
        var contentWidth: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > maxWidth, x > 0 {
                contentWidth = max(contentWidth, x - spacing)
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            positions.append(CGPoint(x: x, y: y))
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }

        contentWidth = max(contentWidth, x > 0 ? x - spacing : 0)
        return (
            CGSize(
                width: hasFiniteWidth ? proposedWidth : contentWidth,
                height: y + rowHeight
            ),
            positions
        )
    }
}
