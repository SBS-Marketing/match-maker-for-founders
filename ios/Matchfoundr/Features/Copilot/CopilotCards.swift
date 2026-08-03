// Rich Cards des Co-Piloten — Kontakt- und Recherche-Karte.
//
// Gerüst nach dem Design-System (claude.ai/design · "matchfoundr Co-Pilot
// Rich Cards", mfx-richcards.jsx): ein gemeinsamer Rahmen aus Kopfzeile
// (Icon-Kachel, Mono-Kicker, Status-Pill), Body und Aktionsleiste — pro
// Kartentyp eine eigene Innen-Struktur. Farbe trägt Bedeutung: die
// Service-Paletten aus MF.services, nicht das Indigo des Chats.

import Contacts
import SwiftUI

// ─── Design-Tokens der Karten ─────────────────────────────────

private enum RC {
    static let cardRadius: CGFloat = 20
    static let blockRadius: CGFloat = 13
    static let tile: CGFloat = 30
    static let tileRadius: CGFloat = 9
    static let buttonHeight: CGFloat = 42
    static let buttonRadius: CGFloat = 13

    static func service(_ key: String) -> MF.ServiceHue {
        MF.services[key] ?? MF.services["cofounder"]!
    }

    static func gradient(_ hue: Color) -> LinearGradient {
        LinearGradient(
            colors: [hue.opacity(0.92), hue],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
}

/// Status-Pill der Kopfzeile. `solid` trägt zusätzlich einen Punkt.
private struct RCPill: View {
    let text: String
    let service: MF.ServiceHue
    var solid = false

    var body: some View {
        HStack(spacing: 5) {
            if solid {
                Circle().fill(.white).frame(width: 6, height: 6)
            }
            Text(text)
                .font(.mfMono(10.5))
                .kerning(0.42)
        }
        .foregroundStyle(solid ? Color.white : service.ink)
        .padding(.horizontal, 9)
        .padding(.vertical, 4)
        .background(solid ? AnyShapeStyle(service.hue) : AnyShapeStyle(service.tint))
        .clipShape(Capsule())
    }
}

/// Aktionsleisten-Button: `primary` trägt den Service-Verlauf, sonst ruhig.
private struct RCButton: View {
    let label: String
    var icon: String?
    var primary = false
    var service: MF.ServiceHue
    var busy = false
    var done = false
    let action: () -> Void

    var body: some View {
        Button {
            guard !busy, !done else { return }
            action()
        } label: {
            HStack(spacing: 7) {
                if busy {
                    ProgressView()
                        .controlSize(.mini)
                        .tint(primary ? .white : MF.smoke)
                } else if let icon {
                    Image(systemName: done ? "checkmark" : icon)
                        .font(.system(size: 13, weight: .bold))
                }
                Text(label)
                    .font(.system(size: 14, weight: .bold))
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
            .frame(maxWidth: .infinity)
            .frame(height: RC.buttonHeight)
            .foregroundStyle(primary ? Color.white : MF.inkSoft)
            .background {
                if primary {
                    RoundedRectangle(cornerRadius: RC.buttonRadius, style: .continuous)
                        .fill(RC.gradient(service.hue))
                        .shadow(color: service.hue.opacity(0.45), radius: 10, y: 5)
                } else {
                    RoundedRectangle(cornerRadius: RC.buttonRadius, style: .continuous)
                        .fill(MF.surfaceSoft)
                        .overlay(
                            RoundedRectangle(cornerRadius: RC.buttonRadius, style: .continuous)
                                .stroke(MF.border, lineWidth: 1)
                        )
                }
            }
            .opacity(done ? 0.75 : 1)
        }
        .buttonStyle(.plain)
    }
}

/// Das gemeinsame Karten-Gerüst aller Rich Cards.
private struct RCFrame<Body: View, Actions: View>: View {
    let kicker: String
    let icon: String
    let service: MF.ServiceHue
    var status: String?
    var statusSolid = false
    @ViewBuilder var content: () -> Body
    @ViewBuilder var actions: () -> Actions

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 10) {
                Image(systemName: icon)
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(service.ink)
                    .frame(width: RC.tile, height: RC.tile)
                    .background(service.tint)
                    .clipShape(RoundedRectangle(cornerRadius: RC.tileRadius, style: .continuous))
                Text(kicker.uppercased())
                    .font(.mfMono(10.5))
                    .kerning(1.05)
                    .foregroundStyle(MF.faint)
                Spacer(minLength: 4)
                if let status {
                    RCPill(text: status, service: service, solid: statusSolid)
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .overlay(alignment: .bottom) {
                Rectangle().fill(MF.borderSoft).frame(height: 1)
            }

            content()
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)

            actions()
                .padding(.horizontal, 14)
                .padding(.bottom, 14)
        }
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: RC.cardRadius, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: RC.cardRadius, style: .continuous)
                .stroke(MF.border, lineWidth: 1)
        )
        .warmShadow(large: true)
    }
}

/// Initialen-Avatar wie im Design — zwei Buchstaben, Service-Tint.
private struct RCAvatar: View {
    let name: String
    let service: MF.ServiceHue
    var size: CGFloat = 52

    private var initials: String {
        name.split(whereSeparator: { $0 == " " || $0 == "·" })
            .prefix(2)
            .compactMap { $0.first.map(String.init) }
            .joined()
            .uppercased()
    }

    var body: some View {
        Text(initials)
            .font(.system(size: size * 0.36, weight: .bold))
            .kerning(-0.2)
            .foregroundStyle(service.ink)
            .frame(width: size, height: size)
            .background(service.tint)
            .clipShape(Circle())
    }
}

/// Eine Datenzeile im ruhigen Block — antippbar, wenn ein Ziel dahinter liegt.
private struct RCRow: View {
    let icon: String
    let text: String
    var url: URL?
    @Environment(\.openURL) private var openURL

    var body: some View {
        Button {
            guard let url else { return }
            Haptics.tap()
            openURL(url)
        } label: {
            HStack(spacing: 9) {
                Image(systemName: icon)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(MF.faint)
                    .frame(width: 15)
                Text(text)
                    .font(.system(size: 13.5))
                    .foregroundStyle(MF.inkSoft)
                    .lineLimit(1)
                    .truncationMode(.tail)
                Spacer(minLength: 0)
                if url != nil {
                    Image(systemName: "arrow.up.right")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(MF.faint.opacity(0.7))
                }
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .disabled(url == nil)
    }
}

// ─── Adressbuch ───────────────────────────────────────────────

enum ContactBookError: LocalizedError {
    case denied
    case failed(String)

    var errorDescription: String? {
        switch self {
        case .denied:
            return "matchfoundr darf nicht auf deine Kontakte zugreifen. Das änderst du in den iOS-Einstellungen unter Datenschutz › Kontakte."
        case .failed(let reason):
            return reason
        }
    }
}

enum ContactBook {
    /// Legt die Karte als echten iOS-Kontakt an. Löst beim ersten Mal den
    /// Berechtigungsdialog aus — ohne Freigabe wird nichts geschrieben.
    static func add(_ card: CopilotCard) async throws {
        let store = CNContactStore()
        let status = CNContactStore.authorizationStatus(for: .contacts)
        if status == .notDetermined {
            let granted = try await store.requestAccess(for: .contacts)
            guard granted else { throw ContactBookError.denied }
        } else if status == .denied || status == .restricted {
            throw ContactBookError.denied
        }

        let contact = CNMutableContact()
        if card.organization.isEmpty {
            // Kein Personenname belegt: die Stelle selbst trägt den Kontakt.
            contact.organizationName = card.name
        } else {
            let parts = card.name.split(separator: " ").map(String.init)
            contact.givenName = parts.dropLast().joined(separator: " ")
            contact.familyName = parts.last ?? card.name
            if contact.givenName.isEmpty { contact.givenName = card.name }
            contact.organizationName = card.organization
        }
        if !card.role.isEmpty { contact.jobTitle = card.role }
        if !card.phone.isEmpty {
            contact.phoneNumbers = [
                CNLabeledValue(label: CNLabelWork, value: CNPhoneNumber(stringValue: card.phone))
            ]
        }
        if !card.email.isEmpty {
            contact.emailAddresses = [
                CNLabeledValue(label: CNLabelWork, value: card.email as NSString)
            ]
        }
        if !card.addressLine.isEmpty {
            let address = CNMutablePostalAddress()
            address.street = card.street
            address.postalCode = card.postalCode
            address.city = card.city
            contact.postalAddresses = [CNLabeledValue(label: CNLabelWork, value: address)]
        }
        let link = card.website.isEmpty ? card.sourceURL : card.website
        if !link.isEmpty {
            contact.urlAddresses = [CNLabeledValue(label: CNLabelWork, value: link as NSString)]
        }

        let request = CNSaveRequest()
        request.add(contact, toContainerWithIdentifier: nil)
        do {
            try store.execute(request)
        } catch {
            throw ContactBookError.failed(error.localizedDescription)
        }
    }
}

// ─── Kontaktkarte ─────────────────────────────────────────────

struct CopilotContactCard: View {
    let card: CopilotCard
    @EnvironmentObject var state: AppState

    @State private var addressBookState: SaveState = .idle
    @State private var appSaveState: SaveState = .idle
    @State private var errorMessage: String?

    private enum SaveState: Equatable { case idle, working, done }

    private let service = RC.service("talent")

    var body: some View {
        RCFrame(
            kicker: "Kontakt",
            icon: card.organization.isEmpty ? "building.columns.fill" : "person.fill",
            service: service,
            status: savedInApp ? "gespeichert" : "neu",
            statusSolid: !savedInApp
        ) {
            VStack(alignment: .leading, spacing: 12) {
                identity
                if !detailRows.isEmpty {
                    VStack(alignment: .leading, spacing: 9) {
                        ForEach(detailRows) { row in
                            RCRow(icon: row.icon, text: row.text, url: row.url)
                        }
                    }
                    .padding(.horizontal, 13)
                    .padding(.vertical, 11)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(MF.surfaceSoft)
                    .clipShape(RoundedRectangle(cornerRadius: RC.blockRadius, style: .continuous))
                }
                if !card.note.isEmpty {
                    Text(card.note)
                        .font(.system(size: 12.5))
                        .foregroundStyle(MF.smoke)
                        .fixedSize(horizontal: false, vertical: true)
                }
                if let errorMessage {
                    Text(errorMessage)
                        .font(.system(size: 11.5, weight: .medium))
                        .foregroundStyle(MF.emberDeep)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        } actions: {
            HStack(spacing: 9) {
                RCButton(
                    label: addressBookState == .done ? "Im Adressbuch" : "Adressbuch",
                    icon: "person.crop.circle.badge.plus",
                    service: service,
                    busy: addressBookState == .working,
                    done: addressBookState == .done
                ) {
                    Task { await addToAddressBook() }
                }
                RCButton(
                    label: savedInApp ? "Gespeichert" : "In der App",
                    icon: "tray.and.arrow.down.fill",
                    primary: true,
                    service: service,
                    busy: appSaveState == .working,
                    done: savedInApp
                ) {
                    saveInApp()
                }
            }
        }
    }

    private var identity: some View {
        HStack(spacing: 13) {
            RCAvatar(name: card.name, service: service)
            VStack(alignment: .leading, spacing: 2) {
                Text(card.name)
                    .font(.system(size: 17, weight: .bold))
                    .kerning(-0.34)
                    .foregroundStyle(MF.ink)
                    .fixedSize(horizontal: false, vertical: true)
                if !card.contactSubtitle.isEmpty {
                    Text(card.contactSubtitle)
                        .font(.system(size: 13))
                        .foregroundStyle(MF.smoke)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            Spacer(minLength: 0)
        }
    }

    // ─── Antippbare Zeilen ────────────────────────────────────

    private struct DetailRow: Identifiable {
        let id: String
        let icon: String
        let text: String
        let url: URL?
    }

    private var detailRows: [DetailRow] {
        var rows: [DetailRow] = []
        if !card.phone.isEmpty {
            let digits = card.phone.filter { $0.isNumber || $0 == "+" }
            rows.append(DetailRow(
                id: "phone", icon: "phone.fill", text: card.phone,
                url: URL(string: "tel:\(digits)")))
        }
        if !card.email.isEmpty {
            rows.append(DetailRow(
                id: "mail", icon: "envelope.fill", text: card.email,
                url: URL(string: "mailto:\(card.email)")))
        }
        if !card.addressLine.isEmpty {
            let query = card.addressLine
                .addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
            rows.append(DetailRow(
                id: "address", icon: "mappin.and.ellipse", text: card.addressLine,
                url: URL(string: "http://maps.apple.com/?q=\(query)")))
        }
        if !card.website.isEmpty {
            rows.append(DetailRow(
                id: "web", icon: "safari.fill", text: displayHost(card.website),
                url: URL(string: card.website)))
        }
        return rows
    }

    private func displayHost(_ value: String) -> String {
        guard let host = URL(string: value)?.host else { return value }
        return host.hasPrefix("www.") ? String(host.dropFirst(4)) : host
    }

    // ─── Speichern ────────────────────────────────────────────

    private var savedInApp: Bool {
        appSaveState == .done || state.isContactSaved(card)
    }

    @MainActor
    private func addToAddressBook() async {
        errorMessage = nil
        addressBookState = .working
        do {
            try await ContactBook.add(card)
            addressBookState = .done
            Haptics.success()
        } catch {
            addressBookState = .idle
            errorMessage = error.localizedDescription
            Haptics.heavy()
        }
    }

    @MainActor
    private func saveInApp() {
        errorMessage = nil
        state.saveContact(card)
        appSaveState = .done
        Haptics.success()
    }
}

// ─── E-Mail-Entwurf ───────────────────────────────────────────

/// Nach `CardEmail` aus dem Design: Empfänger-Chip, Betreff, angerissener
/// Text. Gesendet wird erst im Editor — deshalb trägt die Karte nur einen
/// Knopf, der genau dorthin führt, statt ein „Senden" zu versprechen.
struct CopilotEmailCard: View {
    let draft: CopilotEmailDraft
    let onOpen: () -> Void

    private let service = RC.service("mentor")

    var body: some View {
        RCFrame(
            kicker: "E-Mail-Entwurf",
            icon: "envelope.fill",
            service: service,
            status: draft.to.isEmpty ? "Empfänger fehlt" : "bereit"
        ) {
            VStack(alignment: .leading, spacing: 10) {
                HStack(spacing: 8) {
                    fieldLabel("An")
                    if draft.recipientName.isEmpty && draft.to.isEmpty {
                        Text("noch offen")
                            .font(.system(size: 12.5, weight: .semibold))
                            .foregroundStyle(MF.emberDeep)
                    } else {
                        HStack(spacing: 7) {
                            RCAvatar(
                                name: draft.recipientName.isEmpty ? draft.to : draft.recipientName,
                                service: service,
                                size: 22
                            )
                            Text(draft.recipientName.isEmpty ? draft.to : draft.recipientName)
                                .font(.system(size: 12.5, weight: .semibold))
                                .foregroundStyle(MF.inkSoft)
                                .lineLimit(1)
                        }
                        .padding(.leading, 3)
                        .padding(.trailing, 11)
                        .padding(.vertical, 3)
                        .background(MF.surfaceSoft)
                        .clipShape(Capsule())
                        .overlay(Capsule().stroke(MF.border, lineWidth: 1))
                    }
                    Spacer(minLength: 0)
                }
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    fieldLabel("Betreff")
                    Text(draft.subject)
                        .font(.system(size: 14.5, weight: .bold))
                        .kerning(-0.15)
                        .foregroundStyle(MF.ink)
                        .lineLimit(2)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Divider().overlay(MF.borderSoft)
                Text(draft.body)
                    .font(.system(size: 13.5))
                    .foregroundStyle(MF.smoke)
                    .lineSpacing(2.5)
                    .lineLimit(4)
                    .fixedSize(horizontal: false, vertical: true)
                    .mask(
                        LinearGradient(
                            colors: [.black, .black, .black.opacity(0.15)],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
            }
            .contentShape(Rectangle())
            .onTapGesture { onOpen() }
        } actions: {
            RCButton(
                label: "Bearbeiten & senden",
                icon: "pencil",
                primary: true,
                service: service
            ) {
                onOpen()
            }
        }
    }

    private func fieldLabel(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 12))
            .foregroundStyle(MF.faint)
            .frame(width: 44, alignment: .leading)
    }
}

// ─── Termin ───────────────────────────────────────────────────

/// Nach `CardEvent` aus dem Design: Datums-Kachel, Titel, Zeit- und
/// Ort-Zeile. Eingetragen wird erst auf Tap — der Co-Pilot schreibt
/// nichts ungefragt in den Kalender.
struct CopilotEventCard: View {
    let draft: CopilotEventDraft
    @EnvironmentObject var state: AppState

    @State private var saved = false

    private let service = RC.service("capital")

    var body: some View {
        RCFrame(
            kicker: "Termin vorbereitet",
            icon: "calendar",
            service: service,
            status: saved ? "im Kalender" : draft.statusLabel,
            statusSolid: !saved && draft.date != nil
        ) {
            HStack(alignment: .top, spacing: 13) {
                if draft.date != nil {
                    dateTile
                }
                VStack(alignment: .leading, spacing: 9) {
                    Text(draft.title)
                        .font(.system(size: 15.5, weight: .bold))
                        .kerning(-0.15)
                        .foregroundStyle(MF.ink)
                        .fixedSize(horizontal: false, vertical: true)
                    VStack(alignment: .leading, spacing: 6) {
                        if !draft.timeLabel.isEmpty {
                            RCRow(icon: "clock", text: draft.timeLabel)
                        }
                        if !draft.location.isEmpty {
                            RCRow(icon: locationIcon, text: draft.location)
                        }
                        if !draft.note.isEmpty {
                            RCRow(icon: "text.alignleft", text: draft.note)
                        }
                    }
                }
                Spacer(minLength: 0)
            }
        } actions: {
            HStack(spacing: 9) {
                RCButton(label: "Kalender", icon: "calendar", service: service) {
                    Haptics.tap()
                    state.open(.screen(.calendar))
                    state.minimizeCopilot()
                }
                RCButton(
                    label: saved ? "Eingetragen" : "Eintragen",
                    icon: "calendar.badge.plus",
                    primary: true,
                    service: service,
                    done: saved
                ) {
                    addToPlanner()
                }
            }
        }
    }

    private var dateTile: some View {
        VStack(spacing: 0) {
            Text(draft.monthLabel)
                .font(.mfMono(10.5))
                .kerning(1.05)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 4)
                .background(RC.gradient(service.hue))
            Text(draft.dayLabel)
                .font(.system(size: 26, weight: .heavy))
                .kerning(-0.78)
                .foregroundStyle(MF.ink)
                .padding(.top, 5)
                .padding(.bottom, 7)
        }
        .frame(width: 58)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(MF.border, lineWidth: 1)
        )
    }

    private var locationIcon: String {
        let value = draft.location.lowercased()
        return value.contains("meet") || value.contains("zoom") || value.contains("teams")
            || value.contains("call") || value.contains("online")
            ? "video.fill"
            : "mappin.and.ellipse"
    }

    @MainActor
    private func addToPlanner() {
        state.addPlannerItem(
            title: draft.title,
            note: draft.plannerNote,
            dueLabel: draft.dueLabel,
            kind: .focus,
            target: nil,
            date: draft.date,
            createdByCopilot: true
        )
        saved = true
        Haptics.success()
    }
}

// ─── Recherche-Karte ──────────────────────────────────────────

struct CopilotResearchCard: View {
    let card: CopilotCard
    @Environment(\.openURL) private var openURL

    private let service = RC.service("legal")

    var body: some View {
        RCFrame(
            kicker: "Recherche",
            icon: "text.magnifyingglass",
            service: service,
            status: card.sources.count == 1 ? "1 Quelle" : "\(card.sources.count) Quellen"
        ) {
            VStack(alignment: .leading, spacing: 11) {
                Text(card.title)
                    .font(.system(size: 17, weight: .bold))
                    .kerning(-0.34)
                    .foregroundStyle(MF.ink)
                    .fixedSize(horizontal: false, vertical: true)
                Text(card.summary)
                    .font(.system(size: 13.5))
                    .foregroundStyle(MF.inkSoft)
                    .lineSpacing(2.5)
                    .fixedSize(horizontal: false, vertical: true)

                if !card.bullets.isEmpty {
                    VStack(alignment: .leading, spacing: 7) {
                        ForEach(card.bullets, id: \.self) { bullet in
                            HStack(alignment: .top, spacing: 9) {
                                Image(systemName: "checkmark.circle.fill")
                                    .font(.system(size: 14))
                                    .foregroundStyle(service.hue)
                                Text(bullet)
                                    .font(.system(size: 13))
                                    .foregroundStyle(MF.inkSoft)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                        }
                    }
                }
            }
        } actions: {
            VStack(spacing: 7) {
                ForEach(card.sources) { source in
                    sourceRow(source)
                }
            }
        }
    }

    private func sourceRow(_ source: CopilotCardSource) -> some View {
        Button {
            guard let url = URL(string: source.url) else { return }
            Haptics.tap()
            openURL(url)
        } label: {
            HStack(spacing: 9) {
                CardFavicon(url: source.faviconURL)
                VStack(alignment: .leading, spacing: 1) {
                    Text(source.title)
                        .font(.system(size: 12.5, weight: .semibold))
                        .foregroundStyle(MF.ink)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                    Text(source.domain)
                        .font(.mfMono(9.5))
                        .foregroundStyle(MF.faint)
                        .lineLimit(1)
                }
                Spacer(minLength: 0)
                Image(systemName: "arrow.up.right")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(MF.faint)
            }
            .padding(.horizontal, 11)
            .padding(.vertical, 9)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(MF.surfaceSoft)
            .clipShape(RoundedRectangle(cornerRadius: 11, style: .continuous))
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

/// Favicon mit ruhigem Platzhalter — ein fehlendes Icon darf die Zeile nicht springen lassen.
struct CardFavicon: View {
    let url: URL?

    var body: some View {
        AsyncImage(url: url) { phase in
            switch phase {
            case .success(let image):
                image.resizable().scaledToFit()
            default:
                Image(systemName: "globe")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(MF.faint)
            }
        }
        .frame(width: 18, height: 18)
        .padding(4)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))
    }
}

// ─── Verteiler ────────────────────────────────────────────────

struct CopilotCardList: View {
    let cards: [CopilotCard]

    var body: some View {
        VStack(spacing: 10) {
            ForEach(cards.filter(\.isRenderable)) { card in
                switch card.kind {
                case .contact:
                    CopilotContactCard(card: card)
                case .research:
                    CopilotResearchCard(card: card)
                case .unknown:
                    EmptyView()
                }
            }
        }
    }
}
