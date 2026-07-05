// ─────────────────────────────────────────────────────────────
// Freemium-Logik
// Free: 5 Swipes/Tag, 1 neuer Chat-Kontakt. Premium: alles offen.
// Paywall NIE im Onboarding — nur nach Feature-Nutzung.
// Stripe folgt; bis dahin schaltet die Testphase lokal frei.
// ─────────────────────────────────────────────────────────────

const PREMIUM_KEY = "mf_premium_v1";
const SWIPES_KEY = "mf_swipes_v1";
const CONTACTS_KEY = "mf_chat_contacts_v1";
const CHANGE_EVENT = "mf-premium-changed";

export const FREE_SWIPES_PER_DAY = 5;
export const FREE_CHAT_CONTACTS = 1;

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── Premium-Status ───────────────────────────────────────────

export function isPremium(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(PREMIUM_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw) as { active?: boolean; trialUntil?: string };
    if (!data.active) return false;
    if (data.trialUntil && new Date(data.trialUntil).getTime() < Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

export function activateTrial(days = 7): void {
  try {
    localStorage.setItem(
      PREMIUM_KEY,
      JSON.stringify({
        active: true,
        trialUntil: new Date(Date.now() + days * 86400_000).toISOString(),
        activatedAt: new Date().toISOString(),
      }),
    );
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch {
    /* */
  }
}

export function onPremiumChange(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGE_EVENT, handler);
  return () => window.removeEventListener(CHANGE_EVENT, handler);
}

// ─── Swipe-Limit (5/Tag für Free) ─────────────────────────────

function readSwipes(): { date: string; count: number } {
  try {
    const raw = localStorage.getItem(SWIPES_KEY);
    const data = raw ? (JSON.parse(raw) as { date: string; count: number }) : null;
    if (data && data.date === todayKey()) return data;
  } catch {
    /* */
  }
  return { date: todayKey(), count: 0 };
}

export function swipesLeftToday(): number {
  if (isPremium()) return Infinity;
  return Math.max(0, FREE_SWIPES_PER_DAY - readSwipes().count);
}

/** true = Swipe erlaubt (und gezählt), false = Limit erreicht → Paywall zeigen. */
export function registerSwipe(): boolean {
  if (isPremium()) return true;
  const cur = readSwipes();
  if (cur.count >= FREE_SWIPES_PER_DAY) return false;
  try {
    localStorage.setItem(SWIPES_KEY, JSON.stringify({ date: cur.date, count: cur.count + 1 }));
  } catch {
    /* */
  }
  return true;
}

// ─── Chat-Kontakt-Gate (1. Kontakt frei, ab dem 2. Premium) ───

function readContacts(): string[] {
  try {
    const raw = localStorage.getItem(CONTACTS_KEY);
    const data = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/** true = Chat öffnen erlaubt, false = Paywall zeigen. Bereits kontaktierte bleiben immer offen. */
export function registerChatContact(contactId: string): boolean {
  const contacts = readContacts();
  if (contacts.includes(contactId)) return true;
  if (!isPremium() && contacts.length >= FREE_CHAT_CONTACTS) return false;
  try {
    localStorage.setItem(CONTACTS_KEY, JSON.stringify([...contacts, contactId]));
  } catch {
    /* */
  }
  return true;
}
