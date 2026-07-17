// Deals-Datenmodell für die App. Quelle ist das wöchentlich generierte
// public/deals.json (Scraper + KI-Normalisierung). Wir importieren es
// zur Build-Zeit, damit die Deals-Seite ohne extra Fetch rendert.
import dealsJson from "../../public/deals.json";

export type Deal = {
  id: string;
  company: string;
  product: string;
  cat: string;
  logo: string;
  value: string;
  badge: string;
  badge_class: string;
  desc: string;
  eligibility: string;
  duration: string;
  url: string;
  claim_url: string;
  tags: string[];
  tier: string;
  active: boolean;
  cat_icon: string;
  cat_label: string;
};

type DealsFile = {
  generated_at: string;
  stats: {
    total_deals: number;
    total_value_approx?: string;
    by_category: Record<string, number>;
  };
  deals: Deal[];
};

const file = dealsJson as DealsFile;

export const DEALS: Deal[] = (file.deals ?? []).filter((d) => d.active !== false);
export const DEALS_GENERATED_AT: string = file.generated_at;
export const DEALS_STATS = file.stats;

export const DEAL_CATEGORIES: { id: string; label: string; icon: string; count: number }[] = (() => {
  const map = new Map<string, { label: string; icon: string; count: number }>();
  for (const d of DEALS) {
    const cur = map.get(d.cat);
    if (cur) cur.count += 1;
    else map.set(d.cat, { label: d.cat_label || d.cat, icon: d.cat_icon || "•", count: 1 });
  }
  return [...map.entries()]
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.count - a.count);
})();
