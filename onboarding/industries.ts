// matchfoundr · Industry Layer
// Controls language, terminology, relevant skills, and Co-Pilot tone per sector

export type IndustryId =
  | 'tech'
  | 'handwerk'
  | 'gastro'
  | 'kreativ'
  | 'handel'
  | 'bildung'
  | 'gesundheit'
  | 'beratung'

export type Industry = {
  id: IndustryId
  label: string
  emoji: string
  description: string

  // Language overrides — replaces generic terms in UI + Co-Pilot prompts
  terms: {
    venture: string        // "Startup" → "Betrieb", "Lokal", "Studio"
    partner: string        // "Co-Founder" → "Geschäftspartner", "Mitgründer"
    prototype: string      // "MVP" → "erstes Projekt", "Testlauf", "Pilotküche"
    funding: string        // "Funding" → "Kredit / Förderung", "Investoren"
    stage_options: string[] // Stage-Auswahl passend zur Branche
    idea_options: string[]  // Quick-Chips für "Was entsteht?"
  }

  // Which skill categories to show first (from skills.ts)
  primary_skills: string[]  // category IDs

  // Branchen-spezifische Skills (eigene Chip-Kategorie "Branche")
  industry_skills: string[]


  // Co-Pilot system tone hint
  copilot_context: string   // injected into Kimi + Sonnet prompts
}

export const INDUSTRIES: Industry[] = [
  {
    id: 'tech',
    label: 'Tech & Startup',
    emoji: '⚡',
    description: 'Software, Hardware, Deep Tech, SaaS, Plattformen',
    terms: {
      venture: 'Startup',
      partner: 'Co-Founder',
      prototype: 'MVP',
      funding: 'Funding / Investment',
      stage_options: ['Idee', 'Prototyp / MVP', 'Erste Kunden', 'Product-Market Fit', 'Skalierung'],
      idea_options: ['SaaS-Tool', 'Marketplace', 'Mobile App', 'AI/ML-Produkt', 'Hardware', 'Consumer-Brand', 'B2B-Service', 'Noch unklar'],
    },
    primary_skills: ['tech', 'design', 'sales'],
    industry_skills: [
      'Product-Market Fit', 'MVP-Building', 'Pitch Decks', 'Cap Table', 'EXIST-Antrag',
      'VC-Pitching', 'YC / Accelerator', 'Hiring (Tech)', 'OKRs', 'Tech-Strategie',
      'No-Code', 'API-Design', 'Open Source',
    ],
    copilot_context: 'Tech Startup, typische Themen: MVP, Product-Market Fit, VC-Funding, EXIST, Cap Table, Hiring.',
  },
  {
    id: 'handwerk',
    label: 'Handwerk & Produktion',
    emoji: '🔨',
    description: 'Schreinerei, Elektrik, Bau, Manufaktur, Produktion',
    terms: {
      venture: 'Betrieb',
      partner: 'Geschäftspartner',
      prototype: 'erstes Projekt',
      funding: 'Kredit / Förderung',
      stage_options: ['Idee / Plan', 'Meisterbrief / Zulassung', 'Erster Auftrag', 'Fester Kundenstamm', 'Zweiter Standort / Skalierung'],
      idea_options: ['Schreinerei', 'Elektrik / SHK', 'Bau / Sanierung', 'Manufaktur', 'KFZ-Werkstatt', 'Mobiler Service', 'Spezial-Handwerk', 'Noch unklar'],
    },
    primary_skills: ['ops', 'finance', 'sales'],
    industry_skills: [
      'Meisterbrief', 'Gesellenprüfung', 'CAD / Technisches Zeichnen', 'Kalkulation',
      'Aufmaß / Angebotserstellung', 'Bauleitung', 'CNC / Maschinen', 'Schweißen',
      'Materialkunde', 'Handwerkskammer', 'Gewährleistung', 'Subunternehmer-Management',
      'Werkstatt-Organisation',
    ],
    copilot_context: 'Handwerksbetrieb, typische Themen: Meisterpflicht, Gewerbeanmeldung, Handwerkskammer, KfW-Kredit, Gesellenvertrag, Auftragsgewinnung.',
  },
  {
    id: 'gastro',
    label: 'Gastronomie & Food',
    emoji: '◎',
    description: 'Restaurant, Café, Catering, Food Startup, Lieferdienst',
    terms: {
      venture: 'Konzept',
      partner: 'Gastro-Partner',
      prototype: 'Testlauf / Pop-up',
      funding: 'Finanzierung / Förderung',
      stage_options: ['Konzeptidee', 'Businessplan', 'Pop-up / Testlauf', 'Eröffnung', 'Zweites Lokal'],
      idea_options: ['Restaurant', 'Café / Bar', 'Foodtruck', 'Catering', 'Lieferdienst', 'Food-Brand / Produkt', 'Pop-up / Supperclub', 'Noch unklar'],
    },
    primary_skills: ['ops', 'marketing', 'finance'],
    industry_skills: [
      'Küchenleitung', 'Rezept-Entwicklung', 'Menu Engineering', 'HACCP',
      'Sommelier / Getränke', 'Barista', 'Service / Gastfreundschaft', 'Lieferanten-Mgmt',
      'Pachtverhandlung', 'Schichtplanung', 'Food-Cost-Kalkulation', 'POS-Systeme',
      'Gastro-Marketing (Insta/TikTok)',
    ],
    copilot_context: 'Gastronomiebetrieb, typische Themen: HACCP, Konzession, Pachtvertrag, Lieferanten, SCHUFA, Hygienevorschriften, Social Media für Gastro.',
  },
  {
    id: 'kreativ',
    label: 'Kreativwirtschaft',
    emoji: '✦',
    description: 'Agentur, Design Studio, Musik, Film, Mode, Content',
    terms: {
      venture: 'Studio',
      partner: 'Kreativ-Partner',
      prototype: 'erstes Projekt',
      funding: 'Förderung / Auftrag',
      stage_options: ['Idee / Konzept', 'Erstes Projekt', 'Feste Kunden', 'Team aufbauen', 'Agentur skalieren'],
      idea_options: ['Design-Studio', 'Werbeagentur', 'Film / Video', 'Musik / Audio', 'Mode / Fashion', 'Content / Social', 'Foto', 'Noch unklar'],
    },
    primary_skills: ['design', 'marketing', 'sales'],
    industry_skills: [
      'Art Direction', 'Creative Direction', 'Copywriting', 'Storytelling',
      'Pitchen bei Kunden', 'Briefing / Konzeption', 'Produktion (Film/Foto)',
      'Casting', 'Mode-Design', 'Schnitt / Editing', 'Sound Design',
      'Urheberrecht', 'GEMA / Verwertung',
    ],
    copilot_context: 'Kreativagentur oder Studio, typische Themen: Auftragsrecht, Urheberrecht, Freelancer vs. Festanstellung, Projektpreise, Portfolio aufbauen.',
  },
  {
    id: 'handel',
    label: 'Handel & E-Commerce',
    emoji: '◈',
    description: 'Online-Shop, Einzelhandel, Import/Export, Marktplatz',
    terms: {
      venture: 'Shop / Unternehmen',
      partner: 'Geschäftspartner',
      prototype: 'erster Launch',
      funding: 'Kapital / Kredit',
      stage_options: ['Produktidee', 'Supplier gefunden', 'Erster Launch', 'Profitabel', 'Skalierung'],
      idea_options: ['Online-Shop', 'Eigene Marke (D2C)', 'Amazon FBA', 'Einzelhandel / Laden', 'Import / Export', 'Marktplatz', 'Großhandel / B2B', 'Noch unklar'],
    },
    primary_skills: ['sales', 'marketing', 'ops'],
    industry_skills: [
      'Shopify', 'WooCommerce', 'Amazon FBA', 'Produktfotografie', 'Listings / SEO',
      'Performance Ads (Meta/Google)', 'Influencer-Kooperationen', 'Sourcing (Asien/EU)',
      'Zoll / Import', 'Fulfillment / 3PL', 'Retouren-Management', 'CRM / Klaviyo',
      'Marken-Aufbau',
    ],
    copilot_context: 'E-Commerce oder Handel, typische Themen: Lieferanten, Shopify/Amazon, Logistik, Retouren, Performance Marketing, Markenaufbau.',
  },
  {
    id: 'bildung',
    label: 'Bildung & Soziales',
    emoji: '◑',
    description: 'Schule, Kita, NGO, soziales Unternehmen, EdTech',
    terms: {
      venture: 'Einrichtung / Projekt',
      partner: 'Mitgründer / Partner',
      prototype: 'Pilotprojekt',
      funding: 'Förderung / Spenden',
      stage_options: ['Idee', 'Pilotprojekt', 'Anerkennung / Zulassung', 'Betrieb', 'Skalierung / Franchise'],
      idea_options: ['Schule / Kita', 'NGO / Verein', 'EdTech-Plattform', 'Nachhilfe / Kurse', 'Soziales Unternehmen', 'Beratungsstelle', 'Jugendarbeit', 'Noch unklar'],
    },
    primary_skills: ['ops', 'finance', 'marketing'],
    industry_skills: [
      'Pädagogik', 'Lehrplan-Entwicklung', 'Förderantrag schreiben', 'Stiftungs-Kontakte',
      'Gemeinnützigkeits-Recht', 'Spendenakquise', 'Ehrenamt-Koordination',
      'Impact-Messung', 'Betriebserlaubnis (Kita/Schule)', 'EdTech-Didaktik',
      'Inklusion', 'Mehrsprachigkeit',
    ],
    copilot_context: 'Bildungs- oder Sozialunternehmen, typische Themen: Gemeinnützigkeit, Förderanträge, Betriebserlaubnis, Ehrenamt vs. Festanstellung, Impact-Messung.',
  },
  {
    id: 'gesundheit',
    label: 'Gesundheit & Wellness',
    emoji: '⊕',
    description: 'Praxis, Physio, Yoga, MedTech, Apotheke, Coaching',
    terms: {
      venture: 'Praxis / Studio',
      partner: 'Praxispartner',
      prototype: 'erster Kurs / Pilot',
      funding: 'Finanzierung / Kassenzulassung',
      stage_options: ['Konzept', 'Zulassung / Approbation', 'Erste Patienten / Kunden', 'Etabliert', 'Zweiter Standort'],
      idea_options: ['Arzt- / Zahnarztpraxis', 'Physio / Heilpraktik', 'Yoga / Fitness-Studio', 'Coaching / Therapie', 'MedTech-Produkt', 'Apotheke', 'Wellness / Spa', 'Noch unklar'],
    },
    primary_skills: ['ops', 'marketing', 'finance'],
    industry_skills: [
      'Approbation / Heilkundeerlaubnis', 'Kassenzulassung', 'Abrechnung (GOÄ/EBM)',
      'Patientendaten-Schutz', 'Praxis-Management', 'Therapie-Methoden',
      'Anatomie / Physio', 'Yoga-Lehrer-Ausbildung', 'Ernährungsberatung',
      'Medizingeräte (MPG)', 'Apotheken-Recht', 'Online-Coaching',
    ],
    copilot_context: 'Gesundheits- oder Wellnessunternehmen, typische Themen: Approbation, Kassenzulassung, Datenschutz (Patientendaten), Praxisräume, Krankenkassen-Abrechnung.',
  },
  {
    id: 'beratung',
    label: 'Beratung & Dienstleistung',
    emoji: '↗',
    description: 'Unternehmensberatung, Recht, Steuer, IT-Dienstleistung, HR',
    terms: {
      venture: 'Kanzlei / Boutique',
      partner: 'Partner',
      prototype: 'erster Mandant / Auftrag',
      funding: 'Eigenkapital / Kredit',
      stage_options: ['Idee / Positionierung', 'Erster Kunde', 'Feste Pipeline', 'Team aufbauen', 'Skalierung'],
      idea_options: ['Unternehmensberatung', 'Rechtsanwalt / Kanzlei', 'Steuerberatung', 'IT-Dienstleistung', 'HR / Recruiting', 'Marketing-Beratung', 'Coaching / Training', 'Noch unklar'],
    },
    primary_skills: ['sales', 'ops', 'finance'],
    industry_skills: [
      'Mandanten-Akquise', 'Positionierung / Nische', 'Stundensatz-Kalkulation',
      'Proposal / Angebotsschreiben', 'Workshop-Moderation', 'Methodenkompetenz (Scrum/Lean)',
      'Steuerrecht', 'Arbeitsrecht', 'Vertragsrecht', 'Audit / Due Diligence',
      'Recruiting / Active Sourcing', 'Change Management',
    ],
    copilot_context: 'Beratungs- oder Dienstleistungsunternehmen, typische Themen: Positionierung, Akquise, Stundenpreise vs. Projektpreise, Partnerschaft-Modelle, Skalierung ohne Qualitätsverlust.',
  },
]

export function getIndustry(id: IndustryId): Industry {
  return INDUSTRIES.find(i => i.id === id) ?? INDUSTRIES[0]
}
