// ─────────────────────────────────────────────────────────────
// Erfolgs-Chronik (Web) — spiegelt die iOS-„Deine Erfolge"-Karte.
// Zeigt die vom Co-Pilot gefeierten Meilensteine; aktualisiert live,
// wenn ein neuer Erfolg dazukommt. Rendert nichts, wenn leer.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { Trophy, BadgeCheck } from "lucide-react";
import { readAchievements, onAchievementsChange, type Achievement } from "@/lib/copilot-client";

export function AchievementsCard() {
  const [items, setItems] = useState<Achievement[]>(() => readAchievements());

  useEffect(() => {
    const refresh = () => setItems(readAchievements());
    refresh();
    const off = onAchievementsChange(refresh);
    window.addEventListener("focus", refresh);
    return () => {
      off();
      window.removeEventListener("focus", refresh);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="mt-5 rounded-[18px] border border-[var(--ruled)] bg-[var(--surface)] p-5 shadow-warm">
      <div className="flex items-center gap-2">
        <Trophy className="h-4 w-4 text-[var(--ember-deep)]" />
        <h3 className="text-[15px] font-bold text-[var(--ink)]">Deine Erfolge</h3>
        <span className="ml-auto rounded-full bg-[var(--ember-tint)] px-2 py-0.5 text-[11px] font-bold text-[var(--ember-deep)]">
          {items.length}
        </span>
      </div>
      <ul className="mt-3 space-y-2.5">
        {items.slice(0, 4).map((a, i) => (
          <li key={`${a.date}-${i}`} className="flex items-start gap-2.5">
            <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ember)]" />
            <span className="text-[13.5px] font-semibold leading-snug text-[var(--ink)]">
              {a.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
