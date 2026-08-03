// Business-Übersicht aus Modulen + Modulauswahl des Co-Piloten.
// Nach Design "matchfoundr Business Module": dieselben Bausteine, je Betrieb
// andere Auswahl. Der Co-Pilot begründet seine Wahl, alles bleibt abschaltbar.

import SwiftUI

struct BusinessModulesView: View {
    @EnvironmentObject var state: AppState
    @State private var showingPicker = false

    private var modules: [BusinessModuleInstance] {
        state.businessModules.filter(\.enabled)
    }

    var body: some View {
        VStack(spacing: 0) {
            header

            ScrollView {
                VStack(alignment: .leading, spacing: 10) {
                    ForEach(modules) { instance in
                        BizLabel(text: instance.displayLabel, action: instance.action)
                        BusinessModuleCard(instance: instance)
                    }

                    if modules.isEmpty { emptyState }

                    BizLabel(text: "Bereiche")
                    LazyVGrid(columns: [GridItem(.flexible(), spacing: 8), GridItem(.flexible())], spacing: 8) {
                        ForEach(state.businessTiles) { tile in
                            tileCard(tile)
                        }
                    }

                    copilotBar.padding(.top, 4)
                }
                .padding(16)
                .padding(.bottom, 90)
            }
            .scrollIndicators(.hidden)
        }
        .background(MF.canvas.ignoresSafeArea())
        .sheet(isPresented: $showingPicker) {
            BusinessModulePickerView()
                .environmentObject(state)
                .presentationDetents([.large])
                .presentationCornerRadius(26)
        }
        .onAppear { state.seedBusinessModulesIfNeeded() }
    }

    private var header: some View {
        HStack(alignment: .firstTextBaseline) {
            VStack(alignment: .leading, spacing: 2) {
                Text(state.businessDisplayName)
                    .font(.mfMono(10))
                    .tracking(1.3)
                    .textCase(.uppercase)
                    .foregroundStyle(MF.ember)
                Text("Business")
                    .font(.system(size: 27, weight: .heavy))
                    .tracking(-0.8)
                    .foregroundStyle(MF.ink)
            }
            Spacer(minLength: 8)
            Button {
                Haptics.tap()
                showingPicker = true
            } label: {
                Image(systemName: "slider.horizontal.3")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(MF.smoke)
                    .frame(width: 36, height: 36)
                    .background(MF.surface)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(MF.border, lineWidth: 0.6))
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Module verwalten")
        }
        .padding(.horizontal, 20)
        .padding(.top, 8)
        .padding(.bottom, 12)
    }

    private var emptyState: some View {
        BizCard {
            VStack(alignment: .leading, spacing: 6) {
                Text("Noch keine Module")
                    .font(.system(size: 15.5, weight: .semibold))
                    .foregroundStyle(MF.ink)
                Text("Sag dem Co-Pilot, was du machst — er legt dir die passenden Bausteine auf die Übersicht.")
                    .font(.system(size: 13.5))
                    .foregroundStyle(MF.smoke)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(16)
        }
    }

    private func tileCard(_ tile: BusinessTile) -> some View {
        Button {
            Haptics.tap()
            if let destination = tile.destination { state.open(.screen(destination)) }
        } label: {
            BizCard {
                VStack(alignment: .leading, spacing: 0) {
                    Image(systemName: tile.icon)
                        .font(.system(size: 18, weight: .medium))
                        .foregroundStyle(MF.smoke)
                    Text(tile.label)
                        .font(.system(size: 14.5, weight: .semibold))
                        .foregroundStyle(MF.ink)
                        .padding(.top, 10)
                    Text(tile.meta)
                        .font(.system(size: 12.5))
                        .foregroundStyle(tile.highlight ? MF.ember : MF.smoke)
                        .padding(.top, 2)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(13)
            }
        }
        .buttonStyle(.plain)
        .disabled(tile.destination == nil)
    }

    private var copilotBar: some View {
        Button {
            Haptics.tap()
            state.open(.screen(.copilot))
        } label: {
            HStack(spacing: 11) {
                Image(systemName: "sparkles")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(MF.indigoInk)
                Text(state.businessCopilotHint)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(MF.indigoInk)
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)
                Spacer(minLength: 6)
                Image(systemName: "chevron.right")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(MF.indigoInk)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 13)
            .background(MF.indigoTint)
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 18).stroke(MF.indigo.opacity(0.3), lineWidth: 0.6))
        }
        .buttonStyle(.plain)
    }
}

// ─── Modulauswahl (Co-Pilot) ─────────────────────────────────────────────

struct BusinessModulePickerView: View {
    @EnvironmentObject var state: AppState
    @Environment(\.dismiss) private var dismiss

    private var active: [BusinessModuleInstance] { state.businessModules.filter(\.enabled) }
    private var off: [BusinessModuleInstance] { state.businessModules.filter { !$0.enabled } }
    private var suggested: [BusinessModuleInstance] { state.businessSuggestedModules }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 10) {
                    intro

                    if !active.isEmpty {
                        BizLabel(text: "Auf deiner Übersicht")
                        BizCard {
                            VStack(spacing: 0) {
                                ForEach(Array(active.enumerated()), id: \.element.id) { index, item in
                                    if index > 0 { BizHairline(inset: 16) }
                                    row(item, on: true)
                                }
                            }
                        }
                    }

                    if !suggested.isEmpty {
                        BizLabel(text: "Vom Co-Pilot vorgeschlagen")
                        BizCard {
                            VStack(spacing: 0) {
                                ForEach(Array(suggested.enumerated()), id: \.element.id) { index, item in
                                    if index > 0 { BizHairline(inset: 16) }
                                    row(item, on: false, add: true)
                                }
                            }
                        }
                    }

                    if !off.isEmpty {
                        BizLabel(text: "Passt gerade nicht")
                        BizCard {
                            VStack(spacing: 0) {
                                ForEach(Array(off.enumerated()), id: \.element.id) { index, item in
                                    if index > 0 { BizHairline(inset: 16) }
                                    row(item, on: false)
                                }
                            }
                        }
                    }

                    Text("Module bleiben verfügbar. Sobald sich dein Geschäft ändert, schlägt der Co-Pilot neue vor.")
                        .font(.system(size: 12.5))
                        .foregroundStyle(MF.faint)
                        .fixedSize(horizontal: false, vertical: true)
                        .padding(.horizontal, 6)
                        .padding(.top, 2)
                }
                .padding(16)
                .padding(.bottom, 30)
            }
            .scrollIndicators(.hidden)
            .background(MF.canvas.ignoresSafeArea())
            .navigationTitle("Module")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Fertig") { dismiss() }
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(MF.ember)
                }
            }
        }
    }

    private var intro: some View {
        HStack(alignment: .top, spacing: 11) {
            Image(systemName: "sparkles")
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(MF.indigoInk)
            Text(state.businessModuleIntro)
                .font(.system(size: 13.5))
                .foregroundStyle(MF.indigoInk)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(.horizontal, 15)
        .padding(.vertical, 13)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(MF.indigoTint)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(MF.indigo.opacity(0.3), lineWidth: 0.6))
    }

    private func row(_ item: BusinessModuleInstance, on: Bool, add: Bool = false) -> some View {
        HStack(spacing: 12) {
            Image(systemName: item.module.icon)
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(on ? MF.ember : MF.smoke)
                .frame(width: 32, height: 32)
                .background(on ? MF.emberTint : MF.surfaceSoft)
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

            VStack(alignment: .leading, spacing: 1) {
                Text(item.module.name)
                    .font(.system(size: 14.5, weight: .semibold))
                    .foregroundStyle(MF.ink)
                Text(item.why ?? item.module.hint)
                    .font(.system(size: 12.5))
                    .foregroundStyle(MF.smoke)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Spacer(minLength: 6)

            if add {
                Button {
                    Haptics.success()
                    state.adoptSuggestedBusinessModule(item.module)
                } label: {
                    Text("Hinzufügen")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(MF.ember)
                        .padding(.horizontal, 11)
                        .padding(.vertical, 6)
                        .background(MF.emberTint)
                        .clipShape(RoundedRectangle(cornerRadius: 9, style: .continuous))
                }
                .buttonStyle(.plain)
            } else {
                Toggle("", isOn: Binding(
                    get: { item.enabled },
                    set: { _ in
                        Haptics.select()
                        state.toggleBusinessModule(item.module)
                    }
                ))
                .labelsHidden()
                .tint(MF.ember)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }
}
