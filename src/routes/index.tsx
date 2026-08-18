import { createFileRoute } from "@tanstack/react-router";
import { L2Shell } from "@/components/landing/ds";
import { L2Nav, L2Hero, L2Benefits, L2Features } from "@/components/landing/sectionsA";
import { L2Copilot } from "@/components/landing/copilot";
import {
  L2Connect,
  L2Community,
  L2Testimonials,
  L2Pricing,
  L2Faq,
  L2Cta,
  L2Footer,
} from "@/components/landing/sectionsB";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "matchfoundr — Alles fürs Gründen. Gemeinsam." },
      {
        name: "description",
        content:
          "Co-Founder, Förderung, Kapital, Recht & Mentoren: matchfoundr bringt dich mit den Menschen und Programmen zusammen, die dein Vorhaben tragen. Mit Co-Pilot an Bord.",
      },
      { property: "og:title", content: "matchfoundr — Alles fürs Gründen. Gemeinsam." },
      {
        property: "og:description",
        content:
          "1.847 vorgeprüfte Partner, 8 Service-Welten und ein Co-Pilot, der mitdenkt. Finde deinen Co-Founder und die nächsten Schritte, die wirklich dran sind.",
      },
    ],
  }),
  component: Landing,
});

const LANDING_CSS = `
.l2-root *, .l2-root *::before, .l2-root *::after { box-sizing: border-box; }
.l2-root a { color: inherit; }
.l2-root a:hover { color: #E2511C; }
html { scroll-behavior: smooth; }

@media (max-width: 1024px) {
  .l2-nav-items, .l2-signin { display: none !important; }
}
@media (max-width: 900px) {
  .l2-hero-grid, .l2-feature { grid-template-columns: 1fr !important; gap: 40px !important; }
  .l2-3col { grid-template-columns: 1fr !important; }
  .l2-footer-grid { grid-template-columns: 1fr 1fr !important; gap: 28px !important; }
  .l2-footer-grid > div:first-child { grid-column: 1 / -1; }
  .l2-root section { padding-top: 64px !important; padding-bottom: 64px !important; }
  .l2-nav { padding: 12px 22px !important; }
  .l2-hero-grid { padding: 48px 22px 32px !important; }
  .l2-root div[style*="padding: 0 40px"] { padding-left: 22px !important; padding-right: 22px !important; }
}
@media (max-width: 560px) {
  .l2-footer-grid { grid-template-columns: 1fr !important; }
  .l2-nav { padding: 10px 16px !important; }
  .l2-nav a { font-size: 13px !important; padding: 10px 14px !important; }
  .l2-hero-grid { padding: 36px 16px 24px !important; }
  .l2-root div[style*="padding: 0 40px"] { padding-left: 16px !important; padding-right: 16px !important; }
}
.l2-root { overflow-x: hidden; }

`;

function Landing() {
  return (
    <div className="l2-root">
      <style dangerouslySetInnerHTML={{ __html: LANDING_CSS }} />
      <L2Shell>
        <L2Nav />
        <L2Hero />
        <L2Benefits />
        <L2Copilot />
        <L2Features />
        <L2Connect />
        <L2Community />
        <L2Testimonials />
        <L2Pricing />
        <L2Faq />
        <L2Cta />
        <L2Footer />
      </L2Shell>
    </div>
  );
}
