// Unterlagen — Arbeitsraum für Uploads, editierbare Entwürfe,
// echte PDF-Erzeugung und Co-Pilot-Begleitung.

import SwiftUI
import UniformTypeIdentifiers
#if canImport(UIKit)
import UIKit
#endif
#if canImport(QuickLook)
import QuickLook
#endif

struct DocumentsView: View {
    @EnvironmentObject private var state: AppState
    @State private var panel: Panel = .workspace
    @State private var showingImporter = false
    @State private var preview: DocumentPreview?
    @State private var handoffShare: HandoffShare?
    @State private var handoffError: String?

    private enum Panel: String, CaseIterable, Identifiable {
        case workspace, files, draft, checklist
        var id: String { rawValue }
        var label: String {
            switch self {
            case .workspace: "Ablauf"
            case .files: "Dateien"
            case .draft: "Entwurf"
            case .checklist: "Check"
            }
        }
    }

    private var doneCount: Int { state.documents.filter(\.done).count }
    private var progress: Double {
        guard !state.documents.isEmpty else { return 0 }
        return Double(doneCount) / Double(state.documents.count)
    }

    var body: some View {
        VStack(spacing: 0) {
            MShellTop(title: "Unterlagen", subtitle: "\(state.documentAssets.count) Dateien · \(doneCount)/\(state.documents.count) Check") {
                HStack(spacing: 8) {
                    headerButton("tray.and.arrow.up.fill") {
                        showingImporter = true
                    }
                    headerButton("shippingbox.fill") {
                        createAIHandoff()
                    }
                    headerButton("sparkles") {
                        state.startDocumentCopilot(task: "Unterlagen prüfen")
                    }
                }
            }

            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    documentStudioCard

                    Picker("Ansicht", selection: $panel) {
                        ForEach(Panel.allCases) { panel in
                            Text(panel.label).tag(panel)
                        }
                    }
                    .pickerStyle(.segmented)

                    switch panel {
                    case .workspace: workspacePanel
                    case .files: filesPanel
                    case .draft: draftEditor
                    case .checklist: checklist
                    }
                }
                .padding(20)
                .padding(.bottom, 110)
            }
            .scrollIndicators(.hidden)
        }
        .background(MF.canvas.ignoresSafeArea())
        .navigationTitle("Unterlagen")
        .navigationBarTitleDisplayMode(.inline)
        .fileImporter(
            isPresented: $showingImporter,
            allowedContentTypes: [.pdf, .plainText, .text, .image, .data],
            allowsMultipleSelection: true
        ) { result in
            if case .success(let urls) = result {
                let imported = state.importDocumentFiles(urls)
                if !imported.isEmpty {
                    panel = .files
                }
            }
        }
        .sheet(item: $preview) { preview in
            #if canImport(QuickLook)
            QuickLookPreview(url: preview.url)
                .ignoresSafeArea()
            #else
            Text(preview.url.lastPathComponent)
                .font(.system(size: 15, weight: .semibold))
                .padding()
            #endif
        }
        .sheet(item: $handoffShare) { share in
            #if canImport(UIKit)
            ActivityShareSheet(items: share.urls)
                .ignoresSafeArea()
            #else
            Text("AI-Handoff erstellt: \(share.urls.count) Dateien")
                .font(.system(size: 15, weight: .semibold))
                .padding()
            #endif
        }
    }

    private func headerButton(_ icon: String, action: @escaping () -> Void) -> some View {
        Button {
            Haptics.tap()
            action()
        } label: {
            Image(systemName: icon)
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(icon == "sparkles" ? .white : MF.indigoInk)
                .frame(width: 38, height: 38)
                .background(icon == "sparkles" ? AnyShapeStyle(MF.indigoGrad) : AnyShapeStyle(MF.indigoTint))
                .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
        }
        .buttonStyle(.plain)
    }

    private var documentStudioCard: some View {
        VStack(alignment: .leading, spacing: 15) {
            HStack(alignment: .center, spacing: 13) {
                Image(systemName: "folder.fill")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 46, height: 46)
                    .background(.white.opacity(0.14))
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                VStack(alignment: .leading, spacing: 2) {
                    Text("Unterlagen-Workspace")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(.white)
                    Text("Upload, Entwurf, PDF und Co-Pilot in einem Ablauf")
                        .font(.system(size: 12.5))
                        .foregroundStyle(.white.opacity(0.68))
                        .lineLimit(2)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 1) {
                    Text("\(Int(progress * 100))%")
                        .font(.system(size: 29, weight: .heavy))
                        .foregroundStyle(.white)
                    Text("\(state.documentAssets.count) Dateien")
                        .font(.mfMono(10))
                        .foregroundStyle(.white.opacity(0.58))
                }
            }

            GeometryReader { proxy in
                ZStack(alignment: .leading) {
                    Capsule().fill(.white.opacity(0.15))
                    Capsule()
                        .fill(.white)
                        .frame(width: max(8, proxy.size.width * progress))
                }
            }
            .frame(height: 8)

            HStack(spacing: 9) {
                compactAction("Upload", "tray.and.arrow.up.fill") {
                    showingImporter = true
                }
                compactAction("Co-Pilot", "sparkles") {
                    state.startDocumentCopilot(task: "Unterlagen prüfen")
                }
                compactAction("PDF", "doc.richtext.fill") {
                    if let asset = state.exportDocumentDraftPDF() {
                        panel = .files
                        if let url = state.documentAssetURL(asset) {
                            preview = DocumentPreview(url: url)
                        }
                    } else {
                        panel = .draft
                    }
                }
                compactAction("Handoff", "shippingbox.fill") {
                    createAIHandoff()
                }
            }

            if let handoffError {
                Text(handoffError)
                    .font(.system(size: 12.5, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.82))
                    .lineLimit(2)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.top, 2)
            }
        }
        .padding(18)
        .background(MF.ink)
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        .warmShadow(large: true)
    }

    private func compactAction(_ title: String, _ icon: String, action: @escaping () -> Void) -> some View {
        Button {
            Haptics.tap()
            action()
        } label: {
            VStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.system(size: 13, weight: .bold))
                Text(title)
                    .font(.system(size: 12, weight: .bold))
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
            .foregroundStyle(MF.ink)
            .frame(maxWidth: .infinity)
            .frame(height: 58)
            .background(.white)
            .clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))
        }
        .buttonStyle(.plain)
    }

    private var workspacePanel: some View {
        VStack(alignment: .leading, spacing: 12) {
            workflowRow(
                number: "1",
                title: "Unterlage hochladen",
                text: state.documentAssets.isEmpty ? "PDF, Text, Bild oder Export aus Dateien importieren." : "\(state.documentAssets.count) Dateien liegen bereit.",
                icon: "tray.and.arrow.up.fill",
                actionTitle: "Hochladen"
            ) {
                showingImporter = true
            }
            workflowRow(
                number: "2",
                title: "Mit Co-Pilot prüfen",
                text: "Der Co-Pilot bekommt Entwurf, Datei-Vorschauen und deinen Gründer-Kontext.",
                icon: "sparkles",
                actionTitle: "Prüfen"
            ) {
                state.startDocumentCopilot(task: "Unterlagen prüfen und nächste Bearbeitungsschritte führen")
            }
            workflowRow(
                number: "3",
                title: "Entwurf bearbeiten oder PDF erzeugen",
                text: "Schreibe direkt in der App weiter und exportiere daraus eine echte PDF-Datei.",
                icon: "doc.richtext.fill",
                actionTitle: "Zum Entwurf"
            ) {
                panel = .draft
            }
            workflowRow(
                number: "4",
                title: "An eigene KI übergeben",
                text: "Erstellt ein MCP-kompatibles Paket mit Manifest, Prompt, Entwurf und deinen Dateien.",
                icon: "shippingbox.fill",
                actionTitle: "Handoff"
            ) {
                createAIHandoff()
            }
        }
    }

    private func workflowRow(
        number: String,
        title: String,
        text: String,
        icon: String,
        actionTitle: String,
        action: @escaping () -> Void
    ) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Text(number)
                .font(.system(size: 13, weight: .heavy))
                .foregroundStyle(.white)
                .frame(width: 32, height: 32)
                .background(MF.emberGrad)
                .clipShape(RoundedRectangle(cornerRadius: 11, style: .continuous))
            VStack(alignment: .leading, spacing: 5) {
                Text(title)
                    .font(.system(size: 14.5, weight: .bold))
                    .foregroundStyle(MF.ink)
                Text(text)
                    .font(.system(size: 12.5))
                    .foregroundStyle(MF.smoke)
                    .lineSpacing(2)
            }
            Spacer(minLength: 8)
            Button {
                Haptics.tap()
                action()
            } label: {
                Image(systemName: icon)
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(MF.indigoInk)
                    .frame(width: 38, height: 38)
                    .background(MF.indigoTint)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .accessibilityLabel(actionTitle)
            }
            .buttonStyle(.plain)
        }
        .padding(14)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 17, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 17).stroke(MF.border, lineWidth: 1))
        .warmShadow()
    }

    @ViewBuilder
    private var filesPanel: some View {
        if state.documentAssets.isEmpty {
            VStack(alignment: .leading, spacing: 12) {
                Image(systemName: "tray.and.arrow.up.fill")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(MF.indigoInk)
                    .frame(width: 46, height: 46)
                    .background(MF.indigoTint)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                Text("Noch keine Unterlagen hochgeladen")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(MF.ink)
                Text("Importiere PDF, Text oder Bilddateien. Lesbare PDF-/Textinhalte landen als Vorschau im Co-Pilot-Kontext.")
                    .font(.system(size: 13))
                    .foregroundStyle(MF.smoke)
                    .lineSpacing(3)
                MFPrimaryButton(title: "Datei hochladen", icon: "plus") {
                    showingImporter = true
                }
            }
            .warmCard()
        } else {
            VStack(spacing: 10) {
                ForEach(state.documentAssets) { asset in
                    assetRow(asset)
                }
            }
        }
    }

    private func assetRow(_ asset: FounderDocumentAsset) -> some View {
        let url = state.documentAssetURL(asset)
        return VStack(alignment: .leading, spacing: 11) {
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: asset.kind.icon)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(MF.indigoInk)
                    .frame(width: 39, height: 39)
                    .background(MF.indigoTint)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                VStack(alignment: .leading, spacing: 3) {
                    Text(asset.title)
                        .font(.system(size: 14.5, weight: .bold))
                        .foregroundStyle(MF.ink)
                        .lineLimit(2)
                    Text("\(asset.kind.label) · \(asset.fileExtension.isEmpty ? "DATEI" : asset.fileExtension) · \(asset.compactSize)")
                        .font(.mfMono(10))
                        .foregroundStyle(MF.faint)
                }
                Spacer()
                Button {
                    state.deleteDocumentAsset(asset.id)
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(MF.faint)
                        .frame(width: 30, height: 30)
                        .background(MF.surfaceSoft)
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)
            }

            if !asset.textPreview.isEmpty {
                Text(asset.textPreview)
                    .font(.system(size: 12.5))
                    .foregroundStyle(MF.smoke)
                    .lineLimit(3)
                    .lineSpacing(2)
                    .padding(11)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(MF.surfaceSoft)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            }

            HStack(spacing: 8) {
                if let url {
                    Button {
                        preview = DocumentPreview(url: url)
                    } label: {
                        smallPill("Öffnen", "eye.fill")
                    }
                    .buttonStyle(.plain)

                    ShareLink(item: url) {
                        smallPill("Teilen", "square.and.arrow.up")
                    }
                }

                Button {
                    state.startDocumentCopilot(task: "\(asset.title) prüfen und nächste Bearbeitung vorschlagen")
                } label: {
                    smallPill("Co-Pilot", "sparkles")
                }
                .buttonStyle(.plain)
            }
        }
        .padding(14)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 17, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 17).stroke(MF.border, lineWidth: 1))
        .warmShadow()
    }

    private func smallPill(_ title: String, _ icon: String) -> some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 10.5, weight: .bold))
            Text(title)
                .font(.system(size: 12.5, weight: .bold))
        }
        .foregroundStyle(MF.indigoInk)
        .padding(.horizontal, 11)
        .frame(height: 34)
        .background(MF.indigoTint)
        .clipShape(Capsule())
    }

    private var draftEditor: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Eyebrow(text: "Editierbarer Arbeitsentwurf", color: MF.indigoInk)
                Spacer()
                Button {
                    state.generateDocumentDraft()
                } label: {
                    smallPill("Neu", "wand.and.stars")
                }
                .buttonStyle(.plain)
            }

            TextEditor(text: $state.documentDraft)
                .font(.system(size: 14))
                .foregroundStyle(MF.ink)
                .lineSpacing(4)
                .scrollContentBackground(.hidden)
                .frame(minHeight: 320)
                .padding(13)
                .background(MF.surface)
                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 18).stroke(MF.border, lineWidth: 1))
                .warmShadow()

            HStack(spacing: 10) {
                MFGhostButton(title: "Co-Pilot bearbeiten", icon: "sparkles") {
                    state.startDocumentCopilot(task: "Entwurf überarbeiten")
                }
                MFGhostButton(title: "PDF erstellen", icon: "doc.richtext.fill") {
                    if let asset = state.exportDocumentDraftPDF(), let url = state.documentAssetURL(asset) {
                        panel = .files
                        preview = DocumentPreview(url: url)
                    }
                }
            }
        }
    }

    private var checklist: some View {
        VStack(spacing: 10) {
            ForEach(state.documents) { document in
                VStack(alignment: .leading, spacing: 10) {
                    HStack(alignment: .top, spacing: 12) {
                        Button {
                            state.toggleDocument(document.id)
                        } label: {
                            Image(systemName: document.done ? "checkmark" : "doc.text.fill")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundStyle(document.done ? .white : MF.smoke)
                                .frame(width: 38, height: 38)
                                .background(document.done ? MF.ember : MF.surfaceSoft)
                                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                        }
                        .buttonStyle(.plain)

                        VStack(alignment: .leading, spacing: 4) {
                            Text(document.title)
                                .font(.system(size: 14.5, weight: .bold))
                                .foregroundStyle(MF.ink)
                            Text(document.note)
                                .font(.system(size: 12.5))
                                .foregroundStyle(MF.smoke)
                                .lineSpacing(2)
                        }
                        Spacer()
                    }

                    Button {
                        state.startDocumentCopilot(task: "\(document.title) erstellen oder verbessern")
                    } label: {
                        smallPill("Mit Co-Pilot schließen", "sparkles")
                    }
                    .buttonStyle(.plain)
                }
                .padding(14)
                .background(MF.surface)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 16).stroke(MF.border, lineWidth: 1))
                .warmShadow()
            }
        }
    }

    private func createAIHandoff() {
        do {
            handoffError = nil
            handoffShare = HandoffShare(urls: try state.createAIHandoffPackage())
        } catch {
            handoffError = "Handoff konnte nicht erstellt werden: \(error.localizedDescription)"
        }
    }
}

private struct DocumentPreview: Identifiable {
    let url: URL
    var id: String { url.absoluteString }
}

private struct HandoffShare: Identifiable {
    let id = UUID()
    let urls: [URL]
}

#if canImport(UIKit)
private struct ActivityShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ controller: UIActivityViewController, context: Context) {}
}
#endif

#if canImport(QuickLook)
private struct QuickLookPreview: UIViewControllerRepresentable {
    let url: URL

    func makeCoordinator() -> Coordinator {
        Coordinator(url: url)
    }

    func makeUIViewController(context: Context) -> QLPreviewController {
        let controller = QLPreviewController()
        controller.dataSource = context.coordinator
        return controller
    }

    func updateUIViewController(_ controller: QLPreviewController, context: Context) {
        context.coordinator.url = url
        controller.reloadData()
    }

    final class Coordinator: NSObject, QLPreviewControllerDataSource {
        var url: URL

        init(url: URL) {
            self.url = url
        }

        func numberOfPreviewItems(in controller: QLPreviewController) -> Int {
            1
        }

        func previewController(_ controller: QLPreviewController, previewItemAt index: Int) -> QLPreviewItem {
            url as NSURL
        }
    }
}
#endif
