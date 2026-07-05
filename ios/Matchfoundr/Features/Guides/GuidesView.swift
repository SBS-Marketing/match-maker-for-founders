// Guides — Schritt-für-Schritt-Wissen für kleine Gründungen.
// Suche, Kategorie-Chips, Karten mit Lesezeit; Artikel nativ lesbar.

import SwiftUI

struct GuidesView: View {
    @EnvironmentObject var state: AppState
    @State private var query = ""
    @State private var category: GuideCategory?
    @State private var path: [Guide] = []

    private var filtered: [Guide] {
        var result = allGuides
        if let category { result = result.filter { $0.category == category } }
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        if !q.isEmpty {
            result = result.filter {
                $0.title.lowercased().contains(q) || $0.intro.lowercased().contains(q)
                    || $0.sections.contains { $0.h.lowercased().contains(q) || $0.body.lowercased().contains(q) }
            }
        }
        return result
    }

    var body: some View {
        NavigationStack(path: $path) {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    searchField
                    categoryChips
                    LazyVStack(spacing: 12) {
                        ForEach(filtered) { guide in
                            Button {
                                Haptics.tap()
                                path.append(guide)
                            } label: {
                                GuideCard(guide: guide)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    if filtered.isEmpty {
                        Text("Nichts gefunden — frag den Co-Pilot, der kennt alle \(allGuides.count) Guides.")
                            .font(.system(size: 13.5)).foregroundStyle(MF.smoke)
                            .frame(maxWidth: .infinity)
                            .padding(24)
                            .background(MF.surfaceSoft)
                            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 24)
            }
            .scrollIndicators(.hidden)
            .background(MF.canvas.ignoresSafeArea())
            .navigationTitle("Guides")
            .navigationBarTitleDisplayMode(.large)
            .navigationDestination(for: Guide.self) { GuideDetailView(guide: $0) }
        }
        .tint(MF.emberDeep)
        // Co-Pilot kann Guides direkt öffnen.
        .onChange(of: state.openGuideSlug) { _, slug in
            guard let slug, let guide = allGuides.first(where: { $0.slug == slug }) else { return }
            path = [guide]
            state.openGuideSlug = nil
        }
    }

    private var searchField: some View {
        HStack(spacing: 9) {
            Image(systemName: "magnifyingglass").font(.system(size: 14)).foregroundStyle(MF.faint)
            TextField("Gewerbe, Steuern, Kunden…", text: $query)
                .font(.system(size: 14.5))
        }
        .padding(.horizontal, 14).frame(height: 48)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 15).stroke(MF.border, lineWidth: 1))
    }

    private var categoryChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                MFChip(label: "Alle", selected: category == nil) { category = nil }
                ForEach(GuideCategory.allCases, id: \.self) { c in
                    MFChip(label: c.label, selected: category == c) {
                        category = category == c ? nil : c
                    }
                }
            }
        }
    }
}

struct GuideCard: View {
    let guide: Guide
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Eyebrow(text: guide.category.label, color: MF.emberDeep)
                HStack(spacing: 3) {
                    Image(systemName: "clock").font(.system(size: 9))
                    Text("\(guide.minutes) Min").font(.mfMono(10))
                }
                .foregroundStyle(MF.faint)
            }
            Text(guide.title)
                .font(.system(size: 16.5, weight: .bold))
                .foregroundStyle(MF.ink)
                .multilineTextAlignment(.leading)
            Text(guide.intro)
                .font(.system(size: 13)).foregroundStyle(MF.smoke)
                .lineSpacing(2)
                .lineLimit(3)
                .multilineTextAlignment(.leading)
            HStack(spacing: 5) {
                Text("Lesen").font(.system(size: 12.5, weight: .semibold))
                Image(systemName: "arrow.right").font(.system(size: 10, weight: .bold))
            }
            .foregroundStyle(MF.emberDeep)
            .padding(.top, 2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .warmCard(padding: 18)
    }
}

struct GuideDetailView: View {
    @EnvironmentObject var state: AppState
    let guide: Guide

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                VStack(alignment: .leading, spacing: 8) {
                    HStack(spacing: 8) {
                        Eyebrow(text: guide.category.label, color: MF.emberDeep)
                        HStack(spacing: 3) {
                            Image(systemName: "clock").font(.system(size: 9))
                            Text("\(guide.minutes) Min Lesezeit").font(.mfMono(10))
                        }
                        .foregroundStyle(MF.faint)
                    }
                    Text(guide.title)
                        .font(.system(size: 26, weight: .bold))
                        .foregroundStyle(MF.ink)
                    Text(guide.intro)
                        .font(.system(size: 15)).foregroundStyle(MF.smoke)
                        .lineSpacing(4)
                }
                .padding(.top, 6)

                ForEach(Array(guide.sections.enumerated()), id: \.offset) { idx, section in
                    VStack(alignment: .leading, spacing: 7) {
                        HStack(alignment: .firstTextBaseline, spacing: 9) {
                            Text(String(format: "%02d", idx + 1))
                                .font(.mfMono(11)).foregroundStyle(MF.ember)
                            Text(section.h)
                                .font(.system(size: 16.5, weight: .bold))
                                .foregroundStyle(MF.ink)
                        }
                        Text(section.body)
                            .font(.system(size: 14.5)).foregroundStyle(MF.inkSoft)
                            .lineSpacing(4)
                    }
                }

                // Anschluss an den Co-Pilot — Wissen wird Handlung.
                VStack(alignment: .leading, spacing: 12) {
                    HStack(spacing: 10) {
                        Image(systemName: "sparkles")
                            .font(.system(size: 14, weight: .semibold)).foregroundStyle(.white)
                            .frame(width: 34, height: 34)
                            .background(MF.indigoGrad)
                            .clipShape(RoundedRectangle(cornerRadius: 11, style: .continuous))
                        VStack(alignment: .leading, spacing: 1) {
                            Text("Auf dein Vorhaben anwenden?")
                                .font(.system(size: 14, weight: .bold)).foregroundStyle(MF.ink)
                            Text("Der Co-Pilot macht daraus konkrete Schritte.")
                                .font(.system(size: 12)).foregroundStyle(MF.smoke)
                        }
                    }
                    Button {
                        Haptics.tap()
                        state.tab = .pilot
                    } label: {
                        HStack(spacing: 7) {
                            Text("Co-Pilot fragen").font(.system(size: 14, weight: .semibold))
                            Image(systemName: "arrow.right").font(.system(size: 11, weight: .bold))
                        }
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity).frame(height: 46)
                        .background(MF.indigoGrad)
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    }
                    .buttonStyle(.plain)
                }
                .warmCard()
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 30)
        }
        .scrollIndicators(.hidden)
        .background(MF.canvas.ignoresSafeArea())
        .navigationBarTitleDisplayMode(.inline)
    }
}
