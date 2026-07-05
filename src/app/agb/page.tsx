import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";

export const metadata: Metadata = {
	title: "Nutzungsbedingungen - Tablet Teaching",
};

// Allgemeine Nutzungsbedingungen (AGB). Vorläufige Fassung, an der
// tatsächlichen Funktionsweise der App ausgerichtet. Ersetzt keine
// Rechtsberatung — vor öffentlichem Launch anwaltlich prüfen lassen.
export default function AGBPage() {
	return (
		<PageShell title="Nutzungsbedingungen" maxWidth="2xl">
			<section className="space-y-6 text-sm leading-relaxed">
				<p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
					Hinweis: Dies ist eine vorläufige Fassung für die geschlossene
					Beta-Phase. Sie ersetzt keine Rechtsberatung.
				</p>

				<div>
					<h2 className="text-base font-semibold mb-2">
						1. Geltungsbereich und Anbieter
					</h2>
					<p>
						Diese Nutzungsbedingungen gelten für die Nutzung der Anwendung
						„Tablet Teaching" (nachfolgend „App"), bereitgestellt von
						Antonio Bentivoglio (Bensappforge), erreichbar unter{" "}
						<a
							href="mailto:info@bensappforge.cloud"
							className="text-accent underline-offset-4 hover:underline"
						>
							info@bensappforge.cloud
						</a>
						. Anbieterangaben finden sich im{" "}
						<Link
							href="/impressum"
							className="text-accent underline-offset-4 hover:underline"
						>
							Impressum
						</Link>
						.
					</p>
				</div>

				<div>
					<h2 className="text-base font-semibold mb-2">
						2. Leistungsbeschreibung
					</h2>
					<p>
						Die App ermöglicht Lehrkräften, Tests und Arbeitsblätter zu
						erstellen, sie einer Klasse oder per Zugangscode zugänglich zu
						machen, Ergebnisse einzusehen und Aufgaben gemeinsam im
						Unterricht zu besprechen. Optional kann bei der
						Aufgabenerstellung ein KI-Modell genutzt werden. Umfang und
						Funktionen können sich im Laufe der Weiterentwicklung ändern.
					</p>
				</div>

				<div>
					<h2 className="text-base font-semibold mb-2">3. Beta-Phase</h2>
					<p>
						Die App befindet sich in einer geschlossenen Beta-Phase. Sie
						wird ohne Gewähr für ununterbrochene Verfügbarkeit,
						Fehlerfreiheit oder dauerhafte Speicherung von Daten
						bereitgestellt. Funktionen können jederzeit geändert oder
						eingestellt werden. Es wird empfohlen, sich nicht allein auf die
						App als einzigen Speicherort wichtiger Daten zu verlassen.
					</p>
				</div>

				<div>
					<h2 className="text-base font-semibold mb-2">
						4. Konten und Zugänge
					</h2>
					<p>
						Lehrkräfte erhalten ein persönliches Konto. Die Zugangsdaten
						sind vertraulich zu behandeln. Zugänge für Schüler:innen werden
						von der Lehrkraft angelegt und verwaltet.
					</p>
					<p className="mt-2">
						Die Lehrkraft ist dafür verantwortlich, dass für den Einsatz der
						App im Unterricht die erforderlichen datenschutzrechtlichen
						Grundlagen bestehen (z. B. Einwilligungen bzw. Genehmigungen
						nach den Vorgaben der Schule und des jeweiligen
						Landesdatenschutzrechts) und dass keine über das erforderliche
						Maß hinausgehenden personenbezogenen Daten von Schüler:innen
						eingegeben werden.
					</p>
				</div>

				<div>
					<h2 className="text-base font-semibold mb-2">
						5. Pflichten der Nutzer
					</h2>
					<p>
						Die App darf nur im Rahmen der geltenden Gesetze und für den
						vorgesehenen unterrichtlichen Zweck genutzt werden. Untersagt
						sind insbesondere rechtswidrige Inhalte, die Beeinträchtigung der
						technischen Infrastruktur sowie der unbefugte Zugriff auf Daten
						anderer Nutzer.
					</p>
				</div>

				<div>
					<h2 className="text-base font-semibold mb-2">
						6. Verfügbarkeit
					</h2>
					<p>
						Ein Anspruch auf ständige Verfügbarkeit besteht nicht.
						Wartungsarbeiten, Weiterentwicklungen oder technische Störungen
						können zu vorübergehenden Einschränkungen führen.
					</p>
				</div>

				<div>
					<h2 className="text-base font-semibold mb-2">7. Haftung</h2>
					<p>
						Die Haftung des Anbieters richtet sich nach den gesetzlichen
						Bestimmungen. Für unentgeltlich im Rahmen der Beta-Phase
						bereitgestellte Leistungen wird — soweit gesetzlich zulässig —
						nur für Vorsatz und grobe Fahrlässigkeit gehaftet. Die Haftung
						für die Verletzung von Leben, Körper und Gesundheit sowie nach
						zwingenden gesetzlichen Vorschriften bleibt unberührt.
					</p>
				</div>

				<div>
					<h2 className="text-base font-semibold mb-2">
						8. Änderungen der Nutzungsbedingungen
					</h2>
					<p>
						Diese Nutzungsbedingungen können angepasst werden, etwa bei
						Änderungen des Funktionsumfangs oder der Rechtslage. Über
						wesentliche Änderungen wird in geeigneter Weise informiert.
					</p>
				</div>

				<div>
					<h2 className="text-base font-semibold mb-2">
						9. Anwendbares Recht und Kontakt
					</h2>
					<p>
						Es gilt das Recht der Bundesrepublik Deutschland. Bei Fragen zu
						diesen Nutzungsbedingungen wenden Sie sich an{" "}
						<a
							href="mailto:info@bensappforge.cloud"
							className="text-accent underline-offset-4 hover:underline"
						>
							info@bensappforge.cloud
						</a>
						. Hinweise zur Verarbeitung personenbezogener Daten enthält die{" "}
						<Link
							href="/datenschutz"
							className="text-accent underline-offset-4 hover:underline"
						>
							Datenschutzerklärung
						</Link>
						.
					</p>
				</div>

				<div>
					<h2 className="text-base font-semibold mb-2">Stand</h2>
					<p>Juli 2026</p>
				</div>
			</section>
		</PageShell>
	);
}
