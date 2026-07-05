// matchfoundr · „Warm Signal" Designsystem für SwiftUI
// 1:1-Übersetzung der Web-Tokens (src/styles.css + Design-Handoff).
// Regel: warme Fläche, weiße Karten, EIN leuchtender Akzent pro Screen
// (Ember = Aktion/nächster Schritt, Indigo = Co-Pilot).

import SwiftUI

enum MF {
    // ─── Kernpalette ─────────────────────────────────────────
    static let canvas = Color(hex: 0xFAF8F3)       // Seitenhintergrund
    static let canvasDeep = Color(hex: 0xF4F0E8)   // Abschnittswechsel
    static let surface = Color.white               // Karten
    static let surfaceSoft = Color(hex: 0xF7F3EC)  // ruhige Innenflächen
    static let ink = Color(hex: 0x17150F)          // Headlines / starker Text
    static let inkSoft = Color(hex: 0x2A251F)
    static let smoke = Color(hex: 0x6E665C)        // Fließtext
    static let faint = Color(hex: 0x9A9286)        // Meta / Platzhalter
    static let ember = Color(hex: 0xE2511C)        // Primärakzent
    static let emberDeep = Color(hex: 0xB23B0E)
    static let emberTint = Color(hex: 0xFBE7DA)    // aktive Pills, sanfte Füllungen
    static let border = Color(hex: 0x17150F).opacity(0.09)
    static let borderSoft = Color(hex: 0x17150F).opacity(0.055)

    // Indigo = Signalfarbe des Co-Pilot
    static let indigo = Color(hex: 0x3756C4)
    static let indigoDeep = Color(hex: 0x273F96)
    static let indigoTint = Color(hex: 0xDEE7FB)
    static let indigoInk = Color(hex: 0x26519E)

    // ─── Gradients ───────────────────────────────────────────
    static let emberGrad = LinearGradient(
        colors: [Color(hex: 0xF2622A), Color(hex: 0xE2511C), Color(hex: 0xB83C10)],
        startPoint: .topLeading, endPoint: .bottomTrailing)
    static let indigoGrad = LinearGradient(
        colors: [Color(hex: 0x4B6FE2), Color(hex: 0x3756C4), Color(hex: 0x273F96)],
        startPoint: .topLeading, endPoint: .bottomTrailing)

    // ─── Service-Palette (Farbe trägt Bedeutung) ─────────────
    struct ServiceHue { let hue: Color; let tint: Color; let ink: Color }
    static let services: [String: ServiceHue] = [
        "cofounder": .init(hue: Color(hex: 0xE2511C), tint: Color(hex: 0xFCE6DA), ink: Color(hex: 0xA8390E)),
        "legal":     .init(hue: Color(hex: 0x13957A), tint: Color(hex: 0xD8F1EA), ink: Color(hex: 0x0B6B57)),
        "tax":       .init(hue: Color(hex: 0xD79014), tint: Color(hex: 0xF8ECCF), ink: Color(hex: 0x9A6608)),
        "funding":   .init(hue: Color(hex: 0xE03A2E), tint: Color(hex: 0xFBDFDC), ink: Color(hex: 0xA82418)),
        "capital":   .init(hue: Color(hex: 0x3A6FD6), tint: Color(hex: 0xDEE7FB), ink: Color(hex: 0x26519E)),
        "mentor":    .init(hue: Color(hex: 0x8A55D2), tint: Color(hex: 0xECE2FA), ink: Color(hex: 0x623BA0)),
        "talent":    .init(hue: Color(hex: 0x2E9E50), tint: Color(hex: 0xDBF1E1), ink: Color(hex: 0x1C7038)),
        "growth":    .init(hue: Color(hex: 0xDB4B93), tint: Color(hex: 0xFBDEEC), ink: Color(hex: 0xA52E69)),
    ]

    // ─── Radii ───────────────────────────────────────────────
    enum Radius {
        static let button: CGFloat = 13
        static let card: CGFloat = 18
        static let hero: CGFloat = 22
    }

    // ─── Schatten (Warm Signal) ──────────────────────────────
    struct WarmShadow: ViewModifier {
        var large = false
        func body(content: Content) -> some View {
            content
                .shadow(color: MF.ink.opacity(large ? 0.05 : 0.04), radius: large ? 3 : 1, y: large ? 2 : 1)
                .shadow(color: MF.ink.opacity(large ? 0.24 : 0.18), radius: large ? 28 : 13, y: large ? 14 : 5)
        }
    }
    struct EmberGlow: ViewModifier {
        func body(content: Content) -> some View {
            content
                .shadow(color: Color(hex: 0xB23B0E).opacity(0.18), radius: 3, y: 2)
                .shadow(color: Color(hex: 0xB23B0E).opacity(0.45), radius: 30, y: 17)
        }
    }
}

// ─── Typografie (SF Pro = natives Pendant zu Geist) ──────────
extension Font {
    static func mfDisplay(_ size: CGFloat = 40) -> Font { .system(size: size, weight: .bold, design: .default) }
    static func mfHeadline(_ size: CGFloat = 22) -> Font { .system(size: size, weight: .bold) }
    static func mfTitle(_ size: CGFloat = 15) -> Font { .system(size: size, weight: .bold) }
    static func mfBody(_ size: CGFloat = 14.5) -> Font { .system(size: size, weight: .regular) }
    static func mfLabel(_ size: CGFloat = 12) -> Font { .system(size: size, weight: .semibold) }
    static func mfMono(_ size: CGFloat = 11) -> Font { .system(size: size, weight: .semibold, design: .monospaced) }
}

// ─── Bausteine ────────────────────────────────────────────────
extension View {
    func warmCard(padding: CGFloat = 16, radius: CGFloat = MF.Radius.card) -> some View {
        self.padding(padding)
            .background(MF.surface)
            .clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: radius, style: .continuous).stroke(MF.border, lineWidth: 1))
            .modifier(MF.WarmShadow())
    }
    func warmShadow(large: Bool = false) -> some View { modifier(MF.WarmShadow(large: large)) }
    func emberGlow() -> some View { modifier(MF.EmberGlow()) }
}

/// Eyebrow — kleines Mono-Label in Versalien.
struct Eyebrow: View {
    let text: String
    var color: Color = MF.smoke
    var body: some View {
        Text(text.uppercased())
            .font(.mfMono(10))
            .kerning(1.6)
            .foregroundStyle(color)
    }
}

/// Primärer Button — Ember-Gradient, 44pt+ Touch-Target.
struct MFPrimaryButton: View {
    let title: String
    var icon: String? = nil
    var action: () -> Void
    var body: some View {
        Button(action: { Haptics.tap(); action() }) {
            HStack(spacing: 8) {
                Text(title).font(.system(size: 15, weight: .semibold))
                if let icon { Image(systemName: icon).font(.system(size: 13, weight: .semibold)) }
            }
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .frame(height: 50)
            .background(MF.emberGrad)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        }
        .emberGlow()
        .buttonStyle(.plain)
    }
}

/// Sekundärer Button — weiße Fläche, Hairline.
struct MFGhostButton: View {
    let title: String
    var icon: String? = nil
    var action: () -> Void
    var body: some View {
        Button(action: { Haptics.tap(); action() }) {
            HStack(spacing: 8) {
                if let icon { Image(systemName: icon).font(.system(size: 13, weight: .semibold)) }
                Text(title).font(.system(size: 15, weight: .semibold))
            }
            .foregroundStyle(MF.ink)
            .frame(maxWidth: .infinity)
            .frame(height: 50)
            .background(MF.surface)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(MF.border, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }
}

/// Chip — auswählbare Pille.
struct MFChip: View {
    let label: String
    var selected: Bool
    var action: () -> Void
    var body: some View {
        Button(action: { Haptics.select(); action() }) {
            Text(label)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(selected ? MF.emberDeep : MF.smoke)
                .padding(.horizontal, 15)
                .frame(height: 40)
                .background(selected ? MF.emberTint : MF.surface)
                .clipShape(Capsule())
                .overlay(Capsule().stroke(selected ? MF.ember : MF.border, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }
}

/// Initialen-Avatar mit Service-Färbung.
struct MFAvatar: View {
    let name: String
    var service: String = "cofounder"
    var size: CGFloat = 44
    var body: some View {
        let hue = MF.services[service] ?? MF.services["cofounder"]!
        Text(initials)
            .font(.system(size: size * 0.34, weight: .bold))
            .foregroundStyle(hue.ink)
            .frame(width: size, height: size)
            .background(hue.tint)
            .clipShape(Circle())
            .overlay(Circle().stroke(hue.hue, lineWidth: 1.5))
    }
    private var initials: String {
        let parts = name.split(separator: " ")
        let chars = parts.prefix(2).compactMap(\.first)
        return String(chars).uppercased()
    }
}

/// Marken-Logo „zwei Pfade, ein Treffpunkt".
struct MFLogo: View {
    var size: CGFloat = 22
    var tint: Color = MF.ink
    var body: some View {
        HStack(spacing: 0) {
            Image(systemName: "chevron.right")
                .font(.system(size: size, weight: .heavy))
                .foregroundStyle(tint)
            Image(systemName: "chevron.left")
                .font(.system(size: size, weight: .heavy))
                .foregroundStyle(MF.ember)
        }
    }
}

/// Haptik — natives Feedback für Gesten und Aktionen.
enum Haptics {
    static func tap() { UIImpactFeedbackGenerator(style: .light).impactOccurred() }
    static func select() { UISelectionFeedbackGenerator().selectionChanged() }
    static func success() { UINotificationFeedbackGenerator().notificationOccurred(.success) }
    static func heavy() { UIImpactFeedbackGenerator(style: .medium).impactOccurred() }
}

extension Color {
    init(hex: UInt32) {
        self.init(
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255)
    }
}
