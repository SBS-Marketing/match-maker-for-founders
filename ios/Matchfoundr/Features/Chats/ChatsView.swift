// Chats — Liste (pushbar aus Heute/Profil) + Chat-Detail.
// Letzte Nachricht als Vorschau, Ungelesen-Badge, schneller Text-Chat.

import SwiftUI

struct ChatsListView: View {
    @EnvironmentObject var state: AppState
    @State private var searchText = ""
    @State private var showingComposer = false

    private var orderedMatches: [Match] {
        state.matches.sorted { lhs, rhs in
            lhs.lastActivity > rhs.lastActivity
        }
    }

    private var visibleMatches: [Match] {
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !query.isEmpty else { return orderedMatches }
        return orderedMatches.filter { $0.matchesChatSearch(query) }
    }

    var body: some View {
        Group {
            if state.matches.isEmpty {
                emptyState
            } else {
                ScrollView {
                    VStack(spacing: 14) {
                        newMessageEntry

                        if visibleMatches.isEmpty {
                            noSearchResults
                        } else {
                            VStack(spacing: 0) {
                                ForEach(Array(visibleMatches.enumerated()), id: \.element.id) { idx, match in
                                    Button {
                                        openChat(match.id)
                                    } label: {
                                        ChatRow(match: match)
                                            .padding(.horizontal, 15)
                                            .padding(.vertical, 11)
                                    }
                                    .buttonStyle(.plain)
                                    if idx < visibleMatches.count - 1 {
                                        Divider().overlay(MF.borderSoft).padding(.leading, 78)
                                    }
                                }
                            }
                            .background(MF.surface)
                            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                            .overlay(RoundedRectangle(cornerRadius: 18).stroke(MF.border, lineWidth: 1))
                            .warmShadow()
                        }
                    }
                    .padding(20)
                    .padding(.bottom, 90)
                }
                .scrollIndicators(.hidden)
            }
        }
        .background(MF.canvas.ignoresSafeArea())
        .navigationTitle("Chats")
        .navigationBarTitleDisplayMode(.large)
        .searchable(
            text: $searchText,
            placement: .navigationBarDrawer(displayMode: .always),
            prompt: "Name, Skill oder Stadt suchen"
        )
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    Haptics.tap()
                    showingComposer = true
                } label: {
                    Image(systemName: "square.and.pencil")
                        .font(.system(size: 16, weight: .semibold))
                }
                .accessibilityLabel("Person anschreiben")
                .disabled(state.matches.isEmpty)
            }
        }
        .sheet(isPresented: $showingComposer) {
            NewMessageSheet(matches: orderedMatches) { matchID in
                openChat(matchID)
            }
            .environmentObject(state)
            .presentationDetents([.medium, .large])
            .presentationDragIndicator(.visible)
        }
    }

    private var newMessageEntry: some View {
        Button {
            Haptics.tap()
            showingComposer = true
        } label: {
            HStack(spacing: 13) {
                Image(systemName: "square.and.pencil")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 42, height: 42)
                    .background(MF.emberGrad)
                    .clipShape(Circle())

                VStack(alignment: .leading, spacing: 3) {
                    Text("Person anschreiben")
                        .font(.system(size: 15.5, weight: .bold))
                        .foregroundStyle(MF.ink)
                    Text("Match auswählen, Nachricht senden, Chat öffnen")
                        .font(.system(size: 13))
                        .foregroundStyle(MF.smoke)
                        .lineLimit(1)
                }

                Spacer(minLength: 0)

                Image(systemName: "chevron.right")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(MF.faint)
            }
            .padding(15)
            .background(MF.surface)
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 18).stroke(MF.border, lineWidth: 1))
            .warmShadow()
        }
        .buttonStyle(.plain)
    }

    private var noSearchResults: some View {
        VStack(spacing: 10) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 25, weight: .semibold))
                .foregroundStyle(MF.faint)
            Text("Kein Chat gefunden")
                .font(.system(size: 16, weight: .bold))
                .foregroundStyle(MF.ink)
            Text("Suche nach Namen, Rolle, Skill, Stadt oder einem Wort aus dem Pitch.")
                .font(.system(size: 13))
                .foregroundStyle(MF.smoke)
                .multilineTextAlignment(.center)
            Button("Suche löschen") {
                Haptics.tap()
                searchText = ""
            }
            .font(.system(size: 13.5, weight: .semibold))
            .foregroundStyle(MF.emberDeep)
            .padding(.top, 4)
        }
        .frame(maxWidth: .infinity)
        .padding(26)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(MF.border, lineWidth: 1))
    }

    private func openChat(_ matchID: String) {
        dismissKeyboard()
        state.todayPath.append(.chat(matchID))
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "bubble.left.and.bubble.right")
                .font(.system(size: 36)).foregroundStyle(MF.faint)
            Text("Noch keine Matches").font(.system(size: 18, weight: .bold)).foregroundStyle(MF.ink)
            Text("Swipe dich durch die Profile —\ndein erstes Match wartet schon.")
                .font(.system(size: 13.5)).foregroundStyle(MF.smoke)
                .multilineTextAlignment(.center)
            MFPrimaryButton(title: "Zum Swipe-Deck", icon: "rectangle.stack") {
                state.open(.screen(.swipe))
            }
            .frame(width: 230)
            .padding(.top, 6)
        }
        .padding(30)
    }
}

struct ChatRow: View {
    let match: Match
    var body: some View {
        HStack(spacing: 13) {
            MFAvatar(name: match.card.name, size: 50)
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 6) {
                    Text(match.card.name).font(.system(size: 15.5, weight: .bold)).foregroundStyle(MF.ink)
                    if match.card.isSuper {
                        Image(systemName: "star.fill").font(.system(size: 10)).foregroundStyle(MF.indigo)
                    }
                }
                Text(match.lastPreview)
                    .font(.system(size: 13)).foregroundStyle(MF.smoke)
                    .lineLimit(1)
            }
            Spacer()
            if match.unread > 0 {
                Text("\(match.unread)")
                    .font(.system(size: 11, weight: .bold)).foregroundStyle(.white)
                    .frame(minWidth: 20).frame(height: 20)
                    .background(MF.ember)
                    .clipShape(Capsule())
            }
            Image(systemName: "chevron.right")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(MF.faint)
        }
    }
}

struct NewMessageSheet: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var state: AppState

    let matches: [Match]
    let openChat: (String) -> Void

    @State private var searchText = ""
    @State private var selectedID: String?
    @State private var draft = ""
    @FocusState private var draftFocused: Bool

    private var selectedMatch: Match? {
        matches.first { $0.id == selectedID } ?? matches.first
    }

    private var visibleMatches: [Match] {
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !query.isEmpty else { return matches }
        return matches.filter { $0.matchesChatSearch(query) }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 12) {
                    ForEach(visibleMatches) { match in
                        Button {
                            select(match)
                        } label: {
                            ComposePersonRow(match: match, selected: match.id == selectedMatch?.id)
                        }
                        .buttonStyle(.plain)
                    }

                    if visibleMatches.isEmpty {
                        VStack(spacing: 8) {
                            Image(systemName: "magnifyingglass")
                                .font(.system(size: 24, weight: .semibold))
                                .foregroundStyle(MF.faint)
                            Text("Niemand gefunden")
                                .font(.system(size: 15, weight: .bold))
                                .foregroundStyle(MF.ink)
                            Text("Versuch Name, Rolle, Skill oder Stadt.")
                                .font(.system(size: 13))
                                .foregroundStyle(MF.smoke)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 30)
                    }
                }
                .padding(16)
                .padding(.bottom, 126)
            }
            .background(MF.canvas.ignoresSafeArea())
            .navigationTitle("Person anschreiben")
            .navigationBarTitleDisplayMode(.inline)
            .searchable(text: $searchText, prompt: "Match suchen")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Schließen") { dismiss() }
                }
            }
            .safeAreaInset(edge: .bottom) {
                composer
            }
            .onAppear {
                if selectedID == nil, let first = matches.first {
                    select(first, focus: false)
                }
            }
        }
    }

    private var composer: some View {
        VStack(spacing: 9) {
            if let selectedMatch {
                HStack(spacing: 8) {
                    MFAvatar(name: selectedMatch.card.name, size: 28)
                    Text(selectedMatch.card.name)
                        .font(.system(size: 13.5, weight: .bold))
                        .foregroundStyle(MF.ink)
                    Text("\(selectedMatch.card.matchPercent)% Fit")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(MF.emberDeep)
                        .padding(.horizontal, 8)
                        .frame(height: 24)
                        .background(MF.emberTint)
                        .clipShape(Capsule())
                    Spacer(minLength: 0)
                }
            }

            HStack(alignment: .bottom, spacing: 9) {
                TextField("Nachricht...", text: $draft, axis: .vertical)
                    .font(.system(size: 14.5))
                    .lineLimit(1...4)
                    .focused($draftFocused)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 11)
                    .background(MF.surface)
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 16).stroke(MF.border, lineWidth: 1))

                Button {
                    send()
                } label: {
                    Image(systemName: "paperplane.fill")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(width: 44, height: 44)
                        .background(canSend ? AnyShapeStyle(MF.emberGrad) : AnyShapeStyle(MF.faint.opacity(0.45)))
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)
                .disabled(!canSend)
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 12)
        .padding(.bottom, 10)
        .background(.regularMaterial)
    }

    private var canSend: Bool {
        selectedMatch != nil && !draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    private func select(_ match: Match, focus: Bool = true) {
        Haptics.select()
        selectedID = match.id
        if draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            draft = suggestedOpening(for: match)
        }
        if focus {
            draftFocused = true
        }
    }

    private func send() {
        guard let selectedMatch else { return }
        let text = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        Haptics.tap()
        state.send(text, to: selectedMatch.id)
        dismiss()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
            openChat(selectedMatch.id)
        }
    }

    private func suggestedOpening(for match: Match) -> String {
        let skill = match.card.skills.first ?? match.card.role
        return "Hey \(match.card.name.split(separator: " ").first.map(String.init) ?? match.card.name), dein Profil rund um \(skill) passt spannend zu meinem Vorhaben. Hast du diese Woche 15 Minuten fuer einen kurzen Rollen-Check?"
    }
}

struct ComposePersonRow: View {
    let match: Match
    let selected: Bool

    var body: some View {
        HStack(spacing: 12) {
            MFAvatar(name: match.card.name, size: 46)

            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(match.card.name)
                        .font(.system(size: 15.5, weight: .bold))
                        .foregroundStyle(MF.ink)
                        .lineLimit(1)
                    if match.card.isSuper {
                        Image(systemName: "star.fill")
                            .font(.system(size: 10))
                            .foregroundStyle(MF.indigo)
                    }
                }
                Text("\(match.card.role) · \(match.card.city)")
                    .font(.system(size: 13))
                    .foregroundStyle(MF.smoke)
                    .lineLimit(1)
                Text(match.card.skills.prefix(3).joined(separator: " · "))
                    .font(.system(size: 12.5, weight: .semibold))
                    .foregroundStyle(MF.inkSoft)
                    .lineLimit(1)
            }

            Spacer(minLength: 0)

            Image(systemName: selected ? "checkmark.circle.fill" : "plus.message")
                .font(.system(size: 18, weight: .semibold))
                .foregroundStyle(selected ? MF.ember : MF.faint)
        }
        .padding(14)
        .background(selected ? MF.emberTint.opacity(0.75) : MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(selected ? MF.ember : MF.border, lineWidth: 1))
    }
}

struct ChatDetailView: View {
    @EnvironmentObject var state: AppState
    let matchId: String
    @State private var input = ""

    private var match: Match? { state.matches.first { $0.id == matchId } }

    var body: some View {
        VStack(spacing: 0) {
            ScrollViewReader { proxy in
                ScrollView {
                    VStack(spacing: 10) {
                        if let match {
                            matchBanner(match)
                            ForEach(match.messages) { msg in
                                bubble(msg)
                                    .id(msg.id)
                            }
                        }
                    }
                    .padding(.horizontal, 18)
                    .padding(.vertical, 14)
                }
                .scrollIndicators(.hidden)
                .onChange(of: match?.messages.count ?? 0) { _, _ in
                    if let last = match?.messages.last {
                        withAnimation { proxy.scrollTo(last.id, anchor: .bottom) }
                    }
                }
            }
            composer
        }
        .background(MF.canvas.ignoresSafeArea())
        .navigationTitle(match?.card.name ?? "Chat")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func matchBanner(_ match: Match) -> some View {
        VStack(spacing: 8) {
            MFAvatar(name: match.card.name, size: 58)
            Text("Ihr habt gematcht — \(match.card.matchPercent)% Fit")
                .font(.system(size: 12.5, weight: .semibold)).foregroundStyle(MF.emberDeep)
                .padding(.horizontal, 13).padding(.vertical, 7)
                .background(MF.emberTint)
                .clipShape(Capsule())
            Text("„\(match.card.pitch)“")
                .font(.system(size: 13, design: .serif)).italic()
                .foregroundStyle(MF.smoke)
                .multilineTextAlignment(.center)
        }
        .padding(.vertical, 12)
    }

    private func bubble(_ msg: ChatMessage) -> some View {
        HStack {
            if msg.mine { Spacer(minLength: 48) }
            Text(msg.text)
                .font(.system(size: 14.5))
                .foregroundStyle(msg.mine ? .white : MF.ink)
                .padding(.horizontal, 14).padding(.vertical, 10)
                .background {
                    if msg.mine { MF.emberGrad } else { MF.surface }
                }
                .clipShape(UnevenRoundedRectangle(
                    topLeadingRadius: 18,
                    bottomLeadingRadius: msg.mine ? 18 : 5,
                    bottomTrailingRadius: msg.mine ? 5 : 18,
                    topTrailingRadius: 18))
                .overlay(UnevenRoundedRectangle(
                    topLeadingRadius: 18,
                    bottomLeadingRadius: msg.mine ? 18 : 5,
                    bottomTrailingRadius: msg.mine ? 5 : 18,
                    topTrailingRadius: 18)
                    .stroke(msg.mine ? .clear : MF.border, lineWidth: 1))
            if !msg.mine { Spacer(minLength: 48) }
        }
    }

    private var composer: some View {
        HStack(spacing: 9) {
            TextField("Nachricht…", text: $input, axis: .vertical)
                .font(.system(size: 14.5))
                .lineLimit(1...4)
                .submitLabel(.send)
                .onSubmit { send() }
                .padding(.horizontal, 14).padding(.vertical, 11)
                .background(MF.surface)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 16).stroke(MF.border, lineWidth: 1))
            Button {
                send()
            } label: {
                Image(systemName: "arrow.up")
                    .font(.system(size: 15, weight: .bold)).foregroundStyle(.white)
                    .frame(width: 44, height: 44)
                    .background(MF.emberGrad)
                    .clipShape(Circle())
            }
            .buttonStyle(.plain)
            .disabled(input.trimmingCharacters(in: .whitespaces).isEmpty)
            .opacity(input.trimmingCharacters(in: .whitespaces).isEmpty ? 0.4 : 1)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(MF.canvas)
    }

    private func send() {
        let text = input.trimmingCharacters(in: .whitespaces)
        guard !text.isEmpty else { return }
        Haptics.tap()
        input = ""
        state.send(text, to: matchId)
    }
}

private extension Match {
    var lastActivity: Date {
        messages.last?.at ?? .distantPast
    }

    func matchesChatSearch(_ query: String) -> Bool {
        let needle = query.folding(options: [.diacriticInsensitive, .caseInsensitive], locale: .current)
        let haystack = [
            card.name,
            card.role,
            card.city,
            card.pitch,
            card.availability.label,
            card.skills.joined(separator: " "),
            messages.map(\.text).joined(separator: " ")
        ]
        .joined(separator: " ")
        .folding(options: [.diacriticInsensitive, .caseInsensitive], locale: .current)

        return haystack.localizedCaseInsensitiveContains(needle)
    }
}

private func dismissKeyboard() {
    #if canImport(UIKit)
    UIApplication.shared.sendAction(
        #selector(UIResponder.resignFirstResponder),
        to: nil,
        from: nil,
        for: nil
    )
    #endif
}
