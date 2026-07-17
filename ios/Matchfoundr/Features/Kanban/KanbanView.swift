// KanbanView — das Board aus der Web-App (/kanban) nativ für iOS.
// Gleiche Lanes wie im Web (Backlog / In Arbeit / Review / Erledigt),
// Persistenz in UserDefaults, mobile-first: eine Lane pro Seite mit
// Chips zum Wechseln, Karten wandern per Buttons oder Kontextmenü.

import SwiftUI

// MARK: - Modell

enum KanbanLane: String, Codable, CaseIterable, Identifiable {
    case backlog, doing, review, done

    var id: String { rawValue }

    var title: String {
        switch self {
        case .backlog: "Backlog"
        case .doing: "In Arbeit"
        case .review: "Review"
        case .done: "Erledigt"
        }
    }

    var hint: String {
        switch self {
        case .backlog: "Noch nicht gestartet"
        case .doing: "Aktiver Fokus"
        case .review: "Prüfen, finalisieren"
        case .done: "Abgeschlossen"
        }
    }

    var next: KanbanLane? {
        switch self {
        case .backlog: .doing
        case .doing: .review
        case .review: .done
        case .done: nil
        }
    }

    var previous: KanbanLane? {
        switch self {
        case .backlog: nil
        case .doing: .backlog
        case .review: .doing
        case .done: .review
        }
    }
}

enum KanbanPriority: String, Codable, CaseIterable, Identifiable {
    case hoch, mittel, niedrig

    var id: String { rawValue }
    var label: String { rawValue.capitalized }

    var color: Color {
        switch self {
        case .hoch: MF.ember
        case .mittel: MF.indigo
        case .niedrig: MF.smoke
        }
    }
}

struct KanbanCard: Identifiable, Codable, Hashable {
    var id: String = UUID().uuidString
    var title: String
    var note: String = ""
    var lane: KanbanLane = .backlog
    var priority: KanbanPriority = .mittel
    var createdAt: Date = .now
}

// MARK: - Store

@MainActor
final class KanbanStore: ObservableObject {
    static let shared = KanbanStore()

    @Published var cards: [KanbanCard] {
        didSet { persist() }
    }

    private let storageKey = "mf.kanban.cards.v1"

    private init() {
        if let data = UserDefaults.standard.data(forKey: storageKey),
           let saved = try? JSONDecoder().decode([KanbanCard].self, from: data) {
            cards = saved
        } else {
            cards = KanbanStore.starterCards
        }
    }

    func add(title: String, lane: KanbanLane = .backlog, note: String = "", priority: KanbanPriority = .mittel) {
        let clean = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !clean.isEmpty else { return }
        cards.insert(KanbanCard(title: clean, note: note, lane: lane, priority: priority), at: 0)
    }

    func move(_ card: KanbanCard, to lane: KanbanLane) {
        guard let idx = cards.firstIndex(where: { $0.id == card.id }) else { return }
        cards[idx].lane = lane
    }

    func remove(_ card: KanbanCard) {
        cards.removeAll { $0.id == card.id }
    }

    func cards(in lane: KanbanLane) -> [KanbanCard] {
        cards.filter { $0.lane == lane }
    }

    private func persist() {
        if let data = try? JSONEncoder().encode(cards) {
            UserDefaults.standard.set(data, forKey: storageKey)
        }
    }

    private static let starterCards: [KanbanCard] = [
        KanbanCard(title: "Angebot für ersten Kunden schreiben", note: "Preis + Leistung auf eine Seite.", lane: .doing, priority: .hoch),
        KanbanCard(title: "Gewerbeanmeldung erledigen", note: "Unterlagen liegen in Dokumente.", lane: .backlog, priority: .hoch),
        KanbanCard(title: "3 Referenzfotos schießen", note: "Für Firmenprofil und Google.", lane: .backlog, priority: .mittel),
        KanbanCard(title: "Website-Startseite prüfen", note: "Text vom Co-Piloten gegenlesen lassen.", lane: .review, priority: .mittel),
    ]
}

// MARK: - View

struct KanbanView: View {
    @EnvironmentObject var state: AppState
    @StateObject private var store = KanbanStore.shared
    @State private var activeLane: KanbanLane = .doing
    @State private var newTitle = ""
    @FocusState private var inputFocused: Bool

    var body: some View {
        VStack(spacing: 0) {
            header

            lanePicker
                .padding(.horizontal, 20)
                .padding(.top, 12)

            TabView(selection: $activeLane) {
                ForEach(KanbanLane.allCases) { lane in
                    laneColumn(lane)
                        .tag(lane)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            .animation(.easeOut(duration: 0.2), value: activeLane)

            addBar
        }
        .background(MF.canvas.ignoresSafeArea())
        .navigationTitle("Board")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var header: some View {
        HStack(spacing: 10) {
            VStack(alignment: .leading, spacing: 2) {
                Text("Board")
                    .font(.system(size: 22, weight: .heavy))
                    .foregroundStyle(MF.ink)
                Text("\(store.cards(in: .doing).count) in Arbeit · \(store.cards(in: .done).count) erledigt")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(MF.smoke)
            }
            Spacer()
        }
        .padding(.horizontal, 20)
        .padding(.top, 10)
    }

    private var lanePicker: some View {
        HStack(spacing: 7) {
            ForEach(KanbanLane.allCases) { lane in
                Button {
                    Haptics.select()
                    activeLane = lane
                } label: {
                    HStack(spacing: 5) {
                        Text(lane.title)
                            .font(.system(size: 12.5, weight: .bold))
                        Text("\(store.cards(in: lane).count)")
                            .font(.system(size: 11, weight: .heavy))
                            .foregroundStyle(activeLane == lane ? MF.ember : MF.faint)
                    }
                    .padding(.horizontal, 11)
                    .padding(.vertical, 8)
                    .background(activeLane == lane ? MF.surface : Color.clear)
                    .clipShape(Capsule())
                    .overlay(
                        Capsule().stroke(activeLane == lane ? MF.border : Color.clear, lineWidth: 1)
                    )
                    .foregroundStyle(activeLane == lane ? MF.ink : MF.smoke)
                }
                .buttonStyle(.plain)
            }
            Spacer(minLength: 0)
        }
    }

    private func laneColumn(_ lane: KanbanLane) -> some View {
        ScrollView {
            VStack(spacing: 10) {
                Text(lane.hint)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(MF.faint)
                    .frame(maxWidth: .infinity, alignment: .leading)

                let laneCards = store.cards(in: lane)
                if laneCards.isEmpty {
                    emptyLane(lane)
                } else {
                    ForEach(laneCards) { card in
                        cardView(card)
                    }
                }
            }
            .padding(20)
            .padding(.bottom, 24)
        }
        .scrollIndicators(.hidden)
    }

    private func emptyLane(_ lane: KanbanLane) -> some View {
        VStack(spacing: 8) {
            Image(systemName: "square.stack.3d.up.slash")
                .font(.system(size: 22, weight: .semibold))
                .foregroundStyle(MF.faint)
            Text(lane == .done ? "Noch nichts abgeschlossen." : "Keine Karten hier.")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(MF.smoke)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
    }

    private func cardView(_ card: KanbanCard) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top, spacing: 8) {
                Circle()
                    .fill(card.priority.color)
                    .frame(width: 7, height: 7)
                    .padding(.top, 5)
                Text(card.title)
                    .font(.system(size: 14.5, weight: .bold))
                    .foregroundStyle(MF.ink)
                    .fixedSize(horizontal: false, vertical: true)
                Spacer(minLength: 0)
            }

            if !card.note.isEmpty {
                Text(card.note)
                    .font(.system(size: 12.5))
                    .foregroundStyle(MF.smoke)
                    .fixedSize(horizontal: false, vertical: true)
            }

            HStack(spacing: 8) {
                if let prev = card.lane.previous {
                    moveButton("chevron.left", prev.title) {
                        store.move(card, to: prev)
                    }
                }
                Spacer(minLength: 0)
                if let next = card.lane.next {
                    moveButton(next == .done ? "checkmark" : "chevron.right", next.title, filled: true) {
                        store.move(card, to: next)
                        if next == .done { Haptics.success() }
                    }
                }
            }
        }
        .padding(13)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 15).stroke(MF.border, lineWidth: 1))
        .warmShadow()
        .contextMenu {
            ForEach(KanbanLane.allCases.filter { $0 != card.lane }) { lane in
                Button("Nach \(lane.title)") { store.move(card, to: lane) }
            }
            Divider()
            ForEach(KanbanPriority.allCases) { priority in
                Button("Priorität \(priority.label)") {
                    if let idx = store.cards.firstIndex(where: { $0.id == card.id }) {
                        store.cards[idx].priority = priority
                    }
                }
            }
            Divider()
            Button("Löschen", role: .destructive) { store.remove(card) }
        }
    }

    private func moveButton(_ icon: String, _ label: String, filled: Bool = false, action: @escaping () -> Void) -> some View {
        Button {
            Haptics.tap()
            withAnimation(.easeOut(duration: 0.18)) { action() }
        } label: {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 10.5, weight: .bold))
                Text(label)
                    .font(.system(size: 12, weight: .bold))
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 7)
            .background(filled ? AnyShapeStyle(MF.ink) : AnyShapeStyle(MF.canvas))
            .foregroundStyle(filled ? Color.white : MF.smoke)
            .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }

    private var addBar: some View {
        HStack(spacing: 9) {
            TextField("Neue Karte…", text: $newTitle)
                .font(.system(size: 14))
                .focused($inputFocused)
                .submitLabel(.done)
                .onSubmit(addCard)
                .padding(.horizontal, 13)
                .frame(height: 44)
                .background(MF.surface)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 14).stroke(MF.border, lineWidth: 1))

            Button(action: addCard) {
                Image(systemName: "plus")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 44, height: 44)
                    .background(MF.emberGrad)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 10)
        .background(MF.canvas)
    }

    private func addCard() {
        store.add(title: newTitle, lane: activeLane == .done ? .backlog : activeLane)
        newTitle = ""
        Haptics.tap()
    }
}
