import SwiftUI

struct FounderRadarView: View {
    @EnvironmentObject private var state: AppState
    @State private var didAutoRefresh = false

    private var brief: FounderRadarBrief {
        state.currentFounderRadarBrief()
    }

    var body: some View {
        VStack(spacing: 0) {
            MShellTop(title: "Business Radar", subtitle: "Tragfähigkeitscheck aus deinem Workspace") {
                Button {
                    Task { await refresh() }
                } label: {
                    Image(systemName: "arrow.clockwise")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(MF.indigoInk)
                        .frame(width: 38, height: 38)
                        .background(MF.indigoTint)
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                .buttonStyle(.plain)
                .disabled(state.founderRadarState == .loading)
            }

            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    hero
                    signalGrid
                    riskOpportunity
                    boardQuestion
                    moves
                    sourceNote
                }
                .padding(20)
                .padding(.bottom, 90)
            }
            .scrollIndicators(.hidden)
        }
        .background(MF.canvas.ignoresSafeArea())
        .navigationTitle("Business Radar")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            guard !didAutoRefresh else { return }
            didAutoRefresh = true
            if state.founderRadarBrief == nil {
                await refresh()
            }
        }
    }

    private var hero: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .center, spacing: 15) {
                RadarScoreView(score: brief.overallScore)
                VStack(alignment: .leading, spacing: 5) {
                    HStack(spacing: 7) {
                        Text(brief.scoreLabel)
                            .font(.system(size: 12.5, weight: .heavy))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 10)
                            .frame(height: 27)
                            .background(.white.opacity(0.16))
                            .clipShape(Capsule())
                        Text(brief.source.label)
                            .font(.mfMono(9))
                            .foregroundStyle(.white.opacity(0.72))
                    }
                    Text(brief.title)
                        .font(.system(size: 20, weight: .heavy))
                        .foregroundStyle(.white)
                        .fixedSize(horizontal: false, vertical: true)
                    Text(brief.urgency)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(.white.opacity(0.72))
                }
            }

            Text(brief.verdict)
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(.white.opacity(0.92))
                .lineSpacing(3)
                .fixedSize(horizontal: false, vertical: true)

            HStack(spacing: 9) {
                Button {
                    state.installFounderRadarSprint(brief)
                } label: {
                    Label("Sprint setzen", systemImage: "calendar.badge.plus")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(MF.indigoInk)
                        .frame(maxWidth: .infinity)
                        .frame(height: 44)
                        .background(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
                }
                .buttonStyle(.plain)

                Button {
                    state.queueFounderRadarCopilot(brief)
                } label: {
                    Label("Durchgehen", systemImage: "sparkles")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 44)
                        .background(.white.opacity(0.14))
                        .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: 13).stroke(.white.opacity(0.24), lineWidth: 1))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(MF.indigoGrad)
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        .indigoGlow()
    }

    private var signalGrid: some View {
        LazyVGrid(columns: [.init(.flexible(), spacing: 10), .init(.flexible())], spacing: 10) {
            ForEach(brief.signals) { signal in
                VStack(alignment: .leading, spacing: 10) {
                    HStack {
                        Text(signal.label)
                            .font(.system(size: 13, weight: .bold))
                            .foregroundStyle(MF.ink)
                        Spacer()
                        Text("\(signal.score)")
                            .font(.system(size: 18, weight: .heavy))
                            .foregroundStyle(signal.score >= 70 ? MF.indigoInk : MF.emberDeep)
                    }
                    ProgressView(value: Double(signal.score), total: 100)
                        .tint(signal.score >= 70 ? MF.indigo : MF.ember)
                    Text(signal.note)
                        .font(.system(size: 12.2))
                        .foregroundStyle(MF.smoke)
                        .lineLimit(3)
                    Text(signal.trend)
                        .font(.mfMono(9))
                        .foregroundStyle(MF.faint)
                }
                .padding(13)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(MF.surface)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 16).stroke(MF.border, lineWidth: 1))
                .warmShadow()
            }
        }
    }

    private var riskOpportunity: some View {
        HStack(alignment: .top, spacing: 10) {
            insightCard(
                icon: "exclamationmark.triangle.fill",
                title: "Blind Spot",
                text: brief.primaryRisk,
                tint: MF.emberTint,
                ink: MF.emberDeep
            )
            insightCard(
                icon: "bolt.fill",
                title: "Hebel",
                text: brief.hiddenOpportunity,
                tint: MF.indigoTint,
                ink: MF.indigoInk
            )
        }
    }

    private func insightCard(icon: String, title: String, text: String, tint: Color, ink: Color) -> some View {
        VStack(alignment: .leading, spacing: 9) {
            Image(systemName: icon)
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(ink)
                .frame(width: 32, height: 32)
                .background(tint)
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            Text(title)
                .font(.system(size: 13, weight: .heavy))
                .foregroundStyle(MF.ink)
            Text(text)
                .font(.system(size: 12.5))
                .foregroundStyle(MF.smoke)
                .lineSpacing(2)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(13)
        .frame(maxWidth: .infinity, alignment: .topLeading)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(MF.border, lineWidth: 1))
        .warmShadow()
    }

    private var boardQuestion: some View {
        VStack(alignment: .leading, spacing: 10) {
            Eyebrow(text: "Gründungsfrage", color: MF.indigoInk)
            Text(brief.investorQuestion)
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(MF.ink)
                .fixedSize(horizontal: false, vertical: true)
            Button {
                state.queueCopilotPrompt(
                    "Beantworte mit mir diese Gründungsfrage aus dem Business Radar: \(brief.investorQuestion)",
                    title: "Gründungsfrage"
                )
            } label: {
                Label("Mit Co-Pilot beantworten", systemImage: "sparkles")
                    .font(.system(size: 13.5, weight: .bold))
                    .foregroundStyle(MF.indigoInk)
                    .padding(.horizontal, 13)
                    .frame(height: 36)
                    .background(MF.indigoTint)
                    .clipShape(Capsule())
            }
            .buttonStyle(.plain)
        }
        .warmCard()
    }

    private var moves: some View {
        VStack(alignment: .leading, spacing: 10) {
            MSectionHead(text: "Nächste Moves")
            ForEach(brief.moves) { move in
                moveRow(move)
            }
        }
    }

    private func moveRow(_ move: FounderRadarMove) -> some View {
        let hue = MF.services[move.kind.serviceId] ?? MF.services["cofounder"]!
        return HStack(alignment: .top, spacing: 12) {
            Image(systemName: move.kind.icon)
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(hue.ink)
                .frame(width: 38, height: 38)
                .background(hue.tint)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

            VStack(alignment: .leading, spacing: 5) {
                HStack(spacing: 7) {
                    Text(move.dueLabel)
                        .font(.system(size: 11.5, weight: .bold))
                        .foregroundStyle(hue.ink)
                    Text("· \(move.kind.label)")
                        .font(.system(size: 11.5, weight: .semibold))
                        .foregroundStyle(MF.faint)
                }
                Text(move.title)
                    .font(.system(size: 14.5, weight: .bold))
                    .foregroundStyle(MF.ink)
                    .fixedSize(horizontal: false, vertical: true)
                Text(move.reason)
                    .font(.system(size: 12.5))
                    .foregroundStyle(MF.smoke)
                    .lineSpacing(2)
                Text("Erfolg: \(move.successMetric)")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(MF.indigoInk)
                    .fixedSize(horizontal: false, vertical: true)
                HStack(spacing: 7) {
                    Button {
                        state.addPlannerItem(
                            title: move.title,
                            note: "\(move.reason)\nErfolgskriterium: \(move.successMetric)",
                            dueLabel: move.dueLabel,
                            kind: move.kind,
                            target: move.target,
                            createdByCopilot: true
                        )
                    } label: {
                        Label("Einplanen", systemImage: "plus")
                            .font(.system(size: 12.5, weight: .bold))
                            .foregroundStyle(hue.ink)
                            .padding(.horizontal, 11)
                            .frame(height: 31)
                            .background(hue.tint)
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)

                    Button {
                        state.open(move.target.destination)
                    } label: {
                        Label(move.target.title, systemImage: "arrow.right")
                            .font(.system(size: 12.5, weight: .bold))
                            .foregroundStyle(MF.smoke)
                            .padding(.horizontal, 11)
                            .frame(height: 31)
                            .background(MF.surfaceSoft)
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                }
                .padding(.top, 2)
            }
            Spacer(minLength: 0)
        }
        .padding(14)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(MF.border, lineWidth: 1))
        .warmShadow()
    }

    private var sourceNote: some View {
        let isLoading = state.founderRadarState == .loading
        return HStack(spacing: 10) {
            if isLoading {
                ProgressView()
                    .controlSize(.small)
                    .tint(MF.indigo)
            } else {
                Image(systemName: brief.source == .live ? "checkmark.seal.fill" : "server.rack")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(brief.source == .live ? Color.green : MF.faint)
            }
            Text(sourceText)
                .font(.system(size: 12.5, weight: .semibold))
                .foregroundStyle(MF.faint)
            Spacer()
        }
        .padding(13)
        .background(MF.surfaceSoft)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private var sourceText: String {
        switch state.founderRadarState {
        case .loading:
            return "Live-Radar wird mit Supabase/KI aktualisiert..."
        case .failed(let message):
            return "Lokaler Radar aktiv · Live noch nicht erreichbar: \(message)"
        case .loaded:
            return "Live-Brief gespeichert · \(brief.generatedAt.formatted(.dateTime.hour().minute()))"
        case .idle:
            return "Lokaler Brief bereit · zum Aktualisieren oben tippen."
        }
    }

    private func refresh() async {
        Haptics.tap()
        await state.refreshFounderRadar()
    }
}

private struct RadarScoreView: View {
    let score: Int

    var body: some View {
        ZStack {
            Circle()
                .stroke(.white.opacity(0.18), lineWidth: 9)
            Circle()
                .trim(from: 0, to: CGFloat(min(max(score, 0), 100)) / 100)
                .stroke(.white, style: StrokeStyle(lineWidth: 9, lineCap: .round))
                .rotationEffect(.degrees(-90))
            VStack(spacing: 0) {
                Text("\(score)")
                    .font(.system(size: 25, weight: .heavy, design: .rounded))
                    .foregroundStyle(.white)
                Text("Score")
                    .font(.mfMono(9))
                    .foregroundStyle(.white.opacity(0.7))
            }
        }
        .frame(width: 84, height: 84)
    }
}
