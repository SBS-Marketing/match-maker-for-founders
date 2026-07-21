// Meeting-Aufnahme — nach Design mfx-meeting.jsx: Extra des Co-Piloten.
// Intro → Aufnahme (echtes Mikro + On-Device-Transkription, de-DE)
// → Verarbeitung → Zusammenfassung mit Aufgaben, die direkt in der App
// landen (Kalender, Board, Business-Memory). Indigo-Welt, Aufnahme = Rot.

import AVFoundation
import Speech
import SwiftUI

// MARK: - Transkription

enum MeetingRole: String, CaseIterable, Identifiable {
    case founder = "Inhaber"
    case customer = "Kunde/Partner"
    case advisor = "Beratung"
    case finance = "Finanzen"
    case legal = "Recht"
    case tech = "Tech/Web"
    case marketing = "Marketing"
    case operations = "Betrieb"
    case task = "Aufgabe"
    case unknown = "Gespräch"

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .founder: "person.crop.circle"
        case .customer: "person.2.fill"
        case .advisor: "lightbulb.fill"
        case .finance: "banknote.fill"
        case .legal: "checkmark.seal.fill"
        case .tech: "network"
        case .marketing: "megaphone.fill"
        case .operations: "wrench.and.screwdriver.fill"
        case .task: "checklist"
        case .unknown: "quote.bubble.fill"
        }
    }

    var tint: Color {
        switch self {
        case .founder: MF.indigoTint
        case .customer: Color(hex: 0xE9F7EF)
        case .advisor: Color(hex: 0xFFF3D8)
        case .finance: Color(hex: 0xEAF3FF)
        case .legal: Color(hex: 0xF4ECFF)
        case .tech: Color(hex: 0xEAF8F7)
        case .marketing: Color(hex: 0xFEEAF3)
        case .operations: MF.emberTint
        case .task: Color(hex: 0xEAF4EE)
        case .unknown: MF.surfaceSoft
        }
    }

    var ink: Color {
        switch self {
        case .founder: MF.indigoInk
        case .customer: Color(hex: 0x26734D)
        case .advisor: Color(hex: 0x986900)
        case .finance: Color(hex: 0x245B9E)
        case .legal: Color(hex: 0x6B3FA0)
        case .tech: Color(hex: 0x1E7771)
        case .marketing: Color(hex: 0xB4376C)
        case .operations: MF.emberDeep
        case .task: Color(hex: 0x2E7D5B)
        case .unknown: MF.smoke
        }
    }

    static func infer(from text: String) -> MeetingRole {
        let lower = text
            .folding(options: [.diacriticInsensitive, .caseInsensitive], locale: Locale(identifier: "de-DE"))
            .lowercased()

        if lower.containsAny("ich uebernehme", "ich ubernehme", "du machst", "wir sollten", "bis morgen", "bis naechste", "bis nachste", "todo", "aufgabe", "naechster schritt", "nachster schritt", "next step") {
            return .task
        }
        if lower.containsAny("steuer", "finanzamt", "buchhaltung", "umsatzsteuer", "ust", "datev", "kredit", "foerder", "forderung", "bank", "liquiditaet", "liquiditat", "rechnung") {
            return .finance
        }
        if lower.containsAny("vertrag", "agb", "datenschutz", "impressum", "haftung", "recht", "anwalt", "marke anmelden", "gewerbeanmeldung", "genehmigung") {
            return .legal
        }
        if lower.containsAny("website", "online shop", "onlineshop", "software", "app", "domain", "hosting", "seo", "automatisierung", "schnittstelle", "api") {
            return .tech
        }
        if lower.containsAny("instagram", "tiktok", "kampagne", "kunden gewinnen", "werbung", "flyer", "angebot", "vertrieb", "preis", "positionierung") {
            return .marketing
        }
        if lower.containsAny("terminplan", "lieferant", "lager", "einkauf", "material", "werkstatt", "betrieb", "prozess", "ablauf", "mitarbeiter") {
            return .operations
        }
        if lower.containsAny("beratung", "ich empfehle", "mein rat", "gruendungsberatung", "ihk", "hwk", "handwerkskammer", "mentor") {
            return .advisor
        }
        if lower.containsAny("kunde", "auftraggeber", "partner", "kooperation", "zusammenarbeiten", "interessent") {
            return .customer
        }
        if lower.containsAny("meine idee", "mein laden", "mein geschaeft", "mein geschaft", "ich gruende", "ich grunde", "ich moechte", "ich mochte", "ich will", "wir gruenden", "wir grunden") {
            return .founder
        }
        return .unknown
    }
}

private extension String {
    func containsAny(_ needles: String...) -> Bool {
        needles.contains { contains($0) }
    }
}

struct MeetingTranscriptSegment: Identifiable, Equatable {
    let id: UUID
    var text: String
    var role: MeetingRole
    var isPartial: Bool
    var timestamp: Date

    init(id: UUID = UUID(), text: String, role: MeetingRole, isPartial: Bool = false, timestamp: Date = .now) {
        self.id = id
        self.text = text
        self.role = role
        self.isPartial = isPartial
        self.timestamp = timestamp
    }
}

@MainActor
final class MeetingRecorder: NSObject, ObservableObject {
    @Published var elapsed = 0
    @Published var paused = false
    @Published var segments: [MeetingTranscriptSegment] = []
    @Published var currentPartial = ""
    @Published var currentRole: MeetingRole = .unknown
    @Published var permissionDenied = false
    @Published var recognitionWarning: String?

    private let engine = AVAudioEngine()
    private let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "de-DE"))
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?
    private var timer: Timer?
    private var rotationTimer: Timer?
    private var tapInstalled = false
    private var stopping = false
    private var recognitionGeneration = 0
    private var lastRestartAt = Date.distantPast
    private let rotationInterval: TimeInterval = 52

    var transcript: String {
        visibleSegments.map(\.text).joined(separator: "\n\n")
    }

    var visibleSegments: [MeetingTranscriptSegment] {
        var all = segments
        let partial = cleanTranscript(currentPartial)
        if !partial.isEmpty {
            all.append(MeetingTranscriptSegment(text: partial, role: currentRole, isPartial: true))
        }
        return all
    }

    func start() {
        permissionDenied = false
        recognitionWarning = nil
        SFSpeechRecognizer.requestAuthorization { auth in
            AVAudioApplication.requestRecordPermission { granted in
                Task { @MainActor in
                    guard auth == .authorized, granted else {
                        self.permissionDenied = true
                        return
                    }
                    self.beginSession()
                }
            }
        }
    }

    private func beginSession() {
        do {
            resetState()
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.record, mode: .measurement, options: .duckOthers)
            try session.setActive(true, options: .notifyOthersOnDeactivation)

            recognizer?.defaultTaskHint = .dictation
            try installTapIfNeeded()
            startRecognitionTask()
            engine.prepare()
            try engine.start()

            timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
                Task { @MainActor in
                    guard let self, !self.paused else { return }
                    self.elapsed += 1
                }
            }
            rotationTimer = Timer.scheduledTimer(withTimeInterval: rotationInterval, repeats: true) { [weak self] _ in
                Task { @MainActor in
                    guard let self, !self.paused, !self.stopping else { return }
                    self.rotateRecognitionTask()
                }
            }
        } catch {
            recognitionWarning = "Aufnahme konnte nicht gestartet werden: \(error.localizedDescription)"
            permissionDenied = true
        }
    }

    private func resetState() {
        elapsed = 0
        paused = false
        segments = []
        currentPartial = ""
        currentRole = .unknown
        stopping = false
        recognitionGeneration += 1
    }

    private func installTapIfNeeded() throws {
        guard !tapInstalled else { return }
        let input = engine.inputNode
        let format = input.outputFormat(forBus: 0)
        input.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in
            self?.request?.append(buffer)
        }
        tapInstalled = true
    }

    private func startRecognitionTask() {
        recognitionGeneration += 1
        let generation = recognitionGeneration

        if request != nil {
            request?.endAudio()
        }
        task?.cancel()

        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = true
        request.taskHint = .dictation
        if #available(iOS 16.0, *) {
            request.addsPunctuation = true
        }
        if recognizer?.supportsOnDeviceRecognition == true {
            request.requiresOnDeviceRecognition = true
        }
        self.request = request

        task = recognizer?.recognitionTask(with: request) { [weak self] result, error in
            guard let self else { return }
            Task { @MainActor in
                guard generation == self.recognitionGeneration else { return }
                if let result {
                    self.handle(result)
                }
                if let error, !self.stopping {
                    self.recognitionWarning = "Spracherkennung wurde neu verbunden: \(error.localizedDescription)"
                    self.commitCurrentPartial()
                    if Date().timeIntervalSince(self.lastRestartAt) > 1.5 {
                        self.lastRestartAt = .now
                        self.startRecognitionTask()
                    }
                }
            }
        }
    }

    private func handle(_ result: SFSpeechRecognitionResult) {
        let text = cleanTranscript(result.bestTranscription.formattedString)
        guard !text.isEmpty else { return }
        currentPartial = text
        currentRole = MeetingRole.infer(from: text)

        if result.isFinal {
            commitCurrentPartial()
            if !stopping {
                startRecognitionTask()
            }
        }
    }

    private func rotateRecognitionTask() {
        commitCurrentPartial()
        startRecognitionTask()
    }

    private func cleanTranscript(_ text: String) -> String {
        text.replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func normalized(_ text: String) -> String {
        cleanTranscript(text)
            .folding(options: [.caseInsensitive, .diacriticInsensitive], locale: Locale(identifier: "de-DE"))
            .lowercased()
    }

    private func commitCurrentPartial() {
        let text = cleanTranscript(currentPartial)
        guard !text.isEmpty else { return }
        let norm = normalized(text)
        if let last = segments.last, normalized(last.text) == norm {
            currentPartial = ""
            currentRole = .unknown
            return
        }
        segments.append(MeetingTranscriptSegment(text: text, role: MeetingRole.infer(from: text)))
        currentPartial = ""
        currentRole = .unknown
    }

    func snapshotSegments() -> [MeetingTranscriptSegment] {
        commitCurrentPartial()
        return segments
    }

    func togglePause() {
        paused.toggle()
        if paused {
            commitCurrentPartial()
            engine.pause()
        } else {
            try? engine.start()
            startRecognitionTask()
        }
    }

    func stop() {
        stopping = true
        commitCurrentPartial()
        timer?.invalidate()
        rotationTimer?.invalidate()
        timer = nil
        rotationTimer = nil
        engine.stop()
        if tapInstalled {
            engine.inputNode.removeTap(onBus: 0)
            tapInstalled = false
        }
        request?.endAudio()
        task?.cancel()
        request = nil
        task = nil
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }

    deinit {
        timer?.invalidate()
        rotationTimer?.invalidate()
        engine.stop()
        if tapInstalled {
            engine.inputNode.removeTap(onBus: 0)
        }
    }
}

// MARK: - View

struct MeetingView: View {
    @EnvironmentObject var state: AppState
    @Environment(\.dismiss) private var dismiss
    @StateObject private var recorder = MeetingRecorder()

    enum Phase { case intro, recording, processing, summary }
    @State private var phase: Phase = .intro
    @State private var applied: Set<String> = []
    @State private var finalTranscript = ""
    @State private var finalSegments: [MeetingTranscriptSegment] = []
    @State private var showFullTranscript = false

    private let rec = Color(hex: 0xD64545)

    var body: some View {
        Group {
            switch phase {
            case .intro: intro
            case .recording: recording
            case .processing: processing
            case .summary: summary
            }
        }
        .background(MF.canvas.ignoresSafeArea())
        .animation(.easeOut(duration: 0.25), value: phase)
    }

    private func mmss(_ s: Int) -> String {
        "\(s / 60):" + String(format: "%02d", s % 60)
    }

    // ═══════════════════════════════ INTRO
    private var intro: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    // Hero
                    VStack(alignment: .leading, spacing: 0) {
                        Text("Co-Pilot Extra")
                            .font(.mfMono(10)).tracking(1.4).textCase(.uppercase)
                            .foregroundStyle(.white.opacity(0.85))
                        Text("Nimm dein Gespräch auf — ich mache Aufgaben daraus.")
                            .font(.system(size: 23, weight: .heavy)).tracking(-0.6)
                            .foregroundStyle(.white)
                            .padding(.top, 8)
                            .fixedSize(horizontal: false, vertical: true)
                        Text("Kein Mitschreiben mehr. Am Ende steht die Zusammenfassung — mit einem Tipp in deine To-dos, deinen Kalender und ans Match.")
                            .font(.system(size: 14.5)).lineSpacing(3.5)
                            .foregroundStyle(.white.opacity(0.9))
                            .padding(.top, 10)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(20)
                    .background(MF.indigoGrad)
                    .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
                    .indigoGlow()
                    .padding(.top, 6)

                    // 3 Schritte
                    VStack(alignment: .leading, spacing: 14) {
                        introStep("mic.fill", MF.emberTint, MF.emberDeep, "Gespräch aufnehmen", "Kennenlern-Call oder Team-Meeting")
                        introStep("sparkles", MF.indigoTint, MF.indigoInk, "Co-Pilot fasst zusammen", "Kernpunkte, Entscheidungen, Aufgaben")
                        introStep("bolt.fill", MF.surfaceSoft, MF.ink, "Direkt in der App", "Aufgaben, Termine & Match-Notizen")
                    }
                    .padding(.horizontal, 4)
                    .padding(.top, 26)
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 30)
            }
            .scrollIndicators(.hidden)

            // Aufnahme starten
            VStack(spacing: 10) {
                Button {
                    Haptics.tap()
                    recorder.start()
                    phase = .recording
                } label: {
                    HStack(spacing: 9) {
                        Image(systemName: "mic.fill").font(.system(size: 17, weight: .bold))
                        Text("Aufnahme starten").font(.system(size: 16.5, weight: .bold))
                    }
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 54)
                    .background(rec)
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .shadow(color: rec.opacity(0.5), radius: 15, y: 9)
                }
                .buttonStyle(.plain)
                Text("Läuft auf deinem Gerät · nur du siehst die Zusammenfassung")
                    .font(.system(size: 12))
                    .foregroundStyle(MF.faint)
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 14)
        }
        .navigationTitle("Meeting-Aufnahme")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func introStep(_ icon: String, _ tint: Color, _ ink: Color, _ title: String, _ sub: String) -> some View {
        HStack(spacing: 14) {
            Image(systemName: icon)
                .font(.system(size: 19, weight: .semibold))
                .foregroundStyle(ink)
                .frame(width: 46, height: 46)
                .background(tint)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            VStack(alignment: .leading, spacing: 1) {
                Text(title).font(.system(size: 15.5, weight: .bold)).foregroundStyle(MF.ink)
                Text(sub).font(.system(size: 13)).foregroundStyle(MF.smoke)
            }
        }
    }

    // ═══════════════════════════════ RECORDING
    private var recording: some View {
        VStack(spacing: 0) {
            // Kopf
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 1) {
                    Text("Meeting läuft").font(.system(size: 16, weight: .bold)).foregroundStyle(MF.ink)
                    Text("Co-Pilot hört mit").font(.system(size: 13)).foregroundStyle(MF.smoke)
                }
                Spacer()
                HStack(spacing: 7) {
                    Circle().fill(rec).frame(width: 9, height: 9)
                        .opacity(recorder.paused ? 0.4 : 1)
                    Text(recorder.paused ? "Pause" : "REC")
                        .font(.mfMono(13))
                        .foregroundStyle(rec)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 7)
                .background(rec.opacity(0.12))
                .clipShape(Capsule())
            }
            .padding(.horizontal, 20)
            .padding(.top, 12)

            // Timer + Waveform
            Text(mmss(recorder.elapsed))
                .font(.mfMono(46))
                .foregroundStyle(MF.ink)
                .monospacedDigit()
                .padding(.top, 26)
            WaveformBars(color: rec, paused: recorder.paused)
                .frame(height: 64)
                .padding(.horizontal, 40)
                .padding(.top, 18)

            // Live-Transkript
            ScrollView {
                VStack(alignment: .leading, spacing: 10) {
                    if recorder.permissionDenied {
                        Text("Mikrofon oder Spracherkennung nicht erlaubt — in den iOS-Einstellungen freigeben.")
                            .font(.system(size: 13.5, weight: .semibold))
                            .foregroundStyle(MF.emberDeep)
                            .frame(maxWidth: .infinity)
                            .padding(14)
                            .background(MF.emberTint)
                            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    }
                    if let warning = recorder.recognitionWarning {
                        HStack(spacing: 9) {
                            Image(systemName: "arrow.triangle.2.circlepath")
                                .font(.system(size: 13, weight: .bold))
                            Text(warning)
                                .font(.system(size: 12.5, weight: .semibold))
                        }
                        .foregroundStyle(MF.indigoInk)
                        .padding(12)
                        .background(MF.indigoTint)
                        .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
                    }
                    if recorder.visibleSegments.isEmpty && !recorder.permissionDenied {
                        Text("Sprich los — ich speichere laufend mit und sichere Zwischenergebnisse automatisch.")
                            .font(.system(size: 13.5, weight: .semibold))
                            .foregroundStyle(MF.smoke)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(14)
                            .background(MF.surface)
                            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                            .overlay(RoundedRectangle(cornerRadius: 14).stroke(MF.border, lineWidth: 1))
                    }
                    ForEach(recorder.visibleSegments) { segment in
                        MeetingTranscriptBubble(segment: segment)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(20)
            }
            .scrollIndicators(.hidden)

            // Controls
            HStack {
                Button {
                    Haptics.tap()
                    recorder.togglePause()
                } label: {
                    Image(systemName: recorder.paused ? "mic.fill" : "pause.fill")
                        .font(.system(size: 21, weight: .semibold))
                        .foregroundStyle(MF.ink)
                        .frame(width: 60, height: 60)
                        .background(MF.surface)
                        .clipShape(Circle())
                        .overlay(Circle().stroke(MF.border, lineWidth: 1.5))
                }
                .buttonStyle(.plain)

                Spacer()

                Button {
                    Haptics.success()
                    let snapshot = recorder.snapshotSegments()
                    finalSegments = snapshot
                    finalTranscript = snapshot.map { "[\($0.role.rawValue)] \($0.text)" }.joined(separator: "\n\n")
                    recorder.stop()
                    phase = .processing
                    Task {
                        try? await Task.sleep(for: .seconds(2.2))
                        phase = .summary
                    }
                } label: {
                    VStack(spacing: 8) {
                        Image(systemName: "stop.fill")
                            .font(.system(size: 26, weight: .bold))
                            .foregroundStyle(.white)
                            .frame(width: 78, height: 78)
                            .background(MF.indigoGrad)
                            .clipShape(Circle())
                            .indigoGlow()
                        Text("Beenden & zusammenfassen")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundStyle(MF.ink)
                    }
                }
                .buttonStyle(.plain)

                Spacer()
                Color.clear.frame(width: 60, height: 60)
            }
            .padding(.horizontal, 40)
            .padding(.bottom, 24)
        }
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar)
        .onDisappear { recorder.stop() }
    }

    // ═══════════════════════════════ PROCESSING
    private var processing: some View {
        VStack(spacing: 0) {
            Spacer()
            ZStack {
                Circle().fill(MF.indigoGrad).frame(width: 72, height: 72).indigoGlow()
                Image(systemName: "sparkles")
                    .font(.system(size: 30, weight: .semibold))
                    .foregroundStyle(.white)
            }
            Text("Ich fasse zusammen…")
                .font(.system(size: 22, weight: .heavy)).tracking(-0.4)
                .foregroundStyle(MF.ink)
                .padding(.top, 30)
            Text("\(mmss(recorder.elapsed)) Gespräch · in ein paar Sekunden fertig")
                .font(.system(size: 14.5))
                .foregroundStyle(MF.smoke)
                .padding(.top, 8)
            VStack(alignment: .leading, spacing: 12) {
                ForEach(["Transkript aufbereiten", "Kernpunkte finden", "Aufgaben ableiten"], id: \.self) { s in
                    HStack(spacing: 11) {
                        Image(systemName: "checkmark")
                            .font(.system(size: 12, weight: .heavy))
                            .foregroundStyle(MF.indigoInk)
                            .frame(width: 24, height: 24)
                            .background(MF.indigoTint)
                            .clipShape(Circle())
                        Text(s).font(.system(size: 14.5, weight: .semibold)).foregroundStyle(MF.inkSoft)
                    }
                }
            }
            .padding(.top, 26)
            Spacer()
        }
        .toolbar(.hidden, for: .navigationBar)
    }

    // ═══════════════════════════════ SUMMARY
    private struct MeetingAction: Identifiable {
        let id: String
        let icon: String
        let text: String
        let done: String
        let run: () -> Void
    }

    private var meetingActions: [MeetingAction] {
        [
            .init(id: "task", icon: "bolt.fill", text: "Nächsten Schritt als Aufgabe aufs Board legen",
                  done: "Als Karte angelegt") {
                KanbanStore.shared.add(title: "Follow-up aus dem Meeting", note: summaryLead)
            },
            .init(id: "cal", icon: "calendar.badge.plus", text: "Follow-up-Termin in den Kalender legen",
                  done: "Im Kalender") {
                state.addPlannerItem(title: "Follow-up zum Meeting", note: summaryLead,
                                     dueLabel: "Diese Woche", kind: .meeting, target: nil)
            },
            .init(id: "mem", icon: "brain.head.profile", text: "Kernpunkte ins Business-Memory schreiben",
                  done: "Im Memory gespeichert") {
                state.rememberCopilotFact("Meeting-Notiz: \(summaryLead)")
            },
        ]
    }

    private var plainTranscript: String {
        let segmentText = finalSegments.map(\.text).joined(separator: "\n\n")
        return segmentText.isEmpty ? finalTranscript : segmentText
    }

    private var roleSummary: [(role: MeetingRole, count: Int)] {
        let counts = Dictionary(grouping: finalSegments, by: \.role)
            .mapValues(\.count)
            .filter { $0.key != .unknown }
        return counts
            .map { (role: $0.key, count: $0.value) }
            .sorted { lhs, rhs in
                if lhs.count == rhs.count { return lhs.role.rawValue < rhs.role.rawValue }
                return lhs.count > rhs.count
            }
    }

    private var summaryLead: String {
        let clean = plainTranscript.trimmingCharacters(in: .whitespacesAndNewlines)
        if clean.isEmpty { return "Gespräch vom \(Date.now.formatted(date: .abbreviated, time: .shortened))" }
        return String(clean.prefix(160))
    }

    private var keypoints: [String] {
        let sentences = plainTranscript
            .components(separatedBy: CharacterSet(charactersIn: ".!?"))
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { $0.count > 24 }
        if sentences.isEmpty {
            return ["Kein Transkript erkannt — sprich näher am Mikrofon oder erlaube die Spracherkennung."]
        }
        return Array(sentences.prefix(3))
    }

    private var summary: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    // TL;DR
                    VStack(alignment: .leading, spacing: 10) {
                        HStack(spacing: 8) {
                            Image(systemName: "sparkles").font(.system(size: 13, weight: .bold)).foregroundStyle(.white)
                            Text("Auf den Punkt")
                                .font(.mfMono(10)).tracking(1.4).textCase(.uppercase)
                                .foregroundStyle(.white.opacity(0.85))
                        }
                        Text("\(mmss(recorder.elapsed)) Gespräch aufgenommen. Kernpunkte und nächste Schritte stehen unten — übernimm sie mit einem Tipp in die App.")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(.white)
                            .lineSpacing(4)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(18)
                    .background(MF.indigoGrad)
                    .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
                    .indigoGlow()

                    if !roleSummary.isEmpty {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Erkannte Rollen")
                                .font(.system(size: 15, weight: .heavy)).foregroundStyle(MF.ink)
                            FlowLayout(spacing: 8) {
                                ForEach(roleSummary, id: \.role) { item in
                                    HStack(spacing: 7) {
                                        Image(systemName: item.role.icon)
                                            .font(.system(size: 12, weight: .bold))
                                        Text(item.role.rawValue)
                                            .font(.system(size: 12.5, weight: .bold))
                                        Text("\(item.count)")
                                            .font(.mfMono(11))
                                            .foregroundStyle(item.role.ink.opacity(0.72))
                                    }
                                    .foregroundStyle(item.role.ink)
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 7)
                                    .background(item.role.tint)
                                    .clipShape(Capsule())
                                }
                            }
                            Text("Die Rollen werden aus dem Inhalt abgeleitet. Für echte Sprecher-Trennung braucht die Cloud-STT Diarization.")
                                .font(.system(size: 12))
                                .foregroundStyle(MF.faint)
                        }
                        .padding(14)
                        .background(MF.surface)
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: 16).stroke(MF.border, lineWidth: 1))
                    }

                    // Kernpunkte
                    VStack(alignment: .leading, spacing: 0) {
                        Text("Kernpunkte")
                            .font(.system(size: 15, weight: .heavy)).foregroundStyle(MF.ink)
                            .padding(.bottom, 11)
                        VStack(alignment: .leading, spacing: 0) {
                            ForEach(Array(keypoints.enumerated()), id: \.offset) { i, k in
                                HStack(alignment: .top, spacing: 11) {
                                    Circle().fill(MF.indigo).frame(width: 6, height: 6).padding(.top, 7)
                                    Text(k).font(.system(size: 14.5)).foregroundStyle(MF.inkSoft).lineSpacing(3)
                                }
                                .padding(.vertical, 11)
                                if i < keypoints.count - 1 {
                                    Rectangle().fill(MF.borderSoft).frame(height: 1)
                                }
                            }
                        }
                        .padding(.horizontal, 15)
                        .background(MF.surface)
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: 16).stroke(MF.border, lineWidth: 1))
                        .warmShadow()
                    }

                    if !finalSegments.isEmpty {
                        DisclosureGroup(isExpanded: $showFullTranscript) {
                            VStack(alignment: .leading, spacing: 10) {
                                ForEach(finalSegments) { segment in
                                    MeetingTranscriptBubble(segment: segment, compact: true)
                                }
                            }
                            .padding(.top, 10)
                        } label: {
                            HStack {
                                Text("Vollständiges Transkript")
                                    .font(.system(size: 15, weight: .heavy))
                                Spacer()
                                Text("\(finalSegments.count) Abschnitte")
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundStyle(MF.faint)
                            }
                            .foregroundStyle(MF.ink)
                        }
                        .padding(14)
                        .background(MF.surface)
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: 16).stroke(MF.border, lineWidth: 1))
                    }

                    // In der App übernehmen
                    VStack(alignment: .leading, spacing: 10) {
                        Text("In der App übernehmen")
                            .font(.system(size: 15, weight: .heavy)).foregroundStyle(MF.ink)
                        ForEach(meetingActions) { a in
                            let on = applied.contains(a.id)
                            HStack(spacing: 12) {
                                Image(systemName: on ? "checkmark" : a.icon)
                                    .font(.system(size: 18, weight: on ? .heavy : .semibold))
                                    .foregroundStyle(on ? Color(hex: 0x2E7D5B) : MF.indigoInk)
                                    .frame(width: 40, height: 40)
                                    .background(on ? Color(hex: 0x2E7D5B).opacity(0.12) : MF.indigoTint)
                                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(a.text)
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundStyle(MF.ink)
                                        .fixedSize(horizontal: false, vertical: true)
                                    if on {
                                        Text(a.done)
                                            .font(.system(size: 12, weight: .semibold))
                                            .foregroundStyle(Color(hex: 0x2E7D5B))
                                    }
                                }
                                Spacer(minLength: 0)
                                if !on {
                                    Button {
                                        Haptics.success()
                                        a.run()
                                        applied.insert(a.id)
                                    } label: {
                                        Text("Übernehmen")
                                            .font(.system(size: 13, weight: .bold))
                                            .foregroundStyle(.white)
                                            .padding(.horizontal, 14)
                                            .padding(.vertical, 9)
                                            .background(MF.indigoGrad)
                                            .clipShape(Capsule())
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                            .padding(13)
                            .background(MF.surface)
                            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                            .overlay(RoundedRectangle(cornerRadius: 16).stroke(MF.border, lineWidth: 1))
                            .warmShadow()
                        }
                    }
                }
                .padding(.horizontal, 18)
                .padding(.top, 16)
                .padding(.bottom, 30)
            }
            .scrollIndicators(.hidden)

            // Sticky Aktionen
            VStack(spacing: 10) {
                Button {
                    Haptics.tap()
                    if applied.count == meetingActions.count {
                        dismiss()
                    } else {
                        for a in meetingActions where !applied.contains(a.id) {
                            a.run()
                            applied.insert(a.id)
                        }
                        Haptics.success()
                    }
                } label: {
                    Text(applied.count == meetingActions.count ? "Fertig" : "Alle \(meetingActions.count) Aufgaben übernehmen")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 52)
                        .background(MF.indigoGrad)
                        .clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))
                        .indigoGlow()
                }
                .buttonStyle(.plain)

                Button {
                    // Transkript an den Co-Pilot übergeben — der echte KI-Weg.
                    let roles = roleSummary
                        .map { "- \($0.role.rawValue): \($0.count) Abschnitt(e)" }
                        .joined(separator: "\n")
                    let prompt = """
                    Fasse dieses Meeting zusammen und leite konkrete Aufgaben ab.
                    Nutze die Rollenhinweise, aber korrigiere sie, falls der Inhalt etwas anderes zeigt.

                    Erkannte Rollen:
                    \(roles.isEmpty ? "- keine eindeutigen Rollen erkannt" : roles)

                    Transkript:
                    \(finalTranscript.isEmpty ? summaryLead : finalTranscript)
                    """
                    state.queueCopilotPrompt(prompt, title: "Meeting-Zusammenfassung")
                    dismiss()
                } label: {
                    Text("Mit Co-Pilot besprechen")
                        .font(.system(size: 14.5, weight: .semibold))
                        .foregroundStyle(MF.indigoInk)
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 14)
        }
        .navigationTitle("Zusammenfassung")
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct MeetingTranscriptBubble: View {
    let segment: MeetingTranscriptSegment
    var compact = false

    var body: some View {
        VStack(alignment: .leading, spacing: compact ? 6 : 8) {
            HStack(spacing: 7) {
                Image(systemName: segment.role.icon)
                    .font(.system(size: compact ? 10 : 11, weight: .bold))
                Text(segment.role.rawValue)
                    .font(.system(size: compact ? 11 : 12, weight: .bold))
                if segment.isPartial {
                    Text("live")
                        .font(.mfMono(9))
                        .padding(.horizontal, 6)
                        .frame(height: 17)
                        .background(segment.role.ink.opacity(0.12))
                        .clipShape(Capsule())
                }
            }
            .foregroundStyle(segment.role.ink)

            Text(segment.text)
                .font(.system(size: compact ? 13.5 : 14.5))
                .foregroundStyle(MF.inkSoft)
                .lineSpacing(3)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(.horizontal, compact ? 12 : 13)
        .padding(.vertical, compact ? 10 : 11)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(segment.role.tint.opacity(segment.isPartial ? 0.75 : 1))
        .clipShape(RoundedRectangle(cornerRadius: compact ? 13 : 14, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: compact ? 13 : 14)
                .stroke(segment.role.ink.opacity(segment.isPartial ? 0.28 : 0.18), lineWidth: 1)
        )
    }
}

/// Animierte Aufnahme-Waveform.
private struct WaveformBars: View {
    let color: Color
    let paused: Bool
    @State private var animate = false

    var body: some View {
        HStack(spacing: 3) {
            ForEach(0..<42, id: \.self) { i in
                Capsule()
                    .fill(i % 3 == 0 ? color : color.opacity(0.45))
                    .frame(width: 3.5)
                    .scaleEffect(y: animate && !paused ? CGFloat([0.35, 0.9, 0.6, 1.0, 0.5][i % 5]) : 0.3,
                                 anchor: .center)
                    .animation(
                        .easeInOut(duration: 0.7 + Double(i % 5) * 0.12)
                            .repeatForever(autoreverses: true)
                            .delay(Double(i) * 0.045),
                        value: animate
                    )
            }
        }
        .opacity(paused ? 0.3 : 1)
        .onAppear { animate = true }
    }
}
