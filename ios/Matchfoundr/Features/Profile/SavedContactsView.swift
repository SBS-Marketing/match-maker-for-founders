// Kontakte, die der Founder aus einer Co-Pilot-Karte in der App abgelegt hat.

import SwiftUI

struct SavedContactsView: View {
    @EnvironmentObject var state: AppState
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 0) {
            MShellTop(
                title: "Kontakte",
                subtitle: state.savedContacts.isEmpty
                    ? "Noch nichts gespeichert"
                    : "\(state.savedContacts.count) gespeichert"
            ) {
                Button {
                    Haptics.tap()
                    dismiss()
                } label: {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(MF.emberDeep)
                        .frame(width: 38, height: 38)
                        .background(MF.emberTint)
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                .buttonStyle(.plain)
            }

            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    if state.savedContacts.isEmpty {
                        emptyState
                    } else {
                        ForEach(state.savedContacts) { contact in
                            CopilotContactCard(card: contact.card)
                                .contextMenu {
                                    Button(role: .destructive) {
                                        state.removeSavedContact(contact.id)
                                    } label: {
                                        Label("Entfernen", systemImage: "trash")
                                    }
                                }
                        }
                    }
                }
                .padding(20)
                .padding(.bottom, 90)
            }
            .scrollIndicators(.hidden)
        }
        .background(MF.canvas.ignoresSafeArea())
        .toolbar(.hidden, for: .navigationBar)
    }

    private var emptyState: some View {
        VStack(alignment: .leading, spacing: 10) {
            Image(systemName: "person.crop.rectangle.stack")
                .font(.system(size: 22, weight: .bold))
                .foregroundStyle(MF.emberDeep)
            Text("Noch keine Kontakte")
                .font(.system(size: 16, weight: .bold))
                .foregroundStyle(MF.ink)
            Text("Wenn der Co-Pilot eine Stelle mit Kontaktdaten findet, kannst du sie direkt aus der Karte hier ablegen.")
                .font(.system(size: 13))
                .foregroundStyle(MF.smoke)
                .fixedSize(horizontal: false, vertical: true)
            Button {
                Haptics.tap()
                state.open(.screen(.copilot))
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "sparkle").font(.system(size: 11, weight: .bold))
                    Text("Co-Pilot öffnen").font(.system(size: 13, weight: .bold))
                }
                .foregroundStyle(.white)
                .padding(.horizontal, 14)
                .frame(height: 38)
                .background(MF.emberGrad)
                .clipShape(Capsule())
            }
            .buttonStyle(.plain)
            .padding(.top, 2)
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(MF.border, lineWidth: 1))
        .warmShadow()
    }
}
