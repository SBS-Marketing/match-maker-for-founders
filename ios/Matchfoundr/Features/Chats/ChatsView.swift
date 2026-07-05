// Chats — Matches gelistet, letzter Vorschau-Satz, Ungelesen-Badge.
// Chat selbst: schnell, sauber, Text reicht.

import SwiftUI

struct ChatsView: View {
    @EnvironmentObject var state: AppState

    var body: some View {
        NavigationStack {
            Group {
                if state.matches.isEmpty {
                    emptyState
                } else {
                    List {
                        ForEach(state.matches) { match in
                            NavigationLink(value: match.id) {
                                ChatRow(match: match)
                            }
                            .listRowBackground(MF.surface)
                            .listRowSeparatorTint(MF.borderSoft)
                        }
                    }
                    .listStyle(.plain)
                    .scrollContentBackground(.hidden)
                }
            }
            .background(MF.canvas.ignoresSafeArea())
            .navigationTitle("Chats")
            .navigationBarTitleDisplayMode(.large)
            .navigationDestination(for: String.self) { id in
                if let match = state.matches.first(where: { $0.id == id }) {
                    ChatDetailView(matchId: match.id)
                }
            }
        }
        .tint(MF.emberDeep)
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
                state.tab = .swipe
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
        }
        .padding(.vertical, 6)
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
                .clipShape(RoundedRectangle(cornerRadius: 17, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 17).stroke(msg.mine ? .clear : MF.border, lineWidth: 1))
            if !msg.mine { Spacer(minLength: 48) }
        }
    }

    private var composer: some View {
        HStack(spacing: 9) {
            TextField("Nachricht…", text: $input, axis: .vertical)
                .font(.system(size: 14.5))
                .lineLimit(1...4)
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
