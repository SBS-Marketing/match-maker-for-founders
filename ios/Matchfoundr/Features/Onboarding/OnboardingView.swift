// Onboarding — 3 Screens, unter 90 Sekunden, dann direkt ins Dashboard.
// Dunkler Auftritt (Ink) mit Ember-Akzent — der erste Eindruck.

import SwiftUI

struct OnboardingView: View {
    @EnvironmentObject var state: AppState
    @State private var step = 0
    @State private var buildingPlan = false

    @State private var mode: FounderMode?
    @State private var industryId: String?
    @State private var skills: Set<String> = []
    @State private var name = ""
    @State private var role = ""
    @State private var pitch = ""
    @State private var plz = ""
    @State private var availability: Availability?
    @State private var selectedPlan: OnboardingPlan = .standard

    private var canNext: Bool {
        switch step {
        case 0: mode != nil
        case 1: industryId != nil && !skills.isEmpty
        case 2: name.count > 1 && role.count > 1 && availability != nil
        default: true
        }
    }

    private var selectedIndustry: Industry? {
        industries.first { $0.id == industryId }
    }

    var body: some View {
        ZStack {
            VStack(spacing: 0) {
                header
                TabView(selection: $step) {
                    stepMode.tag(0)
                    stepIndustry.tag(1)
                    stepProfile.tag(2)
                    stepPlan.tag(3)
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
                .animation(.easeOut(duration: 0.28), value: step)
                footer
            }
            .disabled(buildingPlan)
            .blur(radius: buildingPlan ? 2 : 0)

            if buildingPlan {
                planOverlay
                    .transition(.scale(scale: 0.96).combined(with: .opacity))
            }
        }
        .background(MF.ink.ignoresSafeArea())
        .animation(.easeOut(duration: 0.25), value: buildingPlan)
    }

    // ─── Kopf: Marke + Fortschritt ───────────────────────────
    private var header: some View {
        HStack {
            HStack(spacing: 2) {
                Text("matchfoundr").font(.system(size: 17, weight: .bold)).foregroundStyle(.white)
                Text(".").font(.system(size: 17, weight: .bold)).foregroundStyle(MF.ember)
            }
            Spacer()
            HStack(spacing: 6) {
                ForEach(0..<4) { i in
                    Capsule()
                        .fill(i <= step ? MF.ember : .white.opacity(0.2))
                        .frame(width: i == step ? 22 : 8, height: 6)
                        .animation(.easeOut(duration: 0.25), value: step)
                }
            }
        }
        .padding(.horizontal, 22)
        .padding(.top, 10)
    }

    // ─── Schritt 1: Modus ────────────────────────────────────
    private var stepMode: some View {
        VStack(alignment: .leading, spacing: 24) {
            Spacer()
            Text("Womit startest du?")
                .font(.system(size: 30, weight: .bold))
                .foregroundStyle(.white)
            copilotBriefing
            VStack(spacing: 12) {
                modeCard(.skills, icon: "wrench.and.screwdriver.fill",
                         title: "Ich biete Skills",
                         sub: "Ich kann etwas — und suche ein Vorhaben oder Menschen, die mich brauchen.")
                modeCard(.idea, icon: "lightbulb.fill",
                         title: "Ich habe eine Idee",
                         sub: "Ich will etwas aufbauen — und suche Menschen, die mitmachen.")
            }
            Spacer()
            Spacer()
        }
        .padding(.horizontal, 22)
    }

    private func modeCard(_ m: FounderMode, icon: String, title: String, sub: String) -> some View {
        let active = mode == m
        return Button {
            Haptics.select()
            mode = m
        } label: {
            HStack(alignment: .top, spacing: 16) {
                Image(systemName: icon)
                    .font(.system(size: 19, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 46, height: 46)
                    .background(active ? AnyShapeStyle(MF.emberGrad) : AnyShapeStyle(.white.opacity(0.1)))
                    .clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))
                VStack(alignment: .leading, spacing: 4) {
                    Text(title).font(.system(size: 17, weight: .semibold)).foregroundStyle(.white)
                    Text(sub).font(.system(size: 13.5)).foregroundStyle(.white.opacity(0.6))
                        .multilineTextAlignment(.leading)
                }
                Spacer(minLength: 0)
            }
            .padding(18)
            .background(active ? MF.ember.opacity(0.16) : .white.opacity(0.05))
            .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 22, style: .continuous)
                .stroke(active ? MF.ember : .white.opacity(0.12), lineWidth: 1.5))
            .scaleEffect(active ? 1.01 : 1)
            .animation(.easeOut(duration: 0.2), value: active)
        }
        .buttonStyle(.plain)
    }

    // ─── Schritt 2: Branche & Skills ─────────────────────────
    private var stepIndustry: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Text("Deine Welt.")
                    .font(.system(size: 30, weight: .bold))
                    .foregroundStyle(.white)
                    .padding(.top, 24)

                copilotBriefing

                VStack(alignment: .leading, spacing: 10) {
                    Eyebrow(text: "Branche", color: .white.opacity(0.45))
                    LazyVGrid(columns: [.init(.flexible(), spacing: 8), .init(.flexible())], spacing: 8) {
                        ForEach(industries) { ind in
                            darkChoice(active: industryId == ind.id, minHeight: 54) {
                                Haptics.select(); industryId = ind.id
                            } content: {
                                HStack(spacing: 9) {
                                    Text(ind.emoji).font(.system(size: 17))
                                    Text(ind.label)
                                        .font(.system(size: 12.5, weight: .semibold))
                                        .foregroundStyle(.white)
                                        .multilineTextAlignment(.leading)
                                    Spacer(minLength: 0)
                                }
                            }
                        }
                    }
                }

                VStack(alignment: .leading, spacing: 10) {
                    Eyebrow(text: mode == .skills ? "Das kann ich" : "Das brauche ich",
                            color: .white.opacity(0.45))
                    FlowLayout(spacing: 8) {
                        ForEach(skillTags, id: \.self) { tag in
                            let active = skills.contains(tag)
                            Button {
                                Haptics.select()
                                if active { skills.remove(tag) } else { skills.insert(tag) }
                            } label: {
                                Text(tag)
                                    .font(.system(size: 13, weight: .medium))
                                    .foregroundStyle(active ? .white : .white.opacity(0.85))
                                    .padding(.horizontal, 16)
                                    .frame(height: 44)
                                    .background(active ? AnyShapeStyle(MF.ember) : AnyShapeStyle(.white.opacity(0.05)))
                                    .clipShape(Capsule())
                                    .overlay(Capsule().stroke(active ? MF.ember : .white.opacity(0.14), lineWidth: 1))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                Spacer(minLength: 20)
            }
            .padding(.horizontal, 22)
        }
        .scrollIndicators(.hidden)
    }

    private func darkChoice<C: View>(active: Bool, minHeight: CGFloat,
                                     action: @escaping () -> Void,
                                     @ViewBuilder content: () -> C) -> some View {
        Button(action: action) {
            content()
                .padding(.horizontal, 14)
                .frame(maxWidth: .infinity, minHeight: minHeight)
                .background(active ? MF.ember.opacity(0.16) : .white.opacity(0.05))
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(active ? MF.ember : .white.opacity(0.12), lineWidth: 1.2))
        }
        .buttonStyle(.plain)
    }

    // ─── Schritt 3: Kurzprofil ───────────────────────────────
    private var stepProfile: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                Text("Fast geschafft.")
                    .font(.system(size: 30, weight: .bold))
                    .foregroundStyle(.white)
                    .padding(.top, 24)

                copilotBriefing

                field("Dein Name") {
                    darkTextField("Vorname reicht", text: $name)
                }
                field(mode == .skills ? "Deine Rolle" : "Deine Rolle im Vorhaben") {
                    darkTextField(mode == .skills ? "z.B. Elektriker, Designerin" : "z.B. Gründerin, Macher", text: $role)
                }
                field("Dein Pitch in einem Satz", hint: "\(pitch.count)/140") {
                    darkTextField(mode == .skills
                        ? "Ich baue Websites, die Handwerkern Kunden bringen."
                        : "Ich eröffne eine Padelhalle in Köln.", text: $pitch, axis: .vertical)
                        .onChange(of: pitch) { _, v in if v.count > 140 { pitch = String(v.prefix(140)) } }
                }
                field("PLZ") {
                    darkTextField("50667", text: $plz)
                        .onChange(of: plz) { _, v in
                            plz = String(v.filter(\.isNumber).prefix(5))
                        }
                }
                field("Verfügbarkeit") {
                    VStack(spacing: 8) {
                        ForEach(Availability.allCases, id: \.self) { a in
                            darkChoice(active: availability == a, minHeight: 54) {
                                Haptics.select(); availability = a
                            } content: {
                                HStack {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(a.label).font(.system(size: 14, weight: .semibold)).foregroundStyle(.white)
                                        Text(a.sub).font(.system(size: 12)).foregroundStyle(.white.opacity(0.55))
                                    }
                                    Spacer()
                                    if availability == a {
                                        Image(systemName: "checkmark").font(.system(size: 13, weight: .bold))
                                            .foregroundStyle(MF.ember)
                                    }
                                }
                            }
                        }
                    }
                }
                Spacer(minLength: 16)
            }
            .padding(.horizontal, 22)
        }
        .scrollIndicators(.hidden)
        .scrollDismissesKeyboard(.interactively)
    }

    private var stepPlan: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                Text("Wie willst du starten?")
                    .font(.system(size: 30, weight: .bold))
                    .foregroundStyle(.white)
                    .padding(.top, 24)

                copilotBriefing

                VStack(spacing: 12) {
                    planCard(
                        plan: .standard,
                        title: "Standard",
                        price: "Kostenlos",
                        subtitle: "Profil, Matching, Kalender und kleine KI-Hilfe.",
                        bullets: ["2.000 KI-Tokens pro Tag", "8.000 KI-Tokens pro Woche", "Basis-Co-Pilot ohne tiefe Analyse"]
                    )
                    planCard(
                        plan: .pro,
                        title: "Pro",
                        price: "3 Tage kostenlos testen",
                        subtitle: "KI-Gründeranalyse, mehr Kontext und höhere Limits.",
                        bullets: ["25.000 KI-Tokens pro Tag", "120.000 KI-Tokens pro Woche", "KI-Analyse direkt nach dem Onboarding"]
                    )
                }

                aiAnalysisGate
                Spacer(minLength: 16)
            }
            .padding(.horizontal, 22)
        }
        .scrollIndicators(.hidden)
    }

    private func planCard(
        plan: OnboardingPlan,
        title: String,
        price: String,
        subtitle: String,
        bullets: [String]
    ) -> some View {
        let active = selectedPlan == plan
        return Button {
            Haptics.select()
            selectedPlan = plan
        } label: {
            VStack(alignment: .leading, spacing: 13) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(title)
                            .font(.system(size: 18, weight: .heavy))
                            .foregroundStyle(.white)
                        Text(price)
                            .font(.system(size: 13, weight: .bold))
                            .foregroundStyle(plan == .pro ? MF.ember : .white.opacity(0.72))
                    }
                    Spacer()
                    Image(systemName: active ? "checkmark.circle.fill" : "circle")
                        .font(.system(size: 21, weight: .semibold))
                        .foregroundStyle(active ? MF.ember : .white.opacity(0.42))
                }

                Text(subtitle)
                    .font(.system(size: 13.5))
                    .foregroundStyle(.white.opacity(0.66))
                    .fixedSize(horizontal: false, vertical: true)

                VStack(alignment: .leading, spacing: 8) {
                    ForEach(bullets, id: \.self) { bullet in
                        HStack(spacing: 8) {
                            Image(systemName: "checkmark")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundStyle(plan == .pro ? MF.ember : .white.opacity(0.7))
                                .frame(width: 18, height: 18)
                                .background(.white.opacity(0.08))
                                .clipShape(Circle())
                            Text(bullet)
                                .font(.system(size: 12.5, weight: .semibold))
                                .foregroundStyle(.white.opacity(0.78))
                        }
                    }
                }
            }
            .padding(17)
            .background(active ? MF.ember.opacity(plan == .pro ? 0.18 : 0.11) : .white.opacity(0.05))
            .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 20).stroke(active ? MF.ember : .white.opacity(0.12), lineWidth: active ? 1.5 : 1))
        }
        .buttonStyle(.plain)
    }

    private var aiAnalysisGate: some View {
        let pro = selectedPlan == .pro
        return HStack(alignment: .top, spacing: 12) {
            Image(systemName: pro ? "sparkles" : "lock.fill")
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 36, height: 36)
                .background(pro ? AnyShapeStyle(MF.indigoGrad) : AnyShapeStyle(.white.opacity(0.12)))
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            VStack(alignment: .leading, spacing: 5) {
                Text("KI-Gründeranalyse")
                    .font(.system(size: 14.5, weight: .bold))
                    .foregroundStyle(.white)
                Text(pro
                     ? "Nach dem Start analysiere ich dein Vorhaben, Risiken, Team-Lücke und nächste App-Aktionen."
                     : "Diese tiefere Analyse ist Pro. Standard startet ohne Analyse, du kannst später im Profil upgraden.")
                    .font(.system(size: 12.5))
                    .foregroundStyle(.white.opacity(0.64))
                    .lineSpacing(2)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 0)
        }
        .padding(14)
        .background(.white.opacity(0.06))
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(.white.opacity(0.12), lineWidth: 1))
    }

    private func field<C: View>(_ label: String, hint: String? = nil, @ViewBuilder content: () -> C) -> some View {
        VStack(alignment: .leading, spacing: 7) {
            HStack {
                Eyebrow(text: label, color: .white.opacity(0.45))
                Spacer()
                if let hint { Eyebrow(text: hint, color: .white.opacity(0.35)) }
            }
            content()
        }
    }

    private func darkTextField(_ placeholder: String, text: Binding<String>, axis: Axis = .horizontal) -> some View {
        TextField("", text: text, axis: axis)
            .font(.system(size: 15))
            .foregroundStyle(.white)
            .tint(MF.ember)
            .submitLabel(axis == .vertical ? .return : .done)
            .padding(.horizontal, 14)
            .padding(.vertical, 13)
            .background(.white.opacity(0.06))
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).stroke(.white.opacity(0.14), lineWidth: 1))
            .overlay(alignment: axis == .vertical ? .topLeading : .leading) {
                if text.wrappedValue.isEmpty {
                    Text(placeholder)
                        .font(.system(size: 15))
                        .foregroundStyle(.white.opacity(0.35))
                        .padding(.horizontal, 14)
                        .padding(.vertical, axis == .vertical ? 13 : 0)
                        .allowsHitTesting(false)
                }
            }
    }

    private var copilotBriefing: some View {
        let briefing = copilotBriefingCopy
        return HStack(alignment: .top, spacing: 12) {
            Image(systemName: "sparkles")
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 34, height: 34)
                .background(MF.indigoGrad)
                .clipShape(RoundedRectangle(cornerRadius: 11, style: .continuous))
            VStack(alignment: .leading, spacing: 4) {
                Text(briefing.title)
                    .font(.system(size: 13.5, weight: .bold))
                    .foregroundStyle(.white)
                Text(briefing.text)
                    .font(.system(size: 12.5))
                    .foregroundStyle(.white.opacity(0.64))
                    .lineSpacing(2)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 0)
        }
        .padding(14)
        .background(.white.opacity(0.06))
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(.white.opacity(0.12), lineWidth: 1))
    }

    private var copilotBriefingCopy: (title: String, text: String) {
        switch step {
        case 0:
            let modeText = mode == .skills ? "Skills-Profil" : mode == .idea ? "Founder-Profil" : "deinen Startpunkt"
            return (
                "Co-Pilot-Briefing",
                "Ich merke mir \(modeText) und baue daraus nach dem Onboarding erste Schritte, Match-Logik und Workspace-Kontext."
            )
        case 1:
            if let selectedIndustry {
                let skillText = skills.isEmpty ? "Wähle gleich noch deine stärksten Signale." : "\(skills.count) Skills fließen schon ein."
                return (
                    "\(selectedIndustry.ventureTerm)-Kontext",
                    "\(selectedIndustry.copilotContext) \(skillText)"
                )
            }
            return (
                "Branche macht den Plan genauer",
                "Je nach Feld spreche ich anders: Handwerk braucht andere Schritte als SaaS, Gastro oder Beratung."
            )
        case 2:
            let idea = pitch.trimmingCharacters(in: .whitespacesAndNewlines)
            return (
                "Aus Antworten wird ein Plan",
                idea.isEmpty
                    ? "Name, Rolle, Ort und Verfügbarkeit werden gleich in Kalender, Firmenprofil und Unterlagen übersetzt."
                    : "Ich nutze „\(idea)” gleich als Kern für Founder-Memory, Firmenprofil und erste Kalender-Schritte."
            )
        default:
            return (
                "Standard oder Pro",
                "Standard begrenzt KI bewusst klein. Pro startet mit 3 Tagen kostenlos und schaltet die KI-Gründeranalyse plus höhere Tages- und Wochenlimits frei."
            )
        }
    }

    private var planOverlay: some View {
        VStack(spacing: 16) {
            Image(systemName: "sparkles")
                .font(.system(size: 26, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 68, height: 68)
                .background(MF.indigoGrad)
                .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
                .indigoGlow()
            VStack(spacing: 7) {
                Text(selectedPlan == .pro ? "KI-Analyse wird vorbereitet" : "Co-Pilot erstellt deinen Plan")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(MF.ink)
                Text(selectedPlan == .pro
                     ? "Dein Pro-Trial startet und der Co-Pilot analysiert Vorhaben, Risiken, Team-Lücke und nächste Schritte."
                     : "Founder-Memory, Kalender, Firmenprofil und Unterlagen werden aus deinen Antworten vorbereitet.")
                    .font(.system(size: 13.5))
                    .foregroundStyle(MF.smoke)
                    .multilineTextAlignment(.center)
                    .lineSpacing(3)
            }
            ProgressView()
                .tint(MF.indigo)
                .padding(.top, 2)
        }
        .padding(22)
        .frame(maxWidth: 320)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 24).stroke(MF.border, lineWidth: 1))
        .warmShadow(large: true)
        .padding(24)
    }

    // ─── Fußzeile ────────────────────────────────────────────
    private var footer: some View {
        HStack(spacing: 12) {
            if step > 0 {
                Button {
                    Haptics.tap()
                    step -= 1
                } label: {
                    Image(systemName: "arrow.left")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(.white.opacity(0.7))
                        .frame(width: 50, height: 50)
                        .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .stroke(.white.opacity(0.15), lineWidth: 1))
                }
                .buttonStyle(.plain)
            }
            Button {
                Haptics.tap()
                if step < 3 { step += 1 } else { finish() }
            } label: {
                HStack(spacing: 8) {
                    Text(step < 3 ? "Weiter" : selectedPlan == .pro ? "Analyse starten" : "Standard starten")
                        .font(.system(size: 15.5, weight: .semibold))
                    Image(systemName: "arrow.right").font(.system(size: 13, weight: .semibold))
                }
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .frame(height: 50)
                .background(MF.emberGrad)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                .opacity(canNext && !buildingPlan ? 1 : 0.4)
            }
            .buttonStyle(.plain)
            .disabled(!canNext || buildingPlan)
            .emberGlow()
        }
        .padding(.horizontal, 22)
        .padding(.bottom, 12)
        .padding(.top, 8)
    }

    private func finish() {
        guard let mode, let industryId, let availability else { return }
        let profile = MyProfile(
            mode: mode, industryId: industryId, skills: Array(skills),
            name: name.trimmingCharacters(in: .whitespaces),
            role: role.trimmingCharacters(in: .whitespaces),
            pitch: pitch.trimmingCharacters(in: .whitespaces),
            plz: plz, availability: availability)
        buildingPlan = true
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(900))
            if selectedPlan == .pro {
                state.activateTrial(days: 3)
            }
            state.completeOnboarding(with: profile, launchAIAnalysis: selectedPlan == .pro)
        }
    }
}

private enum OnboardingPlan {
    case standard, pro
}

/// Einfaches Flow-Layout für Tag-Wolken.
struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        layout(proposal: proposal, subviews: subviews).size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = layout(proposal: proposal, subviews: subviews)
        for (idx, pos) in result.positions.enumerated() {
            subviews[idx].place(at: CGPoint(x: bounds.minX + pos.x, y: bounds.minY + pos.y),
                                proposal: .unspecified)
        }
    }

    private func layout(proposal: ProposedViewSize, subviews: Subviews) -> (size: CGSize, positions: [CGPoint]) {
        let proposedWidth = proposal.width ?? 0
        let hasFiniteWidth = proposedWidth.isFinite && proposedWidth > 0
        let maxWidth = hasFiniteWidth ? proposedWidth : CGFloat.greatestFiniteMagnitude
        var positions: [CGPoint] = []
        var x: CGFloat = 0, y: CGFloat = 0, rowHeight: CGFloat = 0
        var contentWidth: CGFloat = 0
        for sub in subviews {
            let size = sub.sizeThatFits(.unspecified)
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
        return (CGSize(width: hasFiniteWidth ? proposedWidth : contentWidth, height: y + rowHeight), positions)
    }
}
