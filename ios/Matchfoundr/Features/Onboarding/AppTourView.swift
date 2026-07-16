// App-Tour — kurze native Orientierung nach dem Onboarding und aus dem Profil.

import SwiftUI

struct AppTourView: View {
    @EnvironmentObject private var state: AppState
    @Environment(\.dismiss) private var dismiss
    @State private var pageIndex = 0

    private let pages: [AppTourPage] = [
        .init(
            icon: "sun.max.fill",
            title: "Heute ist deine Kommandozentrale.",
            text: "Hier siehst du Fokus, neue Matches, wartende Chats, Swipes, Community-Puls und den nächsten Schritt aus deinem Gründer-Memory.",
            bullets: ["Matches und ungelesene Chats im Blick", "Direkt in Kalender, Startup oder Co-Pilot springen", "Tagesfokus ohne To-do-Überladung"],
            colors: [Color(hex: 0xFF7A1A), Color(hex: 0xFFB04F)],
            destination: .tab(.today)
        ),
        .init(
            icon: "person.2.fill",
            title: "Entdecken verbindet Menschen und Wissen.",
            text: "Swipe durch passende Gründerprofile, öffne Guides, Events, Unterlagen, Firmenprofil und Startup-Flächen von einem Ort aus.",
            bullets: ["Tinder-Stil für Co-Founder-Matches", "Guides und Events mit DACH-Fokus", "Firmenprofil und Unterlagen nah am Matching"],
            colors: [Color(hex: 0x273F96), Color(hex: 0x6375D6)],
            destination: .screen(.swipe)
        ),
        .init(
            icon: "sparkles",
            title: "Der Co-Pilot soll mitarbeiten.",
            text: "Er liest Profil, Firmenprofil, Kalender, Unterlagen, Matches und Sessions. Er kann Chats öffnen, Nachrichten entwerfen und Aufgaben in der App anstoßen.",
            bullets: ["Gespeicherte KI-Themen statt Einmal-Chat", "Kontext aus Kalender und Matches wird mitgegeben", "Aktionen führen direkt in die App"],
            colors: [Color(hex: 0x273F96), Color(hex: 0x8A76FF)],
            destination: .screen(.copilot)
        ),
        .init(
            icon: "calendar.badge.clock",
            title: "Kalender und Startup hängen zusammen.",
            text: "Monatsansicht, Termine, Team-Zuständigkeit und Co-Pilot-Kontext greifen ineinander, damit Aufgaben nicht lose herumliegen.",
            bullets: ["Termine mit Teammitgliedern verbinden", "Einzelne Termine mit Co-Pilot durchgehen", "Startup Workspace für Zusammenarbeit öffnen"],
            colors: [Color(hex: 0x0B6B57), Color(hex: 0x2E9E50)],
            destination: .screen(.calendar)
        ),
        .init(
            icon: "person.crop.circle.fill",
            title: "Profil bleibt dein Kontrollraum.",
            text: "Bearbeite dein persönliches Profil, Firmenprofil, Unterlagen, Premium und starte Onboarding oder Tour jederzeit neu.",
            bullets: ["Profil und Firmenprofil bearbeiten", "Backend-Status prüfen", "Onboarding bei Bedarf komplett neu starten"],
            colors: [Color(hex: 0xC8521A), Color(hex: 0xFF7A1A)],
            destination: .tab(.profile)
        ),
    ]

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                TabView(selection: $pageIndex) {
                    ForEach(Array(pages.enumerated()), id: \.element.id) { index, page in
                        tourPage(page)
                            .tag(index)
                    }
                }
                .tabViewStyle(.page(indexDisplayMode: .never))

                footer
            }
            .background(MF.canvas.ignoresSafeArea())
            .navigationTitle("App-Tour")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Fertig") {
                        finish()
                    }
                    .font(.system(size: 15, weight: .semibold))
                }
            }
        }
    }

    private var currentPage: AppTourPage {
        pages[min(pageIndex, pages.count - 1)]
    }

    private func tourPage(_ page: AppTourPage) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                iconStage(page)
                    .padding(.top, 18)

                VStack(alignment: .leading, spacing: 9) {
                    Text(page.title)
                        .font(.system(size: 28, weight: .heavy))
                        .foregroundStyle(MF.ink)
                        .fixedSize(horizontal: false, vertical: true)
                    Text(page.text)
                        .font(.system(size: 15))
                        .foregroundStyle(MF.smoke)
                        .lineSpacing(4)
                        .fixedSize(horizontal: false, vertical: true)
                }

                VStack(spacing: 10) {
                    ForEach(page.bullets, id: \.self) { bullet in
                        HStack(alignment: .top, spacing: 10) {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundStyle(page.colors.first ?? MF.ember)
                                .padding(.top, 1)
                            Text(bullet)
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundStyle(MF.inkSoft)
                                .fixedSize(horizontal: false, vertical: true)
                            Spacer(minLength: 0)
                        }
                        .padding(13)
                        .background(MF.surface)
                        .clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: 15).stroke(MF.border, lineWidth: 1))
                    }
                }
            }
            .padding(20)
            .padding(.bottom, 10)
        }
        .scrollIndicators(.hidden)
    }

    private func iconStage(_ page: AppTourPage) -> some View {
        ZStack {
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .fill(LinearGradient(colors: page.colors, startPoint: .topLeading, endPoint: .bottomTrailing))
            VStack(spacing: 14) {
                Image(systemName: page.icon)
                    .font(.system(size: 45, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 92, height: 92)
                    .background(.white.opacity(0.18))
                    .clipShape(RoundedRectangle(cornerRadius: 26, style: .continuous))
                Text("matchfoundr")
                    .font(.system(size: 16, weight: .heavy))
                    .foregroundStyle(.white.opacity(0.9))
            }
        }
        .frame(height: 210)
        .warmShadow(large: true)
    }

    private var footer: some View {
        VStack(spacing: 12) {
            HStack(spacing: 6) {
                ForEach(pages.indices, id: \.self) { index in
                    Capsule()
                        .fill(index == pageIndex ? MF.ember : MF.border)
                        .frame(width: index == pageIndex ? 24 : 7, height: 7)
                        .animation(.easeOut(duration: 0.2), value: pageIndex)
                }
            }

            HStack(spacing: 10) {
                Button {
                    openCurrentDestination()
                } label: {
                    Text("Bereich öffnen")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(MF.emberDeep)
                        .frame(maxWidth: .infinity)
                        .frame(height: 46)
                        .background(MF.emberTint)
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
                .buttonStyle(.plain)

                Button {
                    next()
                } label: {
                    Text(pageIndex == pages.count - 1 ? "Loslegen" : "Weiter")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 46)
                        .background(MF.emberGrad)
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 18)
        .padding(.top, 12)
        .padding(.bottom, 14)
        .background(MF.surface)
        .overlay(alignment: .top) { Rectangle().fill(MF.borderSoft).frame(height: 1) }
    }

    private func next() {
        Haptics.select()
        if pageIndex < pages.count - 1 {
            withAnimation(.easeOut(duration: 0.22)) {
                pageIndex += 1
            }
        } else {
            finish()
        }
    }

    private func openCurrentDestination() {
        Haptics.tap()
        state.open(currentPage.destination)
        finish()
    }

    private func finish() {
        state.finishAppTour()
        dismiss()
    }
}

private struct AppTourPage: Identifiable {
    let id = UUID()
    let icon: String
    let title: String
    let text: String
    let bullets: [String]
    let colors: [Color]
    let destination: CopilotDestination
}
