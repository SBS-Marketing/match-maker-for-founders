// Co-Pilot — der Begleiter. Indigo ist seine Signalfarbe.
// Chat mit Intent-Engine, klickbare Navigations-Chips, Quick-Prompts.

import SwiftUI

struct CopilotView: View {
    @EnvironmentObject var state: AppState
    @State private var messages: [CopilotMessage] = []
    @State private var input = ""
    @State private var thinking = false

    var body: some View {
        VStack(spacing: 0) {
            header
            ScrollViewReader { proxy in
                ScrollView {
                    VStack(spacing: 14) {
                        if messages.isEmpty { welcome }
                        ForEach(messages) { msg in
                            bubble(msg).id(msg.id)
                        }
                        if thinking { thinkingBubble }
                    }
                    .padding(.horizontal, 18)
                    .padding(.vertical, 16)
                }
                .scrollIndicators(.hidden)
                .onChange(of: messages.count) { _, _ in
                    if let last = messages.last {
                        withAnimation { proxy.scrollTo(last.id, anchor: .bottom) }
                    }
                }
            }
            quickPrompts
            composer
        }
        .background(MF.canvas.ignoresSafeArea())
    }

    private var header: some View {
        HStack(spacing: 12) {
            Image(systemName: "sparkles")
                .font(.system(size: 17, weight: .semibold)).foregroundStyle(.white)
                .frame(width: 42, height: 42)
                .background(MF.indigoGrad)
                .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
            VStack(alignment: .leading, spacing: 1) {
                Text("Co-Pilot").font(.system(size: 18, weight: .bold)).foregroundStyle(MF.ink)
                Text("Kennt deinen Stand · immer da")
                    .font(.system(size: 12)).foregroundStyle(MF.smoke)
            }
            Spacer()
        }
        .padding(.horizontal, 20)
        .padding(.top, 10)
        .padding(.bottom, 10)
    }

    private var welcome: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Ich bin dein Co-Pilot.")
                .font(.system(size: 15, weight: .bold)).foregroundStyle(MF.ink)
            Text("Ich kenne dein \(state.profile?.industry.ventureTerm ?? "Vorhaben"), zeige dir die nächsten Schritte und bringe dich direkt zum richtigen Guide oder Menschen. Frag einfach — auf Deutsch, wie einem Freund.")
                .font(.system(size: 13.5)).foregroundStyle(MF.smoke)
                .lineSpacing(3)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(MF.surfaceSoft)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private func bubble(_ msg: CopilotMessage) -> some View {
        HStack {
            if msg.mine { Spacer(minLength: 40) }
            VStack(alignment: .leading, spacing: 10) {
                Text(msg.text)
                    .font(.system(size: 14.5))
                    .foregroundStyle(msg.mine ? .white : MF.inkSoft)
                    .lineSpacing(3)
                if !msg.navigation.isEmpty {
                    FlowLayout(spacing: 7) {
                        ForEach(msg.navigation) { nav in
                            Button {
                                Haptics.tap()
                                navigate(nav.destination)
                            } label: {
                                HStack(spacing: 5) {
                                    Text(nav.label).font(.system(size: 12.5, weight: .semibold))
                                    Image(systemName: "arrow.right").font(.system(size: 9, weight: .bold))
                                }
                                .foregroundStyle(MF.indigoInk)
                                .padding(.horizontal, 12).padding(.vertical, 8)
                                .background(MF.indigoTint)
                                .clipShape(Capsule())
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
            .padding(.horizontal, 15).padding(.vertical, 12)
            .background {
                if msg.mine { AnyView(MF.indigoGrad) } else { AnyView(MF.surface) }
            }
            .clipShape(RoundedRectangle(cornerRadius: 17, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 17).stroke(msg.mine ? .clear : MF.border, lineWidth: 1))
            .warmShadow()
            if !msg.mine { Spacer(minLength: 40) }
        }
    }

    private var thinkingBubble: some View {
        HStack {
            HStack(spacing: 8) {
                ProgressView().controlSize(.small).tint(MF.indigo)
                Text("denkt nach…").font(.system(size: 12.5)).foregroundStyle(MF.smoke)
            }
            .padding(.horizontal, 15).padding(.vertical, 11)
            .background(MF.surface)
            .clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))
            Spacer()
        }
    }

    private var quickPrompts: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(CopilotEngine.quickPrompts, id: \.self) { prompt in
                    Button {
                        send(prompt)
                    } label: {
                        Text(prompt)
                            .font(.system(size: 12.5, weight: .medium))
                            .foregroundStyle(MF.smoke)
                            .padding(.horizontal, 13).frame(height: 38)
                            .background(MF.surfaceSoft)
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 18)
        }
        .padding(.bottom, 8)
    }

    private var composer: some View {
        HStack(spacing: 9) {
            TextField("Frag mich zu deiner Gründung…", text: $input, axis: .vertical)
                .font(.system(size: 14.5))
                .lineLimit(1...4)
                .padding(.horizontal, 14).padding(.vertical, 12)
                .background(MF.surface)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 16).stroke(MF.border, lineWidth: 1))
            Button { send(nil) } label: {
                Image(systemName: "arrow.up")
                    .font(.system(size: 15, weight: .bold)).foregroundStyle(.white)
                    .frame(width: 46, height: 46)
                    .background(MF.indigoGrad)
                    .clipShape(Circle())
            }
            .buttonStyle(.plain)
            .disabled(input.trimmingCharacters(in: .whitespaces).isEmpty)
            .opacity(input.trimmingCharacters(in: .whitespaces).isEmpty ? 0.4 : 1)
        }
        .padding(.horizontal, 16)
        .padding(.bottom, 10)
    }

    private func send(_ preset: String?) {
        let text = (preset ?? input).trimmingCharacters(in: .whitespaces)
        guard !text.isEmpty, !thinking else { return }
        Haptics.tap()
        input = ""
        messages.append(CopilotMessage(mine: true, text: text))
        thinking = true
        Task {
            try? await Task.sleep(for: .milliseconds(650))
            let answer = CopilotEngine.answer(for: text, profile: state.profile)
            thinking = false
            withAnimation(.easeOut(duration: 0.25)) { messages.append(answer) }
        }
    }

    private func navigate(_ dest: CopilotDestination) {
        switch dest {
        case .tab(let tab): state.tab = tab
        case .guide(let slug):
            state.openGuideSlug = slug
            state.tab = .guides
        }
    }
}
