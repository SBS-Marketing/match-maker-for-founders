// Unterlagen — native Version der Web-Route /unterlagen:
// Paketstatus, Checkliste und Co-Pilot-Arbeitsentwurf.

import SwiftUI

struct DocumentsView: View {
    @EnvironmentObject private var state: AppState
    @State private var panel: Panel = .checklist

    private enum Panel: String, CaseIterable, Identifiable {
        case checklist, draft
        var id: String { rawValue }
        var label: String { self == .checklist ? "Checkliste" : "Entwurf" }
    }

    private var doneCount: Int { state.documents.filter(\.done).count }
    private var progress: Double {
        guard !state.documents.isEmpty else { return 0 }
        return Double(doneCount) / Double(state.documents.count)
    }

    var body: some View {
        VStack(spacing: 0) {
            MShellTop(title: "Unterlagen", subtitle: "Förderung, Plan, Nachweise") {
                Button {
                    state.generateDocumentDraft()
                    panel = .draft
                } label: {
                    Image(systemName: "wand.and.stars")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(width: 38, height: 38)
                        .background(MF.indigoGrad)
                        .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
                }
                .buttonStyle(.plain)
            }

            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    statusCard
                    Picker("Ansicht", selection: $panel) {
                        ForEach(Panel.allCases) { panel in
                            Text(panel.label).tag(panel)
                        }
                    }
                    .pickerStyle(.segmented)

                    if panel == .checklist {
                        checklist
                    } else {
                        draftEditor
                    }
                }
                .padding(20)
                .padding(.bottom, 90)
            }
            .scrollIndicators(.hidden)
        }
        .background(MF.canvas.ignoresSafeArea())
        .navigationTitle("Unterlagen")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var statusCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .center, spacing: 13) {
                Image(systemName: "folder.fill")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 46, height: 46)
                    .background(.white.opacity(0.14))
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                VStack(alignment: .leading, spacing: 2) {
                    Text("Paketstatus")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(.white)
                    Text(state.companyProfile.name)
                        .font(.system(size: 12.5))
                        .foregroundStyle(.white.opacity(0.62))
                        .lineLimit(1)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 1) {
                    Text("\(Int(progress * 100))%")
                        .font(.system(size: 30, weight: .heavy))
                        .foregroundStyle(.white)
                    Text("\(doneCount)/\(state.documents.count)")
                        .font(.mfMono(10))
                        .foregroundStyle(.white.opacity(0.55))
                }
            }

            GeometryReader { proxy in
                ZStack(alignment: .leading) {
                    Capsule().fill(.white.opacity(0.14))
                    Capsule()
                        .fill(.white)
                        .frame(width: max(8, proxy.size.width * progress))
                }
            }
            .frame(height: 8)

            Button {
                state.generateDocumentDraft()
                panel = .draft
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "sparkles")
                    Text("Co-Pilot Entwurf erstellen")
                        .font(.system(size: 14, weight: .bold))
                }
                .foregroundStyle(MF.ink)
                .frame(maxWidth: .infinity)
                .frame(height: 44)
                .background(.white)
                .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
            }
            .buttonStyle(.plain)
        }
        .padding(18)
        .background(MF.ink)
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        .warmShadow(large: true)
    }

    private var checklist: some View {
        VStack(spacing: 10) {
            ForEach(state.documents) { document in
                Button {
                    state.toggleDocument(document.id)
                } label: {
                    HStack(alignment: .top, spacing: 12) {
                        Image(systemName: document.done ? "checkmark" : "doc.text.fill")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(document.done ? .white : MF.smoke)
                            .frame(width: 38, height: 38)
                            .background(document.done ? MF.ember : MF.surfaceSoft)
                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                        VStack(alignment: .leading, spacing: 4) {
                            Text(document.title)
                                .font(.system(size: 14.5, weight: .bold))
                                .foregroundStyle(MF.ink)
                            Text(document.note)
                                .font(.system(size: 12.5))
                                .foregroundStyle(MF.smoke)
                                .lineSpacing(2)
                                .multilineTextAlignment(.leading)
                        }
                        Spacer()
                    }
                    .padding(14)
                    .background(MF.surface)
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 16).stroke(MF.border, lineWidth: 1))
                    .warmShadow()
                }
                .buttonStyle(.plain)
            }
        }
    }

    private var draftEditor: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Eyebrow(text: "Co-Pilot Entwurf", color: MF.indigoInk)
                Spacer()
                Button {
                    state.open(.screen(.copilot))
                } label: {
                    Text("Weiter schreiben")
                        .font(.system(size: 12.5, weight: .semibold))
                        .foregroundStyle(MF.indigoInk)
                }
                .buttonStyle(.plain)
            }
            TextField("Entwurf", text: $state.documentDraft, axis: .vertical)
                .font(.system(size: 14))
                .foregroundStyle(MF.ink)
                .submitLabel(.return)
                .lineSpacing(4)
                .lineLimit(12...22)
                .padding(15)
                .background(MF.surface)
                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 18).stroke(MF.border, lineWidth: 1))
                .warmShadow()
        }
    }
}
