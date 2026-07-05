// Heute — der ruhige Startpunkt. Ein Fokus, kurze Liste, Mini-Pilot.

import SwiftUI

struct TodayView: View {
    @EnvironmentObject var state: AppState
    @State private var done: Set<String> = []
    @State private var pilotInput = ""
    @State private var pilotAnswer: CopilotMessage?

    private var tasks: [(id: String, title: String, dest: CopilotDestination)] {
        let venture = state.profile?.industry.ventureTerm ?? "Vorhaben"
        return [
            ("step", "Deinen ersten Schritt für dein \(venture) machen", .guide("businessplan-light")),
            ("funding", "Förderung für deinen Start prüfen", .guide("foerderung-kleine-gruendungen")),
            ("person", "Eine Person kennenlernen, die mitbauen könnte", .tab(.swipe)),
            ("guide", "5 Minuten Gründerwissen tanken", .tab(.guides)),
        ]
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                header
                focusCard
                todayList
                miniPilot
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 24)
        }
        .scrollIndicators(.hidden)
        .background(MF.canvas.ignoresSafeArea())
    }

    private var header: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 2) {
                Text("Guten Morgen, \(state.profile?.firstName ?? "Founder").")
                    .font(.system(size: 22, weight: .bold)).foregroundStyle(MF.ink)
                Text("\(Date.now.formatted(.dateTime.weekday(.wide).day().month(.wide).locale(Locale(identifier: "de_DE")))) · \(done.count)/\(tasks.count) erledigt")
                    .font(.system(size: 12.5)).foregroundStyle(MF.smoke)
            }
            Spacer()
            MFLogo(size: 15)
        }
        .padding(.top, 10)
    }

    private var focusCard: some View {
        let next = tasks.first { !done.contains($0.id) }
        return VStack(alignment: .leading, spacing: 10) {
            Eyebrow(text: "Dein nächster Schritt", color: .white.opacity(0.75))
            Text(next?.title ?? "Alles erledigt für heute. 🎉")
                .font(.system(size: 20, weight: .bold))
                .foregroundStyle(.white)
                .fixedSize(horizontal: false, vertical: true)
            HStack(spacing: 10) {
                if let next {
                    Button {
                        Haptics.tap()
                        navigate(next.dest)
                    } label: {
                        HStack(spacing: 6) {
                            Text("Loslegen").font(.system(size: 14, weight: .semibold))
                            Image(systemName: "arrow.right").font(.system(size: 12, weight: .semibold))
                        }
                        .foregroundStyle(MF.emberDeep)
                        .padding(.horizontal, 18).frame(height: 44)
                        .background(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
                    }
                    .buttonStyle(.plain)
                    Button {
                        Haptics.success()
                        withAnimation { _ = done.insert(next.id) }
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: "checkmark").font(.system(size: 12, weight: .bold))
                            Text("Erledigt").font(.system(size: 14, weight: .semibold))
                        }
                        .foregroundStyle(.white)
                        .padding(.horizontal, 16).frame(height: 44)
                        .background(.white.opacity(0.14))
                        .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: 13).stroke(.white.opacity(0.3), lineWidth: 1))
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.top, 4)
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(MF.emberGrad)
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .emberGlow()
    }

    private var todayList: some View {
        VStack(alignment: .leading, spacing: 4) {
            Eyebrow(text: "Heute")
                .padding(.bottom, 6)
            ForEach(tasks, id: \.id) { task in
                HStack(spacing: 11) {
                    Button {
                        Haptics.select()
                        withAnimation {
                            if done.contains(task.id) { done.remove(task.id) } else { done.insert(task.id) }
                        }
                    } label: {
                        Image(systemName: done.contains(task.id) ? "checkmark.square.fill" : "square")
                            .font(.system(size: 20))
                            .foregroundStyle(done.contains(task.id) ? MF.ember : MF.border)
                    }
                    .buttonStyle(.plain)
                    Text(task.title)
                        .font(.system(size: 14))
                        .foregroundStyle(done.contains(task.id) ? MF.faint : MF.ink)
                        .strikethrough(done.contains(task.id), color: MF.faint)
                        .lineLimit(1)
                    Spacer()
                    Button {
                        navigate(task.dest)
                    } label: {
                        Image(systemName: "arrow.right")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(MF.faint)
                    }
                    .buttonStyle(.plain)
                }
                .padding(.vertical, 9)
                if task.id != tasks.last?.id {
                    Divider().overlay(MF.borderSoft)
                }
            }
        }
        .warmCard()
    }

    private var miniPilot: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 9) {
                Image(systemName: "sparkles")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 28, height: 28)
                    .background(MF.indigoGrad)
                    .clipShape(RoundedRectangle(cornerRadius: 9, style: .continuous))
                Eyebrow(text: "Frag den Co-Pilot")
            }

            if let answer = pilotAnswer {
                VStack(alignment: .leading, spacing: 10) {
                    Text(answer.text)
                        .font(.system(size: 13.5)).foregroundStyle(MF.ink)
                        .lineSpacing(3)
                    if !answer.navigation.isEmpty {
                        FlowLayout(spacing: 7) {
                            ForEach(answer.navigation) { nav in
                                Button {
                                    navigate(nav.destination)
                                } label: {
                                    HStack(spacing: 5) {
                                        Text(nav.label).font(.system(size: 12, weight: .semibold))
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
                .padding(13)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(MF.surfaceSoft)
                .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
            } else {
                Text("„Wo fange ich an?“ · „Was kostet die Gründung?“ · „Wer hilft mir?“")
                    .font(.system(size: 12.5)).foregroundStyle(MF.faint)
                    .padding(13)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(MF.surfaceSoft)
                    .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
            }

            HStack(spacing: 8) {
                TextField("Frag mich was…", text: $pilotInput)
                    .font(.system(size: 14))
                    .padding(.horizontal, 13).frame(height: 44)
                    .background(MF.surface)
                    .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 13).stroke(MF.border, lineWidth: 1))
                    .onSubmit(ask)
                Button(action: ask) {
                    Image(systemName: "arrow.up")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(width: 44, height: 44)
                        .background(MF.indigoGrad)
                        .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
                }
                .buttonStyle(.plain)
                .disabled(pilotInput.trimmingCharacters(in: .whitespaces).isEmpty)
                .opacity(pilotInput.trimmingCharacters(in: .whitespaces).isEmpty ? 0.4 : 1)
            }
        }
        .warmCard()
    }

    private func ask() {
        let text = pilotInput.trimmingCharacters(in: .whitespaces)
        guard !text.isEmpty else { return }
        Haptics.tap()
        pilotInput = ""
        withAnimation { pilotAnswer = CopilotEngine.answer(for: text, profile: state.profile) }
    }

    private func navigate(_ dest: CopilotDestination) {
        Haptics.tap()
        switch dest {
        case .tab(let tab): state.tab = tab
        case .guide(let slug):
            state.openGuideSlug = slug
            state.tab = .guides
        }
    }
}
