// Onboarding — nach Design mfx-onboarding.jsx (Warm Signal, Ember, nativ):
// Welcome (schwebende Founder-Blasen) → Was baust du → Wen suchst du
// → Wo & Verfügbarkeit → Payoff mit echten Treffern.
// Verkauft Nutzen, sammelt das Nötigste, endet mit einem greifbaren Ergebnis.

import SwiftUI

struct OnboardingView: View {
    @EnvironmentObject var state: AppState
    @State private var step = 0

    @State private var industryId: String?
    @State private var roles: Set<String> = []
    @State private var region = "Köln"
    @State private var availability: Availability = .fulltime
    @State private var name = ""
    @State private var poppedBubble: Int?

    private let collectSteps = [1, 2, 3]

    private var canNext: Bool {
        switch step {
        case 1: industryId != nil
        case 2: !roles.isEmpty
        default: true
        }
    }

    var body: some View {
        ZStack {
            if step == 0 {
                welcome.transition(.opacity)
            } else if step == 4 {
                payoff.transition(.opacity)
            } else {
                collect.transition(.opacity)
            }
        }
        .animation(.easeOut(duration: 0.28), value: step)
    }

    private func next() {
        Haptics.tap()
        if step >= 4 { finish() } else { step += 1 }
    }

    private func back() {
        Haptics.select()
        if step > 0 { step -= 1 }
    }

    // ═══════════════════════════════════ STEP 0 — Welcome
    // [x, y, größe, name, alter, gründet]
    private let bubbles: [(CGFloat, CGFloat, CGFloat, String, Int, String)] = [
        (30, 110, 60, "Lisa", 23, "ein Kosmetikstudio"),
        (252, 158, 48, "Deniz", 29, "eine Buchungs-App"),
        (286, 282, 66, "Jonas", 34, "einen Elektrobetrieb"),
        (36, 340, 52, "Mara", 27, "ein Design-Studio"),
        (240, 442, 56, "Tim", 31, "Büro-Bowls"),
        (66, 505, 46, "Anna", 38, "eine Padelhalle"),
    ]

    private var welcome: some View {
        ZStack {
            MF.emberGrad.ignoresSafeArea()

            // schwebende Founder-Blasen — antippbar, verraten was hier entsteht
            ForEach(Array(bubbles.enumerated()), id: \.offset) { i, b in
                let on = poppedBubble == i
                FloatingBubble(index: i, size: b.2, initial: String(b.3.prefix(1)), active: on) {
                    Haptics.select()
                    withAnimation(.easeOut(duration: 0.18)) { poppedBubble = on ? nil : i }
                }
                .position(x: b.0 + b.2 / 2, y: b.1 + b.2 / 2)
            }
            if let i = poppedBubble {
                let b = bubbles[i]
                VStack(alignment: .leading, spacing: 1) {
                    Text("\(b.3), \(b.4)")
                        .font(.system(size: 14.5, weight: .heavy))
                        .foregroundStyle(Color(hex: 0x1A1A1A))
                    Text("gründet \(b.5)")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(MF.emberDeep)
                }
                .padding(.horizontal, 13)
                .padding(.vertical, 9)
                .background(.white)
                .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
                .shadow(color: .black.opacity(0.35), radius: 14, y: 8)
                .fixedSize()
                .position(x: min(max(b.0 + b.2 / 2, 90), 300), y: b.1 - 26)
                .transition(.scale(scale: 0.85).combined(with: .opacity))
            }

            VStack(alignment: .leading, spacing: 0) {
                Spacer()
                HStack(spacing: 0) {
                    Text("match").foregroundStyle(.white)
                    Text("foundr").foregroundStyle(.white.opacity(0.6))
                }
                .font(.system(size: 26, weight: .heavy))
                .tracking(-0.5)
                .padding(.bottom, 18)

                Text("Finde den Mitgründer, der wirklich passt.")
                    .font(.system(size: 38, weight: .heavy))
                    .tracking(-1)
                    .foregroundStyle(.white)
                    .fixedSize(horizontal: false, vertical: true)

                Text("Kein endloses Netzwerken — echte Treffer nach Skills, Vision und Werten. DACH-weit.")
                    .font(.system(size: 16.5))
                    .foregroundStyle(.white.opacity(0.9))
                    .lineSpacing(4)
                    .padding(.top, 16)
                    .frame(maxWidth: 320, alignment: .leading)

                Button {
                    next()
                } label: {
                    HStack(spacing: 8) {
                        Text("Los geht's").font(.system(size: 17, weight: .bold))
                        Image(systemName: "arrow.right").font(.system(size: 15, weight: .heavy))
                    }
                    .foregroundStyle(MF.emberDeep)
                    .frame(maxWidth: .infinity)
                    .frame(height: 54)
                    .background(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .shadow(color: .black.opacity(0.3), radius: 16, y: 10)
                }
                .buttonStyle(.plain)
                .padding(.top, 26)

                Button {
                    finish()
                } label: {
                    Text("Ich habe schon ein Konto")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(.white.opacity(0.9))
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.plain)
                .padding(.top, 14)
            }
            .padding(.horizontal, 30)
            .padding(.bottom, 34)
        }
    }

    // ═══════════════════════════════════ STEPS 1–3 — Collect
    private struct RoleOption: Identifiable {
        let id: String
        let icon: String
        let label: String
    }

    private let roleOptions: [RoleOption] = [
        .init(id: "ops", icon: "bolt.fill", label: "Macher fürs Operative"),
        .init(id: "sales", icon: "person.2.fill", label: "Vertrieb & Sales"),
        .init(id: "tech", icon: "square.grid.2x2.fill", label: "Technik & Produkt"),
        .init(id: "money", icon: "checkmark.seal.fill", label: "Finanzen & Zahlen"),
        .init(id: "brand", icon: "star.fill", label: "Design & Marke"),
        .init(id: "craft", icon: "book.fill", label: "Handwerk & Umsetzung"),
    ]

    private let regions = ["Köln", "Berlin", "München", "Hamburg", "Frankfurt", "Remote"]

    private var stepHead: (eyebrow: String, title: String, sub: String) {
        switch step {
        case 1: ("Schritt 1 von 3", "Was baust du gerade?", "Damit wir dich den richtigen Leuten zeigen.")
        case 2: ("Schritt 2 von 3", "Wen suchst du?", "Wähl bis zu drei — was deinem Team am meisten fehlt.")
        default: ("Schritt 3 von 3", "Wo & wie viel?", "Region und dein Einsatz für das Projekt.")
        }
    }

    private var collect: some View {
        VStack(spacing: 0) {
            topBar

            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    Text(stepHead.eyebrow)
                        .font(.mfMono(10))
                        .tracking(1.4)
                        .textCase(.uppercase)
                        .foregroundStyle(MF.ember)
                    Text(stepHead.title)
                        .font(.system(size: 27, weight: .heavy))
                        .tracking(-0.8)
                        .foregroundStyle(MF.ink)
                        .padding(.top, 8)
                    Text(stepHead.sub)
                        .font(.system(size: 15))
                        .foregroundStyle(MF.smoke)
                        .lineSpacing(3)
                        .padding(.top, 8)

                    if step == 1 { industryGrid.padding(.top, 22) }
                    if step == 2 { roleList.padding(.top, 22) }
                    if step == 3 { regionAndEffort.padding(.top, 4) }
                }
                .padding(.horizontal, 24)
                .padding(.top, 14)
                .padding(.bottom, 40)
            }
            .scrollIndicators(.hidden)
        }
        .background(MF.canvas.ignoresSafeArea())
        .safeAreaInset(edge: .bottom) { footer }
    }

    private var topBar: some View {
        HStack(spacing: 12) {
            Button { back() } label: {
                Image(systemName: "chevron.left")
                    .font(.system(size: 19, weight: .bold))
                    .foregroundStyle(MF.smoke)
                    .frame(width: 32, height: 32)
            }
            .buttonStyle(.plain)

            HStack(spacing: 6) {
                ForEach(collectSteps, id: \.self) { s in
                    Capsule()
                        .fill(s <= step ? MF.ember : MF.border)
                        .frame(height: 5)
                }
            }

            if step == 3 {
                Button { next() } label: {
                    Text("Überspringen")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(MF.smoke)
                }
                .buttonStyle(.plain)
            } else {
                Color.clear.frame(width: 32, height: 32)
            }
        }
        .padding(.horizontal, 14)
        .padding(.top, 8)
        .frame(minHeight: 44)
    }

    private var industryGrid: some View {
        LazyVGrid(columns: [GridItem(.flexible(), spacing: 11), GridItem(.flexible())], spacing: 11) {
            ForEach(industries) { ind in
                let on = industryId == ind.id
                Button {
                    Haptics.select()
                    industryId = ind.id
                } label: {
                    VStack(alignment: .leading, spacing: 12) {
                        Text(ind.emoji)
                            .font(.system(size: 22))
                            .frame(width: 42, height: 42)
                            .background(on ? MF.surface : MF.canvas)
                            .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
                        Text(ind.label)
                            .font(.system(size: 14.5, weight: .bold))
                            .foregroundStyle(on ? MF.emberDeep : MF.ink)
                            .multilineTextAlignment(.leading)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(14)
                    .background(on ? MF.emberTint : MF.surface)
                    .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 18)
                            .stroke(on ? MF.ember : MF.border, lineWidth: 1.5)
                    )
                }
                .buttonStyle(.plain)
            }
        }
    }

    private var roleList: some View {
        VStack(spacing: 10) {
            ForEach(roleOptions) { r in
                let on = roles.contains(r.id)
                Button {
                    Haptics.select()
                    if on { roles.remove(r.id) } else if roles.count < 3 { roles.insert(r.id) }
                } label: {
                    HStack(spacing: 13) {
                        Image(systemName: r.icon)
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundStyle(on ? MF.emberDeep : MF.smoke)
                            .frame(width: 40, height: 40)
                            .background(on ? MF.surface : MF.canvas)
                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                        Text(r.label)
                            .font(.system(size: 15.5, weight: .bold))
                            .foregroundStyle(on ? MF.emberDeep : MF.ink)
                        Spacer(minLength: 0)
                        ZStack {
                            if on {
                                Circle().fill(MF.ember).frame(width: 24, height: 24)
                                Image(systemName: "checkmark")
                                    .font(.system(size: 12, weight: .heavy))
                                    .foregroundStyle(.white)
                            } else {
                                Circle().stroke(MF.border, lineWidth: 2).frame(width: 24, height: 24)
                            }
                        }
                    }
                    .padding(.horizontal, 15)
                    .padding(.vertical, 13)
                    .background(on ? MF.emberTint : MF.surface)
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 16).stroke(on ? MF.ember : MF.border, lineWidth: 1.5))
                }
                .buttonStyle(.plain)
            }
        }
    }

    private var regionAndEffort: some View {
        VStack(alignment: .leading, spacing: 0) {
            sectionLabel("Dein Name")
            TextField("Wie sollen wir dich nennen?", text: $name)
                .font(.system(size: 15))
                .padding(.horizontal, 15)
                .frame(height: 48)
                .background(MF.surface)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 14).stroke(MF.border, lineWidth: 1.5))

            sectionLabel("Deine Region")
            FlowLayout(spacing: 9) {
                ForEach(regions, id: \.self) { r in
                    let on = region == r
                    Button {
                        Haptics.select()
                        region = r
                    } label: {
                        HStack(spacing: 6) {
                            if on {
                                Image(systemName: "mappin").font(.system(size: 12, weight: .bold))
                            }
                            Text(r).font(.system(size: 14.5, weight: .semibold))
                        }
                        .foregroundStyle(on ? .white : MF.ink)
                        .padding(.horizontal, 17)
                        .padding(.vertical, 10)
                        .background(on ? AnyShapeStyle(MF.emberGrad) : AnyShapeStyle(MF.surface))
                        .clipShape(Capsule())
                        .overlay(Capsule().stroke(on ? Color.clear : MF.border, lineWidth: 1.5))
                    }
                    .buttonStyle(.plain)
                }
            }

            sectionLabel("Dein Einsatz")
            HStack(spacing: 9) {
                effortChip("Vollzeit", .fulltime)
                effortChip("Teilzeit", .parttime)
                effortChip("Nebenbei", .weekend)
            }
        }
    }

    private func sectionLabel(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 13, weight: .bold))
            .foregroundStyle(MF.smoke)
            .padding(.top, 26)
            .padding(.bottom, 12)
    }

    private func effortChip(_ label: String, _ value: Availability) -> some View {
        let on = availability == value
        return Button {
            Haptics.select()
            availability = value
        } label: {
            Text(label)
                .font(.system(size: 14.5, weight: .bold))
                .foregroundStyle(on ? MF.ember : MF.ink)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(on ? MF.emberTint : MF.surface)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 14).stroke(on ? MF.ember : MF.border, lineWidth: 1.5))
        }
        .buttonStyle(.plain)
    }

    private var footer: some View {
        Button {
            next()
        } label: {
            HStack(spacing: 8) {
                Text(step == 3 ? "Profil erstellen" : "Weiter")
                    .font(.system(size: 17, weight: .bold))
                if canNext {
                    Image(systemName: "arrow.right").font(.system(size: 15, weight: .heavy))
                }
            }
            .foregroundStyle(canNext ? .white : MF.faint)
            .frame(maxWidth: .infinity)
            .frame(height: 54)
            .background(canNext ? AnyShapeStyle(MF.emberGrad) : AnyShapeStyle(MF.surfaceSoft))
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        }
        .buttonStyle(.plain)
        .disabled(!canNext)
        .padding(.horizontal, 22)
        .padding(.top, 14)
        .padding(.bottom, 8)
        .background(
            LinearGradient(colors: [MF.canvas.opacity(0), MF.canvas, MF.canvas],
                           startPoint: .top, endPoint: .bottom)
        )
    }

    // ═══════════════════════════════════ STEP 4 — Payoff
    private var payoff: some View {
        VStack(spacing: 0) {
            topBar

            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 20, style: .continuous)
                            .fill(MF.emberGrad)
                            .frame(width: 64, height: 64)
                            .emberGlow()
                        Image(systemName: "checkmark")
                            .font(.system(size: 30, weight: .heavy))
                            .foregroundStyle(.white)
                    }

                    Text("Dein Profil steht.\n\(payoffHits.count) passen schon zu dir.")
                        .font(.system(size: 30, weight: .heavy))
                        .tracking(-1)
                        .foregroundStyle(MF.ink)
                        .padding(.top, 20)

                    Text("Basierend auf \(selectedIndustry?.label ?? "deiner Branche") in \(region). Schau sie dir an — der Rest kommt täglich dazu.")
                        .font(.system(size: 15.5))
                        .foregroundStyle(MF.smoke)
                        .lineSpacing(3)
                        .padding(.top, 12)

                    VStack(spacing: 11) {
                        ForEach(payoffHits) { card in
                            HStack(spacing: 13) {
                                MFAvatar(name: card.name, service: "cofounder", size: 48)
                                VStack(alignment: .leading, spacing: 1) {
                                    Text(card.name)
                                        .font(.system(size: 15.5, weight: .bold))
                                        .foregroundStyle(MF.ink)
                                    Text("\(card.role) · \(card.city)")
                                        .font(.system(size: 13))
                                        .foregroundStyle(MF.smoke)
                                        .lineLimit(1)
                                }
                                Spacer(minLength: 0)
                                Text("\(card.matchPercent)%")
                                    .font(.system(size: 13, weight: .bold))
                                    .foregroundStyle(MF.emberDeep)
                                    .padding(.horizontal, 11)
                                    .padding(.vertical, 6)
                                    .background(MF.emberTint)
                                    .clipShape(Capsule())
                            }
                            .padding(13)
                            .background(MF.surface)
                            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                            .overlay(RoundedRectangle(cornerRadius: 16).stroke(MF.border, lineWidth: 1))
                            .warmShadow()
                        }
                    }
                    .padding(.top, 24)
                }
                .padding(.horizontal, 24)
                .padding(.top, 8)
                .padding(.bottom, 40)
            }
            .scrollIndicators(.hidden)
        }
        .background(MF.canvas.ignoresSafeArea())
        .safeAreaInset(edge: .bottom) {
            Button {
                finish()
            } label: {
                HStack(spacing: 8) {
                    Text("Zu meinen Treffern").font(.system(size: 17, weight: .bold))
                    Image(systemName: "arrow.right").font(.system(size: 15, weight: .heavy))
                }
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .frame(height: 54)
                .background(MF.emberGrad)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                .emberGlow()
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 22)
            .padding(.vertical, 14)
            .background(
                LinearGradient(colors: [MF.canvas.opacity(0), MF.canvas, MF.canvas],
                               startPoint: .top, endPoint: .bottom)
            )
        }
    }

    private var selectedIndustry: Industry? {
        industries.first { $0.id == industryId }
    }

    private var payoffHits: [FounderCard] {
        if !state.deck.isEmpty { return Array(state.deck.prefix(3)) }
        // Deck kommt erst nach dem Onboarding — bis dahin passende Beispiel-Treffer.
        return [
            FounderCard(id: "onb-1", name: "Deniz Kaya", role: "Entwickler", city: "Frankfurt", pitch: "", skills: [], industryId: industryId ?? "agentur", availability: .fulltime, matchPercent: 91),
            FounderCard(id: "onb-2", name: "Lena Hoffmann", role: "Vertrieb", city: region, pitch: "", skills: [], industryId: industryId ?? "handel", availability: .parttime, matchPercent: 87),
            FounderCard(id: "onb-3", name: "Jonas Weber", role: "Meister im Betrieb", city: "Köln", pitch: "", skills: [], industryId: industryId ?? "handwerk", availability: .fulltime, matchPercent: 84),
        ]
    }

    // ═══════════════════════════════════ Abschluss
    private func finish() {
        let roleLabels = roleOptions.filter { roles.contains($0.id) }.map(\.label)
        let profile = MyProfile(
            mode: .idea,
            industryId: industryId ?? industries[0].id,
            skills: roleLabels.isEmpty ? ["Organisation"] : roleLabels,
            name: name.trimmingCharacters(in: .whitespaces).isEmpty
                ? "Founder"
                : name.trimmingCharacters(in: .whitespaces),
            role: "Gründer:in",
            pitch: "",
            plz: region,
            availability: availability
        )
        Haptics.success()
        state.completeOnboarding(with: profile, launchAIAnalysis: false)
    }
}

// ─── Bausteine ───────────────────────────────────────────────

/// Schwebende Founder-Blase auf dem Welcome-Screen.
private struct FloatingBubble: View {
    let index: Int
    let size: CGFloat
    let initial: String
    let active: Bool
    let onTap: () -> Void
    @State private var drift = false

    var body: some View {
        Button(action: onTap) {
            Text(initial)
                .font(.system(size: size * 0.34, weight: .heavy))
                .foregroundStyle(.white)
                .frame(width: size, height: size)
                .background(.white.opacity(active ? 0.32 : 0.16))
                .clipShape(Circle())
                .overlay(Circle().stroke(.white.opacity(active ? 0.85 : 0.4), lineWidth: 1.5))
                .shadow(color: active ? .black.opacity(0.35) : .clear, radius: 12, y: 8)
        }
        .buttonStyle(.plain)
        .offset(y: drift ? -10 : 4)
        .animation(
            .easeInOut(duration: 3.4 + Double(index) * 0.5).repeatForever(autoreverses: true),
            value: drift
        )
        .onAppear { drift = true }
    }
}

/// Einfaches Flow-Layout für Tag-Wolken (wird app-weit genutzt).
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
