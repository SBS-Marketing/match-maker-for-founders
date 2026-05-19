// matchfoundr · Psychological Assessment for Co-Founder Matching
// 15 questions across 6 dimensions, scored 1–5
// Used to calculate compatibility scores between founders and talents

export type Dimension =
  | 'risk'        // Risikobereitschaft
  | 'structure'   // Arbeitsweise (strukturiert vs. chaotisch)
  | 'decision'    // Entscheidungstyp (schnell-intuitiv vs. langsam-analytisch)
  | 'leadership'  // Führungsanspruch
  | 'commitment'  // Commitment-Level (Dealbreaker bei großer Differenz)
  | 'feedback'    // Feedback-Kultur (direkt vs. diplomatisch)

export type AssessmentQuestion = {
  id: string
  dimension: Dimension
  text: string
  low_label: string   // Label für Wert 1
  high_label: string  // Label für Wert 5
}

export const ASSESSMENT_QUESTIONS: AssessmentQuestion[] = [
  // ── RISK ──────────────────────────────────────────────────────
  {
    id: 'risk_1',
    dimension: 'risk',
    text: 'Ich bin bereit, mein Gehalt für 12+ Monate zu verzichten.',
    low_label: 'Nein, zu riskant',
    high_label: 'Absolut, kein Problem',
  },
  {
    id: 'risk_2',
    dimension: 'risk',
    text: 'Lieber schnell scheitern und neu starten als lange an einer Idee festhalten.',
    low_label: 'Ich halte durch',
    high_label: 'Pivot ist kein Problem',
  },
  {
    id: 'risk_3',
    dimension: 'risk',
    text: 'Ich schlafe gut, auch wenn die Zukunft meines Projekts unsicher ist.',
    low_label: 'Unsicherheit stresst mich',
    high_label: 'Unsicherheit motiviert mich',
  },

  // ── STRUCTURE ─────────────────────────────────────────────────
  {
    id: 'structure_1',
    dimension: 'structure',
    text: 'Ich brauche klare Strukturen und Prozesse, um produktiv zu sein.',
    low_label: 'Nein, ich bin flexibel',
    high_label: 'Ja, unbedingt',
  },
  {
    id: 'structure_2',
    dimension: 'structure',
    text: 'Ich arbeite lieber tief an einer Sache statt viele Dinge parallel zu jonglieren.',
    low_label: 'Multitasking liegt mir',
    high_label: 'Deep Work ist mein Ding',
  },
  {
    id: 'structure_3',
    dimension: 'structure',
    text: 'Ich plane meine Woche detailliert im Voraus.',
    low_label: 'Ich improvisiere lieber',
    high_label: 'Immer mit Plan',
  },

  // ── DECISION ──────────────────────────────────────────────────
  {
    id: 'decision_1',
    dimension: 'decision',
    text: 'Ich treffe lieber schnell eine Entscheidung und korrigiere unterwegs.',
    low_label: 'Ich analysiere erst gründlich',
    high_label: 'Schnell entscheiden, dann anpassen',
  },
  {
    id: 'decision_2',
    dimension: 'decision',
    text: 'Ich vertraue meinem Bauchgefühl bei wichtigen Entscheidungen.',
    low_label: 'Nur Daten und Fakten',
    high_label: 'Intuition first',
  },

  // ── LEADERSHIP ────────────────────────────────────────────────
  {
    id: 'leadership_1',
    dimension: 'leadership',
    text: 'Ich möchte die finale Entscheidungsgewalt in unserem Unternehmen haben.',
    low_label: 'Nein, gerne geteilte Führung',
    high_label: 'Ja, klare Verantwortung bei mir',
  },
  {
    id: 'leadership_2',
    dimension: 'leadership',
    text: 'Es fällt mir leicht, anderen zu sagen, was zu tun ist.',
    low_label: 'Ich führe lieber durch Beispiel',
    high_label: 'Ja, ich übernehme gern die Führung',
  },
  {
    id: 'leadership_3',
    dimension: 'leadership',
    text: 'Ich kann gut loslassen und Aufgaben vollständig delegieren.',
    low_label: 'Ich mache es lieber selbst',
    high_label: 'Delegation ist meine Stärke',
  },

  // ── COMMITMENT ────────────────────────────────────────────────
  {
    id: 'commitment_1',
    dimension: 'commitment',
    text: 'Dieses Projekt ist meine absolute Priorität — alles andere ist zweitrangig.',
    low_label: 'Es ist eines von mehreren Projekten',
    high_label: 'All-in, kein Plan B',
  },
  {
    id: 'commitment_2',
    dimension: 'commitment',
    text: 'Ich erwarte, dass mein Co-Founder genauso viel Zeit investiert wie ich.',
    low_label: 'Flexibilität ist okay',
    high_label: 'Gleiches Commitment ist Pflicht',
  },

  // ── FEEDBACK ──────────────────────────────────────────────────
  {
    id: 'feedback_1',
    dimension: 'feedback',
    text: 'Ich sage direkt, was mich stört — auch wenn es unbequem ist.',
    low_label: 'Ich wähle meine Worte vorsichtig',
    high_label: 'Radikale Ehrlichkeit',
  },
  {
    id: 'feedback_2',
    dimension: 'feedback',
    text: 'Ich kann Kritik an meiner Arbeit gut von Kritik an meiner Person trennen.',
    low_label: 'Kritik trifft mich persönlich',
    high_label: 'Kritik ist reines Feedback',
  },
]

// ── Matching Logic ─────────────────────────────────────────────
// Dimensions where COMPLEMENTARITY is good (different = better match)
export const COMPLEMENTARY_DIMENSIONS: Dimension[] = ['structure', 'decision', 'leadership']

// Dimensions where ALIGNMENT is required (similar = better match)
export const ALIGNMENT_DIMENSIONS: Dimension[] = ['commitment', 'risk', 'feedback']

// Dealbreaker: commitment score difference > 2 = no match
export const DEALBREAKER_DIMENSION: Dimension = 'commitment'
export const DEALBREAKER_MAX_DIFF = 2

export type AssessmentScores = Record<Dimension, number> // 1–5 per dimension

export function calculateDimensionScore(
  answers: Record<string, number>,
  dimension: Dimension
): number {
  const questions = ASSESSMENT_QUESTIONS.filter(q => q.dimension === dimension)
  const total = questions.reduce((sum, q) => sum + (answers[q.id] ?? 3), 0)
  return Math.round((total / questions.length) * 10) / 10
}

export function calculateAllScores(answers: Record<string, number>): AssessmentScores {
  const dimensions: Dimension[] = ['risk', 'structure', 'decision', 'leadership', 'commitment', 'feedback']
  return Object.fromEntries(
    dimensions.map(d => [d, calculateDimensionScore(answers, d)])
  ) as AssessmentScores
}
