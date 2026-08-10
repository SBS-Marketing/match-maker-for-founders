import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/datenschutz")({
  head: () => ({
    meta: [
      { title: "Datenschutzerklärung — matchfoundr" },
      {
        name: "description",
        content: "Datenschutzerklärung von matchfoundr.",
      },
    ],
  }),
  component: DatenschutzPage,
});

function DatenschutzPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-24">
      <article className="rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur sm:p-10">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Rechtliches
        </p>
        <h1 className="mb-10 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Datenschutzerklärung
        </h1>

        <div className="space-y-8 text-sm leading-7 text-muted-foreground">
          <Section title="Einführung">
            <p>
              Diese Datenschutzrichtlinie beschreibt die Praktiken von SBS Marketing in Bezug auf die von Benutzern gesammelten Informationen, die auf unsere Website unter www.sbs-marketing.de („Website") zugreifen oder auf andere Weise personenbezogene Daten mit uns teilen (gemeinsam: „Benutzer").
            </p>
          </Section>

          <Section title="Gründe für die Datenerhebung">
            <p>
              Verarbeitung Ihrer personenbezogenen Daten (d.h. aller Informationen, die möglicherweise mit angemessenen Mitteln eine Identifizierung Ihrer Person zulassen; im Folgenden „personenbezogene Daten") ist für die Erfüllung unserer vertraglichen Verpflichtungen Ihnen gegenüber und die Erbringung unserer Dienstleistungen für Sie, zur Wahrung unserer berechtigten Interessen und zur Einhaltung rechtlicher und finanzieller Regulierungspflichten, denen wir unterliegen, erforderlich.
            </p>
            <p>
              Wenn Sie die Website nutzen, stimmen Sie der Erfassung, Speicherung, Verwendung, Offenlegung und anderen Verwendungszwecken Ihrer persönlichen Daten gemäß der Beschreibung in dieser Datenschutzrichtlinie zu.
            </p>
          </Section>

          <Section title="Welche Informationen sammeln wir?"><p>Wir erfassen zwei Arten von Daten und Informationen von Benutzern.</p><p>Bei der ersten Art von Informationen handelt es sich um nicht identifizierte und nicht identifizierbare Informationen über einen oder mehrere Benutzer, die durch Ihre Nutzung der Website verfügbar gemacht oder gesammelt werden können („Nicht-personenbezogene Informationen"). Zu den nicht personenbezogenen Daten, die erfasst werden, gehören möglicherweise Ihre aggregierten Nutzungsinformationen und technischen Informationen, die von Ihrem Gerät übertragen werden, einschließlich bestimmter Software- und Hardwareinformationen.</p><p>Bei der zweiten Art von Informationen handelt es sich um personenbezogene Daten, bei denen es sich um individuell identifizierbare Informationen handelt:</p><ul><li><strong>Geräteinformationen:</strong> Geolokalisierungsdaten, IP-Adresse, eindeutige Kennungen und andere Informationen, die sich auf Ihre Aktivitäten auf der Website beziehen.</li><li><strong>Registrierungsinformationen:</strong> Vollständiger Name, E-Mail-Adresse oder physische Adresse und andere Informationen.</li></ul></Section>

          <Section title="Wie erhalten wir Informationen über Sie?"><ul><li>Wenn Sie uns freiwillig Ihre persönlichen Daten zur Verfügung stellen;</li><li>Wenn Sie unsere Website im Zusammenhang mit Ihrer Nutzung unserer Dienste nutzen oder darauf zugreifen;</li><li>Von Drittanbietern, Diensten und öffentlichen Registern (z.B. Anbieter von Verkehrsanalysen).</li></ul></Section>

          <Section title="Nutzerrechte"><p>Sie können Folgendes beantragen:</p><ul><li>Zugriff auf Ihre gespeicherten personenbezogenen Daten sowie ergänzende Informationen.</li><li>Erhalt einer Kopie der personenbezogenen Daten in einem strukturierten, allgemein verwendeten und maschinenlesbaren Format.</li><li>Berichtigung Ihrer personenbezogenen Daten.</li><li>Löschung Ihrer persönlichen Daten.</li><li>Widerspruch gegen die Verarbeitung personenbezogener Daten.</li><li>Einschränkung der Verarbeitung Ihrer personenbezogenen Daten.</li><li>Beschwerde bei einer Aufsichtsbehörde einreichen.</li></ul><p>Kontaktieren Sie unseren Datenschutzbeauftragten unter: <a className="text-primary underline-offset-4 hover:underline" href="mailto:sales@sbs-marketing.de">sales@sbs-marketing.de</a></p></Section>

          <Section title="Verwendung und Weitergabe Ihrer Daten"><p>Wir vermieten, verkaufen oder geben die Benutzerdaten nicht an Dritte weiter, außer wie in dieser Datenschutzrichtlinie beschrieben. Wir können die Informationen für Folgendes verwenden:</p><ul><li>Kommunikation mit Ihnen und Bereitstellung technischer Informationen;</li><li>Updates und Informationen über unsere neuesten Dienste;</li><li>Anzeige von Werbung bei Nutzung unserer Website;</li><li>Marketing unserer Websites und Produkte;</li><li>Durchführung statistischer und analytischer Zwecke zur Verbesserung der Website.</li></ul></Section>

          <Section title="Aufbewahrung"><p>Wir werden Ihre personenbezogenen Daten so lange aufbewahren, wie es für die Bereitstellung unserer Dienste und für die Einhaltung unserer gesetzlichen Verpflichtungen, die Beilegung von Streitigkeiten und die Durchsetzung unserer Richtlinien erforderlich ist.</p></Section>

          <Section title="Cookies"><p>Wir und unsere vertrauenswürdigen Partner verwenden Cookies und andere Technologien in unseren zugehörigen Diensten. Cookies werden für verschiedene Zwecke verwendet: Navigation, automatische Aktivierung bestimmter Funktionen, Speicherung Ihrer Präferenzen und Anzeige relevanter Werbung.</p><p>Die Website verwendet die folgenden Arten von Cookies:</p><ul><li><strong>Sitzungscookies</strong> – vorübergehend gespeichert, werden beim Schließen des Browsers gelöscht.</li><li><strong>Dauerhafte Cookies</strong> – für einen bestimmten Zeitraum auf Ihrem Computer gespeichert.</li><li><strong>Drittanbieter-Cookies</strong> – gesetzt von anderen Online-Diensten (z.B. Analyseunternehmen).</li></ul><p>Wir verwenden außerdem Google Analytics, um Informationen über Ihre Nutzung der Website zu sammeln. Die Möglichkeit von Google, von Google Analytics gesammelte Informationen zu verwenden und weiterzugeben, wird durch die Nutzungsbedingungen und die Datenschutzrichtlinie von Google eingeschränkt.</p></Section>

          <Section title="Datensicherheit"><p>Wir legen großen Wert auf die Implementierung und Aufrechterhaltung der Sicherheit der Website und Ihrer Informationen. Wir wenden branchenübliche Verfahren und Richtlinien an, um die Sicherheit der von uns erfassten und gespeicherten Informationen zu gewährleisten.</p></Section>
          <Section title="Übermittlung von Daten außerhalb des EWR"><p>Einige Datenempfänger können ihren Sitz außerhalb des EWR haben. In solchen Fällen werden wir Ihre Daten nur in Länder übermitteln, die von der Europäischen Kommission ein angemessenes Datenschutzniveau gewährleisten.</p></Section>
          <Section title="Marketing"><p>Wir können Ihre personenbezogenen Daten verwenden, um Ihnen Werbematerialien zu unseren Dienstleistungen bereitzustellen. Sie haben jederzeit die Möglichkeit, den Erhalt weiterer Marketingangebote abzulehnen.</p></Section>
          <Section title="Minderjährige"><p>Die Website ist nicht für Kinder konzipiert oder richtet sich an diese. Unter keinen Umständen gestatten wir Minderjährigen die Nutzung unserer Dienste ohne vorherige Zustimmung eines Elternteils oder Erziehungsberechtigten.</p></Section>
          <Section title="Änderungen dieser Datenschutzrichtlinie"><p>Wir behalten uns das Recht vor, die Datenschutzrichtlinie regelmäßig zu ändern oder zu überarbeiten. Wesentliche Änderungen treten sofort nach Veröffentlichung der überarbeiteten Datenschutzrichtlinie in Kraft.</p></Section>
          <Section title="Kontakt"><p>SBS Marketing<br />44866 Bochum<br /><a className="text-primary underline-offset-4 hover:underline" href="mailto:info@sbs-marketing.de">info@sbs-marketing.de</a></p></Section>
        </div>
      </article>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold text-foreground">{title}</h2>
      <div className="space-y-3 [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">{children}</div>
    </section>
  );
}
