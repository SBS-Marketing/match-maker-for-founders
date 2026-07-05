// Premium-Paywall — erscheint nach Feature-Nutzung, nie im Onboarding.
// Mobile: Bottom-Sheet. Desktop: zentrierte Karte. Ein Branding, eine Aktion.

import { Check, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { activateTrial } from "@/lib/premium";

const FEATURES = [
  "Unbegrenzt swipen — jeden Tag",
  "Alle Matches anschreiben",
  "Sehen, wer dein Profil besucht hat",
  "Dein Gesuch ganz oben im Marktplatz",
];

export function PremiumSheet({
  open,
  reason,
  onClose,
  onUnlocked,
}: {
  open: boolean;
  reason: "swipes" | "chat";
  onClose: () => void;
  onUnlocked?: () => void;
}) {
  if (!open) return null;

  function startTrial() {
    activateTrial(7);
    toast.success("Premium-Testphase aktiv — 7 Tage alles offen!");
    onUnlocked?.();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <button
        aria-label="Schließen"
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(23,21,15,0.4)] backdrop-blur-[2px]"
      />
      <div className="relative w-full max-w-md rounded-t-[26px] bg-[var(--surface)] p-6 pb-8 shadow-warm-lg sm:rounded-[26px] sm:pb-6">
        <button
          onClick={onClose}
          aria-label="Später"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-[var(--smoke)] hover:bg-[var(--surface-soft)] hover:text-[var(--ink)]"
        >
          <X className="h-4 w-4" />
        </button>

        <span
          className="flex h-12 w-12 items-center justify-center rounded-2xl text-white"
          style={{ background: "var(--ember-grad)", boxShadow: "var(--ember-glow)" }}
        >
          <Zap className="h-5 w-5" />
        </span>

        <h2 className="mt-4 text-[22px] font-semibold leading-tight tracking-tight text-[var(--ink)]">
          {reason === "swipes"
            ? "Deine 5 Swipes für heute sind durch."
            : "Der nächste Kontakt gehört zu Premium."}
        </h2>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--smoke)]">
          {reason === "swipes"
            ? "Gute Partner warten nicht bis morgen. Mit Premium swipst du weiter — so viel du willst."
            : "Dein erster Kontakt ist immer frei. Für alle weiteren Gespräche schaltet Premium den Chat auf."}
        </p>

        <ul className="mt-4 space-y-2.5">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-[13.5px] text-[var(--ink)]">
              <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-[var(--ember-tint)]">
                <Check className="h-3 w-3 text-[var(--ember-deep)]" />
              </span>
              {f}
            </li>
          ))}
        </ul>

        <button
          onClick={startTrial}
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-[14.5px] font-semibold text-white transition hover:brightness-105"
          style={{ background: "var(--ember-grad)", boxShadow: "var(--ember-glow)" }}
        >
          7 Tage kostenlos testen
        </button>
        <div className="mt-2.5 text-center text-[11.5px] text-[var(--faint)]">
          Danach 9 €/Monat · jederzeit kündbar · endet automatisch ohne Zahlungsdaten
        </div>
        <button
          onClick={onClose}
          className="mx-auto mt-2 block min-h-[44px] text-[13px] font-semibold text-[var(--smoke)] hover:text-[var(--ink)]"
        >
          Vielleicht später
        </button>
      </div>
    </div>
  );
}
