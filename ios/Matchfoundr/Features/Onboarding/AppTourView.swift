// Start-Assistent — Orientierung nach dem Onboarding, aber als Prozess statt Feature-Tour.

import SwiftUI

struct AppTourView: View {
    @EnvironmentObject private var state: AppState
    @Environment(\.dismiss) private var dismiss

    private var steps: [LaunchGuideStep] { state.launchGuideSteps }
    private var actionableStep: LaunchGuideStep? {
        steps.first { !$0.completed && $0.id != "orientation" }
            ?? steps.first { !$0.completed }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    headerCard
                    rhythmCard
                    roadmap
                }
                .padding(20)
                .padding(.bottom, 108)
            }
            .scrollIndicators(.hidden)
            .background(MF.canvas.ignoresSafeArea())
            .navigationTitle("Start-Assistent")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Später") { closeOnly() }
                        .font(.system(size: 15, weight: .semibold))
                }
            }
            .safeAreaInset(edge: .bottom) {
                footer
            }
        }
    }

    private var headerCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: "map.fill")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 48, height: 48)
                    .background(.white.opacity(0.18))
                    .clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))

                VStack(alignment: .leading, spacing: 4) {
                    Text("Dein erster Ablauf")
                        .font(.system(size: 26, weight: .heavy))
                        .foregroundStyle(.white)
                    Text("Nicht alles suchen. Erst verstehen, dann ein Arbeitsstück bauen, dann echte Signale holen.")
                        .font(.system(size: 14.5))
                        .foregroundStyle(.white.opacity(0.82))
                        .lineSpacing(3)
                }
            }

            GeometryReader { proxy in
                ZStack(alignment: .leading) {
                    Capsule().fill(.white.opacity(0.22))
                    Capsule()
                        .fill(.white)
                        .frame(width: max(18, proxy.size.width * state.launchGuideProgress))
                }
            }
            .frame(height: 8)

            HStack(spacing: 8) {
                guideMetric("\(state.launchGuideCompletedCount)/\(max(steps.count, 1))", "erledigt")
                guideMetric(nextShortTitle, "nächster Schritt")
            }
        }
        .padding(18)
        .background(MF.emberGrad)
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        .emberGlow()
    }

    private var nextShortTitle: String {
        let title = actionableStep?.title ?? "Startklar"
        return title.count > 18 ? String(title.prefix(18)) + "…" : title
    }

    private func guideMetric(_ value: String, _ label: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(value)
                .font(.system(size: 14, weight: .heavy))
                .foregroundStyle(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Text(label)
                .font(.system(size: 11.5, weight: .semibold))
                .foregroundStyle(.white.opacity(0.72))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 12)
        .frame(height: 48)
        .background(.white.opacity(0.14))
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private var rhythmCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            MSectionHead(text: "Wie du starten sollst")
            rhythmRow("1", "Co-Pilot liest Kontext", "Er baut aus Profil, Kalender, Unterlagen und Matches einen Arbeitsstand.")
            rhythmRow("2", "Ein echtes Artefakt entsteht", "Ein Dokument, Workspace oder Termin macht dein Vorhaben greifbar.")
            rhythmRow("3", "Dann erst rausgehen", "Swipe, Partner oder Event liefern ein echtes Signal statt App-Klickerei.")
        }
        .padding(15)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(MF.border, lineWidth: 1))
        .warmShadow()
    }

    private func rhythmRow(_ number: String, _ title: String, _ text: String) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Text(number)
                .font(.system(size: 12, weight: .heavy, design: .rounded))
                .foregroundStyle(MF.emberDeep)
                .frame(width: 26, height: 26)
                .background(MF.emberTint)
                .clipShape(Circle())
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 13.5, weight: .bold))
                    .foregroundStyle(MF.ink)
                Text(text)
                    .font(.system(size: 12.5))
                    .foregroundStyle(MF.smoke)
                    .lineSpacing(2)
            }
        }
    }

    private var roadmap: some View {
        VStack(alignment: .leading, spacing: 12) {
            MSectionHead(text: "Startplan")
            VStack(spacing: 10) {
                ForEach(steps) { step in
                    stepRow(step)
                }
            }
        }
    }

    private func stepRow(_ step: LaunchGuideStep) -> some View {
        let hue = MF.services[step.serviceId] ?? MF.services["cofounder"]!
        return Button {
            guard !step.completed else { return }
            run(step)
        } label: {
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: step.completed ? "checkmark" : step.icon)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(step.completed ? .white : hue.ink)
                    .frame(width: 38, height: 38)
                    .background(step.completed ? hue.hue : hue.tint)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

                VStack(alignment: .leading, spacing: 4) {
                    HStack(alignment: .firstTextBaseline, spacing: 8) {
                        Text(step.title)
                            .font(.system(size: 14.5, weight: .bold))
                            .foregroundStyle(MF.ink)
                            .fixedSize(horizontal: false, vertical: true)
                        Spacer(minLength: 8)
                        Text(step.completed ? "erledigt" : step.actionTitle)
                            .font(.system(size: 11.5, weight: .bold))
                            .foregroundStyle(step.completed ? MF.faint : hue.ink)
                            .lineLimit(1)
                    }
                    Text(step.subtitle)
                        .font(.system(size: 12.5, weight: .semibold))
                        .foregroundStyle(hue.ink)
                        .lineLimit(1)
                    Text(step.detail)
                        .font(.system(size: 12.5))
                        .foregroundStyle(MF.smoke)
                        .lineSpacing(2)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            .padding(14)
            .background(MF.surface)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(step.completed ? hue.hue.opacity(0.45) : MF.border, lineWidth: 1))
            .warmShadow()
        }
        .buttonStyle(.plain)
    }

    private var footer: some View {
        VStack(spacing: 10) {
            Button {
                if let actionableStep {
                    run(actionableStep)
                } else {
                    closeOnly()
                }
            } label: {
                Label(actionableStep?.actionTitle ?? "Heute öffnen", systemImage: actionableStep?.icon ?? "sun.max.fill")
                    .font(.system(size: 15, weight: .heavy))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 52)
                    .background(MF.emberGrad)
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            }
            .buttonStyle(.plain)

            Button {
                closeOnly()
            } label: {
                Text("Ich schaue mich erst um")
                    .font(.system(size: 13.5, weight: .bold))
                    .foregroundStyle(MF.smoke)
                    .frame(maxWidth: .infinity)
                    .frame(height: 42)
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 18)
        .padding(.top, 12)
        .padding(.bottom, 12)
        .background(.ultraThinMaterial)
        .overlay(alignment: .top) { Rectangle().fill(MF.borderSoft).frame(height: 1) }
    }

    private func run(_ step: LaunchGuideStep) {
        state.finishAppTour()
        dismiss()
        Task { @MainActor in
            try? await Task.sleep(nanoseconds: 260_000_000)
            state.startLaunchGuideStep(step)
        }
    }

    private func closeOnly() {
        state.finishAppTour()
        dismiss()
    }
}
