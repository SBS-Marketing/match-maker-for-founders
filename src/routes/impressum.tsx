import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/impressum")({
  head: () => ({
    meta: [
      { title: "Impressum — matchfoundr" },
      {
        name: "description",
        content: "Impressum von matchfoundr, einem Projekt der SBS Marketing GbR.",
      },
    ],
  }),
  component: ImpressumPage,
});

function ImpressumPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-24">
      <article className="rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur sm:p-10">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Rechtliches
        </p>
        <h1 className="mb-10 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Impressum
        </h1>

        <div className="space-y-8 text-sm leading-7 text-muted-foreground">
          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">Angaben gemäß § 5 TMG</h2>
            <div className="space-y-1">
              <p>
                <strong>SBS Marketing GbR</strong>
                <br />
                (Korsanke/Hille/Rieger GbR)
              </p>
              <p>Geschäftsführer: Marvin Korsanke, Louis Rieger, Jannik Hille</p>
              <p>
                Osterfeldstraße 24
                <br />
                44866 Bochum
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">Kontakt</h2>
            <p>
              Telefon: <a className="text-primary underline-offset-4 hover:underline" href="tel:+4917660171071">+49 (0) 176 60 17 1071</a>
              <br />
              E-Mail: <a className="text-primary underline-offset-4 hover:underline" href="mailto:info@sbs-marketing.de">info@sbs-marketing.de</a>
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">
              Verbraucherstreitbeilegung / Universalschlichtungsstelle
            </h2>
            <p>
              Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
              Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
