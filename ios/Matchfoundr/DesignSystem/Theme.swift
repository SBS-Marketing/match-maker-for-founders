// matchfoundr · „Warm Signal" Designsystem für SwiftUI
// 1:1-Übersetzung der Web-Tokens (src/styles.css + Design-Handoff).
// Regel: warme Fläche, weiße Karten, EIN leuchtender Akzent pro Screen
// (Ember = Aktion/nächster Schritt, Indigo = Co-Pilot).

import SwiftUI
import UIKit

enum AppAppearance: String, CaseIterable, Identifiable {
    case system
    case light
    case dark

    var id: String { rawValue }

    var label: String {
        switch self {
        case .system: "System"
        case .light: "Hell"
        case .dark: "Dunkel"
        }
    }

    var colorScheme: ColorScheme? {
        switch self {
        case .system: nil
        case .light: .light
        case .dark: .dark
        }
    }
}

enum MF {
    // ─── Kernpalette ─────────────────────────────────────────
    static let canvas = Color.adaptive(light: 0xFAF8F3, dark: 0x11110F)
    static let canvasDeep = Color.adaptive(light: 0xF4F0E8, dark: 0x161512)
    static let surface = Color.adaptive(light: 0xFFFFFF, dark: 0x1C1B18)
    static let surfaceSoft = Color.adaptive(light: 0xF7F3EC, dark: 0x25231F)
    static let ink = Color.adaptive(light: 0x17150F, dark: 0xF7F5EF)
    static let inkSoft = Color.adaptive(light: 0x2A251F, dark: 0xE2DED5)
    static let smoke = Color.adaptive(light: 0x6E665C, dark: 0xB9B2A8)
    static let faint = Color.adaptive(light: 0x9A9286, dark: 0x8C857C)
    static let ember = Color.adaptive(light: 0xE2511C, dark: 0xF86A35)
    static let emberDeep = Color.adaptive(light: 0xB23B0E, dark: 0xFF8A5C)
    static let emberTint = Color.adaptive(light: 0xFBE7DA, dark: 0x3A241A)
    static let border = Color.adaptive(
        light: 0x17150F, dark: 0xFFFFFF, lightAlpha: 0.09, darkAlpha: 0.13)
    static let borderSoft = Color.adaptive(
        light: 0x17150F, dark: 0xFFFFFF, lightAlpha: 0.055, darkAlpha: 0.075)

    // Indigo = Signalfarbe des Co-Pilot
    static let indigo = Color.adaptive(light: 0x3756C4, dark: 0x6E8AF0)
    static let indigoDeep = Color.adaptive(light: 0x273F96, dark: 0x91A8FF)
    static let indigoTint = Color.adaptive(light: 0xDEE7FB, dark: 0x222B45)
    static let indigoInk = Color.adaptive(light: 0x26519E, dark: 0xAFC1FF)

    // ─── Gradients ───────────────────────────────────────────
    static let emberGrad = LinearGradient(
        colors: [
            Color.adaptive(light: 0xF2622A, dark: 0xFF7B45),
            Color.adaptive(light: 0xE2511C, dark: 0xE85A25),
            Color.adaptive(light: 0xB83C10, dark: 0xA83410),
        ],
        startPoint: .topLeading, endPoint: .bottomTrailing)
    static let indigoGrad = LinearGradient(
        colors: [
            Color.adaptive(light: 0x4B6FE2, dark: 0x718EF1),
            Color.adaptive(light: 0x3756C4, dark: 0x4A65C9),
            Color.adaptive(light: 0x273F96, dark: 0x2A3E88),
        ],
        startPoint: .topLeading, endPoint: .bottomTrailing)

    // ─── Service-Palette (Farbe trägt Bedeutung) ─────────────
    struct ServiceHue { let hue: Color; let tint: Color; let ink: Color }
    static let services: [String: ServiceHue] = [
        "cofounder": .init(hue: ember, tint: emberTint, ink: emberDeep),
        "legal": .init(
            hue: .adaptive(light: 0x13957A, dark: 0x37C5A4),
            tint: .adaptive(light: 0xD8F1EA, dark: 0x173A32),
            ink: .adaptive(light: 0x0B6B57, dark: 0x7BE0C6)),
        "tax": .init(
            hue: .adaptive(light: 0xD79014, dark: 0xE3AB3B),
            tint: .adaptive(light: 0xF8ECCF, dark: 0x3B3019),
            ink: .adaptive(light: 0x9A6608, dark: 0xF4C96C)),
        "funding": .init(
            hue: .adaptive(light: 0xE03A2E, dark: 0xF2675D),
            tint: .adaptive(light: 0xFBDFDC, dark: 0x3D211F),
            ink: .adaptive(light: 0xA82418, dark: 0xFF9B93)),
        "capital": .init(
            hue: .adaptive(light: 0x3A6FD6, dark: 0x6E91E8),
            tint: .adaptive(light: 0xDEE7FB, dark: 0x202D4A),
            ink: .adaptive(light: 0x26519E, dark: 0xAFC4FF)),
        "mentor": .init(
            hue: .adaptive(light: 0x8A55D2, dark: 0xA77AE5),
            tint: .adaptive(light: 0xECE2FA, dark: 0x322546),
            ink: .adaptive(light: 0x623BA0, dark: 0xD2B4FF)),
        "talent": .init(
            hue: .adaptive(light: 0x2E9E50, dark: 0x55BD71),
            tint: .adaptive(light: 0xDBF1E1, dark: 0x203A27),
            ink: .adaptive(light: 0x1C7038, dark: 0x89E29D)),
        "growth": .init(
            hue: .adaptive(light: 0xDB4B93, dark: 0xE86DAB),
            tint: .adaptive(light: 0xFBDEEC, dark: 0x402438),
            ink: .adaptive(light: 0xA52E69, dark: 0xFFABD3)),
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
                .shadow(color: Color.black.opacity(large ? 0.08 : 0.06), radius: large ? 3 : 1, y: large ? 2 : 1)
                .shadow(color: Color.black.opacity(large ? 0.34 : 0.24), radius: large ? 28 : 13, y: large ? 14 : 5)
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
    static func adaptive(
        light: UInt32,
        dark: UInt32,
        lightAlpha: CGFloat = 1,
        darkAlpha: CGFloat = 1
    ) -> Color {
        Color(uiColor: UIColor { traits in
            let isDark = traits.userInterfaceStyle == .dark
            let value = isDark ? dark : light
            let alpha = isDark ? darkAlpha : lightAlpha
            return UIColor(
                red: CGFloat((value >> 16) & 0xFF) / 255,
                green: CGFloat((value >> 8) & 0xFF) / 255,
                blue: CGFloat(value & 0xFF) / 255,
                alpha: alpha
            )
        })
    }

    init(hex: UInt32) {
        self.init(
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255)
    }
}
