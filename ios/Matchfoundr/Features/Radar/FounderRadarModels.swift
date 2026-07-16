import Foundation

enum FounderRadarSource: String, Codable, Hashable {
    case live, local

    var label: String {
        switch self {
        case .live: "Live KI"
        case .local: "App Radar"
        }
    }
}

struct FounderRadarSignal: Identifiable, Codable, Hashable {
    let id: String
    let label: String
    let score: Int
    let note: String
    let trend: String
}

struct FounderRadarMove: Identifiable, Codable, Hashable {
    var id: UUID = UUID()
    let title: String
    let reason: String
    let dueLabel: String
    let kind: PlannerItemKind
    let target: PlannerTarget
    let successMetric: String

    enum CodingKeys: String, CodingKey {
        case id, title, reason, dueLabel, kind, target, successMetric
    }

    init(
        id: UUID = UUID(),
        title: String,
        reason: String,
        dueLabel: String,
        kind: PlannerItemKind,
        target: PlannerTarget,
        successMetric: String
    ) {
        self.id = id
        self.title = title
        self.reason = reason
        self.dueLabel = dueLabel
        self.kind = kind
        self.target = target
        self.successMetric = successMetric
    }
}

struct FounderRadarBrief: Identifiable, Codable, Hashable {
    var id: UUID = UUID()
    let title: String
    let verdict: String
    let overallScore: Int
    let urgency: String
    let generatedAt: Date
    let source: FounderRadarSource
    let primaryRisk: String
    let hiddenOpportunity: String
    let investorQuestion: String
    let signals: [FounderRadarSignal]
    let moves: [FounderRadarMove]

    enum CodingKeys: String, CodingKey {
        case id, title, verdict, overallScore, urgency, generatedAt, source
        case primaryRisk, hiddenOpportunity, investorQuestion, signals, moves
    }

    var scoreLabel: String {
        if overallScore >= 82 { return "Launch-bereit" }
        if overallScore >= 66 { return "Validieren" }
        if overallScore >= 48 { return "Schärfen" }
        return "Ordnen"
    }

    var copilotPrompt: String {
        let signalLines = signals.map { "- \($0.label): \($0.score)/100 · \($0.note)" }.joined(separator: "\n")
        let moveLines = moves.enumerated().map { idx, move in
            "\(idx + 1). \(move.title) — \(move.reason) Erfolg: \(move.successMetric)"
        }.joined(separator: "\n")
        return """
        FOUNDER-RADAR-BRIEF
        Bitte geh diesen Board-Brief mit mir durch und hilf mir, die nächsten Schritte konkret auszuführen.

        Urteil: \(verdict)
        Score: \(overallScore)/100 · \(scoreLabel)
        Dringlichkeit: \(urgency)
        Risiko: \(primaryRisk)
        Chance: \(hiddenOpportunity)
        Harte Frage: \(investorQuestion)

        Signale:
        \(signalLines)

        Nächste Moves:
        \(moveLines)

        Bitte antworte wie ein kritischer, aber praktischer Startup-Operator: erst Entscheidung, dann konkrete App-Aktionen.
        """
    }
}

struct FounderRadarCloudRequest: Encodable {
    let mobileClient: Bool
    let memory: FounderRadarMemoryPayload
    let signals: [FounderRadarSignal]
    let openItems: [String]
    let matches: [FounderRadarMatchPayload]
    let team: [FounderRadarTeamPayload]
    let partners: [FounderRadarPartnerPayload]
}

struct FounderRadarMemoryPayload: Encodable {
    let founderName: String
    let role: String
    let ventureName: String
    let industry: String
    let stage: String
    let location: String
    let idea: String
    let nextStep: String
    let openDocuments: [String]
    let documentProgress: String
}

struct FounderRadarMatchPayload: Encodable {
    let name: String
    let role: String
    let city: String
    let matchPercent: Int
    let messages: Int
}

struct FounderRadarTeamPayload: Encodable {
    let name: String
    let role: String
    let focus: String
}

struct FounderRadarPartnerPayload: Encodable {
    let name: String
    let service: String
    let fit: Int
    let blurb: String
}
