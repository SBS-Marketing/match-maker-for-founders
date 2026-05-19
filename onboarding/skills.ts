// matchfoundr · Skill Taxonomy for Talent Onboarding

export type SkillCategory = {
  id: string
  label: string
  emoji: string
  skills: string[]
}

export const SKILL_CATEGORIES: SkillCategory[] = [
  {
    id: 'tech',
    label: 'Tech',
    emoji: '⚡',
    skills: [
      'React', 'Vue', 'Angular', 'Next.js', 'Node.js',
      'Python', 'Go', 'Rust', 'Swift', 'Kotlin', 'Flutter',
      'TypeScript', 'PostgreSQL', 'MongoDB', 'Redis',
      'AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes',
      'ML / AI', 'LLMs', 'Computer Vision', 'Blockchain', 'Solidity',
      'Cybersecurity', 'DevOps', 'Data Engineering',
    ],
  },
  {
    id: 'design',
    label: 'Design',
    emoji: '✦',
    skills: [
      'UI Design', 'UX Research', 'Figma', 'Prototyping',
      'Brand Identity', 'Motion Design', '3D / Blender',
      'Illustration', 'Product Design', 'Design Systems',
      'Web Design', 'App Design', 'Packaging',
    ],
  },
  {
    id: 'sales',
    label: 'Sales',
    emoji: '↗',
    skills: [
      'B2B Sales', 'B2C Sales', 'Enterprise Sales',
      'SDR / BDR', 'Account Management', 'CRM',
      'Cold Outreach', 'Partnerships', 'Channel Sales',
      'SaaS Sales', 'Retail', 'E-Commerce',
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    emoji: '◈',
    skills: [
      'Financial Modeling', 'VC Fundraising', 'Angel Investing',
      'Cap Table', 'Due Diligence', 'Controlling',
      'Accounting', 'Tax', 'Grant Writing (EXIST)',
      'Förderprogramme', 'Crowdfunding',
    ],
  },
  {
    id: 'legal',
    label: 'Legal',
    emoji: '§',
    skills: [
      'GmbH-Gründung', 'Term Sheets', 'IP / Patente',
      'Arbeitsrecht', 'DSGVO / Data Privacy',
      'Vertragsrecht', 'Lizenzrecht', 'Open Source Licensing',
      'Markenrecht',
    ],
  },
  {
    id: 'ops',
    label: 'Ops',
    emoji: '⊞',
    skills: [
      'Project Management', 'Recruiting', 'HR',
      'Supply Chain', 'Prozessoptimierung',
      'Customer Success', 'QA / Testing',
      'Einkauf', 'Logistik',
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    emoji: '◉',
    skills: [
      'Content Marketing', 'SEO', 'Performance Marketing',
      'Social Media', 'PR / Presse', 'Community Building',
      'Email Marketing', 'Growth Hacking', 'Influencer Marketing',
      'Podcast', 'Video / YouTube', 'TikTok',
    ],
  },
]

export type LookingFor = 'idea_codev' | 'early_stage' | 'equity_based' | 'paid_later'

export const LOOKING_FOR_OPTIONS: { id: LookingFor; label: string; desc: string }[] = [
  { id: 'idea_codev',    label: 'Idee mitentwickeln',    desc: 'Von Anfang an dabei, Idee noch offen' },
  { id: 'early_stage',  label: 'Early Startup joinen',   desc: 'Idee existiert, Team noch klein' },
  { id: 'equity_based', label: 'Equity statt Gehalt',    desc: 'Ich investiere Zeit für Anteile' },
  { id: 'paid_later',   label: 'Gehalt ab Funding',      desc: 'Erstmal Sweat Equity, dann Fixgehalt' },
]
