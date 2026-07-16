// Swipe-Deck — das Herz der App.
// Echte Drag-Gesten mit Rotation, Like/Nope-Stempel, Haptik,
// Stern = Super-Interest, Match-Celebration. 5 Swipes/Tag für Free.

import SwiftUI

struct SwipeDeckView: View {
    @EnvironmentObject var state: AppState

    var body: some View {
        VStack(spacing: 0) {
            header
            ZStack {
                if state.deck.isEmpty {
                    emptyState
                } else {
                    // Stapel: bis zu 3 Karten sichtbar, oberste interaktiv.
                    ForEach(Array(state.deck.prefix(3).enumerated().reversed()), id: \.element.id) { index, card in
                        SwipeCard(card: card, isTop: index == 0, stackIndex: index)
                    }
                }
            }
            .frame(maxHeight: .infinity)
            .padding(.horizontal, 20)
            .padding(.top, 6)
            .padding(.bottom, 14)
        }
        .background(MF.canvas.ignoresSafeArea())
    }

    private var header: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("Swipe").font(.system(size: 22, weight: .bold)).foregroundStyle(MF.ink)
                Text("Menschen, die mitbauen").font(.system(size: 12.5)).foregroundStyle(MF.smoke)
            }
            Spacer()
            if !state.isPremium {
                Text("\(state.swipesLeft) übrig")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(MF.emberDeep)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 7)
                    .background(MF.emberTint)
                    .clipShape(Capsule())
            }
        }
        .padding(.horizontal, 22)
        .padding(.top, 8)
    }

    private var emptyState: some View {
        VStack(spacing: 14) {
            Image(systemName: "checkmark.seal.fill")
                .font(.system(size: 40))
                .foregroundStyle(MF.ember)
            Text("Noch keine Live-Profile")
                .font(.system(size: 22, weight: .bold)).foregroundStyle(MF.ink)
            Text("Sobald echte Gründerprofile in Supabase sichtbar sind, erscheinen sie hier.")
                .font(.system(size: 14)).foregroundStyle(MF.smoke)
                .multilineTextAlignment(.center)
            MFGhostButton(title: "Live neu laden", icon: "arrow.clockwise") {
                state.reloadDeck()
            }
            .frame(width: 220)
        }
        .padding(30)
    }
}

// ─── Die Karte ────────────────────────────────────────────────

struct SwipeCard: View {
    @EnvironmentObject var state: AppState
    let card: FounderCard
    let isTop: Bool
    let stackIndex: Int

    @State private var offset: CGSize = .zero
    @State private var didHapticThreshold = false

    private var rotation: Angle { .degrees(Double(offset.width / 22)) }
    private var likeOpacity: Double { max(0, min(1, Double(offset.width - 30) / 70)) }
    private var nopeOpacity: Double { max(0, min(1, Double(-offset.width - 30) / 70)) }

    var body: some View {
        let hue = MF.services[card.industryId == "tech" ? "capital" : "cofounder"] ?? MF.services["cofounder"]!

        VStack(alignment: .leading, spacing: 0) {
            // Kopfbereich mit Avatar + Match-Prozent
            HStack(alignment: .top) {
                MFAvatar(name: card.name, service: serviceFor(card.industryId), size: 64)
                Spacer()
                VStack(spacing: 1) {
                    Text("\(card.matchPercent)")
                        .font(.system(size: 22, weight: .heavy, design: .monospaced))
                        .foregroundStyle(hue.ink)
                    Text("FIT").font(.mfMono(9)).kerning(1).foregroundStyle(hue.ink.opacity(0.7))
                }
                .frame(width: 58, height: 54)
                .background(hue.tint)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            }

            Text(card.name)
                .font(.system(size: 25, weight: .bold))
                .foregroundStyle(MF.ink)
                .padding(.top, 16)
            HStack(spacing: 6) {
                Text(card.role).font(.system(size: 14, weight: .semibold)).foregroundStyle(MF.inkSoft)
                Text("·").foregroundStyle(MF.faint)
                Image(systemName: "mappin").font(.system(size: 11)).foregroundStyle(MF.faint)
                Text(card.city).font(.system(size: 14)).foregroundStyle(MF.smoke)
            }
            .padding(.top, 3)

            Text("„\(card.pitch)“")
                .font(.system(size: 16, weight: .regular, design: .serif))
                .italic()
                .foregroundStyle(MF.inkSoft)
                .lineSpacing(3)
                .padding(.top, 14)

            FlowLayout(spacing: 7) {
                ForEach(card.skills, id: \.self) { skill in
                    Text(skill)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(MF.smoke)
                        .padding(.horizontal, 11)
                        .padding(.vertical, 6)
                        .background(MF.surfaceSoft)
                        .clipShape(Capsule())
                }
            }
            .padding(.top, 14)

            HStack(spacing: 5) {
                Image(systemName: "clock").font(.system(size: 11))
                Text(card.availability.label).font(.system(size: 12.5, weight: .medium))
            }
            .foregroundStyle(MF.faint)
            .padding(.top, 12)

            Spacer(minLength: 12)

            // Aktionen — nur auf der obersten Karte
            if isTop {
                HStack(spacing: 18) {
                    actionButton(icon: "xmark", color: MF.smoke, bg: MF.surface, label: "Pass") {
                        swipeAway(like: false)
                    }
                    actionButton(icon: "star.fill", color: .white, bg: nil, gradient: MF.indigoGrad,
                                 size: 62, label: "Super Interest") {
                        swipeAway(like: true, superLike: true)
                    }
                    actionButton(icon: "heart.fill", color: .white, bg: nil, gradient: MF.emberGrad, label: "Like") {
                        swipeAway(like: true)
                    }
                }
                .frame(maxWidth: .infinity)
            }
        }
        .padding(22)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: MF.Radius.hero, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: MF.Radius.hero, style: .continuous).stroke(MF.border, lineWidth: 1))
        .warmShadow(large: true)
        // Like/Nope-Stempel
        .overlay(alignment: .topLeading) {
            stamp("INTERESSE", color: Color(hex: 0x2E9E50)).opacity(likeOpacity).rotationEffect(.degrees(-12))
                .padding(24)
        }
        .overlay(alignment: .topTrailing) {
            stamp("WEITER", color: MF.smoke).opacity(nopeOpacity).rotationEffect(.degrees(12))
                .padding(24)
        }
        // Stapel-Effekt
        .scaleEffect(isTop ? 1 : 1 - CGFloat(stackIndex) * 0.04)
        .offset(y: isTop ? 0 : CGFloat(stackIndex) * 10)
        .offset(offset)
        .rotationEffect(isTop ? rotation : .zero)
        .gesture(isTop ? dragGesture : nil)
        .animation(.spring(response: 0.35, dampingFraction: 0.75), value: offset)
        .allowsHitTesting(isTop)
    }

    private var dragGesture: some Gesture {
        DragGesture()
            .onChanged { value in
                offset = value.translation
                let past = abs(value.translation.width) > 90
                if past && !didHapticThreshold { Haptics.select(); didHapticThreshold = true }
                if !past { didHapticThreshold = false }
            }
            .onEnded { value in
                if value.translation.width > 90 {
                    swipeAway(like: true, fling: value.translation)
                } else if value.translation.width < -90 {
                    swipeAway(like: false, fling: value.translation)
                } else {
                    offset = .zero
                }
            }
    }

    private func swipeAway(like: Bool, superLike: Bool = false, fling: CGSize? = nil) {
        // Erst Limit prüfen — bei Paywall schnappt die Karte zurück.
        let allowed = state.swipe(card, like: like, superLike: superLike)
        guard allowed else {
            offset = .zero
            return
        }
        let dir: CGFloat = like ? 1 : -1
        withAnimation(.easeOut(duration: 0.28)) {
            offset = CGSize(width: dir * 600, height: (fling?.height ?? 0) * 1.4)
        }
    }

    private func stamp(_ text: String, color: Color) -> some View {
        Text(text)
            .font(.system(size: 22, weight: .heavy))
            .kerning(2)
            .foregroundStyle(color)
            .padding(.horizontal, 14)
            .padding(.vertical, 6)
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(color, lineWidth: 3.5))
    }

    private func actionButton(icon: String, color: Color, bg: Color?,
                              gradient: LinearGradient? = nil,
                              size: CGFloat = 54, label: String,
                              action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: size * 0.36, weight: .bold))
                .foregroundStyle(color)
                .frame(width: size, height: size)
                .background {
                    if let gradient { gradient } else { bg ?? MF.surface }
                }
                .clipShape(Circle())
                .overlay(Circle().stroke(MF.border, lineWidth: gradient == nil ? 1 : 0))
                .warmShadow()
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
    }

    private func serviceFor(_ industryId: String) -> String {
        switch industryId {
        case "tech": "capital"
        case "handwerk": "tax"
        case "gastro": "funding"
        case "kreativ": "growth"
        case "gesundheit": "talent"
        case "beratung": "mentor"
        default: "cofounder"
        }
    }
}

// ─── Match-Celebration ────────────────────────────────────────

struct MatchCelebrationView: View {
    @EnvironmentObject var state: AppState
    let card: FounderCard
    @State private var appeared = false

    var body: some View {
        ZStack {
            MF.ink.opacity(0.75).ignoresSafeArea()
                .onTapGesture { dismiss() }
            VStack(spacing: 18) {
                ZStack {
                    Circle().fill(MF.emberGrad).frame(width: 110, height: 110)
                        .emberGlow()
                        .scaleEffect(appeared ? 1 : 0.4)
                    Text("🎉").font(.system(size: 52)).scaleEffect(appeared ? 1 : 0.2)
                }
                Text("Es ist ein Match!")
                    .font(.system(size: 27, weight: .bold)).foregroundStyle(.white)
                Text("\(card.name) will auch mit dir bauen.\(card.isSuper ? " Und zwar mit Super Interest ⭐️" : "")")
                    .font(.system(size: 15)).foregroundStyle(.white.opacity(0.75))
                    .multilineTextAlignment(.center)
                VStack(spacing: 10) {
                    MFPrimaryButton(title: "Jetzt schreiben", icon: "bubble.left.fill") {
                        dismiss()
                        state.open(.screen(.chats))
                    }
                    Button("Später") { dismiss() }
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(.white.opacity(0.6))
                        .frame(height: 44)
                }
                .padding(.top, 6)
            }
            .padding(30)
            .frame(maxWidth: 340)
        }
        .onAppear {
            withAnimation(.spring(response: 0.45, dampingFraction: 0.6)) { appeared = true }
        }
    }

    private func dismiss() {
        withAnimation(.easeOut(duration: 0.2)) { state.celebrating = nil }
    }
}

// ─── Premium-Sheet ────────────────────────────────────────────

struct PremiumSheetView: View {
    @EnvironmentObject var state: AppState
    let reason: AppState.PaywallReason

    private let features = [
        "KI-Gründeranalyse nach dem Onboarding",
        "25.000 KI-Tokens pro Tag",
        "120.000 KI-Tokens pro Woche",
        "Mehr Swipes, Matches und App-Aktionen",
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Image(systemName: "bolt.fill")
                .font(.system(size: 20, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 50, height: 50)
                .background(MF.emberGrad)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                .emberGlow()

            Text(title)
                .font(.system(size: 22, weight: .bold))
                .foregroundStyle(MF.ink)
                .padding(.top, 16)

            Text(subtitle)
                .font(.system(size: 14)).foregroundStyle(MF.smoke)
                .padding(.top, 6)

            VStack(alignment: .leading, spacing: 11) {
                ForEach(features, id: \.self) { f in
                    HStack(spacing: 10) {
                        Image(systemName: "checkmark")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundStyle(MF.emberDeep)
                            .frame(width: 19, height: 19)
                            .background(MF.emberTint)
                            .clipShape(Circle())
                        Text(f).font(.system(size: 14)).foregroundStyle(MF.ink)
                    }
                }
            }
            .padding(.top, 18)

            Spacer(minLength: 18)

            MFPrimaryButton(title: "3 Tage kostenlos testen") {
                state.activateTrial(days: 3)
            }
            Text("Danach 9 €/Monat · jederzeit kündbar · endet automatisch")
                .font(.system(size: 11.5)).foregroundStyle(MF.faint)
                .frame(maxWidth: .infinity)
                .padding(.top, 10)
            Button("Vielleicht später") { state.paywall = nil }
                .font(.system(size: 13.5, weight: .semibold))
                .foregroundStyle(MF.smoke)
                .frame(maxWidth: .infinity)
                .frame(height: 44)
        }
        .padding(24)
        .background(MF.surface)
    }

    private var title: String {
        switch reason {
        case .swipes:
            return "Deine 5 Swipes für heute sind durch."
        case .chat:
            return "Der nächste Kontakt gehört zu Pro."
        case .aiAnalysis:
            return "Die KI-Gründeranalyse ist Pro."
        case .aiUsage:
            return "Dein KI-Budget ist erreicht."
        }
    }

    private var subtitle: String {
        switch reason {
        case .swipes:
            return "Mit Pro swipst du weiter und bekommst deutlich mehr KI-Kontingent für Co-Pilot-Aufgaben."
        case .chat:
            return "Dein erster Kontakt ist frei. Pro schaltet weitere Gespräche und bessere KI-Unterstützung frei."
        case .aiAnalysis:
            return "Starte 3 Tage kostenlos und lass den Co-Pilot dein Vorhaben, Risiken und Team-Lücke analysieren."
        case .aiUsage:
            return "Standard bleibt bewusst knapp, damit KI-Kosten kontrollierbar bleiben. Pro hebt Tages- und Wochenlimit deutlich an."
        }
    }
}
