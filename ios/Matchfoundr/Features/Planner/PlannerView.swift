// Kalender/Planer — Arbeitsplan aus Founder-Memory, Events und Co-Pilot-Aktionen.

import SwiftUI

struct PlannerView: View {
    @EnvironmentObject private var state: AppState
    @State private var selectedDate = Date()
    @State private var visibleMonth = Date()
    @State private var showingNewItem = false

    private var memory: FounderMemorySnapshot { state.founderMemory }
    private var openItems: [PlannerItem] { state.plannerItems.filter { !$0.done } }
    private var doneItems: [PlannerItem] { state.plannerItems.filter(\.done) }
    private var selectedDayItems: [PlannerItem] {
        state.plannerItems.filter { item in
            Calendar.current.isDate(calendarDate(for: item), inSameDayAs: selectedDate)
        }
    }
    private var registeredEvents: [CommunityEvent] {
        state.events.filter { state.registeredEvents.contains($0.id) }
    }

    var body: some View {
        VStack(spacing: 0) {
            MShellTop(title: "Kalender", subtitle: "Plan, Termine, nächste Schritte") {
                HStack(spacing: 8) {
                    Button {
                        showingNewItem = true
                    } label: {
                        Image(systemName: "plus")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(.white)
                            .frame(width: 38, height: 38)
                            .background(MF.emberGrad)
                            .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
                    }
                    .buttonStyle(.plain)

                    Button {
                        state.rebuildPlannerFromMemory()
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
            }

            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    dayFocusCard
                    monthOverview
                    selectedDayList
                    MSectionHead(text: "Diese Woche", action: "Neu planen") {
                        state.rebuildPlannerFromMemory()
                    }
                    plannerList
                    MSectionHead(text: "Termine", action: "Events") {
                        state.open(.screen(.events))
                    }
                    eventList
                }
                .padding(20)
                .padding(.bottom, 90)
            }
            .scrollIndicators(.hidden)
        }
        .background(MF.canvas.ignoresSafeArea())
        .navigationTitle("Kalender")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showingNewItem) {
            PlannerItemEditor(
                selectedDate: selectedDate,
                teamMembers: state.startupTeamMembers,
                onSave: { title, note, date, kind, assignee, smart in
                    state.addPlannerItem(
                        title: title,
                        note: note,
                        dueLabel: dueLabel(for: date),
                        kind: kind,
                        target: target(for: kind),
                        date: date,
                        assigneeName: assignee,
                        createdByCopilot: smart
                    )
                    selectedDate = date
                    visibleMonth = date
                }
            )
            .presentationDetents([.large])
            .presentationCornerRadius(26)
        }
    }

    private var monthOverview: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Button {
                    visibleMonth = Calendar.current.date(byAdding: .month, value: -1, to: visibleMonth) ?? visibleMonth
                } label: {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(MF.ink)
                        .frame(width: 34, height: 34)
                        .background(MF.surfaceSoft)
                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                }
                .buttonStyle(.plain)

                Spacer()
                Text(visibleMonth.formatted(.dateTime.month(.wide).year().locale(Locale(identifier: "de_DE"))))
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(MF.ink)
                Spacer()

                Button {
                    visibleMonth = Calendar.current.date(byAdding: .month, value: 1, to: visibleMonth) ?? visibleMonth
                } label: {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(MF.ink)
                        .frame(width: 34, height: 34)
                        .background(MF.surfaceSoft)
                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                }
                .buttonStyle(.plain)
            }

            CalendarMonthGrid(
                month: visibleMonth,
                selectedDate: $selectedDate,
                markers: calendarMarkers
            )
        }
        .padding(14)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(MF.border, lineWidth: 1))
        .warmShadow()
    }

    private var selectedDayList: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                MSectionHead(text: selectedDate.formatted(.dateTime.weekday(.wide).day().month(.wide).locale(Locale(identifier: "de_DE"))))
                Spacer()
                Button {
                    showingNewItem = true
                } label: {
                    Label("Termin", systemImage: "plus")
                        .font(.system(size: 12.5, weight: .bold))
                        .foregroundStyle(MF.emberDeep)
                        .padding(.horizontal, 12)
                        .frame(height: 32)
                        .background(MF.emberTint)
                        .clipShape(Capsule())
                }
                .buttonStyle(.plain)
            }

            if selectedDayItems.isEmpty {
                emptyCard(
                    icon: "calendar.badge.plus",
                    title: emptyDayTitle,
                    text: emptyDayText
                ) {
                    showingNewItem = true
                }
            } else {
                ForEach(selectedDayItems) { item in
                    plannerRow(item)
                }
            }
        }
    }

    private var selectedDayTitle: String {
        if Calendar.current.isDateInToday(selectedDate) { return "Heute" }
        if Calendar.current.isDateInTomorrow(selectedDate) { return "Morgen" }
        return selectedDate.formatted(.dateTime.weekday(.wide).locale(Locale(identifier: "de_DE")))
    }

    private var dayBadgeTitle: String {
        if Calendar.current.isDateInToday(selectedDate) { return "HEUTE" }
        if Calendar.current.isDateInTomorrow(selectedDate) { return "MORGEN" }
        return selectedDate.formatted(.dateTime.day().month(.abbreviated).locale(Locale(identifier: "de_DE"))).uppercased()
    }

    private var emptyDayTitle: String {
        if Calendar.current.isDateInToday(selectedDate) { return "Heute nix geplant" }
        if Calendar.current.isDateInTomorrow(selectedDate) { return "Morgen nix geplant" }
        return "An diesem Tag nix geplant"
    }

    private var emptyDayText: String {
        if Calendar.current.isDateInToday(selectedDate) {
            return "Du hast heute keinen Termin im Kalender. Leg einen Fokusblock an oder lass den Co-Pilot den Tag planen."
        }
        return "Für diesen Tag ist noch kein Termin eingetragen. Du kannst direkt einen Call, Team-Check-in oder Fokusblock setzen."
    }

    private var dayFocusCard: some View {
        let primaryItem = selectedDayItems.first(where: { !$0.done }) ?? selectedDayItems.first
        let hasItems = primaryItem != nil

        return VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 10) {
                Image(systemName: hasItems ? "calendar.badge.clock" : "calendar")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 42, height: 42)
                    .background(.white.opacity(0.16))
                    .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))

                VStack(alignment: .leading, spacing: 2) {
                    Text(selectedDayTitle)
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(.white)
                    Text(selectedDate.formatted(.dateTime.weekday(.wide).day().month(.wide).locale(Locale(identifier: "de_DE"))))
                        .font(.system(size: 12.5))
                        .foregroundStyle(.white.opacity(0.72))
                        .lineLimit(1)
                }
                Spacer()

                Text(dayBadgeTitle)
                    .font(.system(size: 11.5, weight: .heavy))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 11)
                    .frame(height: 30)
                    .background(.white.opacity(0.16))
                    .clipShape(Capsule())
            }

            VStack(alignment: .leading, spacing: 5) {
                Text(hasItems ? primaryItem!.title : emptyDayTitle)
                    .font(.system(size: 22, weight: .bold))
                    .foregroundStyle(.white)
                    .fixedSize(horizontal: false, vertical: true)

                Text(hasItems ? primaryItem!.note : emptyDayText)
                    .font(.system(size: 13))
                    .foregroundStyle(.white.opacity(0.74))
                    .lineSpacing(2)
                    .fixedSize(horizontal: false, vertical: true)
            }

            if selectedDayItems.count > 1 {
                VStack(spacing: 7) {
                    ForEach(selectedDayItems.prefix(3)) { item in
                        HStack(spacing: 8) {
                            Circle()
                                .fill(item.done ? .white.opacity(0.45) : .white)
                                .frame(width: 6, height: 6)
                            Text(item.title)
                                .font(.system(size: 12.5, weight: .semibold))
                                .foregroundStyle(.white.opacity(item.done ? 0.56 : 0.82))
                                .lineLimit(1)
                            Spacer(minLength: 0)
                        }
                    }
                }
                .padding(10)
                .background(.white.opacity(0.10))
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            }

            HStack(spacing: 9) {
                planMetric(title: "Geplant", value: "\(selectedDayItems.count)")
                planMetric(title: "Offen", value: "\(selectedDayItems.filter { !$0.done }.count)")
                planMetric(title: "Gesamt", value: "\(openItems.count)")
            }

            HStack(spacing: 9) {
                Button {
                    showingNewItem = true
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "plus")
                        Text("Termin")
                            .font(.system(size: 14.5, weight: .bold))
                    }
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 44)
                    .background(.white.opacity(0.16))
                    .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
                }
                .buttonStyle(.plain)

                Button {
                    openDayInCopilot()
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "sparkles")
                        Text(hasItems ? "Durchgehen" : "Planen")
                            .font(.system(size: 14.5, weight: .bold))
                    }
                    .foregroundStyle(MF.indigoInk)
                    .frame(maxWidth: .infinity)
                    .frame(height: 44)
                    .background(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(18)
        .background(MF.indigoGrad)
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        .indigoGlow()
        .animation(.spring(response: 0.28, dampingFraction: 0.86), value: selectedDate)
    }

    private var memoryCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 10) {
                Image(systemName: "brain.head.profile")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 42, height: 42)
                    .background(.white.opacity(0.16))
                    .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
                VStack(alignment: .leading, spacing: 2) {
                    Text("Business-Memory")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(.white)
                    Text(memory.compactSummary)
                        .font(.system(size: 12.5))
                        .foregroundStyle(.white.opacity(0.72))
                        .lineLimit(1)
                }
                Spacer()
            }

            Text(memory.nextStep)
                .font(.system(size: 22, weight: .bold))
                .foregroundStyle(.white)
                .fixedSize(horizontal: false, vertical: true)

            HStack(spacing: 9) {
                planMetric(title: "Offen", value: "\(openItems.count)")
                planMetric(title: "Unterlagen", value: "\(memory.completedDocuments)/\(memory.totalDocuments)")
                planMetric(title: "Matches", value: "\(state.matches.count)")
            }

            Button {
                openDayInCopilot()
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "sparkles")
                    Text("Mit Co-Pilot durchgehen")
                        .font(.system(size: 14.5, weight: .bold))
                }
                .foregroundStyle(MF.indigoInk)
                .frame(maxWidth: .infinity)
                .frame(height: 44)
                .background(.white)
                .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
            }
            .buttonStyle(.plain)
        }
        .padding(18)
        .background(MF.indigoGrad)
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        .indigoGlow()
    }

    private func planMetric(title: String, value: String) -> some View {
        VStack(spacing: 2) {
            Text(value)
                .font(.system(size: value.count > 4 ? 13 : 18, weight: .heavy))
                .foregroundStyle(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Text(title)
                .font(.system(size: 10.5, weight: .semibold))
                .foregroundStyle(.white.opacity(0.62))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .background(.white.opacity(0.12))
        .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
    }

    private var plannerList: some View {
        VStack(spacing: 10) {
            if state.plannerItems.isEmpty {
                emptyCard(
                    icon: "calendar.badge.plus",
                    title: "Noch kein Plan",
                    text: "Der Co-Pilot baut dir aus Profil, Idee und Unterlagen einen ersten Arbeitsplan."
                ) {
                    state.rebuildPlannerFromMemory()
                }
            } else {
                ForEach(openItems) { item in
                    plannerRow(item)
                }
                if !doneItems.isEmpty {
                    MSectionHead(text: "Erledigt")
                    ForEach(doneItems) { item in
                        plannerRow(item)
                            .opacity(0.62)
                    }
                }
            }
        }
    }

    private func plannerRow(_ item: PlannerItem) -> some View {
        let hue = MF.services[item.kind.serviceId] ?? MF.services["cofounder"]!
        return HStack(alignment: .top, spacing: 12) {
            Button {
                state.togglePlannerItem(item.id)
            } label: {
                Image(systemName: item.done ? "checkmark" : item.kind.icon)
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(item.done ? .white : hue.ink)
                    .frame(width: 38, height: 38)
                    .background(item.done ? hue.hue : hue.tint)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
            .buttonStyle(.plain)

            VStack(alignment: .leading, spacing: 5) {
                HStack(spacing: 7) {
                    Text(item.dueLabel)
                        .font(.system(size: 11.5, weight: .bold))
                        .foregroundStyle(hue.ink)
                    Text("· \(item.kind.label)")
                        .font(.system(size: 11.5, weight: .semibold))
                        .foregroundStyle(MF.faint)
                }
                Text(item.title)
                    .font(.system(size: 14.5, weight: .bold))
                    .foregroundStyle(MF.ink)
                    .strikethrough(item.done, color: MF.faint)
                    .fixedSize(horizontal: false, vertical: true)
                Text(item.note)
                    .font(.system(size: 12.5))
                    .foregroundStyle(MF.smoke)
                    .lineSpacing(2)
                    .fixedSize(horizontal: false, vertical: true)

                FlowLayout(spacing: 7) {
                    if let target = item.target {
                        Button {
                            Haptics.tap()
                            state.open(target.destination)
                        } label: {
                            HStack(spacing: 6) {
                                Text(target.title)
                                    .font(.system(size: 12.5, weight: .bold))
                                Image(systemName: "arrow.right")
                                    .font(.system(size: 9, weight: .bold))
                            }
                            .foregroundStyle(hue.ink)
                            .padding(.horizontal, 12)
                            .frame(height: 32)
                            .background(hue.tint)
                            .clipShape(Capsule())
                        }
                        .buttonStyle(.plain)
                    }

                    Button {
                        openItemInCopilot(item)
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: "sparkles")
                                .font(.system(size: 10.5, weight: .bold))
                            Text("Co-Pilot")
                                .font(.system(size: 12.5, weight: .bold))
                        }
                        .foregroundStyle(MF.indigoInk)
                        .padding(.horizontal, 12)
                        .frame(height: 32)
                        .background(MF.indigoTint)
                        .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                }
                .padding(.top, 3)
            }
            Spacer(minLength: 0)
        }
        .padding(14)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(MF.border, lineWidth: 1))
        .warmShadow()
    }

    private var eventList: some View {
        VStack(spacing: 10) {
            if registeredEvents.isEmpty {
                emptyCard(
                    icon: "person.3.fill",
                    title: "Noch keine Termine",
                    text: "Events landen hier automatisch, sobald du dich anmeldest."
                ) {
                    state.open(.screen(.events))
                }
            } else {
                ForEach(registeredEvents) { event in
                    eventRow(event)
                }
            }
        }
    }

    private var calendarMarkers: Set<Date> {
        Set(state.plannerItems.map { Calendar.current.startOfDay(for: calendarDate(for: $0)) })
    }

    private func calendarDate(for item: PlannerItem) -> Date {
        if let date = item.date { return date }
        let lower = item.dueLabel.lowercased()
        if lower.contains("morgen") {
            return Calendar.current.date(byAdding: .day, value: 1, to: .now) ?? .now
        }
        if lower.contains("woche") || lower.contains("7 tage") {
            return Calendar.current.date(byAdding: .day, value: 4, to: .now) ?? .now
        }
        if lower.contains("meilenstein") || lower.contains("gespräch") {
            return Calendar.current.date(byAdding: .day, value: 10, to: .now) ?? .now
        }
        return .now
    }

    private func dueLabel(for date: Date) -> String {
        if Calendar.current.isDateInToday(date) { return "Heute" }
        if Calendar.current.isDateInTomorrow(date) { return "Morgen" }
        return date.formatted(.dateTime.weekday(.abbreviated).day().month(.abbreviated).locale(Locale(identifier: "de_DE")))
    }

    private func openDayInCopilot() {
        Haptics.tap()
        state.queueCopilotPrompt(
            calendarContextPrompt(),
            title: "Kalender · \(dueLabel(for: selectedDate))"
        )
    }

    private func openItemInCopilot(_ item: PlannerItem) {
        Haptics.tap()
        state.queueCopilotPrompt(
            itemContextPrompt(item),
            title: "Termin · \(item.title)"
        )
    }

    private func calendarContextPrompt() -> String {
        let entries = selectedDayItems.isEmpty
            ? "- Keine Termine oder Aufgaben auf diesem Tag."
            : selectedDayItems.map(plannerContextLine).joined(separator: "\n")
        let team = startupTeamContext()
        let open = openItems.prefix(5).map(plannerContextLine).joined(separator: "\n")

        return """
        KALENDER-KONTEXT
        Bitte geh diesen konkreten Kalender-Kontext mit mir durch. Beziehe dich auf Datum, Termine, Business-Memory, Team und offene Aufgaben. Sag mir praktisch, was wichtig ist, was blockiert und was ich als nächstes in der App tun sollte.

        Datum: \(fullDateLabel(for: selectedDate))
        Business-Memory: \(memory.compactSummary)
        Nächster Schritt: \(memory.nextStep)
        Offene Unterlagen: \(memory.openDocumentsText)

        Ausgewählte Einträge:
        \(entries)

        Team:
        \(team)

        Weitere offene Aufgaben:
        \(open.isEmpty ? "- Keine weiteren offenen Aufgaben." : open)
        """
    }

    private func itemContextPrompt(_ item: PlannerItem) -> String {
        let date = calendarDate(for: item)
        return """
        TERMIN-KONTEXT
        Bitte geh genau diesen Termin mit mir durch. Nutze den Kontext aus Business-Memory, Team und Kalender und schlage konkrete nächste Schritte oder App-Aktionen vor.

        Termin: \(item.title)
        Datum: \(fullDateLabel(for: date))
        Art: \(item.kind.label)
        Status: \(item.done ? "Erledigt" : "Offen")
        Zuständig: \(item.assigneeName ?? "Noch nicht zugewiesen")
        Zielbereich: \(item.target?.title ?? "Kein Zielbereich")
        Notiz: \(item.note)

        Business-Memory: \(memory.compactSummary)
        Nächster Schritt: \(memory.nextStep)
        Team:
        \(startupTeamContext())
        """
    }

    private func plannerContextLine(_ item: PlannerItem) -> String {
        let date = calendarDate(for: item)
        let status = item.done ? "erledigt" : "offen"
        let assignee = item.assigneeName.map { " · zuständig: \($0)" } ?? ""
        let smart = item.createdByCopilot ? " · Co-Pilot" : ""
        return "- \(fullDateLabel(for: date)): \(item.title) (\(item.kind.label), \(status)\(assignee)\(smart)) — \(item.note)"
    }

    private func startupTeamContext() -> String {
        let members = state.startupTeamMembers.prefix(6)
        guard !members.isEmpty else { return "- Noch kein Team im Business Workspace." }
        return members.map { "- \($0.name): \($0.role) · \($0.focus)" }.joined(separator: "\n")
    }

    private func fullDateLabel(for date: Date) -> String {
        date.formatted(
            .dateTime
                .weekday(.wide)
                .day()
                .month(.wide)
                .year()
                .hour()
                .minute()
                .locale(Locale(identifier: "de_DE"))
        )
    }

    private func target(for kind: PlannerItemKind) -> PlannerTarget {
        switch kind {
        case .document, .funding: .documents
        case .legal: .guides
        case .profile: .startup
        case .match: .chats
        case .meeting, .focus: .startup
        }
    }

    private func eventRow(_ event: CommunityEvent) -> some View {
        let hue = MF.services[event.serviceId] ?? MF.services["growth"]!
        return Button {
            Haptics.tap()
            state.tab = .community
            state.communityPath = [.event(event.id)]
        } label: {
            HStack(spacing: 12) {
                Image(systemName: "calendar")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(hue.ink)
                    .frame(width: 40, height: 40)
                    .background(hue.tint)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                VStack(alignment: .leading, spacing: 3) {
                    Text(event.title)
                        .font(.system(size: 14.5, weight: .bold))
                        .foregroundStyle(MF.ink)
                        .lineLimit(1)
                    Text("\(event.dateLabel) · \(event.timeLabel) · \(event.city)")
                        .font(.system(size: 12.5))
                        .foregroundStyle(MF.smoke)
                        .lineLimit(1)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(MF.faint)
            }
            .padding(14)
            .background(MF.surface)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(MF.border, lineWidth: 1))
            .warmShadow()
        }
        .buttonStyle(.plain)
    }

    private func emptyCard(icon: String, title: String, text: String, action: @escaping () -> Void) -> some View {
        Button {
            Haptics.tap()
            action()
        } label: {
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(MF.indigoInk)
                    .frame(width: 40, height: 40)
                    .background(MF.indigoTint)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                VStack(alignment: .leading, spacing: 3) {
                    Text(title)
                        .font(.system(size: 14.5, weight: .bold))
                        .foregroundStyle(MF.ink)
                    Text(text)
                        .font(.system(size: 12.5))
                        .foregroundStyle(MF.smoke)
                        .fixedSize(horizontal: false, vertical: true)
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

private struct CalendarMonthGrid: View {
    let month: Date
    @Binding var selectedDate: Date
    let markers: Set<Date>

    private let calendar = Calendar.current
    private let columns = Array(repeating: GridItem(.flexible(), spacing: 6), count: 7)
    private let weekdays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]

    var body: some View {
        VStack(spacing: 8) {
            LazyVGrid(columns: columns, spacing: 6) {
                ForEach(weekdays, id: \.self) { day in
                    Text(day)
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(MF.faint)
                        .frame(height: 22)
                }
                ForEach(days, id: \.self) { date in
                    if let date {
                        dayButton(date)
                    } else {
                        Color.clear.frame(height: 42)
                    }
                }
            }
        }
    }

    private func dayButton(_ date: Date) -> some View {
        let selected = calendar.isDate(date, inSameDayAs: selectedDate)
        let today = calendar.isDateInToday(date)
        let marked = markers.contains(calendar.startOfDay(for: date))
        return Button {
            Haptics.select()
            selectedDate = date
        } label: {
            VStack(spacing: 3) {
                Text("\(calendar.component(.day, from: date))")
                    .font(.system(size: 14, weight: selected ? .heavy : .semibold))
                    .foregroundStyle(selected ? .white : today ? MF.emberDeep : MF.ink)
                Circle()
                    .fill(marked ? (selected ? .white : MF.indigo) : .clear)
                    .frame(width: 5, height: 5)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 42)
            .background(selected ? AnyShapeStyle(MF.indigoGrad) : AnyShapeStyle(today ? MF.emberTint : MF.surfaceSoft))
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
        .buttonStyle(.plain)
    }

    private var days: [Date?] {
        guard let interval = calendar.dateInterval(of: .month, for: month),
              let range = calendar.range(of: .day, in: .month, for: month) else {
            return []
        }
        let first = interval.start
        let weekday = calendar.component(.weekday, from: first)
        let mondayBasedOffset = (weekday + 5) % 7
        var result = Array<Date?>(repeating: nil, count: mondayBasedOffset)
        result += range.compactMap { day -> Date? in
            calendar.date(byAdding: .day, value: day - 1, to: first)
        }
        while result.count % 7 != 0 {
            result.append(nil)
        }
        return result
    }
}

private struct PlannerItemEditor: View {
    @Environment(\.dismiss) private var dismiss
    let selectedDate: Date
    let teamMembers: [StartupTeamMember]
    let onSave: (String, String, Date, PlannerItemKind, String?, Bool) -> Void

    @State private var title = ""
    @State private var note = ""
    @State private var date: Date
    @State private var kind: PlannerItemKind = .meeting
    @State private var assigneeName = ""
    @State private var smart = true

    init(
        selectedDate: Date,
        teamMembers: [StartupTeamMember],
        onSave: @escaping (String, String, Date, PlannerItemKind, String?, Bool) -> Void
    ) {
        self.selectedDate = selectedDate
        self.teamMembers = teamMembers
        self.onSave = onSave
        _date = State(initialValue: selectedDate)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    smartTemplates
                    formCard
                    teamPicker
                }
                .padding(20)
                .padding(.bottom, 20)
            }
            .background(MF.canvas.ignoresSafeArea())
            .navigationTitle("Neuer Termin")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Abbrechen") { dismiss() }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Sichern") {
                        save()
                    }
                    .font(.system(size: 15, weight: .bold))
                    .disabled(title.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
    }

    private var smartTemplates: some View {
        VStack(alignment: .leading, spacing: 10) {
            MSectionHead(text: "Smarte Vorlagen")
            FlowLayout(spacing: 8) {
                template("Team-Check-in", "15 Minuten: Fortschritt, Blocker, nächste Zuständigkeit.", .meeting)
                template("Co-Pilot Sprint", "Konkretes Ergebnis erzeugen: Entwurf, Zahl oder Entscheidung.", .focus)
                template("Förder-Deadline", "Unterlagen prüfen, fehlende Angaben schließen, Antrag vorbereiten.", .funding)
                template("Match-Gespräch", "Rollen, Verfügbarkeit und Erwartung ehrlich abgleichen.", .match)
            }
        }
    }

    private func template(_ t: String, _ n: String, _ k: PlannerItemKind) -> some View {
        Button {
            Haptics.select()
            title = t
            note = n
            kind = k
            smart = true
        } label: {
            Text(t)
                .font(.system(size: 12.5, weight: .bold))
                .foregroundStyle(MF.indigoInk)
                .padding(.horizontal, 12)
                .frame(height: 34)
                .background(MF.indigoTint)
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }

    private var formCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            labeledField("Titel", text: $title, placeholder: "z.B. Team-Check-in")
            labeledField("Notiz", text: $note, placeholder: "Was soll am Ende klar sein?", axis: .vertical)
            DatePicker("Datum & Uhrzeit", selection: $date)
                .font(.system(size: 14, weight: .semibold))
                .tint(MF.ember)
            Picker("Art", selection: $kind) {
                ForEach(PlannerItemKind.allCases, id: \.self) { k in
                    Text(k.label).tag(k)
                }
            }
            .pickerStyle(.menu)
            Toggle("Smart im Business-Plan markieren", isOn: $smart)
                .font(.system(size: 14, weight: .semibold))
                .tint(MF.indigo)
        }
        .warmCard()
    }

    private var teamPicker: some View {
        VStack(alignment: .leading, spacing: 10) {
            MSectionHead(text: "Team")
            FlowLayout(spacing: 8) {
                ForEach(teamMembers) { member in
                    Button {
                        Haptics.select()
                        assigneeName = member.name
                    } label: {
                        Text(member.name)
                            .font(.system(size: 12.5, weight: .bold))
                            .foregroundStyle(assigneeName == member.name ? MF.emberDeep : MF.smoke)
                            .padding(.horizontal, 12)
                            .frame(height: 34)
                            .background(assigneeName == member.name ? MF.emberTint : MF.surface)
                            .clipShape(Capsule())
                            .overlay(Capsule().stroke(assigneeName == member.name ? MF.ember : MF.border, lineWidth: 1))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private func labeledField(_ label: String, text: Binding<String>, placeholder: String, axis: Axis = .horizontal) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(MF.faint)
            TextField(placeholder, text: text, axis: axis)
                .font(.system(size: 14.5))
                .lineLimit(axis == .vertical ? 2...5 : 1...1)
                .padding(.horizontal, 12)
                .padding(.vertical, 11)
                .background(MF.surfaceSoft)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
    }

    private func save() {
        let cleanTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanTitle.isEmpty else { return }
        onSave(
            cleanTitle,
            note.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "Noch ohne Notiz." : note,
            date,
            kind,
            assigneeName.isEmpty ? nil : assigneeName,
            smart
        )
        dismiss()
    }
}
