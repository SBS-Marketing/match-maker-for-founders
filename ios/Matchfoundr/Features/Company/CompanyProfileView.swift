// Firmenprofil — native iOS-Variante des Web-Builders aus /firma:
// Metadaten, Block-Editor, Vorschau und Veröffentlichung.

import SwiftUI

struct CompanyProfileView: View {
    @EnvironmentObject private var state: AppState
    @State private var mode: Mode = .edit
    @State private var showPublished = false

    private enum Mode: String, CaseIterable, Identifiable {
        case edit, preview
        var id: String { rawValue }
        var label: String { self == .edit ? "Bearbeiten" : "Vorschau" }
    }

    var body: some View {
        VStack(spacing: 0) {
            MShellTop(title: "Deine Seite", subtitle: state.companyProfile.isPublished ? "Öffentlich · \(state.companyProfile.publishedSlug ?? "")" : "Firmenprofil vorbereiten") {
                Button {
                    let _ = state.publishCompanyProfile()
                    showPublished = true
                } label: {
                    Image(systemName: state.companyProfile.isPublished ? "arrow.triangle.2.circlepath" : "paperplane.fill")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(width: 38, height: 38)
                        .background(MF.emberGrad)
                        .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
                }
                .buttonStyle(.plain)
            }

            Picker("Modus", selection: $mode) {
                ForEach(Mode.allCases) { mode in
                    Text(mode.label).tag(mode)
                }
            }
            .pickerStyle(.segmented)
            .padding(.horizontal, 20)
            .padding(.vertical, 12)

            if mode == .edit {
                editor
            } else {
                preview
            }
        }
        .background(MF.canvas.ignoresSafeArea())
        .navigationTitle("Firmenprofil")
        .navigationBarTitleDisplayMode(.inline)
        .alert("Veröffentlicht", isPresented: $showPublished) {
            Button("OK", role: .cancel) {}
        } message: {
            Text("Profil-Link: /s/\(state.companyProfile.publishedSlug ?? "preview")")
        }
    }

    private var editor: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                metaCard
                addBlockStrip
                ForEach(Array(state.companyProfile.blocks.enumerated()), id: \.element.id) { index, block in
                    blockEditor(block, index: index)
                }
            }
            .padding(20)
            .padding(.bottom, 90)
        }
        .scrollIndicators(.hidden)
        .scrollDismissesKeyboard(.interactively)
    }

    private var preview: some View {
        ScrollView {
            VStack(spacing: 14) {
                CompanyPublicPreview(profile: state.companyProfile)
                    .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 22).stroke(MF.border, lineWidth: 1))
                    .warmShadow(large: true)
                HStack(spacing: 10) {
                    previewMeta("Phase", state.companyProfile.stage)
                    previewMeta("Ort", state.companyProfile.city)
                    previewMeta("Blöcke", "\(state.companyProfile.blocks.count)")
                }
            }
            .padding(20)
            .padding(.bottom, 90)
        }
        .scrollIndicators(.hidden)
    }

    private var metaCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Eyebrow(text: "Basis")
                Spacer()
                Text(state.companyProfile.updatedAt.formatted(.dateTime.day().month().hour().minute()))
                    .font(.mfMono(10))
                    .foregroundStyle(MF.faint)
            }
            profileField("Name", text: binding(\.name))
            profileField("Kategorie", text: binding(\.category))
            HStack(spacing: 10) {
                profileField("Phase", text: binding(\.stage))
                profileField("Ort", text: binding(\.city))
            }
        }
        .warmCard(padding: 16, radius: 18)
    }

    private var addBlockStrip: some View {
        VStack(alignment: .leading, spacing: 10) {
            MSectionHead(text: "Block hinzufügen")
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(CompanyBlockType.allCases) { type in
                        Button {
                            state.addCompanyBlock(type)
                        } label: {
                            HStack(spacing: 7) {
                                Image(systemName: type.icon)
                                    .font(.system(size: 12, weight: .semibold))
                                Text(type.label)
                                    .font(.system(size: 12.5, weight: .semibold))
                            }
                            .foregroundStyle(MF.emberDeep)
                            .padding(.horizontal, 13)
                            .frame(height: 38)
                            .background(MF.emberTint)
                            .clipShape(Capsule())
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }

    private func blockEditor(_ block: CompanyBlock, index: Int) -> some View {
        VStack(alignment: .leading, spacing: 13) {
            HStack(spacing: 10) {
                Image(systemName: block.type.icon)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(MF.emberDeep)
                    .frame(width: 34, height: 34)
                    .background(MF.emberTint)
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                VStack(alignment: .leading, spacing: 1) {
                    Text(block.type.label)
                        .font(.system(size: 14.5, weight: .bold))
                        .foregroundStyle(MF.ink)
                    Text("Block \(index + 1)")
                        .font(.system(size: 11.5))
                        .foregroundStyle(MF.faint)
                }
                Spacer()
                iconButton("arrow.up") { state.moveCompanyBlock(block.id, direction: -1) }
                    .opacity(index == 0 ? 0.35 : 1)
                iconButton("arrow.down") { state.moveCompanyBlock(block.id, direction: 1) }
                    .opacity(index == state.companyProfile.blocks.count - 1 ? 0.35 : 1)
                iconButton("trash") { state.removeCompanyBlock(block.id) }
            }

            switch block.type {
            case .hero:
                profileField("Eyebrow", text: blockBinding(block.id, \.eyebrow))
                profileField("Titel", text: blockBinding(block.id, \.title))
                profileField("Untertitel", text: blockBinding(block.id, \.subtitle))
                profileTextArea("Beschreibung", text: blockBinding(block.id, \.body), lineLimit: 3...5)
                HStack(spacing: 10) {
                    profileField("CTA", text: blockBinding(block.id, \.ctaLabel))
                    profileField("Link", text: blockBinding(block.id, \.ctaHref))
                }
            case .about:
                profileField("Titel", text: blockBinding(block.id, \.title))
                profileTextArea("Text", text: blockBinding(block.id, \.body), lineLimit: 4...7)
            case .metrics:
                profileField("Titel", text: blockBinding(block.id, \.title))
                ForEach(0..<min(block.metrics.count, 3), id: \.self) { idx in
                    HStack(spacing: 10) {
                        profileField("Wert", text: metricBinding(block.id, idx, \.value))
                            .frame(width: 92)
                        profileField("Label", text: metricBinding(block.id, idx, \.label))
                    }
                }
            case .highlights:
                profileField("Titel", text: blockBinding(block.id, \.title))
                ForEach(0..<min(block.items.count, 5), id: \.self) { idx in
                    profileField("Punkt \(idx + 1)", text: itemBinding(block.id, idx))
                }
            case .team:
                profileField("Titel", text: blockBinding(block.id, \.title))
                ForEach(0..<block.members.count, id: \.self) { idx in
                    HStack(spacing: 10) {
                        profileField("Name", text: memberBinding(block.id, idx, \.name))
                        profileField("Rolle", text: memberBinding(block.id, idx, \.role))
                    }
                }
            case .cta:
                profileField("Headline", text: blockBinding(block.id, \.title))
                profileTextArea("Text", text: blockBinding(block.id, \.body), lineLimit: 2...4)
                HStack(spacing: 10) {
                    profileField("Button", text: blockBinding(block.id, \.ctaLabel))
                    profileField("Link", text: blockBinding(block.id, \.ctaHref))
                }
            }
        }
        .warmCard(padding: 15, radius: 18)
    }

    private func profileField(_ label: String, text: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Eyebrow(text: label)
            TextField(label, text: text)
                .font(.system(size: 14.5))
                .foregroundStyle(MF.ink)
                .tint(MF.ember)
                .submitLabel(.done)
                .padding(.horizontal, 12)
                .frame(height: 42)
                .background(MF.surfaceSoft)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(MF.borderSoft, lineWidth: 1))
        }
        .frame(maxWidth: .infinity)
    }

    private func profileTextArea(_ label: String, text: Binding<String>, lineLimit: ClosedRange<Int>) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Eyebrow(text: label)
            TextField(label, text: text, axis: .vertical)
                .font(.system(size: 14.5))
                .foregroundStyle(MF.ink)
                .tint(MF.ember)
                .submitLabel(.return)
                .lineLimit(lineLimit)
                .padding(12)
                .background(MF.surfaceSoft)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(MF.borderSoft, lineWidth: 1))
        }
    }

    private func iconButton(_ icon: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(MF.smoke)
                .frame(width: 32, height: 32)
                .background(MF.surfaceSoft)
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
        }
        .buttonStyle(.plain)
    }

    private func previewMeta(_ label: String, _ value: String) -> some View {
        VStack(spacing: 3) {
            Text(value)
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(MF.ink)
                .lineLimit(1)
                .minimumScaleFactor(0.75)
            Text(label)
                .font(.system(size: 10.5, weight: .semibold))
                .foregroundStyle(MF.faint)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(MF.border, lineWidth: 1))
    }

    private func binding(_ keyPath: WritableKeyPath<CompanyProfile, String>) -> Binding<String> {
        Binding(
            get: { state.companyProfile[keyPath: keyPath] },
            set: { value in
                state.companyProfile[keyPath: keyPath] = value
                state.companyProfile.updatedAt = .now
            }
        )
    }

    private func blockBinding(_ id: UUID, _ keyPath: WritableKeyPath<CompanyBlock, String>) -> Binding<String> {
        Binding(
            get: {
                state.companyProfile.blocks.first(where: { $0.id == id })?[keyPath: keyPath] ?? ""
            },
            set: { value in
                state.updateCompanyBlock(id) { $0[keyPath: keyPath] = value }
            }
        )
    }

    private func metricBinding(_ id: UUID, _ index: Int, _ keyPath: WritableKeyPath<CompanyMetric, String>) -> Binding<String> {
        Binding(
            get: {
                guard let block = state.companyProfile.blocks.first(where: { $0.id == id }),
                      block.metrics.indices.contains(index) else { return "" }
                return block.metrics[index][keyPath: keyPath]
            },
            set: { value in
                state.updateCompanyBlock(id) {
                    guard $0.metrics.indices.contains(index) else { return }
                    $0.metrics[index][keyPath: keyPath] = value
                }
            }
        )
    }

    private func itemBinding(_ id: UUID, _ index: Int) -> Binding<String> {
        Binding(
            get: {
                guard let block = state.companyProfile.blocks.first(where: { $0.id == id }),
                      block.items.indices.contains(index) else { return "" }
                return block.items[index]
            },
            set: { value in
                state.updateCompanyBlock(id) {
                    guard $0.items.indices.contains(index) else { return }
                    $0.items[index] = value
                }
            }
        )
    }

    private func memberBinding(_ id: UUID, _ index: Int, _ keyPath: WritableKeyPath<CompanyMember, String>) -> Binding<String> {
        Binding(
            get: {
                guard let block = state.companyProfile.blocks.first(where: { $0.id == id }),
                      block.members.indices.contains(index) else { return "" }
                return block.members[index][keyPath: keyPath]
            },
            set: { value in
                state.updateCompanyBlock(id) {
                    guard $0.members.indices.contains(index) else { return }
                    $0.members[index][keyPath: keyPath] = value
                }
            }
        )
    }
}

struct CompanyPublicPreview: View {
    let profile: CompanyProfile

    var body: some View {
        VStack(spacing: 0) {
            ForEach(profile.blocks) { block in
                CompanyPreviewBlock(block: block)
            }
        }
        .background(MF.surface)
    }
}

private struct CompanyPreviewBlock: View {
    let block: CompanyBlock

    var body: some View {
        switch block.type {
        case .hero:
            VStack(alignment: .leading, spacing: 13) {
                Eyebrow(text: block.eyebrow.isEmpty ? "Business" : block.eyebrow, color: .white.opacity(0.72))
                Text(block.title)
                    .font(.system(size: 27, weight: .bold))
                    .foregroundStyle(.white)
                    .fixedSize(horizontal: false, vertical: true)
                Text(block.subtitle)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.75))
                if !block.body.isEmpty {
                    Text(block.body)
                        .font(.system(size: 14.5))
                        .foregroundStyle(.white.opacity(0.86))
                        .lineSpacing(4)
                }
                if !block.ctaLabel.isEmpty {
                    Text(block.ctaLabel)
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(MF.emberDeep)
                        .padding(.horizontal, 14)
                        .frame(height: 38)
                        .background(.white)
                        .clipShape(Capsule())
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(24)
            .background(MF.emberGrad)
        case .about:
            textSection(title: block.title, body: block.body)
        case .metrics:
            VStack(alignment: .leading, spacing: 12) {
                if !block.title.isEmpty { Eyebrow(text: block.title) }
                HStack(spacing: 9) {
                    ForEach(block.metrics.prefix(3)) { metric in
                        VStack(spacing: 3) {
                            Text(metric.value.isEmpty ? "—" : metric.value)
                                .font(.system(size: 19, weight: .heavy))
                                .foregroundStyle(MF.ink)
                            Text(metric.label)
                                .font(.system(size: 10.5))
                                .foregroundStyle(MF.smoke)
                                .multilineTextAlignment(.center)
                                .lineLimit(2)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 13)
                        .background(MF.surface)
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: 14).stroke(MF.border, lineWidth: 1))
                    }
                }
            }
            .padding(18)
            .background(MF.surfaceSoft)
        case .highlights:
            VStack(alignment: .leading, spacing: 12) {
                if !block.title.isEmpty { Eyebrow(text: block.title, color: MF.emberDeep) }
                VStack(spacing: 8) {
                    ForEach(block.items.filter { !$0.isEmpty }, id: \.self) { item in
                        HStack(spacing: 10) {
                            Image(systemName: "checkmark")
                                .font(.system(size: 11, weight: .bold))
                                .foregroundStyle(.white)
                                .frame(width: 24, height: 24)
                                .background(MF.ember)
                                .clipShape(Circle())
                            Text(item)
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundStyle(MF.ink)
                            Spacer()
                        }
                    }
                }
            }
            .padding(18)
            .overlay(alignment: .bottom) { Rectangle().fill(MF.borderSoft).frame(height: 1) }
        case .team:
            VStack(alignment: .leading, spacing: 12) {
                if !block.title.isEmpty { Eyebrow(text: block.title, color: MF.emberDeep) }
                ForEach(block.members) { member in
                    HStack(spacing: 12) {
                        MFAvatar(name: member.name.isEmpty ? "Founder" : member.name, size: 44)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(member.name.isEmpty ? "Founder" : member.name)
                                .font(.system(size: 14.5, weight: .bold))
                                .foregroundStyle(MF.ink)
                            Text(member.role.isEmpty ? "Rolle offen" : member.role)
                                .font(.system(size: 12.5))
                                .foregroundStyle(MF.smoke)
                        }
                        Spacer()
                    }
                }
            }
            .padding(18)
            .background(MF.surfaceSoft)
        case .cta:
            VStack(alignment: .leading, spacing: 10) {
                Text(block.title)
                    .font(.system(size: 22, weight: .bold))
                    .foregroundStyle(.white)
                if !block.body.isEmpty {
                    Text(block.body)
                        .font(.system(size: 14))
                        .foregroundStyle(.white.opacity(0.75))
                        .lineSpacing(3)
                }
                if !block.ctaLabel.isEmpty {
                    Text(block.ctaLabel)
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 14)
                        .frame(height: 38)
                        .background(MF.ember)
                        .clipShape(Capsule())
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(22)
            .background(MF.ink)
        }
    }

    private func textSection(title: String, body: String) -> some View {
        VStack(alignment: .leading, spacing: 9) {
            if !title.isEmpty { Eyebrow(text: title, color: MF.emberDeep) }
            Text(body)
                .font(.system(size: 14.5))
                .foregroundStyle(MF.ink)
                .lineSpacing(4)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(18)
        .overlay(alignment: .bottom) { Rectangle().fill(MF.borderSoft).frame(height: 1) }
    }
}
