// matchfoundr · Matching Algorithm
// Three match types: Founder↔Talent, Founder↔Advisor, Founder↔Service
// Returns composite score 0–100 + dimension breakdown for UI display

import type { AssessmentScores } from "../onboarding/assessment.ts";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export type MatchType = "cofounder" | "advisor" | "service";

export type FounderProfile = {
  id: string;
  industry: string;
  founder_type: "founder" | "talent" | "hybrid";
  idea?: string;
  stage?: string;
  city?: string;
  goal?: string;
  risk?: string;
  skills?: string[];
  skill_categories?: string[];
  looking_for?: string[];
  availability_hrs?: number;
  assessment?: AssessmentScores;
};

export type TalentProfile = {
  id: string;
  industry: string;
  founder_type: "talent" | "hybrid";
  skills: string[];
  skill_categories: string[];
  looking_for: string[];
  availability_hrs: number;
  city?: string;
  assessment?: AssessmentScores;
};

export type AdvisorProfile = {
  id: string;
  industries: string[]; // can advise multiple industries
  expertise_areas: string[]; // e.g. ["B2B Sales", "VC Fundraising", "DSGVO"]
  stages: string[]; // stages they advise: ["Idee", "MVP", "Skalierung"]
  cities: string[];
  availability: "low" | "medium" | "high";
  languages: string[];
  verified: boolean;
};

export type ServiceProfile = {
  id: string;
  type: ServiceType;
  name: string;
  industries: string[]; // which industries they serve
  stages: string[]; // relevant stages
  cities: string[];
  remote: boolean;
  tags: string[]; // e.g. ["GmbH-Gründung", "Steuerberatung", "EXIST"]
  price_tier: "free" | "low" | "medium" | "premium";
  verified: boolean;
  rating?: number; // 0–5
};

export type ServiceType =
  | "law_firm" // Rechtsanwalt / Notar
  | "tax_advisor" // Steuerberater
  | "accelerator" // Accelerator / Inkubator
  | "coworking" // Coworking Space
  | "funding_program" // Förderprogramm (EXIST, KfW, etc.)
  | "bank" // Bank / Finanzierung
  | "agency" // Agentur (Marketing, Design, etc.)
  | "coach" // Business Coach / Mentor
  | "chamber" // IHK / HWK / Kammer
  | "event" // Networking Event / Messe
  | "community"; // Online Community / Forum

// ─────────────────────────────────────────────────────────────
// SCORE RESULT
// ─────────────────────────────────────────────────────────────

export type ScoreDimension = {
  label: string;
  score: number; // 0–100
  weight: number; // how much it contributes to total
  reason: string; // human-readable explanation for UI
};

export type MatchScore = {
  total: number; // 0–100 composite
  match_type: MatchType;
  dimensions: ScoreDimension[];
  dealbreaker: boolean; // true = don't show match at all
  dealbreaker_reason?: string;
  badges: string[]; // e.g. ["Skill-Fit", "Gleiche Stadt", "Stage-Match"]
};

// ─────────────────────────────────────────────────────────────
// WEIGHTS PER MATCH TYPE
// ─────────────────────────────────────────────────────────────

const COFOUNDER_WEIGHTS = {
  skill_complementarity: 0.3, // most important: fills gaps
  commitment_alignment: 0.2, // dealbreaker if diff > 2
  personality_fit: 0.18, // complementary on structure/decision, aligned on feedback
  industry_alignment: 0.12, // same or compatible industry
  goal_alignment: 0.1, // similar ambition level
  availability_match: 0.06, // hrs/week compatible
  location: 0.04, // same city = bonus, not required
};

const ADVISOR_WEIGHTS = {
  expertise_relevance: 0.35, // do they know this domain?
  stage_fit: 0.25, // do they advise this stage?
  industry_alignment: 0.2, // do they know this industry?
  availability: 0.12, // are they reachable?
  location: 0.08, // local advisors get bonus
};

const SERVICE_WEIGHTS = {
  stage_relevance: 0.3, // is this service relevant for current stage?
  industry_fit: 0.25, // does the service understand this industry?
  need_match: 0.25, // does it match current risk/goal?
  location: 0.12, // local services ranked higher
  quality: 0.08, // rating + verified bonus
};

// ─────────────────────────────────────────────────────────────
// CO-FOUNDER SCORING
// ─────────────────────────────────────────────────────────────

export function scoreCofounder(founder: FounderProfile, talent: TalentProfile): MatchScore {
  const dimensions: ScoreDimension[] = [];
  let dealbreaker = false;
  let dealbreaker_reason: string | undefined;
  const badges: string[] = [];

  // 1. Skill Complementarity (30%)
  const founderSkills = new Set(founder.skills || []);
  const talentSkills = new Set(talent.skills || []);
  const founderCategories = new Set(founder.skill_categories || []);
  const talentCategories = new Set(talent.skill_categories || []);

  const skillOverlap = [...talentSkills].filter((s) => founderSkills.has(s)).length;
  const categoryComplement = [...talentCategories].filter((c) => !founderCategories.has(c)).length;
  const totalTalentSkills = talentSkills.size || 1;

  // High score = low overlap (complementary) + fills gaps in different categories
  const overlapPenalty = Math.min(skillOverlap / totalTalentSkills, 1);
  const complementBonus = Math.min(categoryComplement / 3, 1);
  const skillScore = Math.round((1 - overlapPenalty * 0.7 + complementBonus * 0.3) * 100);

  if (skillScore >= 70) badges.push("Skill-Fit");
  dimensions.push({
    label: "Skill-Ergänzung",
    score: skillScore,
    weight: COFOUNDER_WEIGHTS.skill_complementarity,
    reason:
      categoryComplement > 0
        ? `Bringt ${categoryComplement} neue Skill-Bereiche mit`
        : "Ähnliche Skills — geringe Ergänzung",
  });

  // 2. Commitment Alignment (20%) — DEALBREAKER
  const founderCommitment = founder.assessment?.commitment ?? 3;
  const talentCommitment = talent.assessment?.commitment ?? 3;
  const commitDiff = Math.abs(founderCommitment - talentCommitment);

  if (commitDiff > 2) {
    dealbreaker = true;
    dealbreaker_reason = `Commitment-Level zu unterschiedlich (${founderCommitment} vs ${talentCommitment})`;
  }

  const commitScore = Math.round(Math.max(0, 1 - commitDiff / 4) * 100);
  if (commitScore >= 80) badges.push("Gleicher Einsatz");
  dimensions.push({
    label: "Commitment",
    score: commitScore,
    weight: COFOUNDER_WEIGHTS.commitment_alignment,
    reason:
      commitDiff === 0
        ? "Gleiches Commitment-Level"
        : commitDiff <= 1
          ? "Sehr ähnliches Commitment"
          : `Commitment-Unterschied: ${commitDiff} Punkte`,
  });

  // 3. Personality Fit (18%)
  // Complementary: structure, decision, leadership
  // Aligned: feedback, risk
  let personalityScore = 50; // default if no assessment
  if (founder.assessment && talent.assessment) {
    const complementDims = ["structure", "decision", "leadership"] as const;
    const alignDims = ["feedback", "risk"] as const;

    const complementScore =
      complementDims.reduce((sum, dim) => {
        const diff = Math.abs((founder.assessment![dim] ?? 3) - (talent.assessment![dim] ?? 3));
        return sum + (diff / 4) * 100; // high diff = high complementarity = good
      }, 0) / complementDims.length;

    const alignScore =
      alignDims.reduce((sum, dim) => {
        const diff = Math.abs((founder.assessment![dim] ?? 3) - (talent.assessment![dim] ?? 3));
        return sum + Math.max(0, 1 - diff / 4) * 100;
      }, 0) / alignDims.length;

    personalityScore = Math.round(complementScore * 0.6 + alignScore * 0.4);
  }

  if (personalityScore >= 70) badges.push("Guter Charakter-Fit");
  dimensions.push({
    label: "Persönlichkeits-Fit",
    score: personalityScore,
    weight: COFOUNDER_WEIGHTS.personality_fit,
    reason:
      personalityScore >= 70
        ? "Ergänzende Arbeits- und Entscheidungsstile"
        : personalityScore >= 50
          ? "Solider Fit, einige Unterschiede"
          : "Sehr ähnliche Persönlichkeiten — wenig Ergänzung",
  });

  // 4. Industry Alignment (12%)
  const industryMatch = founder.industry === talent.industry;
  const industryScore = industryMatch ? 100 : 40;
  if (industryMatch) badges.push("Gleiche Branche");
  dimensions.push({
    label: "Branchen-Fit",
    score: industryScore,
    weight: COFOUNDER_WEIGHTS.industry_alignment,
    reason: industryMatch ? "Gleiche Branche" : "Unterschiedliche Branchen — Cross-Industry",
  });

  // 5. Goal / Looking-For Alignment (10%)
  const founderLooking = new Set(founder.looking_for || []);
  const talentLooking = new Set(talent.looking_for || []);
  const lookingOverlap = [...talentLooking].filter((l) => founderLooking.has(l)).length;
  const goalScore = Math.round(Math.min(lookingOverlap / Math.max(talentLooking.size, 1), 1) * 100);
  dimensions.push({
    label: "Ziel-Alignment",
    score: goalScore,
    weight: COFOUNDER_WEIGHTS.goal_alignment,
    reason:
      goalScore >= 80 ? "Gleiche Vorstellungen was beide suchen" : "Unterschiedliche Erwartungen",
  });

  // 6. Availability (6%)
  const founderHrs = founder.availability_hrs ?? 40;
  const talentHrs = talent.availability_hrs ?? 20;
  const hrsDiff = Math.abs(founderHrs - talentHrs);
  const availScore = Math.round(Math.max(0, 1 - hrsDiff / 40) * 100);
  dimensions.push({
    label: "Verfügbarkeit",
    score: availScore,
    weight: COFOUNDER_WEIGHTS.availability_match,
    reason: `${talentHrs}h/Woche verfügbar`,
  });

  // 7. Location (4%)
  const sameCity =
    founder.city && talent.city && founder.city.toLowerCase() === talent.city.toLowerCase();
  const locScore = sameCity ? 100 : 30;
  if (sameCity) badges.push("Gleiche Stadt");
  dimensions.push({
    label: "Standort",
    score: locScore,
    weight: COFOUNDER_WEIGHTS.location,
    reason: sameCity ? `Beide in ${founder.city}` : "Verschiedene Städte — Remote möglich",
  });

  const total = computeTotal(dimensions);

  return { total, match_type: "cofounder", dimensions, dealbreaker, dealbreaker_reason, badges };
}

// ─────────────────────────────────────────────────────────────
// ADVISOR SCORING
// ─────────────────────────────────────────────────────────────

export function scoreAdvisor(founder: FounderProfile, advisor: AdvisorProfile): MatchScore {
  const dimensions: ScoreDimension[] = [];
  const badges: string[] = [];

  // 1. Expertise Relevance (35%)
  const founderNeeds = extractNeeds(founder);
  const expertiseHits = founderNeeds.filter((n) =>
    advisor.expertise_areas.some((e) => e.toLowerCase().includes(n.toLowerCase())),
  ).length;
  const expertiseScore = Math.round(
    Math.min(expertiseHits / Math.max(founderNeeds.length, 1), 1) * 100,
  );
  if (expertiseScore >= 60) badges.push("Relevante Expertise");
  dimensions.push({
    label: "Expertise-Relevanz",
    score: expertiseScore,
    weight: ADVISOR_WEIGHTS.expertise_relevance,
    reason:
      expertiseScore >= 60
        ? `Deckt ${expertiseHits} deiner aktuellen Themen ab`
        : "Begrenzte Überschneidung mit deinen Themen",
  });

  // 2. Stage Fit (25%)
  const stageMatch = advisor.stages.includes(founder.stage || "");
  const stageScore = stageMatch ? 100 : 35;
  if (stageMatch) badges.push("Stage-Match");
  dimensions.push({
    label: "Stage-Fit",
    score: stageScore,
    weight: ADVISOR_WEIGHTS.stage_fit,
    reason: stageMatch
      ? `Berät Gründer in der "${founder.stage}" Phase`
      : `Primär für andere Phasen — trotzdem nützlich`,
  });

  // 3. Industry Alignment (20%)
  const industryFit =
    advisor.industries.includes(founder.industry || "") || advisor.industries.includes("all");
  const industryScore = industryFit ? 100 : 50;
  if (industryFit) badges.push("Branchen-Expertise");
  dimensions.push({
    label: "Branchen-Fit",
    score: industryScore,
    weight: ADVISOR_WEIGHTS.industry_alignment,
    reason: industryFit ? "Kennt deine Branche" : "Branchenübergreifende Erfahrung",
  });

  // 4. Availability (12%)
  const availMap = { low: 30, medium: 70, high: 100 };
  const availScore = availMap[advisor.availability];
  dimensions.push({
    label: "Erreichbarkeit",
    score: availScore,
    weight: ADVISOR_WEIGHTS.availability,
    reason:
      advisor.availability === "high"
        ? "Gut erreichbar, nimmt aktiv Anfragen an"
        : advisor.availability === "medium"
          ? "Begrenzt verfügbar"
          : "Selten erreichbar — qualifizierte Anfrage nötig",
  });

  // 5. Location (8%)
  const localAdvisor = advisor.cities.some(
    (c) => c.toLowerCase() === (founder.city || "").toLowerCase(),
  );
  const locScore = localAdvisor ? 100 : advisor.cities.includes("remote") ? 70 : 40;
  if (localAdvisor) badges.push("Lokal");
  dimensions.push({
    label: "Standort",
    score: locScore,
    weight: ADVISOR_WEIGHTS.location,
    reason: localAdvisor ? `In ${founder.city}` : "Remote oder andere Stadt",
  });

  if (advisor.verified) badges.push("Verifiziert");

  const total = computeTotal(dimensions);
  return { total, match_type: "advisor", dimensions, dealbreaker: false, badges };
}

// ─────────────────────────────────────────────────────────────
// SERVICE SCORING
// ─────────────────────────────────────────────────────────────

export function scoreService(founder: FounderProfile, service: ServiceProfile): MatchScore {
  const dimensions: ScoreDimension[] = [];
  const badges: string[] = [];

  // 1. Stage Relevance (30%)
  const stageMatch = service.stages.includes(founder.stage || "") || service.stages.includes("all");
  const stageScore = stageMatch ? 100 : 40;
  if (stageMatch) badges.push("Stage-Relevant");
  dimensions.push({
    label: "Stage-Relevanz",
    score: stageScore,
    weight: SERVICE_WEIGHTS.stage_relevance,
    reason: stageMatch ? "Passt zu deiner aktuellen Phase" : "Eher für spätere Phasen relevant",
  });

  // 2. Industry Fit (25%)
  const industryFit =
    service.industries.includes(founder.industry || "") || service.industries.includes("all");
  const industryScore = industryFit ? 100 : 45;
  if (industryFit) badges.push("Branche");
  dimensions.push({
    label: "Branchen-Fit",
    score: industryScore,
    weight: SERVICE_WEIGHTS.industry_fit,
    reason: industryFit ? "Kennt deine Branche" : "Generalistischer Anbieter",
  });

  // 3. Need Match (25%) — matches against founder's risk/goal keywords
  const founderNeeds = extractNeeds(founder);
  const tagHits = founderNeeds.filter((n) =>
    service.tags.some((t) => t.toLowerCase().includes(n.toLowerCase())),
  ).length;
  const needScore = Math.round(Math.min(tagHits / Math.max(founderNeeds.length, 1), 1) * 100);
  if (needScore >= 60) badges.push("Passt zu deinem Bedarf");
  dimensions.push({
    label: "Bedarf-Match",
    score: needScore,
    weight: SERVICE_WEIGHTS.need_match,
    reason:
      needScore >= 60
        ? `Deckt ${tagHits} deiner aktuellen Themen ab`
        : "Begrenzter direkter Bezug zu deinen Themen",
  });

  // 4. Location (12%)
  const localService = service.cities.some(
    (c) => c.toLowerCase() === (founder.city || "").toLowerCase(),
  );
  const locScore = localService ? 100 : service.remote ? 80 : 30;
  if (localService) badges.push("Lokal");
  if (service.remote) badges.push("Remote");
  dimensions.push({
    label: "Standort",
    score: locScore,
    weight: SERVICE_WEIGHTS.location,
    reason: localService
      ? `In ${founder.city}`
      : service.remote
        ? "Remote verfügbar"
        : "Anderer Standort",
  });

  // 5. Quality (8%)
  const ratingScore = ((service.rating ?? 4) / 5) * 80;
  const verifiedBonus = service.verified ? 20 : 0;
  const qualityScore = Math.round(Math.min(ratingScore + verifiedBonus, 100));
  if (service.verified) badges.push("Verifiziert");
  dimensions.push({
    label: "Qualität",
    score: qualityScore,
    weight: SERVICE_WEIGHTS.quality,
    reason: service.verified
      ? `Verifiziert${service.rating ? ` · ${service.rating}/5 Sterne` : ""}`
      : service.rating
        ? `${service.rating}/5 Sterne`
        : "Noch keine Bewertungen",
  });

  const total = computeTotal(dimensions);
  return { total, match_type: "service", dimensions, dealbreaker: false, badges };
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function computeTotal(dimensions: ScoreDimension[]): number {
  const raw = dimensions.reduce((sum, d) => sum + d.score * d.weight, 0);
  return Math.round(Math.min(Math.max(raw, 0), 100));
}

function extractNeeds(founder: FounderProfile): string[] {
  const text = [founder.goal, founder.risk, founder.stage, founder.industry]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  // keyword mapping — expand as needed
  const needMap: Record<string, string[]> = {
    recht: ["GmbH", "Vertrag", "Gründung", "legal", "gründen"],
    steuer: ["Steuer", "tax", "Buchführung", "Finanzamt"],
    förderung: ["EXIST", "KfW", "Förderung", "Stipendium", "Grant"],
    finanzierung: ["Kredit", "Investor", "Funding", "Kapital", "Bank"],
    marketing: ["Kunden", "Marketing", "Brand", "Social", "SEO"],
    team: ["Co-Founder", "Partner", "Mitgründer", "Team", "Hiring"],
    produkt: ["MVP", "Prototyp", "Produkt", "Entwicklung"],
    standort: ["Büro", "Coworking", "Raum", "Standort"],
  };

  return Object.entries(needMap)
    .filter(([, keywords]) => keywords.some((k) => text.includes(k.toLowerCase())))
    .map(([need]) => need);
}

// ─────────────────────────────────────────────────────────────
// RANK + FILTER MATCHES
// ─────────────────────────────────────────────────────────────

export function rankMatches<T>(
  founder: FounderProfile,
  candidates: T[],
  scoreFn: (founder: FounderProfile, candidate: T) => MatchScore,
  minScore = 30,
): Array<{ candidate: T; score: MatchScore }> {
  return candidates
    .map((candidate) => ({ candidate, score: scoreFn(founder, candidate) }))
    .filter(({ score }) => !score.dealbreaker && score.total >= minScore)
    .sort((a, b) => b.score.total - a.score.total);
}
