// matchfoundr · Mobile-Shell nach Design-Spec (mobile-shell.jsx)
// MShellTop: Subtitle über Titel, rechter Slot. MTabBar: 4 Tabs,
// aktives Icon in 44×30-EmberTint-Pill, Blur-Hintergrund, Hairline oben.

import SwiftUI

/// Top-Bar: kleine Subtitle (12.5/600 faint) über großem Titel (21/700).
struct MShellTop<Right: View>: View {
    let title: String
    var subtitle: String?
    @ViewBuilder var right: Right

    var body: some View {
        HStack(alignment: .bottom) {
            VStack(alignment: .leading, spacing: 1) {
                if let subtitle {
                    Text(subtitle)
                        .font(.system(size: 12.5, weight: .semibold))
                        .foregroundStyle(MF.faint)
                }
                Text(title)
                    .font(.system(size: 21, weight: .bold))
                    .foregroundStyle(MF.ink)
                    .lineLimit(1)
            }
            Spacer()
            right
        }
        .padding(.horizontal, 20)
        .padding(.top, 6)
        .padding(.bottom, 12)
        .background(MF.canvas)
        .overlay(alignment: .bottom) { Rectangle().fill(MF.borderSoft).frame(height: 1) }
    }
}

/// Bottom-Tab-Bar nach MTabBar: 4 Tabs, aktive Pille in EmberTint.
struct MTabBar: View {
    @Binding var active: AppTab

    var body: some View {
        HStack {
            ForEach(AppTab.allCases, id: \.self) { tab in
                let on = tab == active
                Button {
                    Haptics.select()
                    active = tab
                } label: {
                    VStack(spacing: 4) {
                        Image(systemName: tab.icon)
                            .font(.system(size: 17, weight: on ? .semibold : .regular))
                            .foregroundStyle(on ? MF.ember : MF.faint)
                            .frame(width: 44, height: 30)
                            .background(on ? MF.emberTint : .clear)
                            .clipShape(RoundedRectangle(cornerRadius: 9, style: .continuous))
                        Text(tab.label)
                            .font(.system(size: 10.5, weight: on ? .bold : .medium))
                            .foregroundStyle(on ? MF.ember : MF.faint)
                    }
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 12)
        .padding(.top, 10)
        .padding(.bottom, 4)
        .background(.ultraThinMaterial)
        .overlay(alignment: .top) { Rectangle().fill(MF.borderSoft).frame(height: 1) }
    }
}

/// Sektions-Kopf mit optionaler Aktion rechts (MSectionHead).
struct MSectionHead: View {
    let text: String
    var action: String?
    var onAction: (() -> Void)?

    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            Text(text)
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(MF.smoke)
            Spacer()
            if let action {
                Button {
                    Haptics.tap()
                    onAction?()
                } label: {
                    Text(action)
                        .font(.system(size: 12.5, weight: .semibold))
                        .foregroundStyle(MF.ember)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.top, 4)
    }
}

/// Indigo-Glow für Co-Pilot-Elemente (Spec: indigoGlow).
struct IndigoGlow: ViewModifier {
    func body(content: Content) -> some View {
        content
            .shadow(color: Color(hex: 0x273F96).opacity(0.18), radius: 3, y: 2)
            .shadow(color: Color(hex: 0x273F96).opacity(0.42), radius: 30, y: 17)
    }
}
extension View {
    func indigoGlow() -> some View { modifier(IndigoGlow()) }
}
