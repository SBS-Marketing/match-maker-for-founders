// Onboarding — 3 Screens, unter 90 Sekunden, dann direkt ins Dashboard.
// Dunkler Auftritt (Ink) mit Ember-Akzent — der erste Eindruck.

import SwiftUI

struct OnboardingView: View {
    @EnvironmentObject var state: AppState
    @State private var step = 0

    @State private var mode: FounderMode?
    @State private var industryId: String?
    @State private var skills: Set<String> = []
    @State private var name = ""
    @State private var role = ""
    @State private var pitch = ""
    @State private var plz = ""
    @State private var availability: Availability?

    private var canNext: Bool {
        switch step {
        case 0: mode != nil
        case 1: industryId != nil && !skills.isEmpty
        default: name.count > 1 && role.count > 1 && availability != nil
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            header
            TabView(selection: $step) {
                stepMode.tag(0)
                stepIndustry.tag(1)
                stepProfile.tag(2)
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            .animation(.easeOut(duration: 0.28), value: step)
            footer
        }
        .background(MF.ink.ignoresSafeArea())
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
                ForEach(0..<3) { i in
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
                        .keyboardType(.numberPad)
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
                if step < 2 { step += 1 } else { finish() }
            } label: {
                HStack(spacing: 8) {
                    Text(step < 2 ? "Weiter" : "Los geht's")
                        .font(.system(size: 15.5, weight: .semibold))
                    Image(systemName: "arrow.right").font(.system(size: 13, weight: .semibold))
                }
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .frame(height: 50)
                .background(MF.emberGrad)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                .opacity(canNext ? 1 : 0.4)
            }
            .buttonStyle(.plain)
            .disabled(!canNext)
            .emberGlow()
        }
        .padding(.horizontal, 22)
        .padding(.bottom, 12)
        .padding(.top, 8)
    }

    private func finish() {
        guard let mode, let industryId, let availability else { return }
        Haptics.success()
        state.profile = MyProfile(
            mode: mode, industryId: industryId, skills: Array(skills),
            name: name.trimmingCharacters(in: .whitespaces),
            role: role.trimmingCharacters(in: .whitespaces),
            pitch: pitch.trimmingCharacters(in: .whitespaces),
            plz: plz, availability: availability)
    }
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
        let maxWidth = proposal.width ?? .infinity
        var positions: [CGPoint] = []
        var x: CGFloat = 0, y: CGFloat = 0, rowHeight: CGFloat = 0
        for sub in subviews {
            let size = sub.sizeThatFits(.unspecified)
            if x + size.width > maxWidth, x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            positions.append(CGPoint(x: x, y: y))
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
        return (CGSize(width: maxWidth, height: y + rowHeight), positions)
    }
}
